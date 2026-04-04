import { useState } from "react";
import { Search, Loader2, User, Building2, MapPin, Phone, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import type { CommissioningData } from "@/lib/installationTypes";

interface EBoekhoudenRelatie {
  Relatiecode: string;
  Bedrijf: string;
  Contactpersoon?: string;
  Adres?: string;
  Postcode?: string;
  Plaats?: string;
  Telefoon?: string;
  Email?: string;
  // Alternative field names from detailed fetch
  id?: string;
  code?: string;
  name?: string;
  company?: string;
  address?: string;
  postal?: string;
  city?: string;
  phone?: string;
  email?: string;
}

interface Props {
  data: CommissioningData;
  setData: React.Dispatch<React.SetStateAction<CommissioningData>>;
}

const MobileCustomerSelector = ({ data, setData }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<EBoekhoudenRelatie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchCustomers = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiRequest<EBoekhoudenRelatie[]>('/eboekhouden/relaties');
      const query = searchQuery.toLowerCase();
      const filtered = (Array.isArray(data) ? data : []).filter(c => {
        const name = (c.Bedrijf || c.company || c.name || "").toLowerCase();
        const contact = (c.Contactpersoon || "").toLowerCase();
        const city = (c.Plaats || c.city || "").toLowerCase();
        return name.includes(query) || contact.includes(query) || city.includes(query);
      });
      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = (c: EBoekhoudenRelatie) => {
    setData(prev => ({
      ...prev,
      customer_name: c.Bedrijf || c.company || c.name || c.Contactpersoon || "",
      customer_contact: c.Contactpersoon || "",
      customer_address: c.Adres || c.address || "",
      customer_postal: c.Postcode || c.postal || "",
      customer_city: c.Plaats || c.city || "",
      customer_phone: c.Telefoon || c.phone || "",
    }));
    setResults([]);
    setSearchQuery("");
    setSearched(false);
  };

  const hasCustomer = !!data.customer_name;

  return (
    <div className="space-y-3">
      {hasCustomer && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-sm">{data.customer_name}</p>
                {data.customer_contact && <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{data.customer_contact}</p>}
                {data.customer_address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{data.customer_address}, {data.customer_postal} {data.customer_city}</p>}
                {data.customer_phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{data.customer_phone}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setData(prev => ({
                ...prev, customer_name: "", customer_contact: "", customer_address: "", customer_postal: "", customer_city: "", customer_phone: ""
              }))}>
                Wijzig
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasCustomer && (
        <>
          <div className="flex gap-2">
            <Input
              placeholder="Zoek klant..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchCustomers()}
              className="h-12 text-base"
            />
            <Button onClick={fetchCustomers} disabled={loading || !searchQuery.trim()} className="h-12 px-4">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            </Button>
          </div>

          {searched && results.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Geen klanten gevonden</p>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((c, i) => (
                <Card key={i} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => selectCustomer(c)}>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm">{c.Bedrijf || c.company || c.name}</p>
                    {c.Contactpersoon && <p className="text-xs text-muted-foreground">{c.Contactpersoon}</p>}
                    <p className="text-xs text-muted-foreground">{c.Plaats || c.city}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MobileCustomerSelector;
