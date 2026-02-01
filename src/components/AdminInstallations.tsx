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
  FileText, ClipboardList, Eye, Download, Building2, User, Printer,
  Ruler, Cylinder
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  Equipment,
  CreateEquipment,
  EquipmentType,
  RefrigerantCylinder,
  CreateRefrigerantCylinder,
  CylinderStatus,
} from "@/lib/installationsApi";
import { generateKenplaatPDF } from "@/lib/kenplaatPdfExport";
import { generateCommissioningPDF } from "@/lib/commissioningPdfExport";
import type { CommissioningData } from "@/lib/installationTypes";

const installationTypeLabels: Record<InstallationType, string> = {
  airco: "Airco",
  warmtepomp: "Warmtepomp",
  koeling: "Koeling",
  ventilatie: "Ventilatie",
  overig: "Overig",
};

const equipmentTypeLabels: Record<EquipmentType, string> = {
  manometer: "Manometer",
  vacuum_pump: "Vacuümpomp",
  leak_detector: "Lekdetector",
  refrigerant_scale: "Koudemiddelweegschaal",
  recovery_unit: "Recovery-unit",
  thermometer: "Thermometer",
  other: "Overig",
};

const cylinderStatusLabels: Record<CylinderStatus, string> = {
  vol: "Vol",
  in_gebruik: "In gebruik",
  bijna_leeg: "Bijna leeg",
  leeg: "Leeg",
  retour: "Retour",
};

const cylinderStatusColors: Record<CylinderStatus, string> = {
  vol: "bg-green-500",
  in_gebruik: "bg-blue-500",
  bijna_leeg: "bg-yellow-500",
  leeg: "bg-gray-500",
  retour: "bg-purple-500",
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
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [cylinders, setCylinders] = useState<RefrigerantCylinder[]>([]);
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
  const [deleteTechnicianId, setDeleteTechnicianId] = useState<number | null>(null);
  const [deleteEquipmentId, setDeleteEquipmentId] = useState<number | null>(null);
  const [deleteCylinderId, setDeleteCylinderId] = useState<number | null>(null);
  
  // Edit state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [editingCylinder, setEditingCylinder] = useState<RefrigerantCylinder | null>(null);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [showCylinderForm, setShowCylinderForm] = useState(false);
  const [customerType, setCustomerType] = useState<"B" | "P">("P");

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

  const [equipmentForm, setEquipmentForm] = useState<CreateEquipment>({
    equipment_type: "manometer",
    name: "",
    brand: "",
    serial_number: "",
  });

  const [cylinderForm, setCylinderForm] = useState<CreateRefrigerantCylinder>({
    refrigerant_type: "R32",
    refrigerant_gwp: REFRIGERANT_GWP["R32"],
    cylinder_size_kg: 9,
    current_weight_kg: 0,
    tare_weight_kg: 0,
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
      const [installationsData, customersData, techniciansData, faultsData, statsData, equipmentData, cylindersData] = await Promise.all([
        installationsApi.getInstallations().catch((e) => { console.error('Installations error:', e); return []; }),
        installationsApi.getCustomers().catch((e) => { console.error('Customers error:', e); return []; }),
        installationsApi.getTechnicians().catch((e) => { console.error('Technicians error:', e); return []; }),
        installationsApi.getAllFaultReports().catch((e) => { console.error('Faults error:', e); return []; }),
        installationsApi.getStats().catch((e) => { console.error('Stats error:', e); return null; }),
        installationsApi.getEquipment().catch((e) => { console.error('Equipment error:', e); return []; }),
        installationsApi.getCylinders().catch((e) => { console.error('Cylinders error:', e); return []; }),
      ]);
      setInstallations(Array.isArray(installationsData) ? installationsData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setTechnicians(Array.isArray(techniciansData) ? techniciansData : []);
      setFaultReports(Array.isArray(faultsData) ? faultsData : []);
      setStats(statsData);
      setEquipment(Array.isArray(equipmentData) ? equipmentData : []);
      setCylinders(Array.isArray(cylindersData) ? cylindersData : []);
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
      // Bij particulier, zorg dat company_name leeg is
      const formData = customerType === "P" 
        ? { ...customerForm, company_name: undefined }
        : customerForm;
      
      if (editingCustomer) {
        await installationsApi.updateCustomer(editingCustomer.id, formData);
        toast({ title: "Klant bijgewerkt" });
      } else {
        await installationsApi.createCustomer(formData);
        toast({ title: "Klant aangemaakt" });
      }
      setShowCustomerForm(false);
      setEditingCustomer(null);
      setCustomerType("P");
      setCustomerForm({ contact_name: "", email: "", address_street: "", address_number: "", address_postal: "", address_city: "" });
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: editingCustomer ? "Kon klant niet bijwerken" : "Kon klant niet aanmaken", variant: "destructive" });
    }
  };

  const handleSaveTechnician = async () => {
    try {
      if (editingTechnician) {
        await installationsApi.updateTechnician(editingTechnician.id, technicianForm);
        toast({ title: "Monteur bijgewerkt" });
      } else {
        await installationsApi.createTechnician(technicianForm);
        toast({ title: "Monteur aangemaakt" });
      }
      setShowTechnicianForm(false);
      setEditingTechnician(null);
      setTechnicianForm({ name: "" });
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: editingTechnician ? "Kon monteur niet bijwerken" : "Kon monteur niet aanmaken", variant: "destructive" });
    }
  };

  const handleDeleteTechnician = async () => {
    if (!deleteTechnicianId) return;
    try {
      await installationsApi.deleteTechnician(deleteTechnicianId);
      toast({ title: "Monteur verwijderd" });
      setDeleteTechnicianId(null);
      fetchData();
    } catch (err: any) {
      toast({ 
        title: "Fout", 
        description: err?.message || "Kon monteur niet verwijderen", 
        variant: "destructive" 
      });
    }
  };

  const handleSaveEquipment = async () => {
    try {
      if (editingEquipment) {
        await installationsApi.updateEquipment(editingEquipment.id, equipmentForm);
        toast({ title: "Gereedschap bijgewerkt" });
      } else {
        await installationsApi.createEquipment(equipmentForm);
        toast({ title: "Gereedschap aangemaakt" });
      }
      setShowEquipmentForm(false);
      setEditingEquipment(null);
      setEquipmentForm({ equipment_type: "manometer", name: "", brand: "", serial_number: "" });
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: editingEquipment ? "Kon gereedschap niet bijwerken" : "Kon gereedschap niet aanmaken", variant: "destructive" });
    }
  };

  const handleDeleteEquipment = async () => {
    if (!deleteEquipmentId) return;
    try {
      await installationsApi.deleteEquipment(deleteEquipmentId);
      toast({ title: "Gereedschap verwijderd" });
      setDeleteEquipmentId(null);
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: "Kon gereedschap niet verwijderen", variant: "destructive" });
    }
  };

  const handleSaveCylinder = async () => {
    try {
      if (editingCylinder) {
        await installationsApi.updateCylinder(editingCylinder.id, cylinderForm);
        toast({ title: "Cilinder bijgewerkt" });
      } else {
        await installationsApi.createCylinder(cylinderForm);
        toast({ title: "Cilinder aangemaakt" });
      }
      setShowCylinderForm(false);
      setEditingCylinder(null);
      setCylinderForm({ refrigerant_type: "R32", refrigerant_gwp: REFRIGERANT_GWP["R32"], cylinder_size_kg: 9, current_weight_kg: 0, tare_weight_kg: 0 });
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: editingCylinder ? "Kon cilinder niet bijwerken" : "Kon cilinder niet aanmaken", variant: "destructive" });
    }
  };

  const handleDeleteCylinder = async () => {
    if (!deleteCylinderId) return;
    try {
      await installationsApi.deleteCylinder(deleteCylinderId);
      toast({ title: "Cilinder verwijderd" });
      setDeleteCylinderId(null);
      fetchData();
    } catch (err) {
      toast({ title: "Fout", description: "Kon cilinder niet verwijderen", variant: "destructive" });
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

  const handleAircoWizardComplete = async (data: CreateInstallation & { brl_checklist: any; commissioning_data?: CommissioningData }) => {
    try {
      const { brl_checklist, commissioning_data, ...installationData } = data;
      // Store BRL checklist in notes for now
      const notes = `BRL 100 Checklist voltooid op ${new Date().toLocaleDateString('nl-NL')}`;
      const result = await installationsApi.createInstallation({ ...installationData, notes });
      
      // Generate PDF with correct QR code now that we have the installation qr_code
      if (commissioning_data && result.qr_code) {
        const fullCommissioningData = {
          ...commissioning_data,
          qr_code: result.qr_code,
          brand: installationData.brand,
          model_outdoor: installationData.model,
          serial_outdoor: installationData.serial_number || "",
          refrigerant_type: installationData.refrigerant_type || "R32",
          standard_charge: String(installationData.refrigerant_charge_kg || 0),
          commissioning_date: installationData.installation_date || new Date().toISOString().split("T")[0],
        };
        await generateCommissioningPDF(fullCommissioningData, installationData.name);
        toast({ title: "Installatie succesvol aangemaakt", description: "BRL 100 rapport met QR-code gedownload" });
      } else {
        toast({ title: "Installatie succesvol aangemaakt", description: "BRL 100 checklist voltooid" });
      }
      
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
          <TabsTrigger value="equipment" className="text-xs sm:text-sm">
            <Ruler className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Gereedschap</span> ({equipment?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="cylinders" className="text-xs sm:text-sm">
            <Cylinder className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Cilinders</span> ({cylinders?.length ?? 0})
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
                                setCustomerType(customer.company_name ? "B" : "P");
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
              <Button onClick={() => {
                setEditingTechnician(null);
                setTechnicianForm({ name: "" });
                setShowTechnicianForm(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Monteur
              </Button>
            </CardHeader>
            <CardContent>
              {technicians.length === 0 ? (
                <p className="text-muted-foreground">Nog geen monteurs</p>
              ) : (
                <div className="space-y-4">
                  {technicians.map((tech) => {
                    const techInstallations = installations.filter(i => i.installed_by_technician_id === tech.id);
                    return (
                      <div key={tech.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{tech.name}</h4>
                            {tech.email && <p className="text-sm text-muted-foreground">{tech.email}</p>}
                            {tech.phone && <p className="text-sm text-muted-foreground">{tech.phone}</p>}
                            <div className="flex flex-wrap gap-4 mt-2">
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
                                  {tech.brl_certificate_expires && (
                                    <span className="text-muted-foreground"> (geldig t/m {new Date(tech.brl_certificate_expires).toLocaleDateString('nl-NL')})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={tech.is_active ? "default" : "secondary"}>
                              {tech.is_active ? "Actief" : "Inactief"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTechnician(tech);
                                setTechnicianForm({
                                  name: tech.name,
                                  email: tech.email || "",
                                  phone: tech.phone || "",
                                  fgas_certificate_number: tech.fgas_certificate_number || "",
                                  fgas_certificate_expires: tech.fgas_certificate_expires || "",
                                  brl_certificate_number: tech.brl_certificate_number || "",
                                  brl_certificate_expires: tech.brl_certificate_expires || "",
                                });
                                setShowTechnicianForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteTechnicianId(tech.id)}
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              disabled={techInstallations.length > 0}
                              title={techInstallations.length > 0 ? "Verwijder eerst alle installaties van deze monteur" : "Monteur verwijderen"}
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

        {/* Equipment Tab */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gereedschap</CardTitle>
                <CardDescription>BRL 100 verplicht gereedschap met kalibratie gegevens</CardDescription>
              </div>
              <Button onClick={() => {
                setEditingEquipment(null);
                setEquipmentForm({ equipment_type: "manometer", name: "", brand: "", serial_number: "" });
                setShowEquipmentForm(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nieuw Gereedschap
              </Button>
            </CardHeader>
            <CardContent>
              {equipment.length === 0 ? (
                <p className="text-muted-foreground">Nog geen gereedschap geregistreerd</p>
              ) : (
                <div className="space-y-4">
                  {equipment.map((item) => {
                    const isCalibrationExpired = item.calibration_valid_until && new Date(item.calibration_valid_until) < new Date();
                    const isCalibrationSoon = item.calibration_valid_until && !isCalibrationExpired && 
                      new Date(item.calibration_valid_until) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    return (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{equipmentTypeLabels[item.equipment_type]}</Badge>
                              <h4 className="font-semibold">{item.name}</h4>
                              {isCalibrationExpired && (
                                <Badge variant="destructive">Kalibratie verlopen</Badge>
                              )}
                              {isCalibrationSoon && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Kalibratie binnenkort</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{item.brand} • Serienr: {item.serial_number}</p>
                            {item.calibration_date && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Gekalibreerd: {new Date(item.calibration_date).toLocaleDateString('nl-NL')}
                                {item.calibration_valid_until && (
                                  <> • Geldig t/m: {new Date(item.calibration_valid_until).toLocaleDateString('nl-NL')}</>
                                )}
                              </p>
                            )}
                            {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                              {item.is_active ? "Actief" : "Inactief"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingEquipment(item);
                                setEquipmentForm({
                                  equipment_type: item.equipment_type,
                                  name: item.name,
                                  brand: item.brand,
                                  serial_number: item.serial_number,
                                  calibration_date: item.calibration_date || "",
                                  calibration_valid_until: item.calibration_valid_until || "",
                                  notes: item.notes || "",
                                });
                                setShowEquipmentForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteEquipmentId(item.id)}
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
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

        {/* Cylinders Tab */}
        <TabsContent value="cylinders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Koelmiddel Cilinders</CardTitle>
                <CardDescription>Voorraad- en verbruiksbeheer van koudemiddelen</CardDescription>
              </div>
              <Button onClick={() => {
                setEditingCylinder(null);
                setCylinderForm({ refrigerant_type: "R32", refrigerant_gwp: REFRIGERANT_GWP["R32"], cylinder_size_kg: 9, current_weight_kg: 0, tare_weight_kg: 0 });
                setShowCylinderForm(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Cilinder
              </Button>
            </CardHeader>
            <CardContent>
              {cylinders.length === 0 ? (
                <p className="text-muted-foreground">Nog geen cilinders geregistreerd</p>
              ) : (
                <div className="space-y-4">
                  {cylinders.map((cyl) => {
                    const contentKg = cyl.current_weight_kg - cyl.tare_weight_kg;
                    const fillPercentage = cyl.cylinder_size_kg > 0 ? Math.round((contentKg / cyl.cylinder_size_kg) * 100) : 0;
                    const isExpired = cyl.expiry_date && new Date(cyl.expiry_date) < new Date();
                    return (
                      <div key={cyl.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`${cylinderStatusColors[cyl.status]} text-white`}>{cylinderStatusLabels[cyl.status]}</Badge>
                              <h4 className="font-semibold">{cyl.refrigerant_type}</h4>
                              <span className="text-sm text-muted-foreground">({cyl.cylinder_size_kg} kg cilinder)</span>
                              {isExpired && (
                                <Badge variant="destructive">Verlopen</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mt-2">
                              <div>
                                <span className="text-muted-foreground">Inhoud:</span>{" "}
                                <span className="font-medium">{contentKg.toFixed(2)} kg ({fillPercentage}%)</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">GWP:</span>{" "}
                                <span className="font-medium">{cyl.refrigerant_gwp}</span>
                              </div>
                              {cyl.batch_number && (
                                <div>
                                  <span className="text-muted-foreground">Batch:</span>{" "}
                                  <span className="font-medium">{cyl.batch_number}</span>
                                </div>
                              )}
                              {cyl.supplier && (
                                <div>
                                  <span className="text-muted-foreground">Leverancier:</span>{" "}
                                  <span className="font-medium">{cyl.supplier}</span>
                                </div>
                              )}
                            </div>
                            {cyl.location && (
                              <p className="text-xs text-muted-foreground mt-1">📍 {cyl.location}</p>
                            )}
                            {/* Progress bar for fill level */}
                            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${fillPercentage > 50 ? 'bg-green-500' : fillPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCylinder(cyl);
                                setCylinderForm({
                                  refrigerant_type: cyl.refrigerant_type,
                                  refrigerant_gwp: cyl.refrigerant_gwp,
                                  cylinder_size_kg: cyl.cylinder_size_kg,
                                  current_weight_kg: cyl.current_weight_kg,
                                  tare_weight_kg: cyl.tare_weight_kg,
                                  batch_number: cyl.batch_number || "",
                                  supplier: cyl.supplier || "",
                                  purchase_date: cyl.purchase_date || "",
                                  expiry_date: cyl.expiry_date || "",
                                  location: cyl.location || "",
                                  status: cyl.status,
                                  notes: cyl.notes || "",
                                });
                                setShowCylinderForm(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteCylinderId(cyl.id)}
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
            <DialogDescription>{editingCustomer ? "Pas de klantgegevens aan of wijzig het type" : "Voeg een nieuwe klant toe"}</DialogDescription>
          </DialogHeader>
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
                  <RadioGroupItem value="P" id="cust-type-p" />
                  <Label htmlFor="cust-type-p" className="flex items-center gap-2 cursor-pointer font-normal">
                    <User className="w-4 h-4 text-green-600" />
                    Particulier
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="B" id="cust-type-b" />
                  <Label htmlFor="cust-type-b" className="flex items-center gap-2 cursor-pointer font-normal">
                    <Building2 className="w-4 h-4 text-blue-600" />
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
            <Button onClick={handleSaveCustomer} className="w-full">{editingCustomer ? "Wijzigingen Opslaan" : "Klant Aanmaken"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Technician Form Dialog */}
      <Dialog open={showTechnicianForm} onOpenChange={(open) => {
        setShowTechnicianForm(open);
        if (!open) {
          setEditingTechnician(null);
          setTechnicianForm({ name: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTechnician ? "Monteur Bewerken" : "Nieuwe Monteur"}</DialogTitle>
            <DialogDescription>{editingTechnician ? "Wijzig de monteur gegevens" : "Voeg een nieuwe monteur toe"}</DialogDescription>
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
            <Button onClick={handleSaveTechnician} className="w-full">
              {editingTechnician ? "Wijzigingen Opslaan" : "Monteur Aanmaken"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Equipment Form Dialog */}
      <Dialog open={showEquipmentForm} onOpenChange={(open) => {
        setShowEquipmentForm(open);
        if (!open) {
          setEditingEquipment(null);
          setEquipmentForm({ equipment_type: "manometer", name: "", brand: "", serial_number: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEquipment ? "Gereedschap Bewerken" : "Nieuw Gereedschap"}</DialogTitle>
            <DialogDescription>BRL 100 verplicht gereedschap met kalibratie gegevens</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type*</label>
              <Select
                value={equipmentForm.equipment_type}
                onValueChange={(v) => setEquipmentForm({ ...equipmentForm, equipment_type: v as EquipmentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(equipmentTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Naam*</label>
              <Input
                value={equipmentForm.name}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                placeholder="bijv. Testo 550s"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Merk*</label>
                <Input
                  value={equipmentForm.brand}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, brand: e.target.value })}
                  placeholder="bijv. Testo"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Serienummer*</label>
                <Input
                  value={equipmentForm.serial_number}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, serial_number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Kalibratiedatum</label>
                <Input
                  type="date"
                  value={equipmentForm.calibration_date || ""}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, calibration_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Geldig t/m</label>
                <Input
                  type="date"
                  value={equipmentForm.calibration_valid_until || ""}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, calibration_valid_until: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Opmerkingen</label>
              <Textarea
                value={equipmentForm.notes || ""}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, notes: e.target.value })}
                placeholder="Eventuele opmerkingen"
                rows={2}
              />
            </div>
            <Button onClick={handleSaveEquipment} className="w-full">
              {editingEquipment ? "Wijzigingen Opslaan" : "Gereedschap Aanmaken"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cylinder Form Dialog */}
      <Dialog open={showCylinderForm} onOpenChange={setShowCylinderForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCylinder ? "Cilinder Bewerken" : "Nieuwe Cilinder"}</DialogTitle>
            <DialogDescription>Registreer koudemiddel voorraad voor BRL 100 administratie</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Koudemiddel*</label>
                <Select
                  value={cylinderForm.refrigerant_type}
                  onValueChange={(v) => setCylinderForm({ 
                    ...cylinderForm, 
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
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={cylinderForm.status || "vol"}
                  onValueChange={(v) => setCylinderForm({ ...cylinderForm, status: v as CylinderStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(cylinderStatusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Cilinder grootte (kg)*</label>
                <Input
                  type="number"
                  step="0.1"
                  value={cylinderForm.cylinder_size_kg}
                  onChange={(e) => setCylinderForm({ ...cylinderForm, cylinder_size_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Huidig gewicht (kg)*</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cylinderForm.current_weight_kg}
                  onChange={(e) => setCylinderForm({ ...cylinderForm, current_weight_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Leeggewicht (kg)*</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cylinderForm.tare_weight_kg}
                  onChange={(e) => setCylinderForm({ ...cylinderForm, tare_weight_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            {cylinderForm.current_weight_kg > 0 && cylinderForm.tare_weight_kg > 0 && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <strong>Berekende inhoud:</strong> {(cylinderForm.current_weight_kg - cylinderForm.tare_weight_kg).toFixed(2)} kg koudemiddel
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Batchnummer</label>
                <Input
                  value={cylinderForm.batch_number || ""}
                  onChange={(e) => setCylinderForm({ ...cylinderForm, batch_number: e.target.value })}
                  placeholder="bijv. BATCH-2025-001"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Leverancier</label>
                <Input
                  value={cylinderForm.supplier || ""}
                  onChange={(e) => setCylinderForm({ ...cylinderForm, supplier: e.target.value })}
                  placeholder="bijv. Koelgas Nederland"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Aankoopdatum</label>
                <Input
                  type="date"
                  value={cylinderForm.purchase_date || ""}
                  onChange={(e) => setCylinderForm({ ...cylinderForm, purchase_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Vervaldatum</label>
                <Input
                  type="date"
                  value={cylinderForm.expiry_date || ""}
                  onChange={(e) => setCylinderForm({ ...cylinderForm, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Opslaglocatie</label>
              <Input
                value={cylinderForm.location || ""}
                onChange={(e) => setCylinderForm({ ...cylinderForm, location: e.target.value })}
                placeholder="bijv. Bus, Magazijn schap 3"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Opmerkingen</label>
              <Textarea
                value={cylinderForm.notes || ""}
                onChange={(e) => setCylinderForm({ ...cylinderForm, notes: e.target.value })}
                placeholder="Eventuele opmerkingen"
                rows={2}
              />
            </div>
            <Button onClick={handleSaveCylinder} className="w-full">
              {editingCylinder ? "Wijzigingen Opslaan" : "Cilinder Aanmaken"}
            </Button>
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
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = getQRCodeUrl(selectedInstallation.qr_code);
                    link.download = `QR-${selectedInstallation.name}.png`;
                    link.click();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
                <Button
                  onClick={() => generateKenplaatPDF(selectedInstallation, window.location.origin)}
                  className="flex-1"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Kenplaat
                </Button>
              </div>
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
          <DialogHeader className="sr-only">
            <DialogTitle>BRL 100 Inbedrijfstelling</DialogTitle>
            <DialogDescription>Wizard voor het inbedrijfstellen van een airco installatie</DialogDescription>
          </DialogHeader>
          <AircoInstallationWizard
            customers={customers}
            technicians={technicians}
            equipment={equipment}
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

      {/* Delete Technician Confirmation */}
      <AlertDialog open={deleteTechnicianId !== null} onOpenChange={(open) => !open && setDeleteTechnicianId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Monteur verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze monteur wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTechnician} className="bg-destructive hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Equipment Confirmation */}
      <AlertDialog open={deleteEquipmentId !== null} onOpenChange={(open) => !open && setDeleteEquipmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gereedschap verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je dit gereedschap wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEquipment} className="bg-destructive hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Cylinder Confirmation */}
      <AlertDialog open={deleteCylinderId !== null} onOpenChange={(open) => !open && setDeleteCylinderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cilinder verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze cilinder wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCylinder} className="bg-destructive hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminInstallations;
