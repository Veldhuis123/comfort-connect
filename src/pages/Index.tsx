import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import AircoCalculator from "@/components/AircoCalculator";
import Testimonials from "@/components/Testimonials";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Services />
        <AircoCalculator />
        <Testimonials />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
