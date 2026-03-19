import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, AlertTriangle, FileText, Phone, Mail, 
  Calendar, Euro, Download, Building2, User
} from "lucide-react";
import { API_URL } from "@/lib/api";

interface PublicQuote {
  id: number;
  quote_number: string;
  customer_name: string;
  customer_email: string | null;
  quote_date: string;
  expiration_date: string | null;
  subtotal_excl: number;
  vat_amount: number;
  total_incl: number;
  status: string;
  customer_note: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    vat_percentage: number;
    line_total_excl: number;
    line_total_incl: number;
  }>;
  company: {
    name: string;
    email: string;
    phone: string;
  };
}

const formatCurrency = (amount: number | string | null) => {
  if (amount === null) return "€0,00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `€${num.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("nl-NL", { year: 'numeric', month: 'long', day: 'numeric' });
};

const QuotePublic = () => {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!token) {
        setError("Geen offerte link gevonden");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/eboekhouden/local-quotes/public/${token}`);
        if (!res.ok) throw new Error("Offerte niet gevonden");
        const data = await res.json();
        setQuote(data);
        if (data.status === 'geaccepteerd') setAccepted(true);
      } catch {
        setError("Offerte niet gevonden of verlopen.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await fetch(`${API_URL}/eboekhouden/local-quotes/public/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error("Kon offerte niet accepteren");
      setAccepted(true);
    } catch {
      // error handling
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Offerte ophalen...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Offerte niet gevonden</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = quote.expiration_date && new Date(quote.expiration_date) < new Date();
  const canAccept = !accepted && !isExpired && quote.status === 'verzonden';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">R. Veldhuis Installatie</h1>
              <p className="text-sm opacity-80">Offerte {quote.quote_number}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4 -mt-4">
        {/* Status banner */}
        {accepted && (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="pt-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-700">Offerte geaccepteerd</p>
                <p className="text-sm text-green-600">Bedankt! Wij nemen spoedig contact op.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {isExpired && !accepted && (
          <Card className="border-orange-300 bg-orange-50">
            <CardContent className="pt-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-700">Offerte verlopen</p>
                <p className="text-sm text-orange-600">Neem contact op voor een nieuwe offerte.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote info */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Offerte voor {quote.customer_name}</CardTitle>
                <CardDescription>
                  <span className="flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(quote.quote_date)}
                    {quote.expiration_date && (
                      <span className="text-muted-foreground"> • Geldig t/m {formatDate(quote.expiration_date)}</span>
                    )}
                  </span>
                </CardDescription>
              </div>
              <Badge variant={accepted ? "default" : "secondary"}>
                {accepted ? "Geaccepteerd" : isExpired ? "Verlopen" : "Open"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Items */}
            <div className="border border-border rounded-lg overflow-hidden mb-6">
              <div className="bg-muted/50 grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                <div className="col-span-5">Omschrijving</div>
                <div className="col-span-2 text-right">Aantal</div>
                <div className="col-span-2 text-right">Prijs</div>
                <div className="col-span-3 text-right">Totaal</div>
              </div>
              {quote.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-t border-border">
                  <div className="col-span-5">{item.description}</div>
                  <div className="col-span-2 text-right text-muted-foreground">{item.quantity} {item.unit}</div>
                  <div className="col-span-2 text-right text-muted-foreground">{formatCurrency(item.price_per_unit)}</div>
                  <div className="col-span-3 text-right font-medium">{formatCurrency(item.line_total_excl)}</div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotaal excl. BTW</span>
                <span>{formatCurrency(quote.subtotal_excl)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">BTW</span>
                <span>{formatCurrency(quote.vat_amount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Totaal incl. BTW</span>
                <span>{formatCurrency(quote.total_incl)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer note */}
        {quote.customer_note && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Opmerkingen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{quote.customer_note}</p>
            </CardContent>
          </Card>
        )}

        {/* Accept button */}
        {canAccept && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-center mb-4">
                Gaat u akkoord met deze offerte? Klik dan op de knop hieronder.
              </p>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleAccept} 
                disabled={accepting}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {accepting ? "Verwerken..." : "Offerte accepteren"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Door te accepteren gaat u akkoord met de voorwaarden in deze offerte.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vragen?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="tel:+31613629947" className="flex items-center gap-3 text-sm hover:text-primary">
              <Phone className="w-4 h-4" />
              <span>06-13629947</span>
            </a>
            <a href="mailto:info@rv-installatie.nl" className="flex items-center gap-3 text-sm hover:text-primary">
              <Mail className="w-4 h-4" />
              <span>info@rv-installatie.nl</span>
            </a>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground py-4">
          <p>© {new Date().getFullYear()} R. Veldhuis Installatie</p>
        </div>
      </main>
    </div>
  );
};

export default QuotePublic;