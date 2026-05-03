import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load non-critical routes
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Calculators = lazy(() => import("./pages/Calculators"));
const InstallationPublic = lazy(() => import("./pages/InstallationPublic"));
const QuotePublic = lazy(() => import("./pages/QuotePublic"));
const MobileBRL = lazy(() => import("./pages/MobileBRL"));
const Projects = lazy(() => import("./pages/Projects"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min cache
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Spring naar inhoud
          </a>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/calculators" element={<Suspense fallback={null}><Calculators /></Suspense>} />
            <Route path="/admin/login" element={<Suspense fallback={null}><AdminLogin /></Suspense>} />
            <Route path="/admin" element={<Suspense fallback={null}><AdminDashboard /></Suspense>} />
            <Route path="/installatie/:qrCode" element={<Suspense fallback={null}><InstallationPublic /></Suspense>} />
            <Route path="/offerte/:token" element={<Suspense fallback={null}><QuotePublic /></Suspense>} />
            <Route path="/brl" element={<Suspense fallback={null}><MobileBRL /></Suspense>} />
            <Route path="/projecten" element={<Suspense fallback={null}><Projects /></Suspense>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
