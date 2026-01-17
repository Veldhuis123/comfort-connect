import { Star, Quote, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  service: string;
  date: string;
}

// Voeg hier je klantreviews toe
const testimonials: Testimonial[] = [
  // Voorbeeld review (verwijder deze en voeg je eigen reviews toe):
  // {
  //   id: "1",
  //   name: "Naam Klant",
  //   location: "Plaats",
  //   rating: 5,
  //   text: "Review tekst hier...",
  //   service: "Type installatie",
  //   date: "Maand 2024"
  // },
];

const Testimonials = () => {
  if (testimonials.length === 0) {
    return (
      <section id="reviews" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">
              Klantbeoordelingen
            </span>
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
              Wat Klanten Zeggen
            </h2>
          </div>

          {/* Empty State / Placeholder */}
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed border-muted-foreground/30 bg-transparent">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Quote className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  Klantreviews Komen Hier
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Reviews van tevreden klanten worden hier getoond. 
                  Voeg reviews toe in het Testimonials.tsx bestand.
                </p>
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Reviews toevoegen via code</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trust Badges - Always visible */}
          <div className="mt-16 text-center">
            <div className="flex flex-wrap justify-center items-center gap-8">
              <div className="flex items-center gap-2 bg-background px-6 py-3 rounded-lg border border-border">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-green-500 text-green-500" />
                  ))}
                </div>
                <span className="font-semibold text-foreground">Google Reviews</span>
              </div>
              <div className="flex items-center gap-2 bg-background px-6 py-3 rounded-lg border border-border">
                <span className="text-lg">✓</span>
                <span className="font-semibold text-foreground">Gecertificeerd Installateur</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="reviews" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Klantbeoordelingen
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
            Wat Klanten Zeggen
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Lees de ervaringen van onze tevreden klanten met onze airco installaties.
          </p>
          
          {/* Overall Rating */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-xl font-bold text-foreground">
              {(testimonials.reduce((acc, t) => acc + t.rating, 0) / testimonials.length).toFixed(1)}
            </span>
            <span className="text-muted-foreground">gemiddeld ({testimonials.length} reviews)</span>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card 
              key={testimonial.id} 
              className="bg-background border-border hover:shadow-lg transition-shadow duration-300"
            >
              <CardContent className="pt-6">
                <Quote className="w-8 h-8 text-accent/30 mb-4" />
                
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-foreground mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>
                
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-accent">{testimonial.service}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.date}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="flex items-center gap-2 bg-background px-6 py-3 rounded-lg border border-border">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-green-500 text-green-500" />
                ))}
              </div>
              <span className="font-semibold text-foreground">Google Reviews</span>
            </div>
            <div className="flex items-center gap-2 bg-background px-6 py-3 rounded-lg border border-border">
              <span className="text-lg">✓</span>
              <span className="font-semibold text-foreground">Gecertificeerd Installateur</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
