import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, UserCog, Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface Customer {
  Relatiecode: string;
  Bedrijf: string;
  Contactpersoon?: string;
  Email?: string;
  Telefoon?: string;
  Adres?: string;
  Postcode?: string;
  Plaats?: string;
}

interface AdminCustomersProps {
  section: "customers-overview" | "customers-add" | "customers-edit";
}

const AdminCustomers = ({ section }: AdminCustomersProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const activeTab = section === "customers-overview" ? "overview" 
    : section === "customers-add" ? "add" : "edit";

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getEboekhoudenRelaties();
      setCustomers(data || []);
    } catch {
      toast({ title: "Fout", description: "Kon klanten niet laden vanuit e-Boekhouden", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(c =>
    (c.Bedrijf || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.Contactpersoon || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.Email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Klantbeheer</h1>
        <p className="text-sm text-muted-foreground">Beheer je klanten via e-Boekhouden</p>
      </div>

      {activeTab === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5" />
              Klantoverzicht
            </CardTitle>
            <CardDescription>Alle relaties uit e-Boekhouden</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam, contactpersoon of email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vernieuwen"}
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
                        <th className="text-left p-3 font-medium">Bedrijf</th>
                        <th className="text-left p-3 font-medium">Contactpersoon</th>
                        <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
                        <th className="text-left p-3 font-medium hidden lg:table-cell">Plaats</th>
                        <th className="text-right p-3 font-medium">Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 50).map((customer) => (
                        <tr key={customer.Relatiecode} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">{customer.Bedrijf || "–"}</td>
                          <td className="p-3">{customer.Contactpersoon || "–"}</td>
                          <td className="p-3 hidden md:table-cell text-muted-foreground">{customer.Email || "–"}</td>
                          <td className="p-3 hidden lg:table-cell text-muted-foreground">{customer.Plaats || "–"}</td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCustomer(customer)}
                            >
                              <UserCog className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length > 50 && (
                  <p className="text-xs text-muted-foreground p-3 bg-muted/30 text-center">
                    {filtered.length - 50} meer resultaten. Verfijn je zoekopdracht.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "add" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="w-5 h-5" />
              Klant Toevoegen
            </CardTitle>
            <CardDescription>Zoek eerst in e-Boekhouden of voeg een nieuwe klant toe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek in e-Boekhouden..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {searchQuery && filtered.length > 0 && (
                <div className="border border-border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                  {filtered.slice(0, 10).map(c => (
                    <div key={c.Relatiecode} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer">
                      <div>
                        <p className="text-sm font-medium">{c.Bedrijf}</p>
                        <p className="text-xs text-muted-foreground">{c.Contactpersoon} • {c.Plaats}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{c.Relatiecode}</span>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && filtered.length === 0 && !loading && (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium mb-1">Niet gevonden in e-Boekhouden</p>
                  <p className="text-xs text-muted-foreground mb-3">Je kunt een nieuwe klant aanmaken</p>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-1" />
                    Nieuwe Klant
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "edit" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="w-5 h-5" />
              Klant Wijzigen
            </CardTitle>
            <CardDescription>Selecteer een klant om gegevens aan te passen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Zoek een klant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {selectedCustomer ? (
              <div className="space-y-4 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{selectedCustomer.Bedrijf}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>Sluiten</Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Bedrijfsnaam</label>
                    <Input defaultValue={selectedCustomer.Bedrijf} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Contactpersoon</label>
                    <Input defaultValue={selectedCustomer.Contactpersoon} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Email</label>
                    <Input defaultValue={selectedCustomer.Email} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Telefoon</label>
                    <Input defaultValue={selectedCustomer.Telefoon} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Adres</label>
                    <Input defaultValue={selectedCustomer.Adres} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Postcode</label>
                    <Input defaultValue={selectedCustomer.Postcode} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Plaats</label>
                    <Input defaultValue={selectedCustomer.Plaats} />
                  </div>
                </div>
                <Button className="w-full">Opslaan in e-Boekhouden</Button>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.slice(0, 20).map(c => (
                  <div
                    key={c.Relatiecode}
                    onClick={() => setSelectedCustomer(c)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer border border-transparent hover:border-border transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.Bedrijf}</p>
                      <p className="text-xs text-muted-foreground">{c.Contactpersoon} • {c.Email}</p>
                    </div>
                    <UserCog className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminCustomers;
