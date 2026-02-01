import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, Trash2, Edit, QrCode, Wrench, AlertTriangle, 
  Users, UserCog, Search, X, Thermometer, Calendar, MapPin,
  FileText, ClipboardList, Eye, Download
} from "lucide-react";
import { AircoInstallationWizard } from "./AircoInstallationWizard";
import { CustomerSelector } from "./CustomerSelector";
import {
  installationsApi,
  Installation,
  Customer,
  Technician,
  FaultReport,
  CreateInstallation,
  CreateCustomer,
  CreateTechnician,
  InstallationStats,
  REFRIGERANT_GWP,
  REFRIGERANT_OPTIONS,
  InstallationType,
  FGasLog,
  CreateFGasLog,
  FGasActivityType,
} from "@/lib/installationsApi";

const installationTypeLabels: Record<InstallationType, string> = {
  airco: "Airco",
  warmtepomp: "Warmtepomp",
  koeling: "Koeling",
  ventilatie: "Ventilatie",
  overig: "Overig",
};

const statusColors: Record<string, string> = {
  actief: "bg-green-500",
  onderhoud_nodig: "bg-yellow-500",
  storing: "bg-red-500",
  buiten_gebruik: "bg-gray-500",
  verwijderd: "bg-gray-300",
};

const faultUrgencyColors: Record<string, string> = {
  laag: "bg-blue-500",
  normaal: "bg-green-500",
  hoog: "bg-orange-500",
  spoed: "bg-red-500",
};

const AdminInstallations = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("installations");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [faultReports, setFaultReports] = useState<FaultReport[]>([]);
  const [stats, setStats] = useState<InstallationStats>({
    totalInstallations: 0,
    maintenanceDue: 0,
    leakCheckDue: 0,
    openFaults: 0,
    totalCO2Equivalent: 0
  });

  // Dialogs
  const [showInstallationForm, setShowInstallationForm] = useState(false);
  const [showAircoWizard, setShowAircoWizard] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showTechnicianForm, setShowTechnicianForm] = useState(false);
  const [showFGasForm, setShowFGasForm] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
  const [fgasLogs, setFgasLogs] = useState<FGasLog[]>([]);
  
  // Delete confirmations
  const [deleteInstallationId, setDeleteInstallationId] = useState<number | null>(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState<number | null>(null);
  
  // Edit state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Forms
  const [installationForm, setInstallationForm] = useState<CreateInstallation>({
    customer_id: 0,
    name: "",
    installation_type: "airco",
    brand: "",
    model: "",
    refrigerant_type: "R32",
    refrigerant_gwp: REFRIGERANT_GWP["R32"],
    refrigerant_charge_kg: 0,
    installation_date: new Date().toISOString().split("T")[0],
  });

  const [customerForm, setCustomerForm] = useState<CreateCustomer>({
    contact_name: "",
    email: "",
    address_street: "",
    address_number: "",
    address_postal: "",
    address_city: "",
  });

  const [technicianForm, setTechnicianForm] = useState<CreateTechnician>({
    name: "",
  });

  const [fgasForm, setFgasForm] = useState<CreateFGasLog>({
    technician_id: 0,
    activity_type: "lekcontrole",
    refrigerant_type: "R32",
    refrigerant_gwp: REFRIGERANT_GWP["R32"],
    performed_at: new Date().toISOString().split("T")[0],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [installationsData, customersData, techniciansData, faultsData, statsData] = await Promise.all([
        installationsApi.getInstallations().catch((e) => { console.error('Installations error:', e); return []; }),
        installationsApi.getCustomers().catch((e) => { console.error('Customers error:', e); return []; }),
        installationsApi.getTechnicians().catch((e) => { console.error('Technicians error:', e); return []; }),
        installationsApi.getAllFaultReports().catch((e) => { console.error('Faults error:', e); return []; }),
        installationsApi.getStats().catch((e) => { console.error('Stats error:', e); return null; }),
      ]);
      setInstallations(Array.isArray(installationsData) ? installationsData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setTechnicians(Array.isArray(techniciansData) ? techniciansData : []);
      setFaultReports(Array.isArray(faultsData) ? faultsData : []);
      setStats(statsData);
    } catch (err) {
      console.error('FetchData error:', err);
      toast({ title: "Fout", description: "Kon gegevens niet laden", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter logic
  const filteredInstallations = (installations ?? []).filter((inst) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      inst.name?.toLowerCase().includes(query) ||
      inst.brand?.toLowerCase().includes(query) ||
      inst.model?.toLowerCase().includes(query) ||
      inst.customer_name?.toLowerCase().includes(query) ||
      inst.customer_city?.toLowerCase().includes(query)
    );
  });

  // Handlers
  const handleCreateInstallation = async () => {
    try {
      await installationsApi.createInstallation(installationForm);
      toast({ title: "Installatie aangemaakt" });
      setShowInstallationForm(false);
      setInstallationForm({
        customer_id: 0,
        name: "",
        installation_type: "airco",
        brand: "",
        model: "",
        refrigerant_type: "R32",
        refrigerant_gwp: REFRIGERANT_GWP["R32"],
        refrigerant_charge_kg: 0,
        installation_date: new Date().toISOString().split("T")[0],
      });
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: "Kon installatie niet aanmaken", variant: "destructive" });
    }
  };

  const handleSaveCustomer = async () => {
    try {
      if (editingCustomer) {
        await installationsApi.updateCustomer(editingCustomer.id, customerForm);
        toast({ title: "Klant bijgewerkt" });
      } else {
        await installationsApi.createCustomer(customerForm);
        toast({ title: "Klant aangemaakt" });
      }
      setShowCustomerForm(false);
      setEditingCustomer(null);
      setCustomerForm({ contact_name: "", email: "", address_street: "", address_number: "", address_postal: "", address_city: "" });
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: editingCustomer ? "Kon klant niet bijwerken" : "Kon klant niet aanmaken", variant: "destructive" });
    }
  };

  const handleCreateTechnician = async () => {
    try {
      await installationsApi.createTechnician(technicianForm);
      toast({ title: "Monteur aangemaakt" });
      setShowTechnicianForm(false);
      setTechnicianForm({ name: "" });
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: "Kon monteur niet aanmaken", variant: "destructive" });
    }
  };

  const handleShowQR = (installation: Installation) => {
    setSelectedInstallation(installation);
    setShowQRDialog(true);
  };

  const handleShowFGas = async (installation: Installation) => {
    setSelectedInstallation(installation);
    try {
      const logs = await installationsApi.getFGasLogs(installation.id);
      setFgasLogs(logs);
      setFgasForm({
        technician_id: technicians[0]?.id || 0,
        activity_type: "lekcontrole",
        refrigerant_type: installation.refrigerant_type,
        refrigerant_gwp: installation.refrigerant_gwp,
        performed_at: new Date().toISOString().split("T")[0],
      });
      setShowFGasForm(true);
    } catch (err) {
      toast({ title: "Fout", description: "Kon F-gas logs niet laden", variant: "destructive" });
    }
  };

  const handleCreateFGasLog = async () => {
    if (!selectedInstallation) return;
    try {
      await installationsApi.createFGasLog(selectedInstallation.id, fgasForm);
      toast({ title: "F-gas registratie toegevoegd" });
      const logs = await installationsApi.getFGasLogs(selectedInstallation.id);
      setFgasLogs(logs);
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: "Kon F-gas log niet aanmaken", variant: "destructive" });
    }
  };

  const handleUpdateFaultStatus = async (id: number, status: string) => {
    try {
      await installationsApi.updateFaultReport(id, { status: status as any });
      toast({ title: "Status bijgewerkt" });
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: "Kon status niet bijwerken", variant: "destructive" });
    }
  };

  const getQRCodeUrl = (qrCode: string) => {
    const baseUrl = window.location.origin;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${baseUrl}/installatie/${qrCode}`)}`;
  };

  const handleDeleteInstallation = async () => {
    if (!deleteInstallationId) return;
    try {
      await installationsApi.deleteInstallation(deleteInstallationId);
      toast({ title: "Installatie verwijderd" });
      setDeleteInstallationId(null);
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: "Kon installatie niet verwijderen", variant: "destructive" });
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerId) return;
    try {
      await installationsApi.deleteCustomer(deleteCustomerId);
      toast({ title: "Klant verwijderd" });
      setDeleteCustomerId(null);
      fetchData();
    } catch (err: any) {
      toast({ 
        title: "Fout", 
        description: err?.message || "Kon klant niet verwijderen", 
        variant: "destructive" 
      });
    }
  };

  const handleAircoWizardComplete = async (data: CreateInstallation & { brl_checklist: any }) => {
    try {
      const { brl_checklist, ...installationData } = data;
      // Store BRL checklist in notes for now
      const notes = `BRL 100 Checklist voltooid op ${new Date().toLocaleDateString('nl-NL')}`;
      await installationsApi.createInstallation({ ...installationData, notes });
      toast({ title: "Installatie succesvol aangemaakt", description: "BRL 100 checklist voltooid" });
      setShowAircoWizard(false);
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: "Kon installatie niet aanmaken", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Thermometer className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalInstallations ?? 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Installaties</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-bold">{stats.maintenanceDue ?? 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Onderhoud</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-bold">{stats.leakCheckDue ?? 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Lekcontrole</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-bold">{stats.openFaults ?? 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Storingen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-bold">{Number(stats.totalCO2Equivalent || 0).toFixed(1)}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Ton CO₂-eq</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="installations" className="text-xs sm:text-sm">
            <Thermometer className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Installaties</span> ({installations?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="faults" className="text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Storingen</span> ({(faultReports ?? []).filter(f => f.status !== 'opgelost' && f.status !== 'gesloten').length})
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs sm:text-sm">
            <Users className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Klanten</span> ({customers?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="technicians" className="text-xs sm:text-sm">
            <UserCog className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Monteurs</span> ({technicians?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Installations Tab */}
        <TabsContent value="installations">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Installaties</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Beheer alle geregistreerde installaties</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowInstallationForm(true)}>
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Snel</span>
                  </Button>
                  <Button size="sm" onClick={() => setShowAircoWizard(true)}>
                    <ClipboardList className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">BRL 100 Wizard</span>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Laden...</p>
              ) : filteredInstallations.length === 0 ? (
                <p className="text-muted-foreground">Geen installaties gevonden</p>
              ) : (
                <div className="space-y-3">
                  {filteredInstallations.map((inst) => (
                    <div key={inst.id} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                            <h4 className="font-semibold text-sm sm:text-base truncate">{inst.name}</h4>
                            <Badge className={`${statusColors[inst.status]} text-xs`}>{inst.status}</Badge>
                            <Badge variant="outline" className="text-xs">{installationTypeLabels[inst.installation_type]}</Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                            {inst.brand} {inst.model} • {inst.refrigerant_type} ({inst.refrigerant_charge_kg} kg)
                          </p>
                          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {inst.customer_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {inst.customer_city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(inst.installation_date).toLocaleDateString('nl-NL')}
                            </span>
                          </div>
                          {Number(inst.co2_equivalent || 0) >= 5 && (
                            <p className="text-xs text-orange-600 mt-2">
                              ⚠️ {Number(inst.co2_equivalent || 0).toFixed(2)} ton CO₂-eq - Lekcontrole verplicht
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 mt-2 sm:mt-0">
                          <Button variant="outline" size="sm" onClick={() => handleShowQR(inst)}>
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleShowFGas(inst)}>
                            <ClipboardList className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setDeleteInstallationId(inst.id)}
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Faults Tab */}
        <TabsContent value="faults">
          <Card>
            <CardHeader>
              <CardTitle>Storingen</CardTitle>
              <CardDescription>Alle storingsmeldingen via QR scan</CardDescription>
            </CardHeader>
            <CardContent>
              {faultReports.length === 0 ? (
                <p className="text-muted-foreground">Geen storingen gemeld</p>
              ) : (
                <div className="space-y-4">
                  {faultReports.map((fault) => (
                    <div key={fault.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={faultUrgencyColors[fault.urgency]}>{fault.urgency}</Badge>
                            <Badge variant="outline">{fault.status}</Badge>
                          </div>
                          <h4 className="font-semibold">{fault.installation_name}</h4>
                          <p className="text-sm text-muted-foreground">{fault.brand} {fault.model}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(fault.created_at).toLocaleDateString('nl-NL')}
                        </p>
                      </div>
                      <p className="text-sm mb-2">{fault.description}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                        <span>Melder: {fault.reporter_name}</span>
                        {fault.reporter_phone && <span>Tel: {fault.reporter_phone}</span>}
                      </div>
                      <Select
                        value={fault.status}
                        onValueChange={(v) => handleUpdateFaultStatus(fault.id, v)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nieuw">Nieuw</SelectItem>
                          <SelectItem value="in_behandeling">In behandeling</SelectItem>
                          <SelectItem value="gepland">Gepland</SelectItem>
                          <SelectItem value="opgelost">Opgelost</SelectItem>
                          <SelectItem value="gesloten">Gesloten</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Klanten</CardTitle>
                <CardDescription>Beheer klantgegevens - importeer uit e-Boekhouden of voeg handmatig toe</CardDescription>
              </div>
              <div className="flex gap-2">
                <CustomerSelector
                  customers={customers}
                  selectedCustomerId={0}
                  onSelectCustomer={() => {}}
                  onCustomerCreated={fetchData}
                />
              </div>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <p className="text-muted-foreground">Nog geen klanten</p>
              ) : (
                <div className="space-y-4">
                  {customers.map((customer) => {
                    const customerInstallationsList = installations.filter(i => i.customer_id === customer.id);
                    return (
                      <div key={customer.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">
                                {customer.company_name || customer.contact_name}
                              </h4>
                              {customer.company_name && (
                                <span className="text-sm text-muted-foreground">({customer.contact_name})</span>
                              )}
                            </div>
                            <p className="text-sm">{customer.address_street} {customer.address_number}</p>
                            <p className="text-sm">{customer.address_postal} {customer.address_city}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                              <span>{customer.email}</span>
                              {customer.phone && <span>• {customer.phone}</span>}
                            </div>
                            
                            {/* Installaties dropdown */}
                            {customerInstallationsList.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <details className="group">
                                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-primary hover:underline">
                                    <Thermometer className="w-4 h-4" />
                                    {customerInstallationsList.length} installatie{customerInstallationsList.length !== 1 ? 's' : ''}
                                  </summary>
                                  <div className="mt-2 space-y-2 pl-6">
                                    {customerInstallationsList.map((inst) => (
                                      <div key={inst.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                        <div>
                                          <span className="font-medium">{inst.name}</span>
                                          <span className="text-muted-foreground ml-2">
                                            {inst.brand} {inst.model}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className={`${statusColors[inst.status]} text-white text-xs`}>
                                            {inst.status}
                                          </Badge>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleShowQR(inst)}
                                          >
                                            <QrCode className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                          <div className="flex items-start gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCustomer(customer);
                                setCustomerForm({
                                  company_name: customer.company_name || "",
                                  contact_name: customer.contact_name,
                                  email: customer.email,
                                  phone: customer.phone || "",
                                  address_street: customer.address_street,
                                  address_number: customer.address_number,
                                  address_postal: customer.address_postal,
                                  address_city: customer.address_city,
                                  notes: customer.notes || "",
                                });
                                setShowCustomerForm(true);
                              }}
                              title="Klant bewerken"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteCustomerId(customer.id)}
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              disabled={customerInstallationsList.length > 0}
                              title={customerInstallationsList.length > 0 ? "Verwijder eerst alle installaties van deze klant" : "Klant verwijderen"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technicians Tab */}
        <TabsContent value="technicians">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Monteurs</CardTitle>
                <CardDescription>Beheer monteurs en certificeringen</CardDescription>
              </div>
              <Button onClick={() => setShowTechnicianForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Monteur
              </Button>
            </CardHeader>
            <CardContent>
              {technicians.length === 0 ? (
                <p className="text-muted-foreground">Nog geen monteurs</p>
              ) : (
                <div className="space-y-4">
                  {technicians.map((tech) => (
                    <div key={tech.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{tech.name}</h4>
                          {tech.email && <p className="text-sm text-muted-foreground">{tech.email}</p>}
                          <div className="flex gap-4 mt-2">
                            {tech.fgas_certificate_number && (
                              <div className="text-sm">
                                <span className="font-medium">F-gas:</span> {tech.fgas_certificate_number}
                                {tech.fgas_certificate_expires && (
                                  <span className="text-muted-foreground"> (geldig t/m {new Date(tech.fgas_certificate_expires).toLocaleDateString('nl-NL')})</span>
                                )}
                              </div>
                            )}
                            {tech.brl_certificate_number && (
                              <div className="text-sm">
                                <span className="font-medium">BRL:</span> {tech.brl_certificate_number}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={tech.is_active ? "default" : "secondary"}>
                          {tech.is_active ? "Actief" : "Inactief"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Installation Form Dialog */}
      <Dialog open={showInstallationForm} onOpenChange={setShowInstallationForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuwe Installatie</DialogTitle>
            <DialogDescription>Registreer een nieuwe klimaatinstallatie</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <CustomerSelector
                  customers={customers}
                  selectedCustomerId={installationForm.customer_id}
                  onSelectCustomer={(id) => setInstallationForm({ ...installationForm, customer_id: id })}
                  onCustomerCreated={fetchData}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Type*</label>
                <Select
                  value={installationForm.installation_type}
                  onValueChange={(v) => setInstallationForm({ ...installationForm, installation_type: v as InstallationType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(installationTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Naam installatie*</label>
              <Input
                value={installationForm.name}
                onChange={(e) => setInstallationForm({ ...installationForm, name: e.target.value })}
                placeholder="bijv. Woonkamer hoofdunit"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Locatie omschrijving</label>
              <Input
                value={installationForm.location_description || ""}
                onChange={(e) => setInstallationForm({ ...installationForm, location_description: e.target.value })}
                placeholder="bijv. Links naast de meterkast"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Merk*</label>
                <Input
                  value={installationForm.brand}
                  onChange={(e) => setInstallationForm({ ...installationForm, brand: e.target.value })}
                  placeholder="bijv. Daikin"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Model*</label>
                <Input
                  value={installationForm.model}
                  onChange={(e) => setInstallationForm({ ...installationForm, model: e.target.value })}
                  placeholder="bijv. Perfera FTXM25"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Serienummer</label>
              <Input
                value={installationForm.serial_number || ""}
                onChange={(e) => setInstallationForm({ ...installationForm, serial_number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Koudemiddel*</label>
                <Select
                  value={installationForm.refrigerant_type}
                  onValueChange={(v) => setInstallationForm({ 
                    ...installationForm, 
                    refrigerant_type: v,
                    refrigerant_gwp: REFRIGERANT_GWP[v] || 0
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRIGERANT_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r} (GWP: {REFRIGERANT_GWP[r]})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Vulling (kg)*</label>
                <Input
                  type="number"
                  step="0.001"
                  value={installationForm.refrigerant_charge_kg}
                  onChange={(e) => setInstallationForm({ ...installationForm, refrigerant_charge_kg: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">CO₂-eq (ton)</label>
                <Input
                  disabled
                  value={(installationForm.refrigerant_charge_kg * installationForm.refrigerant_gwp / 1000).toFixed(3)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Installatiedatum*</label>
                <Input
                  type="date"
                  value={installationForm.installation_date}
                  onChange={(e) => setInstallationForm({ ...installationForm, installation_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Monteur</label>
                <Select
                  value={String(installationForm.installed_by_technician_id || "")}
                  onValueChange={(v) => setInstallationForm({ ...installationForm, installed_by_technician_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer monteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notities</label>
              <Textarea
                value={installationForm.notes || ""}
                onChange={(e) => setInstallationForm({ ...installationForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <Button onClick={handleCreateInstallation} className="w-full">Installatie Aanmaken</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Form Dialog */}
      <Dialog open={showCustomerForm} onOpenChange={(open) => {
        setShowCustomerForm(open);
        if (!open) {
          setEditingCustomer(null);
          setCustomerForm({ contact_name: "", email: "", address_street: "", address_number: "", address_postal: "", address_city: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Klant Bewerken" : "Nieuwe Klant"}</DialogTitle>
            <DialogDescription>{editingCustomer ? "Wijzig de klantgegevens" : "Voeg een nieuwe klant toe"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Bedrijfsnaam</label>
              <Input
                value={customerForm.company_name || ""}
                onChange={(e) => setCustomerForm({ ...customerForm, company_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contactpersoon*</label>
              <Input
                value={customerForm.contact_name}
                onChange={(e) => setCustomerForm({ ...customerForm, contact_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">E-mail*</label>
                <Input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefoon</label>
                <Input
                  value={customerForm.phone || ""}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-2">
                <label className="text-sm font-medium">Straat*</label>
                <Input
                  value={customerForm.address_street}
                  onChange={(e) => setCustomerForm({ ...customerForm, address_street: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nr*</label>
                <Input
                  value={customerForm.address_number}
                  onChange={(e) => setCustomerForm({ ...customerForm, address_number: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Postcode*</label>
                <Input
                  value={customerForm.address_postal}
                  onChange={(e) => setCustomerForm({ ...customerForm, address_postal: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Plaats*</label>
              <Input
                value={customerForm.address_city}
                onChange={(e) => setCustomerForm({ ...customerForm, address_city: e.target.value })}
              />
            </div>
            <Button onClick={handleSaveCustomer} className="w-full">{editingCustomer ? "Wijzigingen Opslaan" : "Klant Aanmaken"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Technician Form Dialog */}
      <Dialog open={showTechnicianForm} onOpenChange={setShowTechnicianForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Monteur</DialogTitle>
            <DialogDescription>Voeg een nieuwe monteur toe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Naam*</label>
              <Input
                value={technicianForm.name}
                onChange={(e) => setTechnicianForm({ ...technicianForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  value={technicianForm.email || ""}
                  onChange={(e) => setTechnicianForm({ ...technicianForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefoon</label>
                <Input
                  value={technicianForm.phone || ""}
                  onChange={(e) => setTechnicianForm({ ...technicianForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">F-gas certificaatnr</label>
                <Input
                  value={technicianForm.fgas_certificate_number || ""}
                  onChange={(e) => setTechnicianForm({ ...technicianForm, fgas_certificate_number: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">F-gas geldig t/m</label>
                <Input
                  type="date"
                  value={technicianForm.fgas_certificate_expires || ""}
                  onChange={(e) => setTechnicianForm({ ...technicianForm, fgas_certificate_expires: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">BRL certificaatnr</label>
                <Input
                  value={technicianForm.brl_certificate_number || ""}
                  onChange={(e) => setTechnicianForm({ ...technicianForm, brl_certificate_number: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">BRL geldig t/m</label>
                <Input
                  type="date"
                  value={technicianForm.brl_certificate_expires || ""}
                  onChange={(e) => setTechnicianForm({ ...technicianForm, brl_certificate_expires: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleCreateTechnician} className="w-full">Monteur Opslaan</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>{selectedInstallation?.name}</DialogDescription>
          </DialogHeader>
          {selectedInstallation && (
            <div className="text-center space-y-4">
              <img
                src={getQRCodeUrl(selectedInstallation.qr_code)}
                alt="QR Code"
                className="mx-auto border rounded-lg"
              />
              <p className="text-sm text-muted-foreground">
                Scan deze QR code om installatie-info te bekijken of een storing te melden.
              </p>
              <div className="text-xs text-muted-foreground break-all">
                {window.location.origin}/installatie/{selectedInstallation.qr_code}
              </div>
              <Button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = getQRCodeUrl(selectedInstallation.qr_code);
                  link.download = `QR-${selectedInstallation.name}.png`;
                  link.click();
                }}
                className="w-full"
              >
                Download QR Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* F-Gas Log Dialog */}
      <Dialog open={showFGasForm} onOpenChange={setShowFGasForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>F-Gas Logboek</DialogTitle>
            <DialogDescription>{selectedInstallation?.name} - {selectedInstallation?.refrigerant_type}</DialogDescription>
          </DialogHeader>
          
          {/* Log History */}
          <div className="border rounded-lg p-4 mb-4 max-h-60 overflow-y-auto">
            <h4 className="font-medium mb-2">Registratie historie</h4>
            {fgasLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen registraties</p>
            ) : (
              <div className="space-y-2">
                {fgasLogs.map((log) => (
                  <div key={log.id} className="text-sm border-b pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{log.activity_type}</span>
                      <span className="text-muted-foreground">{new Date(log.performed_at).toLocaleDateString('nl-NL')}</span>
                    </div>
                    <p className="text-muted-foreground">
                      {log.technician_name} • 
                      {log.quantity_kg && ` ${log.is_addition ? '+' : '-'}${log.quantity_kg} kg`}
                      {log.leak_detected !== null && ` • Lek: ${log.leak_detected ? 'Ja' : 'Nee'}`}
                    </p>
                    {log.notes && <p className="text-xs">{log.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Log Form */}
          <div className="space-y-4">
            <h4 className="font-medium">Nieuwe registratie</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type activiteit*</label>
                <Select
                  value={fgasForm.activity_type}
                  onValueChange={(v) => setFgasForm({ ...fgasForm, activity_type: v as FGasActivityType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lekcontrole">Lekcontrole</SelectItem>
                    <SelectItem value="bijvullen">Bijvullen</SelectItem>
                    <SelectItem value="terugwinnen">Terugwinnen</SelectItem>
                    <SelectItem value="onderhoud">Onderhoud</SelectItem>
                    <SelectItem value="reparatie">Reparatie</SelectItem>
                    <SelectItem value="verwijdering">Verwijdering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Monteur*</label>
                <Select
                  value={String(fgasForm.technician_id)}
                  onValueChange={(v) => setFgasForm({ ...fgasForm, technician_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Datum*</label>
                <Input
                  type="date"
                  value={fgasForm.performed_at}
                  onChange={(e) => setFgasForm({ ...fgasForm, performed_at: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Hoeveelheid (kg)</label>
                <Input
                  type="number"
                  step="0.001"
                  value={fgasForm.quantity_kg || ""}
                  onChange={(e) => setFgasForm({ ...fgasForm, quantity_kg: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Richting</label>
                <Select
                  value={fgasForm.is_addition ? "add" : "remove"}
                  onValueChange={(v) => setFgasForm({ ...fgasForm, is_addition: v === "add" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Toegevoegd</SelectItem>
                    <SelectItem value="remove">Teruggewonnen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {fgasForm.activity_type === 'lekcontrole' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Lek gedetecteerd?</label>
                  <Select
                    value={fgasForm.leak_detected === true ? "yes" : fgasForm.leak_detected === false ? "no" : ""}
                    onValueChange={(v) => setFgasForm({ ...fgasForm, leak_detected: v === "yes" ? true : v === "no" ? false : undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">Nee</SelectItem>
                      <SelectItem value="yes">Ja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {fgasForm.leak_detected && (
                  <div>
                    <label className="text-sm font-medium">Locatie lek</label>
                    <Input
                      value={fgasForm.leak_location || ""}
                      onChange={(e) => setFgasForm({ ...fgasForm, leak_location: e.target.value })}
                    />
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Resultaat</label>
              <Select
                value={fgasForm.result || "goed"}
                onValueChange={(v) => setFgasForm({ ...fgasForm, result: v as 'goed' | 'aandacht' | 'kritiek' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="goed">Goed</SelectItem>
                  <SelectItem value="aandacht">Aandacht nodig</SelectItem>
                  <SelectItem value="kritiek">Kritiek</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notities</label>
              <Textarea
                value={fgasForm.notes || ""}
                onChange={(e) => setFgasForm({ ...fgasForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <Button onClick={handleCreateFGasLog} className="w-full">Registratie Toevoegen</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* BRL 100 Airco Installation Wizard */}
      <Dialog open={showAircoWizard} onOpenChange={setShowAircoWizard}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <AircoInstallationWizard
            customers={customers}
            technicians={technicians}
            onComplete={handleAircoWizardComplete}
            onCancel={() => setShowAircoWizard(false)}
            onCustomerCreated={fetchData}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Installation Confirmation */}
      <AlertDialog open={deleteInstallationId !== null} onOpenChange={(open) => !open && setDeleteInstallationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Installatie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze installatie wilt verwijderen? Alle bijbehorende F-gas logs, onderhoudsrecords en storingen worden ook verwijderd. Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInstallation} className="bg-destructive hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Customer Confirmation */}
      <AlertDialog open={deleteCustomerId !== null} onOpenChange={(open) => !open && setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Klant verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze klant wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminInstallations;
