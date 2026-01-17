import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  service: string;
  date: string;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Peter van Dijk",
    location: "Amersfoort",
    rating: 5,
    text: "Uitstekende service! Robin heeft onze Daikin airco perfect geïnstalleerd. Zeer netjes gewerkt en alles goed uitgelegd. De temperatuur in onze woonkamer is nu heerlijk, zelfs tijdens de heetste dagen.",
    service: "Daikin Perfera installatie",
    date: "Juni 2024"
  },
  {
    id: "2",
    name: "Sandra Bakker",
    location: "Hilversum",
    rating: 5,
    text: "Snelle offerte, eerlijke prijs en vakkundige installatie. De airco werkt geweldig en is super stil. Echt een aanrader voor iedereen die overweegt een airco te laten plaatsen!",
    service: "Haier Flexis Plus",
    date: "Juli 2024"
  },
  {
    id: "3",
    name: "Mark & Lisa Jansen",
    location: "Utrecht",
    rating: 5,
    text: "We hebben airco's laten installeren in 3 slaapkamers. Het verschil is enorm, vooral op zolder waar het voorheen onhoudbaar warm was. Zeer tevreden met de communicatie en het eindresultaat.",
    service: "Multi-split systeem",
    date: "Augustus 2024"
  },
  {
    id: "4",
    name: "Henk de Vries",
    location: "Zeist",
    rating: 5,
    text: "Na veel offertes gevraagd te hebben, koos ik voor RV Installatie vanwege de persoonlijke aanpak. Geen gedoe, gewoon goed werk voor een eerlijke prijs. De airco verwarmt nu ook prima in de winter.",
    service: "Daikin Stylish",
    date: "September 2024"
  },
  {
    id: "5",
    name: "Annemarie Groot",
    location: "Nieuwegein",
    rating: 5,
    text: "Fantastische ervaring! Van de eerste offerte tot de installatie was alles top geregeld. De Haier airco ziet er strak uit en koelt perfect. Zou RV Installatie zeker aanbevelen.",
    service: "Haier Tundra Plus",
    date: "Oktober 2024"
  },
  {
    id: "6",
    name: "Tom Willems",
    location: "Soest",
    rating: 5,
    text: "Eindelijk een installateur die doet wat hij belooft. Punctueel, netjes en vriendelijk. De leidingen zijn keurig weggewerkt en de airco functioneert uitstekend. Top service!",
    service: "Daikin Perfera",
    date: "November 2024"
  }
];

const Testimonials = () => {
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
            Meer dan 100 tevreden klanten gingen u voor. Lees hun ervaringen met onze airco installaties.
          </p>
          
          {/* Overall Rating */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-xl font-bold text-foreground">4.9</span>
            <span className="text-muted-foreground">gemiddeld (100+ reviews)</span>
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
                {/* Quote Icon */}
                <Quote className="w-8 h-8 text-accent/30 mb-4" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                {/* Text */}
                <p className="text-foreground mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>
                
                {/* Author Info */}
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
          <p className="text-muted-foreground mb-6">Beoordeeld op</p>
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
              <span className="text-2xl font-bold text-orange-500">9.4</span>
              <span className="font-semibold text-foreground">Klantenvertellen</span>
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
