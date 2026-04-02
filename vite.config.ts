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
          // Vendor chunk for React core
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router")) {
            return "react-vendor";
          }
          // UI library chunk
          if (id.includes("node_modules/@radix-ui/") || id.includes("node_modules/class-variance-authority") || id.includes("node_modules/clsx") || id.includes("node_modules/tailwind-merge")) {
            return "ui-vendor";
          }
          // Chart library (heavy, only used in admin)
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "charts";
          }
          // PDF generation (only used in admin)
          if (id.includes("node_modules/jspdf")) {
            return "pdf";
          }
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
