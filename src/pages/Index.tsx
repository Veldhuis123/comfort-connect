import { useEffect, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";

// Single lazy chunk for all below-fold content (reduces waterfall from 20+ requests to 1)
const HomepageBelowFold = lazy(() => import("@/components/HomepageBelowFold"));

const Index = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content">
        <Hero />
        <Suspense fallback={null}>
          <HomepageBelowFold />
        </Suspense>
      </main>
    </div>
  );
};

export default Index;
