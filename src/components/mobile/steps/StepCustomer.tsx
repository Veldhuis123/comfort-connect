import { useState, useEffect } from "react";
import { Search, Plus, UserPlus, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import type { CommissioningData } from "@/lib/installationTypes";

interface Props {
  data: CommissioningData;
  setData: (data: CommissioningData) => void;
  onComplete: () => void;
}

const StepCustomer = ({ data, setData, onComplete }: Props) => {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const { toast } = useToast();

  const searchContacts = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/api/eboekhouden/contacts?search=${encodeURIComponent(search)}`) as any;
      setContacts(res.contacts || []);
    } catch {
      toast({ title: "Zoeken mislukt", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectContact = (contact: any) => {
    setData({
      ...data,
      customer_name: contact.bedrijf || `${contact.voornaam || ""} ${contact.achternaam || ""}`.trim(),
      customer_address: contact.adres || "",
      customer_postal: contact.postcode || "",
      customer_city: contact.plaats || "",
      customer_phone: contact.telefoon || contact.mobiel || "",
      customer_contact: contact.contactpersoon || "",
    });
    toast({ title: "Klant geselecteerd" });
  };

  const updateField = (key: keyof CommissioningData, value: string) => {
    setData({ ...data, [key]: value });
  };

  const isComplete = !!data.customer_name && !!data.customer_address;

  return (
    <div className="space-y-4">
      {/* Search from e-Boekhouden */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Klant zoeken</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Zoek op naam of bedrijf..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchContacts()}
              className="h-11 text-base flex-1"
            />
            <Button onClick={searchContacts} disabled={loading} size="icon" className="h-11 w-11">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {contacts.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {contacts.map((c, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border cursor-pointer active:bg-muted/50 hover:bg-muted/30"
                  onClick={() => selectContact(c)}
                >
                  <p className="text-sm font-medium">{c.bedrijf || `${c.voornaam} ${c.achternaam}`}</p>
                  <p className="text-xs text-muted-foreground">{c.plaats}</p>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => setShowManual(!showManual)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Handmatig invoeren
          </Button>
        </CardContent>
      </Card>

      {/* Manual entry or selected customer */}
      {(showManual || data.customer_name) && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Klantgegevens</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {[
              { key: "customer_name" as const, label: "Naam / Bedrijf" },
              { key: "customer_address" as const, label: "Adres" },
              { key: "customer_postal" as const, label: "Postcode" },
              { key: "customer_city" as const, label: "Plaats" },
              { key: "customer_phone" as const, label: "Telefoon" },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input
                  value={data[f.key] as string}
                  onChange={e => updateField(f.key, e.target.value)}
                  className="h-11 text-base"
                />
              </div>
            ))}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Werkbon nummer</Label>
              <Input
                value={data.werkbon_number}
                onChange={e => updateField("werkbon_number", e.target.value)}
                className="h-11 text-base"
                placeholder="Optioneel"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={onComplete} disabled={!isComplete} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" />
        Stap voltooien
      </Button>
    </div>
  );
};

export default StepCustomer;
