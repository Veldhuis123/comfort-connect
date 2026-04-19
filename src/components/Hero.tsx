import { Button } from "@/components/ui/button";
import { Phone, CheckCircle2 } from "lucide-react";
import heroImage from "@/assets/hero-installation.webp";
import heroPortraitImage from "@/assets/hero-installation-portrait.webp";

// Responsive varianten staan in /public/ (server-side gegenereerd met cwebp).
// Vaste paden — niet gehasht — zodat <picture> srcSet ze altijd kan vinden.
const heroImage1024 = "/hero-installation-1024.webp";
const heroImage640 = "/hero-installation-640.webp";

const Hero = () => {
  const highlights = [
    "Vakkundige installaties",
    "Gratis vrijblijvende offerte",
    "Snelle service",
  ];

  return (
    <section id="home" className="relative min-h-[75vh] md:min-h-[80vh] flex items-center pt-24 pb-12 overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0 bg-primary">
        <div className="absolute inset-0 lg:hidden">
          <picture>
            <source media="(max-width: 640px)" srcSet={heroImage640} type="image/webp" />
            <source media="(max-width: 1024px)" srcSet={heroImage1024} type="image/webp" />
            {/* eslint-disable-next-line react/no-unknown-property */}
            <img
              src={heroImage}
              alt="Professionele airco installatie door R. Veldhuis Installatie"
              className="w-full h-full object-cover object-center"
              loading="eager"
              // @ts-ignore
              fetchpriority="high"
              decoding="async"
              width={1280}
              height={720}
            />
          </picture>
        </div>

        <div
          aria-hidden="true"
          className="absolute inset-0 hidden lg:block bg-no-repeat bg-right-bottom [background-size:auto_100%]"
          style={{
            backgroundImage: `url(${heroImage})`,
            WebkitMaskImage: "linear-gradient(to left, black 76%, transparent 100%)",
            maskImage: "linear-gradient(to left, black 76%, transparent 100%)",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/75 to-primary/40" />
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-accent/15 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/25 text-white px-4 py-2 rounded-full mb-6 backdrop-blur-sm border border-white/40">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" aria-hidden="true" />
            <span className="text-sm font-semibold">Beschikbaar in uw regio</span>
          </div>

          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
            Uw Specialist voor{" "}
            <span className="text-sky-300">Alle Installaties</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl">
            R. Veldhuis Installatie biedt professionele installatie van airco, verwarming, 
            elektra, water en riolering. Vakmanschap waar u op kunt vertrouwen.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button size="lg" variant="secondary" asChild className="text-lg px-8 min-h-[48px] bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
              <a href="#contact">Vraag een Offerte Aan</a>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 min-h-[48px] border-white/50 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm [&>a]:text-white">
              <a href="tel:0613629947" className="flex items-center gap-2" aria-label="Bel ons op 06 1362 9947">
                <Phone className="w-5 h-5" />
                Bel Direct
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap gap-6">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-2 text-primary-foreground bg-primary-foreground/10 backdrop-blur-sm px-3 py-1 rounded-full border border-primary-foreground/20">
                <CheckCircle2 className="w-5 h-5 text-sky-300" />
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
