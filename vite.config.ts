import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: ["www.rv-installatie.nl", "rv-installatie.nl"],
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: mode === "development",
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Houd React + router + alle @radix-ui (die React intern importeren) samen
          // in de default vendor chunk om dubbele React instances te voorkomen.
          if (id.includes('@sentry')) return 'vendor-sentry';
          if (id.includes('jspdf') || id.includes('qrcode') || id.includes('html2canvas')) return 'vendor-pdf';
          if (id.includes('recharts') || id.includes('/d3-')) return 'vendor-charts';
          if (id.includes('leaflet')) return 'vendor-maps';
          if (id.includes('barcode-detector') || id.includes('zxing')) return 'vendor-barcode';
        },
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      // Voeg nonce-placeholder toe aan alle door Vite gegenereerde
      // <script>, <link rel="modulepreload"> en <link rel="stylesheet"> tags.
      // Nginx vervangt __CSP_NONCE__ per request via sub_filter.
      name: "inject-csp-nonce-placeholder",
      apply: "build",
      enforce: "post",
      transformIndexHtml(html: string) {
        return html
          .replace(/<script(?![^>]*\bnonce=)/g, '<script nonce="__CSP_NONCE__"')
          .replace(
            /<link(?=[^>]*\brel="(?:modulepreload|stylesheet|preload)")(?![^>]*\bnonce=)/g,
            '<link nonce="__CSP_NONCE__"'
          );
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
