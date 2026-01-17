import { Button } from "@/components/ui/button";
import { Phone, CheckCircle2 } from "lucide-react";

const Hero = () => {
  const highlights = [
    "Vakkundige installaties",
    "Gratis vrijblijvende offerte",
    "Snelle service",
  ];

  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-sm font-medium">Beschikbaar in uw regio</span>
          </div>

          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            Uw Specialist voor{" "}
            <span className="text-accent">Alle Installaties</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
            Professionele installatie van airco, verwarming, elektra, water en riolering. 
            Vakmanschap waar u op kunt vertrouwen.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button size="lg" variant="default" asChild className="text-lg px-8">
              <a href="#contact">Vraag een Offerte Aan</a>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8">
              <a href="tel:0612345678" className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Bel Direct
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap gap-6">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
