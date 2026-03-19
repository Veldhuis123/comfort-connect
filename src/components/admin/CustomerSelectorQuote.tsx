import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, UserPlus, Building2 } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface EBoekhoudenRelatie {
  Relatiecode: string;
  Bedrijf: string;
  Contactpersoon?: string;
  Email?: string;
  Telefoon?: string;
  Adres?: string;
  Postcode?: string;
  Plaats?: string;
}

interface CustomerData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  relation_id?: string;
}

interface CustomerSelectorQuoteProps {
  onSelect: (customer: CustomerData) => void;
  selectedCustomer: CustomerData | null;
  onClear: () => void;
}

const CustomerSelectorQuote = ({ onSelect, selectedCustomer, onClear }: CustomerSelectorQuoteProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<EBoekhoudenRelatie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiRequest<EBoekhoudenRelatie[]>('/eboekhouden/relaties');
      const filtered = (Array.isArray(data) ? data : []).filter(c =>
        (c.Bedrijf || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.Contactpersoon || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.Email || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered.slice(0, 10));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  if (selectedCustomer) {
    return (
      <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-sm">{selectedCustomer.customer_name}</p>
            <p className="text-xs text-muted-foreground">
              {[selectedCustomer.customer_email, selectedCustomer.customer_phone].filter(Boolean).join(" • ")}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>Wijzig</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek klant op naam, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zoek"}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
          {results.map(c => (
            <button
              key={c.Relatiecode}
              onClick={() => onSelect({
                customer_name: c.Bedrijf || c.Contactpersoon || "",
                customer_email: c.Email || "",
                customer_phone: c.Telefoon || "",
                customer_address: [c.Adres, c.Postcode, c.Plaats].filter(Boolean).join(", "),
                relation_id: c.Relatiecode,
              })}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
            >
              <p className="text-sm font-medium">{c.Bedrijf || c.Contactpersoon}</p>
              <p className="text-xs text-muted-foreground">
                {[c.Email, c.Plaats].filter(Boolean).join(" • ")}
              </p>
            </button>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground text-center py-2">Geen klant gevonden</p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>of voer handmatig in</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
};

export default CustomerSelectorQuote;