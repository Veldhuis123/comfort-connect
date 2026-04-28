import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";

// Public reCAPTCHA v3 site key — safe to commit (publishable key).
// Falls back to the production key when the VITE_ env var is not injected at build time.
const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  "6LedJY8sAAAAAEFw7iROOZHlOwV7nSo2b3KgpJ2C";

const contactInfo = [
  { icon: Phone, label: "Telefoon", value: "06 - 1362 9947", href: "tel:0613629947" },
  { icon: Mail, label: "E-mail", value: "info@rv-installatie.nl", href: "mailto:info@rv-installatie.nl" },
  { icon: MapPin, label: "Werkgebied", value: "Regio Nederland", href: null },
  { icon: Clock, label: "Bereikbaar", value: "Ma-Za 08:00-18:00", href: null },
];

const ContactForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      subject: formData.get("service") as string,
      message: formData.get("message") as string,
    };

    try {
      if (!executeRecaptcha) {
        throw new Error('Beveiliging (reCAPTCHA) is nog niet geladen. Wacht een moment en probeer opnieuw.');
      }
      const recaptchaToken = await executeRecaptcha('contact_form');
      if (!recaptchaToken) {
        throw new Error('reCAPTCHA-token kon niet worden gegenereerd.');
      }

      await api.createMessage({ ...data, recaptchaToken });
      toast({
        title: "Bericht verzonden!",
        description: "Bedankt voor uw bericht. Ik neem zo snel mogelijk contact met u op.",
      });
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Contact form submit failed:', error);
      const errMsg = error instanceof Error ? error.message : 'Onbekende fout';
      toast({
        title: "Verzenden mislukt",
        description: `${errMsg} Of bel direct: 06 - 1362 9947.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [executeRecaptcha, toast]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            Naam *
          </label>
          <Input 
            id="name" 
            name="name" 
            autoComplete="name"
            required 
            placeholder="Uw naam"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
            Telefoonnummer *
          </label>
          <Input 
            id="phone" 
            name="phone" 
            type="tel" 
            autoComplete="tel"
            required 
            placeholder="Uw telefoonnummer"
          />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
          E-mailadres *
        </label>
        <Input 
          id="email" 
          name="email" 
          type="email" 
          autoComplete="email"
          required
          placeholder="Uw e-mailadres"
        />
      </div>
      <div>
        <label htmlFor="service" className="block text-sm font-medium text-foreground mb-2">
          Dienst
        </label>
        <select 
          id="service" 
          name="service"
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
        >
          <option value="">Selecteer een dienst</option>
          <option value="airco">Airconditioning</option>
          <option value="verwarming">Verwarming</option>
          <option value="elektra">Elektra</option>
          <option value="water">Water & Sanitair</option>
          <option value="riolering">Riolering</option>
          <option value="unifi">UniFi Netwerken</option>
          <option value="camerabewaking">Camerabewaking</option>
          <option value="zonnepanelen">Zonnepanelen</option>
          <option value="thuisaccu">Thuisaccu's</option>
          <option value="laadpalen">Laadpalen</option>
          <option value="anders">Anders</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
          Bericht *
        </label>
        <Textarea 
          id="message" 
          name="message" 
          required 
          placeholder="Beschrijf uw vraag of project..."
          rows={5}
        />
      </div>
      
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Verzenden..." : "Verstuur Bericht"}
      </Button>
      
      {RECAPTCHA_SITE_KEY && (
        <p className="text-xs text-muted-foreground text-center">
          Beschermd door reCAPTCHA. Google{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
            Privacy
          </a>{" "}
          &{" "}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">
            Voorwaarden
          </a>
        </p>
      )}
    </form>
  );
};

const Contact = () => {
  return (
    <section id="contact" className="py-20 md:py-32 bg-muted/30 scroll-mt-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Contact
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
            Neem Contact Op
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Heeft u een vraag of wilt u een vrijblijvende offerte? 
            Neem gerust contact op!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h3 className="font-heading text-2xl font-bold text-foreground mb-8">
              Contactgegevens
            </h3>
            <div className="space-y-6">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{item.label}</div>
                    {item.href ? (
                      <a 
                        href={item.href} 
                        className="font-semibold text-foreground hover:text-accent transition-colors"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <div className="font-semibold text-foreground">{item.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 p-6 bg-accent/5 rounded-2xl border border-accent/10">
              <h4 className="font-heading font-bold text-lg text-foreground mb-2">
                Direct een offerte nodig?
              </h4>
              <p className="text-muted-foreground mb-4">
                Bel mij direct voor een snelle reactie!
              </p>
              <Button variant="default" size="lg" asChild className="w-full sm:w-auto">
                <a href="tel:0613629947" className="flex items-center justify-center gap-2">
                  <Phone className="w-5 h-5" />
                  06 - 1362 9947
                </a>
              </Button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
            <h3 className="font-heading text-2xl font-bold text-foreground mb-6">
              Stuur een Bericht
            </h3>
            {RECAPTCHA_SITE_KEY ? (
              <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
                <ContactForm />
              </GoogleReCaptchaProvider>
            ) : (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Het contactformulier is tijdelijk niet beschikbaar (reCAPTCHA ontbreekt).
                Bel direct: <a href="tel:0613629947" className="font-semibold underline">06 - 1362 9947</a> of mail naar{" "}
                <a href="mailto:info@rv-installatie.nl" className="font-semibold underline">info@rv-installatie.nl</a>.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
