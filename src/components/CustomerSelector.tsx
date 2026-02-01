import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { 
  Plus, Search, Download, Users, RefreshCw, CheckCircle2, Building2, User, Pencil
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Customer, CreateCustomer, installationsApi } from "@/lib/installationsApi";

// e-Boekhouden relatie type
interface EBoekhoudenRelatie {
  id: string;
  code: string;
  type: string; // B = Bedrijf, P = Persoon
  bedrijf: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  mobiel: string;
  adres: string;
  postcode: string;
  plaats: string;
}

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomerId: number;
  onSelectCustomer: (customerId: number) => void;
  onCustomerCreated?: () => void;
}

export const CustomerSelector = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onCustomerCreated
}: CustomerSelectorProps) => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"existing" | "eboekhouden" | "new">("existing");
  
  // e-Boekhouden state
  const [eboekhoudenRelaties, setEboekhoudenRelaties] = useState<EBoekhoudenRelatie[]>([]);
  const [eboekhoudenLoading, setEboekhoudenLoading] = useState(false);
  const [eboekhoudenConnected, setEboekhoudenConnected] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  
  // New customer form
  const [customerType, setCustomerType] = useState<"B" | "P">("P"); // B = Bedrijf, P = Particulier
  const [customerForm, setCustomerForm] = useState<CreateCustomer>({
    contact_name: "",
    email: "",
    address_street: "",
    address_number: "",
    address_postal: "",
    address_city: "",
  });
  
  // Edit customer state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateCustomer>>({});
  const [editType, setEditType] = useState<"B" | "P">("P");

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Check e-Boekhouden connection on dialog open
  useEffect(() => {
    if (showDialog && eboekhoudenConnected === null) {
      checkEboekhoudenConnection();
    }
  }, [showDialog]);

  const checkEboekhoudenConnection = async () => {
    try {
      await apiRequest('/eboekhouden/test');
      setEboekhoudenConnected(true);
    } catch {
      setEboekhoudenConnected(false);
    }
  };

  const fetchEboekhoudenRelaties = async () => {
    setEboekhoudenLoading(true);
    try {
      const data = await apiRequest<EBoekhoudenRelatie[]>('/eboekhouden/relaties');
      setEboekhoudenRelaties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch relaties error:', error);
      toast({ title: "Fout bij ophalen e-Boekhouden klanten", variant: "destructive" });
    } finally {
      setEboekhoudenLoading(false);
    }
  };

  const importFromEboekhouden = async (relatie: EBoekhoudenRelatie) => {
    setImportingId(relatie.id);
    try {
      // Parse adres naar straat en nummer - probeer straatnaam en huisnummer te scheiden
      const adresParts = (relatie.adres || "").match(/^(.+?)\s+(\d+.*)$/) || ["", relatie.adres || "", ""];
      
      // Telefoon fallback: gebruik mobiel als telefoon leeg is, of andersom
      const phoneNumber = relatie.telefoon || relatie.mobiel || "";
      
      // Type B = bedrijf, Type P = particulier
      // De backend stuurt nu al correct:
      // - bedrijf: gevuld bij type B, leeg bij type P
      // - contactpersoon: bij type P is dit de naam, bij type B de contactpersoon
      const isBedrijf = relatie.type === 'B';
      
      let companyName = "";
      let contactName = "";
      
      if (isBedrijf) {
        // Bedrijf: bedrijfsnaam is verplicht, contactpersoon is optioneel
        companyName = relatie.bedrijf || "";
        contactName = relatie.contactpersoon || relatie.bedrijf || "Onbekend";
      } else {
        // Particulier: geen bedrijf, alleen contactnaam
        companyName = ""; // Expliciet leeg voor particulieren
        contactName = relatie.contactpersoon || relatie.bedrijf || "Onbekend";
      }
      
      const newCustomer: CreateCustomer = {
        company_name: companyName || undefined,
        contact_name: contactName,
        email: relatie.email || "",
        phone: phoneNumber || undefined,
        address_street: adresParts[1]?.trim() || "",
        address_number: adresParts[2]?.trim() || "",
        address_postal: relatie.postcode || "",
        address_city: relatie.plaats || "",
        notes: `Geïmporteerd uit e-Boekhouden (code: ${relatie.code}, type: ${isBedrijf ? 'Bedrijf' : 'Particulier'})`,
      };

      const result = await installationsApi.createCustomer(newCustomer);
      
      toast({ 
        title: "Klant geïmporteerd", 
        description: `${companyName || contactName} is toegevoegd` 
      });
      
      // Select the new customer
      onSelectCustomer(result.id);
      onCustomerCreated?.();
      setShowDialog(false);
    } catch (error) {
      console.error('Import error:', error);
      toast({ title: "Fout bij importeren", variant: "destructive" });
    } finally {
      setImportingId(null);
    }
  };

  const handleCreateCustomer = async () => {
    if (!customerForm.contact_name || !customerForm.email) {
      toast({ title: "Vul contactpersoon en e-mail in", variant: "destructive" });
      return;
    }
    
    // Voor bedrijven is bedrijfsnaam verplicht
    if (customerType === "B" && !customerForm.company_name) {
      toast({ title: "Vul bedrijfsnaam in", variant: "destructive" });
      return;
    }
    
    try {
      // Bij particulier, zorg dat company_name leeg is
      const formData = customerType === "P" 
        ? { ...customerForm, company_name: undefined }
        : customerForm;
      
      const result = await installationsApi.createCustomer(formData);
      toast({ title: "Klant aangemaakt" });
      onSelectCustomer(result.id);
      onCustomerCreated?.();
      setShowDialog(false);
      setCustomerType("P");
      setCustomerForm({
        contact_name: "",
        email: "",
        address_street: "",
        address_number: "",
        address_postal: "",
        address_city: "",
      });
    } catch {
      toast({ title: "Fout bij aanmaken klant", variant: "destructive" });
    }
  };

  const startEditCustomer = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setEditType(customer.company_name ? "B" : "P");
    setEditForm({
      company_name: customer.company_name || "",
      contact_name: customer.contact_name,
      email: customer.email,
      phone: customer.phone || "",
      address_street: customer.address_street,
      address_number: customer.address_number,
      address_postal: customer.address_postal,
      address_city: customer.address_city,
    });
  };

  const handleEditCustomer = async () => {
    if (!editingCustomer) return;
    
    try {
      const updateData = editType === "P" 
        ? { ...editForm, company_name: undefined }
        : editForm;
      
      await installationsApi.updateCustomer(editingCustomer.id, updateData);
      toast({ title: "Klant bijgewerkt" });
      setEditingCustomer(null);
      onCustomerCreated?.();
    } catch {
      toast({ title: "Fout bij bijwerken klant", variant: "destructive" });
    }
  };

  // Filter e-Boekhouden relaties
  const filteredRelaties = eboekhoudenRelaties.filter(r => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.bedrijf?.toLowerCase().includes(query) ||
      r.contactpersoon?.toLowerCase().includes(query) ||
      r.email?.toLowerCase().includes(query) ||
      r.plaats?.toLowerCase().includes(query) ||
      r.code?.toLowerCase().includes(query)
    );
  });

  // Check if relatie already exists as customer (by email)
  const isAlreadyImported = (relatie: EBoekhoudenRelatie) => {
    return customers.some(c => c.email === relatie.email);
  };

  return (
    <div>
      <Label className="text-sm font-medium">Klant*</Label>
      <div className="flex gap-2">
        <Select
          value={selectedCustomerId ? String(selectedCustomerId) : ""}
          onValueChange={(v) => onSelectCustomer(Number(v))}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecteer klant" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                <span className="flex items-center gap-2">
                  {c.company_name && <Building2 className="w-3 h-3" />}
                  {c.company_name || c.contact_name}
                  {c.company_name && <span className="text-muted-foreground text-xs">({c.contact_name})</span>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          type="button" 
          variant="outline" 
          size="icon"
          onClick={() => setShowDialog(true)}
          title="Klant toevoegen of importeren"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Klant Selecteren</DialogTitle>
            <DialogDescription>
              Kies een bestaande klant, importeer uit e-Boekhouden of maak een nieuwe aan
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="existing" className="gap-2">
                <Users className="w-4 h-4" />
                Bestaand ({customers.length})
              </TabsTrigger>
              <TabsTrigger value="eboekhouden" className="gap-2">
                <Download className="w-4 h-4" />
                e-Boekhouden
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-2">
                <Plus className="w-4 h-4" />
                Nieuw
              </TabsTrigger>
            </TabsList>

            {/* Bestaande klanten */}
            <TabsContent value="existing" className="mt-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {customers
                    .filter(c => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        c.contact_name?.toLowerCase().includes(q) ||
                        c.company_name?.toLowerCase().includes(q) ||
                        c.email?.toLowerCase().includes(q) ||
                        c.address_city?.toLowerCase().includes(q)
                      );
                    })
                    .map((customer) => {
                      const isBedrijf = !!customer.company_name;
                      return (
                        <div
                          key={customer.id}
                          className={`p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                            selectedCustomerId === customer.id ? 'border-primary bg-accent' : ''
                          }`}
                          onClick={() => {
                            onSelectCustomer(customer.id);
                            setShowDialog(false);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2 flex-wrap">
                                {isBedrijf ? (
                                  <Building2 className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <User className="w-4 h-4 text-green-600" />
                                )}
                                {customer.company_name || customer.contact_name}
                                <Badge variant={isBedrijf ? "default" : "secondary"} className="text-xs">
                                  {isBedrijf ? "Bedrijf" : "Particulier"}
                                </Badge>
                                {selectedCustomerId === customer.id && (
                                  <CheckCircle2 className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              {customer.company_name && (
                                <p className="text-sm text-muted-foreground ml-6">{customer.contact_name}</p>
                              )}
                              <p className="text-sm text-muted-foreground ml-6">
                                {customer.address_city} • {customer.email}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => startEditCustomer(customer, e)}
                              title="Klant bewerken"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  {customers.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      Nog geen klanten. Importeer uit e-Boekhouden of maak een nieuwe aan.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* e-Boekhouden import */}
            <TabsContent value="eboekhouden" className="mt-4">
              {eboekhoudenConnected === false ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    e-Boekhouden is niet verbonden. Configureer de API-token in de backend.
                  </p>
                  <Button variant="outline" onClick={checkEboekhoudenConnection}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Opnieuw proberen
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Zoeken in e-Boekhouden..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={fetchEboekhoudenRelaties}
                      disabled={eboekhoudenLoading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${eboekhoudenLoading ? 'animate-spin' : ''}`} />
                      Ophalen
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[300px]">
                    {eboekhoudenRelaties.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        Klik op "Ophalen" om klanten uit e-Boekhouden te laden
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredRelaties.map((relatie) => {
                          const alreadyImported = isAlreadyImported(relatie);
                          const isBedrijf = relatie.type === 'B';
                          return (
                            <div
                              key={relatie.id}
                              className={`p-3 border rounded-lg ${alreadyImported ? 'opacity-60' : ''}`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-medium flex items-center gap-2 flex-wrap">
                                    {isBedrijf ? (
                                      <Building2 className="w-4 h-4 text-blue-600" />
                                    ) : (
                                      <User className="w-4 h-4 text-green-600" />
                                    )}
                                    {relatie.bedrijf || relatie.contactpersoon}
                                    <Badge variant={isBedrijf ? "default" : "secondary"} className="text-xs">
                                      {isBedrijf ? "Bedrijf" : "Particulier"}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">{relatie.code}</Badge>
                                    {alreadyImported && (
                                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Geïmporteerd
                                      </Badge>
                                    )}
                                  </div>
                                  {isBedrijf && relatie.contactpersoon && (
                                    <p className="text-sm text-muted-foreground ml-6">{relatie.contactpersoon}</p>
                                  )}
                                  <p className="text-sm text-muted-foreground ml-6">
                                    {relatie.plaats} • {relatie.email}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant={alreadyImported ? "secondary" : "default"}
                                  onClick={() => {
                                    if (alreadyImported) {
                                      // Select the existing customer
                                      const existing = customers.find(c => c.email === relatie.email);
                                      if (existing) {
                                        onSelectCustomer(existing.id);
                                        setShowDialog(false);
                                      }
                                    } else {
                                      importFromEboekhouden(relatie);
                                    }
                                  }}
                                  disabled={importingId === relatie.id}
                                >
                                  {importingId === relatie.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : alreadyImported ? (
                                    "Selecteren"
                                  ) : (
                                    <>
                                      <Download className="w-4 h-4 mr-1" />
                                      Importeren
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </>
              )}
            </TabsContent>

            {/* Nieuwe klant */}
            <TabsContent value="new" className="mt-4">
              <div className="space-y-4">
                {/* Type selectie */}
                <div className="p-3 bg-muted/30 rounded-lg">
                  <Label className="mb-2 block">Type klant</Label>
                  <RadioGroup
                    value={customerType}
                    onValueChange={(v) => setCustomerType(v as "B" | "P")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="P" id="type-p" />
                      <Label htmlFor="type-p" className="flex items-center gap-2 cursor-pointer font-normal">
                        <User className="w-4 h-4" />
                        Particulier
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id="type-b" />
                      <Label htmlFor="type-b" className="flex items-center gap-2 cursor-pointer font-normal">
                        <Building2 className="w-4 h-4" />
                        Bedrijf
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Bedrijfsnaam - alleen voor bedrijven */}
                {customerType === "B" && (
                  <div>
                    <Label>Bedrijfsnaam*</Label>
                    <Input
                      value={customerForm.company_name || ""}
                      onChange={(e) => setCustomerForm({ ...customerForm, company_name: e.target.value })}
                      placeholder="Verplicht voor bedrijven"
                    />
                  </div>
                )}
                
                <div>
                  <Label>{customerType === "B" ? "Contactpersoon*" : "Naam*"}</Label>
                  <Input
                    value={customerForm.contact_name}
                    onChange={(e) => setCustomerForm({ ...customerForm, contact_name: e.target.value })}
                    placeholder={customerType === "B" ? "Contactpersoon bij bedrijf" : "Volledige naam"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>E-mail*</Label>
                    <Input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Telefoon</Label>
                    <Input
                      value={customerForm.phone || ""}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <Label>Straat*</Label>
                    <Input
                      value={customerForm.address_street}
                      onChange={(e) => setCustomerForm({ ...customerForm, address_street: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Nr*</Label>
                    <Input
                      value={customerForm.address_number}
                      onChange={(e) => setCustomerForm({ ...customerForm, address_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Postcode*</Label>
                    <Input
                      value={customerForm.address_postal}
                      onChange={(e) => setCustomerForm({ ...customerForm, address_postal: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Plaats*</Label>
                  <Input
                    value={customerForm.address_city}
                    onChange={(e) => setCustomerForm({ ...customerForm, address_city: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateCustomer} className="w-full">
                  Klant Aanmaken
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Klant Bewerken</DialogTitle>
            <DialogDescription>
              Pas de klantgegevens aan of wijzig het type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type selectie */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <Label className="mb-2 block">Type klant</Label>
              <RadioGroup
                value={editType}
                onValueChange={(v) => setEditType(v as "B" | "P")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="P" id="edit-type-p" />
                  <Label htmlFor="edit-type-p" className="flex items-center gap-2 cursor-pointer font-normal">
                    <User className="w-4 h-4 text-green-600" />
                    Particulier
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="B" id="edit-type-b" />
                  <Label htmlFor="edit-type-b" className="flex items-center gap-2 cursor-pointer font-normal">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Bedrijf
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Bedrijfsnaam - alleen voor bedrijven */}
            {editType === "B" && (
              <div>
                <Label>Bedrijfsnaam*</Label>
                <Input
                  value={editForm.company_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  placeholder="Verplicht voor bedrijven"
                />
              </div>
            )}
            
            <div>
              <Label>{editType === "B" ? "Contactpersoon*" : "Naam*"}</Label>
              <Input
                value={editForm.contact_name || ""}
                onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>E-mail*</Label>
                <Input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefoon</Label>
                <Input
                  value={editForm.phone || ""}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2">
                <Label>Straat</Label>
                <Input
                  value={editForm.address_street || ""}
                  onChange={(e) => setEditForm({ ...editForm, address_street: e.target.value })}
                />
              </div>
              <div>
                <Label>Nr</Label>
                <Input
                  value={editForm.address_number || ""}
                  onChange={(e) => setEditForm({ ...editForm, address_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Postcode</Label>
                <Input
                  value={editForm.address_postal || ""}
                  onChange={(e) => setEditForm({ ...editForm, address_postal: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Plaats</Label>
              <Input
                value={editForm.address_city || ""}
                onChange={(e) => setEditForm({ ...editForm, address_city: e.target.value })}
              />
            </div>
            <Button onClick={handleEditCustomer} className="w-full">
              Opslaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerSelector;
