import { useState, useEffect } from "react";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api, Review } from "@/lib/api";
import ReviewSubmitDialog from "./ReviewSubmitDialog";

const Testimonials = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await api.getPublicReviews();
        setReviews(data);
      } catch (error) {
        // API not available, show empty state
        console.log("Reviews API niet beschikbaar");
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  if (loading) {
    return (
      <section id="reviews" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mx-auto mb-4" />
            <div className="h-12 bg-muted rounded w-96 mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
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

          {/* Empty State */}
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed border-muted-foreground/30 bg-transparent">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Quote className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  Deel je ervaring
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Ben je tevreden over onze diensten? Laat een review achter!
                </p>
                <ReviewSubmitDialog />
              </CardContent>
            </Card>
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
  }

  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

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
            Lees de ervaringen van onze tevreden klanten met onze installaties.
          </p>
          
          {/* Overall Rating */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-xl font-bold text-foreground">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">gemiddeld ({reviews.length} reviews)</span>
          </div>
          
          {/* Submit Review Button */}
          <div className="mt-6">
            <ReviewSubmitDialog />
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <Card 
              key={review.id} 
              className="bg-background border-border hover:shadow-lg transition-shadow duration-300"
            >
              <CardContent className="pt-6">
                <Quote className="w-8 h-8 text-accent/30 mb-4" />
                
                <div className="flex gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-foreground mb-6 leading-relaxed">
                  "{review.review_text}"
                </p>
                
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{review.name}</p>
                      <p className="text-sm text-muted-foreground">{review.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-accent">{review.service}</p>
                      <p className="text-xs text-muted-foreground">{review.review_date}</p>
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
