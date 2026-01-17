import { Wind, Flame, Zap, Droplets, PipetteIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Services = () => {
  const services = [
    {
      icon: Wind,
      title: "Airconditioning",
      description: "Installatie en onderhoud van airconditioningsystemen. Koel in de zomer, warm in de winter.",
      features: ["Split-unit airco's", "Multi-split systemen", "Onderhoud & reparatie"],
    },
    {
      icon: Flame,
      title: "Verwarming",
      description: "Complete verwarmingsoplossingen voor uw woning of bedrijfspand.",
      features: ["CV-ketels", "Vloerverwarming", "Warmtepompen"],
    },
    {
      icon: Zap,
      title: "Elektra",
      description: "Veilige en betrouwbare elektrische installaties door een vakman.",
      features: ["Nieuwbouw installaties", "Renovatie", "Storingen verhelpen"],
    },
    {
      icon: Droplets,
      title: "Water & Sanitair",
      description: "Van leidingwerk tot complete badkamer installaties.",
      features: ["Leidingwerk", "Badkamer installatie", "Lekkages verhelpen"],
    },
    {
      icon: PipetteIcon,
      title: "Riolering",
      description: "Professionele aanleg en onderhoud van rioleringssystemen.",
      features: ["Nieuwe aansluitingen", "Ontstoppingen", "Riool inspectie"],
    },
  ];

  return (
    <section id="diensten" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Onze Expertise
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
            Diensten
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Een compleet pakket aan installatiediensten onder één dak. 
            Kwaliteit en vakmanschap staan bij ons voorop.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card 
              key={service.title} 
              className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-accent/30 bg-card"
            >
              <CardHeader>
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <service.icon className="w-7 h-7 text-accent" />
                </div>
                <CardTitle className="font-heading text-xl">{service.title}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
