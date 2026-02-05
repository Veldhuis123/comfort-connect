import { useState } from "react";
import { Star, MessageSquarePlus, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const services = [
  "Airco installatie",
  "UniFi netwerk",
  "Zonnepanelen",
  "Thuisaccu",
  "Laadpaal",
  "Algemeen",
];

const ReviewSubmitDialog = () => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    service: "",
    review_text: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.service || !formData.review_text) {
      toast({
        title: "Vul alle velden in",
        description: "Alle velden zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    if (formData.review_text.length < 20) {
      toast({
        title: "Review te kort",
        description: "Schrijf minimaal 20 tekens",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await api.submitPublicReview({
        name: formData.name.trim(),
        location: formData.location.trim(),
        service: formData.service,
        review_text: formData.review_text.trim(),
        rating,
      });

      toast({
        title: "Bedankt voor je review!",
        description: "Je review wordt gecontroleerd en daarna gepubliceerd.",
      });

      setFormData({ name: "", location: "", service: "", review_text: "" });
      setRating(5);
      setOpen(false);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Er ging iets mis",
        description: "Probeer het later opnieuw",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageSquarePlus className="w-4 h-4" />
          Plaats een review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deel je ervaring</DialogTitle>
          <DialogDescription>
            Vertel anderen over je ervaring met onze diensten. Je review wordt na controle gepubliceerd.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Beoordeling</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Naam</Label>
            <Input
              id="name"
              placeholder="Je naam"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Plaats</Label>
            <Input
              id="location"
              placeholder="Bijv. Westerhaar"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              maxLength={100}
              required
            />
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label htmlFor="service">Dienst</Label>
            <Select
              value={formData.service}
              onValueChange={(value) => setFormData({ ...formData, service: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een dienst" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review_text">Je review</Label>
            <Textarea
              id="review_text"
              placeholder="Vertel over je ervaring..."
              value={formData.review_text}
              onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
              rows={4}
              maxLength={1000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.review_text.length}/1000
            </p>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verzenden...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Review versturen
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewSubmitDialog;
