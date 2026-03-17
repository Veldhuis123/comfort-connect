import { useEffect, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

// Lazy load below-fold components
const Services = lazy(() => import("@/components/Services"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const About = lazy(() => import("@/components/About"));
const Contact = lazy(() => import("@/components/Contact"));
const Footer = lazy(() => import("@/components/Footer"));

const CalculatorCTA = () => (
  <section className="py-16 bg-accent/5">
    <div className="container mx-auto px-4 text-center">
      <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
        Bereken Uw Besparing
      </h2>
      <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
        Gebruik onze handige calculatoren om direct een indicatieprijs te krijgen 
        voor airconditioning, zonnepanelen of thuisaccu's.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" asChild>
          <Link to="/calculators" className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Alle Calculatoren
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

const Index = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Small delay to ensure DOM is ready
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
      <main>
        <Hero />
        <Suspense fallback={null}>
          <Services />
          <CalculatorCTA />
          <Testimonials />
          <About />
          <Contact />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
