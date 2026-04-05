import { useState } from "react";
import { Search, Check, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { installationsApi } from "@/lib/installationsApi";
import type { CommissioningData, BRLChecklist } from "@/lib/installationTypes";
import { useEffect } from "react";

interface Props {
  data: CommissioningData;
  setData: (data: CommissioningData) => void;
  checklist: BRLChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<BRLChecklist>>;
  technicianId: string;
  onUpdateTechnician: (id: string) => void;
  onComplete: () => void;
}

const StepVoorbereiding = ({ data, setData, checklist, setChecklist, technicianId, onUpdateTechnician, onComplete }: Props) => {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    installationsApi.getTechnicians().then(t => setTechnicians(t.filter(x => x.is_active !== false))).catch(() => {});
  }, []);

  const searchContacts = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/eboekhouden/relaties?name=${encodeURIComponent(search)}&limit=25`) as any;
      setContacts(res.contacts || res || []);
    } catch {
      toast({ title: "Zoeken mislukt", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (contact: any) => {
    if (contact.bedrijf) return contact.bedrijf;
    if (contact.contactpersoon) return contact.contactpersoon;
    if (contact.name) return contact.name;
    return `${contact.voornaam || ""} ${contact.achternaam || ""}`.trim() || "Onbekend";
  };

  const selectContact = (contact: any) => {
    setData({
      ...data,
      customer_name: getDisplayName(contact),
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

  const checklistItems = [
    { key: "customer_informed" as const, label: "Klant geïnformeerd over werkzaamheden", desc: "Klant is op de hoogte van planning, duur en eventuele overlast" },
    { key: "location_inspected" as const, label: "Installatielocatie geïnspecteerd", desc: "Binnen- en buitenlocatie beoordeeld op geschiktheid" },
    { key: "electrical_capacity_checked" as const, label: "Elektrische capaciteit gecontroleerd", desc: "Voldoende aansluitvermogen beschikbaar, eventueel nieuwe groep" },
    { key: "condensate_drain_planned" as const, label: "Condensafvoer gepland", desc: "Route voor condensafvoer bepaald (riool, buitenmuur, pomp)" },
  ];

  const isComplete = !!data.customer_name && !!data.werkbon_number;

  return (
    <div className="space-y-4">
      {/* Basisgegevens */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Basisgegevens</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Werkbonnummer</Label>
              <Input value={data.werkbon_number} onChange={e => updateField("werkbon_number", e.target.value)} className="h-11 text-base" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Datum</Label>
              <Input type="date" value={data.date} onChange={e => updateField("date", e.target.value)} className="h-11 text-base" />
            </div>
          </div>

          {/* Monteur selectie */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Uitvoerend monteur*</Label>
            <Select value={technicianId} onValueChange={id => {
              onUpdateTechnician(id);
              const tech = technicians.find(t => String(t.id) === id);
              if (tech) {
                setData({ ...data, technician_name: tech.name, technician_certificate: tech.fgas_certificate_number || tech.brl_certificate_number || "" });
              }
            }}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecteer monteur" /></SelectTrigger>
              <SelectContent>
                {technicians.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Naam installatie*</Label>
            <Input value={data.installation_number} onChange={e => updateField("installation_number", e.target.value)} className="h-11 text-base" placeholder="bijv. Woonkamer split-unit" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Inbedrijfstellingsdatum*</Label>
            <Input type="date" value={data.commissioning_date} onChange={e => updateField("commissioning_date", e.target.value)} className="h-11 text-base" />
          </div>
        </CardContent>
      </Card>

      {/* Klant zoeken */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Klant*</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Zoek op naam of bedrijf..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchContacts()} className="h-11 text-base flex-1" />
            <Button onClick={searchContacts} disabled={loading} size="icon" className="h-11 w-11"><Search className="h-4 w-4" /></Button>
          </div>

          {contacts.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {contacts.map((c, i) => (
                <div key={i} className="p-3 rounded-lg border cursor-pointer active:bg-muted/50" onClick={() => selectContact(c)}>
                  <p className="text-sm font-medium">{c.bedrijf || `${c.voornaam} ${c.achternaam}`}</p>
                  <p className="text-xs text-muted-foreground">{c.plaats}</p>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => setShowManual(!showManual)}>
            <UserPlus className="h-4 w-4 mr-2" /> Handmatig invoeren
          </Button>

          {(showManual || data.customer_name) && (
            <div className="space-y-2 pt-2">
              {[
                { key: "customer_name" as const, label: "Naam / Bedrijf" },
                { key: "customer_address" as const, label: "Adres" },
                { key: "customer_postal" as const, label: "Postcode" },
                { key: "customer_city" as const, label: "Plaats" },
                { key: "customer_phone" as const, label: "Telefoon" },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input value={data[f.key] as string} onChange={e => updateField(f.key, e.target.value)} className="h-11 text-base" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist Voorbereiding */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Checklist Voorbereiding</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {checklistItems.map(item => (
            <label key={item.key} className="flex items-start gap-3 py-2 px-2 rounded-lg cursor-pointer active:bg-muted/50">
              <Checkbox checked={checklist[item.key] as boolean} onCheckedChange={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))} className="h-6 w-6 mt-0.5" />
              <div>
                <span className="text-sm font-medium">{item.label}</span>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </label>
          ))}
          <Textarea placeholder="Opmerkingen voorbereiding..." value={checklist.notes_step1} onChange={e => setChecklist(prev => ({ ...prev, notes_step1: e.target.value }))} rows={2} className="mt-2" />
        </CardContent>
      </Card>

      <Button onClick={onComplete} disabled={!isComplete} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Stap voltooien
      </Button>
    </div>
  );
};

export default StepVoorbereiding;
