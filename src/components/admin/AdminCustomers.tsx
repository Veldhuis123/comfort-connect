import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserPlus, UserCog, Search, Loader2, RefreshCw, ExternalLink,
  ChevronLeft, FileText, CheckCircle, AlertCircle, Save, X
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, api, QuoteRequest } from "@/lib/api";

interface Customer {
  id: string;
  code: string;
  type: string;
  bedrijf: string;
  contactpersoon?: string;
  email?: string;
  telefoon?: string;
  mobiel?: string;
  adres?: string;
  postcode?: string;
  plaats?: string;
  land?: string;
  iban?: string;
  btwNummer?: string;
  kvkNummer?: string;
  betalingstermijn?: number;
  notities?: string;
  actief?: boolean;
}

const emptyCustomer: Omit<Customer, "id" | "code"> = {
  type: "P",
  bedrijf: "",
  contactpersoon: "",
  email: "",
  telefoon: "",
  mobiel: "",
  adres: "",
  postcode: "",
  plaats: "",
  land: "NL",
  iban: "",
  btwNummer: "",
  kvkNummer: "",
  betalingstermijn: 14,
  notities: "",
};

const MAX_DISPLAY = 100;

const AdminCustomers = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Detail / edit view
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [saving, setSaving] = useState(false);

  // Add customer dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyCustomer });
  const [adding, setAdding] = useState(false);

  // Import from quote dialog
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Customer[]>("/eboekhouden/relaties");
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setCustomers([]);
      toast({ title: "Fout", description: "Kon klanten niet laden vanuit e-Boekhouden", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.bedrijf || "").toLowerCase().includes(q) ||
      (c.contactpersoon || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.plaats || "").toLowerCase().includes(q) ||
      (c.code || "").toLowerCase().includes(q)
    );
  });

  // Open detail/edit
  const openCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditForm({ ...customer });
  };

  const closeDetail = () => {
    setSelectedCustomer(null);
    setEditForm({});
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      await apiRequest(`/eboekhouden/relaties/${selectedCustomer.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      toast({ title: "Opgeslagen", description: "Klantgegevens bijgewerkt in e-Boekhouden" });
      closeDetail();
      fetchCustomers();
    } catch {
      toast({ title: "Fout", description: "Kon klant niet bijwerken", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Add customer
  const handleAddCustomer = async () => {
    if (!addForm.bedrijf && !addForm.contactpersoon) {
      toast({ title: "Vul bedrijfsnaam of contactpersoon in", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      await apiRequest("/eboekhouden/relaties", {
        method: "POST",
        body: JSON.stringify(addForm),
      });
      toast({ title: "Klant toegevoegd", description: "Succesvol aangemaakt in e-Boekhouden" });
      setShowAddDialog(false);
      setAddForm({ ...emptyCustomer });
      fetchCustomers();
    } catch {
      toast({ title: "Fout", description: "Kon klant niet toevoegen", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  // Import from quote
  const openImportDialog = async () => {
    setShowImportDialog(true);
    setLoadingQuotes(true);
    try {
      const data = await api.getQuotes();
      // Only show quotes with customer info
      setQuotes(data.filter((q) => q.customer_name || q.customer_email));
    } catch {
      toast({ title: "Fout", description: "Kon offertes niet laden", variant: "destructive" });
    } finally {
      setLoadingQuotes(false);
    }
  };

  const importFromQuote = (quote: QuoteRequest) => {
    setShowImportDialog(false);
    setAddForm({
      ...emptyCustomer,
      type: "P",
      bedrijf: "",
      contactpersoon: quote.customer_name || "",
      email: quote.customer_email || "",
      telefoon: quote.customer_phone || "",
    });
    setShowAddDialog(true);
  };

  // Detail view
  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={closeDetail}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Terug
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold">
              {selectedCustomer.bedrijf || selectedCustomer.contactpersoon || "Klant"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Code: {selectedCustomer.code} • {selectedCustomer.type === "B" ? "Bedrijf" : "Particulier"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Klantgegevens Wijzigen
            </CardTitle>
            <CardDescription>Wijzigingen worden opgeslagen in e-Boekhouden</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={editForm.type || "P"}
                  onValueChange={(v) => setEditForm({ ...editForm, type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B">Bedrijf</SelectItem>
                    <SelectItem value="P">Particulier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{editForm.type === "B" ? "Bedrijfsnaam" : "Naam"}</Label>
                <Input
                  value={editForm.bedrijf || ""}
                  onChange={(e) => setEditForm({ ...editForm, bedrijf: e.target.value })}
                />
              </div>
              <div>
                <Label>Contactpersoon</Label>
                <Input
                  value={editForm.contactpersoon || ""}
                  onChange={(e) => setEditForm({ ...editForm, contactpersoon: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefoon</Label>
                <Input
                  value={editForm.telefoon || ""}
                  onChange={(e) => setEditForm({ ...editForm, telefoon: e.target.value })}
                />
              </div>
              <div>
                <Label>Mobiel</Label>
                <Input
                  value={editForm.mobiel || ""}
                  onChange={(e) => setEditForm({ ...editForm, mobiel: e.target.value })}
                />
              </div>
              <div>
                <Label>Adres</Label>
                <Input
                  value={editForm.adres || ""}
                  onChange={(e) => setEditForm({ ...editForm, adres: e.target.value })}
                />
              </div>
              <div>
                <Label>Postcode</Label>
                <Input
                  value={editForm.postcode || ""}
                  onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })}
                />
              </div>
              <div>
                <Label>Plaats</Label>
                <Input
                  value={editForm.plaats || ""}
                  onChange={(e) => setEditForm({ ...editForm, plaats: e.target.value })}
                />
              </div>
              <div>
                <Label>IBAN</Label>
                <Input
                  value={editForm.iban || ""}
                  onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })}
                />
              </div>
              <div>
                <Label>BTW-nummer</Label>
                <Input
                  value={editForm.btwNummer || ""}
                  onChange={(e) => setEditForm({ ...editForm, btwNummer: e.target.value })}
                />
              </div>
              <div>
                <Label>KvK-nummer</Label>
                <Input
                  value={editForm.kvkNummer || ""}
                  onChange={(e) => setEditForm({ ...editForm, kvkNummer: e.target.value })}
                />
              </div>
              <div>
                <Label>Betalingstermijn (dagen)</Label>
                <Input
                  type="number"
                  value={editForm.betalingstermijn || 14}
                  onChange={(e) => setEditForm({ ...editForm, betalingstermijn: parseInt(e.target.value) || 14 })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Notities</Label>
                <Textarea
                  value={editForm.notities || ""}
                  onChange={(e) => setEditForm({ ...editForm, notities: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Opslaan in e-Boekhouden
              </Button>
              <Button variant="outline" onClick={closeDetail}>
                <X className="w-4 h-4 mr-2" /> Annuleren
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overview (default)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Relaties</h1>
          <p className="text-sm text-muted-foreground">Alle klanten — gesynchroniseerd met e-Boekhouden</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={openImportDialog}>
            <FileText className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Uit Offerte</span>
          </Button>
          <Button size="sm" onClick={() => { setAddForm({ ...emptyCustomer }); setShowAddDialog(true); }}>
            <UserPlus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Klant Toevoegen</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam, email, plaats of code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? "Geen resultaten gevonden" : "Geen klanten gevonden. Controleer de e-Boekhouden verbinding."}
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Naam</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
                      <th className="text-left p-3 font-medium hidden lg:table-cell">Plaats</th>
                      <th className="text-left p-3 font-medium hidden lg:table-cell">Type</th>
                      <th className="text-right p-3 font-medium">Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, MAX_DISPLAY).map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => openCustomer(customer)}
                      >
                        <td className="p-3 text-muted-foreground font-mono text-xs">{customer.code || "–"}</td>
                        <td className="p-3 font-medium">
                          {customer.bedrijf || customer.contactpersoon || "–"}
                          {customer.contactpersoon && customer.bedrijf && (
                            <span className="block text-xs text-muted-foreground">{customer.contactpersoon}</span>
                          )}
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">{customer.email || "–"}</td>
                        <td className="p-3 hidden lg:table-cell text-muted-foreground">{customer.plaats || "–"}</td>
                        <td className="p-3 hidden lg:table-cell">
                          <Badge variant="secondary" className="text-[10px]">
                            {customer.type === "B" ? "Bedrijf" : "Particulier"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openCustomer(customer); }}>
                            <UserCog className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length > MAX_DISPLAY && (
                <p className="text-xs text-muted-foreground p-3 bg-muted/30 text-center">
                  {filtered.length - MAX_DISPLAY} meer resultaten. Verfijn je zoekopdracht.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Klant Toevoegen
            </DialogTitle>
            <DialogDescription>Wordt aangemaakt in e-Boekhouden</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={addForm.type} onValueChange={(v) => setAddForm({ ...addForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="B">Bedrijf</SelectItem>
                  <SelectItem value="P">Particulier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{addForm.type === "B" ? "Bedrijfsnaam *" : "Naam *"}</Label>
              <Input value={addForm.bedrijf} onChange={(e) => setAddForm({ ...addForm, bedrijf: e.target.value })} />
            </div>
            <div>
              <Label>Contactpersoon</Label>
              <Input value={addForm.contactpersoon} onChange={(e) => setAddForm({ ...addForm, contactpersoon: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefoon</Label>
              <Input value={addForm.telefoon} onChange={(e) => setAddForm({ ...addForm, telefoon: e.target.value })} />
            </div>
            <div>
              <Label>Adres</Label>
              <Input value={addForm.adres} onChange={(e) => setAddForm({ ...addForm, adres: e.target.value })} />
            </div>
            <div>
              <Label>Postcode</Label>
              <Input value={addForm.postcode} onChange={(e) => setAddForm({ ...addForm, postcode: e.target.value })} />
            </div>
            <div>
              <Label>Plaats</Label>
              <Input value={addForm.plaats} onChange={(e) => setAddForm({ ...addForm, plaats: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annuleren</Button>
            <Button onClick={handleAddCustomer} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Quote Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Klant uit Offerte Importeren
            </DialogTitle>
            <DialogDescription>Selecteer een offerte om klantgegevens over te nemen</DialogDescription>
          </DialogHeader>
          {loadingQuotes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Geen offerteaanvragen met klantgegevens gevonden
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  onClick={() => importFromQuote(quote)}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{quote.customer_name || "Onbekend"}</p>
                    <p className="text-xs text-muted-foreground">
                      {quote.customer_email || "–"} • {quote.customer_phone || "–"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      #{quote.id} • {new Date(quote.created_at).toLocaleDateString("nl-NL")}
                      {quote.estimated_price && ` • €${Number(quote.estimated_price).toLocaleString()}`}
                    </p>
                  </div>
                  <UserPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomers;
