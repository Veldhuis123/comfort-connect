import { Shield, Clock, Award, ThumbsUp } from "lucide-react";
import logo from "@/assets/logo.png";

const About = () => {
  const stats = [
    { icon: Clock, value: "10+", label: "Jaar Ervaring" },
    { icon: ThumbsUp, value: "500+", label: "Tevreden Klanten" },
    { icon: Award, value: "100%", label: "Vakmanschap" },
    { icon: Shield, value: "5 Jaar", label: "Garantie" },
  ];

  return (
    <section id="over" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">
              Over Mij
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
              Vakmanschap met <span className="text-accent">Passie</span>
            </h2>
            <div className="space-y-4 text-muted-foreground text-lg">
              <p>
                Als zelfstandig installateur met meer dan 10 jaar ervaring sta ik garant 
                voor kwaliteit en betrouwbaarheid. Of het nu gaat om een nieuwe airco, 
                complete verwarming, of elektrische installatie – ik lever vakwerk.
              </p>
              <p>
                Persoonlijke aandacht en eerlijk advies staan bij mij centraal. 
                U krijgt altijd een duidelijke offerte zonder verrassingen achteraf.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="w-6 h-6 text-accent" />
                  </div>
                  <div className="font-heading font-bold text-2xl text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Image/Visual */}
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-accent/20 via-primary/10 to-accent/5 rounded-2xl flex items-center justify-center">
              <div className="text-center p-8">
                <img 
                  src={logo} 
                  alt="R. Veldhuis Installatie" 
                  className="w-48 h-auto mx-auto mb-6"
                />
                <p className="text-muted-foreground">
                  Uw betrouwbare partner voor alle installaties
                </p>
              </div>
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent/20 rounded-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
