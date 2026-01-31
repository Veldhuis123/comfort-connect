import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle2, Circle, ChevronRight, ChevronLeft, 
  ClipboardCheck, Thermometer, Wrench, FileCheck, 
  AlertTriangle, QrCode, FileText, Settings
} from "lucide-react";
import {
  Customer,
  Technician,
  CreateInstallation,
  REFRIGERANT_GWP,
  REFRIGERANT_OPTIONS,
  InstallationType,
} from "@/lib/installationsApi";
import { generateCommissioningPDF } from "@/lib/commissioningPdfExport";
import {
  type ToolRegistration,
  type CommissioningData,
  type BRLChecklist,
  defaultTools,
  defaultCommissioningData,
  defaultChecklist,
} from "@/lib/installationTypes";

// Re-export types for backwards compatibility
export type { ToolRegistration, CommissioningData, BRLChecklist };

interface AircoInstallationWizardProps {
  customers: Customer[];
  technicians: Technician[];
  onComplete: (data: CreateInstallation & { brl_checklist: BRLChecklist; commissioning_data: CommissioningData }) => void;
  onCancel: () => void;
}

const steps = [
  { id: 1, title: "Voorbereiding", icon: ClipboardCheck },
  { id: 2, title: "Gereedschap", icon: Settings },
  { id: 3, title: "Materiaal", icon: Wrench },
  { id: 4, title: "Buitenunit", icon: Thermometer },
  { id: 5, title: "Binnenunit", icon: Thermometer },
  { id: 6, title: "Leidingwerk", icon: Wrench },
  { id: 7, title: "Vacuüm & Vullen", icon: Thermometer },
  { id: 8, title: "Oplevering", icon: FileCheck },
];

const installationTypeLabels: Record<InstallationType, string> = {
  airco: "Airco",
  warmtepomp: "Warmtepomp",
  koeling: "Koeling",
  ventilatie: "Ventilatie",
  overig: "Overig",
};

export const AircoInstallationWizard = ({
  customers,
  technicians,
  onComplete,
  onCancel,
}: AircoInstallationWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [checklist, setChecklist] = useState<BRLChecklist>(defaultChecklist);
  const [commissioningData, setCommissioningData] = useState<CommissioningData>(defaultCommissioningData);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [generatedQrCode, setGeneratedQrCode] = useState<string | null>(null);
  
  const [installationData, setInstallationData] = useState<CreateInstallation>({
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

  const updateChecklist = (key: keyof BRLChecklist, value: boolean | string) => {
    setChecklist((prev) => ({ ...prev, [key]: value }));
  };

  const updateCommissioning = (key: keyof CommissioningData, value: string | boolean | ToolRegistration) => {
    setCommissioningData((prev) => ({ ...prev, [key]: value }));
  };

  const updateTools = (key: keyof ToolRegistration, value: string) => {
    setCommissioningData((prev) => ({
      ...prev,
      tools: { ...prev.tools, [key]: value },
    }));
  };

  // Synchroniseer klant/monteur data
  const syncCustomerData = (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setCommissioningData((prev) => ({
        ...prev,
        customer_name: customer.company_name || "",
        customer_contact: customer.contact_name,
        customer_address: `${customer.address_street || ""} ${customer.address_number || ""}`.trim(),
        customer_postal: customer.address_postal || "",
        customer_city: customer.address_city || "",
        customer_phone: customer.phone || "",
      }));
    }
    setInstallationData((prev) => ({ ...prev, customer_id: customerId }));
  };

  const syncTechnicianData = (technicianId: number) => {
    const technician = technicians.find((t) => t.id === technicianId);
    if (technician) {
      setCommissioningData((prev) => ({
        ...prev,
        technician_name: technician.name,
        technician_certificate: technician.fgas_certificate_number || "",
      }));
    }
    setInstallationData((prev) => ({ ...prev, installed_by_technician_id: technicianId }));
  };

  const getStepCompletion = (step: number): number => {
    const stepChecks: Record<number, (keyof BRLChecklist)[]> = {
      1: ["customer_informed", "location_inspected", "electrical_capacity_checked", "condensate_drain_planned"],
      2: [], // Gereedschap - geen checklist items, alleen data entry
      3: ["equipment_checked", "refrigerant_verified", "tools_calibrated", "safety_equipment_present"],
      4: ["outdoor_location_suitable", "outdoor_mounted_level", "outdoor_clearance_ok", "outdoor_vibration_dampened"],
      5: ["indoor_location_suitable", "indoor_mounted_level", "indoor_airflow_ok", "condensate_connected"],
      6: ["pipes_insulated", "pipes_protected", "pipes_leak_tested", "electrical_connected"],
      7: ["vacuum_achieved", "vacuum_held", "refrigerant_charged", "charge_recorded"],
      8: ["cooling_tested", "heating_tested", "controls_explained", "documentation_handed"],
    };
    
    // Voor stap 2 (gereedschap), check of minstens 1 gereedschap is ingevuld
    if (step === 2) {
      const tools = commissioningData.tools;
      const hasTools = tools.manometer_serial || tools.vacuum_pump_serial || tools.leak_detector_serial;
      return hasTools ? 100 : 0;
    }
    
    const checks = stepChecks[step] || [];
    const completed = checks.filter((key) => checklist[key] === true).length;
    return checks.length > 0 ? Math.round((completed / checks.length) * 100) : 0;
  };

  const isStepComplete = (step: number): boolean => getStepCompletion(step) === 100;

  const canComplete = (): boolean => {
    if (!installationData.customer_id || !installationData.name || 
        !installationData.brand || !installationData.model ||
        !installationData.refrigerant_charge_kg || !installationData.installed_by_technician_id) {
      return false;
    }
    return steps.every((_, i) => isStepComplete(i + 1));
  };

  const handleGeneratePDF = async () => {
    // Combineer alle data
    const fullCommissioningData: CommissioningData = {
      ...commissioningData,
      brand: installationData.brand,
      model_outdoor: installationData.model,
      serial_outdoor: installationData.serial_number || "",
      refrigerant_type: installationData.refrigerant_type || "R32",
      standard_charge: String(installationData.refrigerant_charge_kg || 0),
      commissioning_date: installationData.installation_date || new Date().toISOString().split("T")[0],
    };

    const { qrCodeDataUrl } = await generateCommissioningPDF(fullCommissioningData, installationData.name);
    setGeneratedQrCode(qrCodeDataUrl);
    setShowPdfPreview(true);
  };

  const handleComplete = () => {
    onComplete({ 
      ...installationData, 
      brl_checklist: checklist,
      commissioning_data: commissioningData
    });
  };

  const CheckItem = ({ 
    label, 
    checked, 
    onChange,
    description 
  }: { 
    label: string; 
    checked: boolean; 
    onChange: (checked: boolean) => void;
    description?: string;
  }) => (
    <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <Checkbox
        id={label}
        checked={checked}
        onCheckedChange={onChange}
        className="mt-0.5"
      />
      <div className="flex-1">
        <label htmlFor={label} className="text-sm font-medium cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {checked ? (
        <CheckCircle2 className="w-5 h-5 text-green-500" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">BRL 100 Inbedrijfstelling Airconditioning</h2>
          <p className="text-sm text-muted-foreground">Conform certificeringsrichtlijn BRL 100/200</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          Stap {currentStep} / {steps.length}
        </Badge>
      </div>

      {/* Step Indicators */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {steps.map((step) => {
          const completion = getStepCompletion(step.id);
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isComplete = completion === 100;
          
          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex-1 min-w-[90px] p-2 rounded-lg border-2 transition-all ${
                isActive 
                  ? "border-primary bg-primary/10" 
                  : isComplete 
                    ? "border-green-500 bg-green-50" 
                    : "border-muted hover:border-primary/50"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Icon className={`w-5 h-5 ${isComplete ? "text-green-500" : isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-medium truncate">{step.title}</span>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${isComplete ? "bg-green-500" : "bg-primary"}`}
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const Icon = steps[currentStep - 1].icon;
              return <Icon className="w-5 h-5" />;
            })()}
            {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Controleer voorbereidende werkzaamheden en vul basisgegevens in"}
            {currentStep === 2 && "Registreer gebruikte gereedschap met serienummers en kalibratiedata"}
            {currentStep === 3 && "Controleer materiaal en apparatuur"}
            {currentStep === 4 && "Installeer en controleer buitenunit"}
            {currentStep === 5 && "Installeer en controleer binnenunit(s)"}
            {currentStep === 6 && "Leg leidingwerk aan en test"}
            {currentStep === 7 && "Vacuümtrekken, druktest en koudemiddel vullen"}
            {currentStep === 8 && "Test systeem, meet waarden en lever op aan klant"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Voorbereiding + Basisgegevens */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <Label>Werkbonnummer</Label>
                    <Input
                      value={commissioningData.werkbon_number}
                      onChange={(e) => updateCommissioning("werkbon_number", e.target.value)}
                      placeholder="WB-2026-001"
                    />
                  </div>
                  <div>
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={commissioningData.date}
                      onChange={(e) => updateCommissioning("date", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Klant*</Label>
                  <Select
                    value={String(installationData.customer_id || "")}
                    onValueChange={(v) => syncCustomerData(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer klant" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.contact_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Uitvoerend monteur*</Label>
                  <Select
                    value={String(installationData.installed_by_technician_id || "")}
                    onValueChange={(v) => syncTechnicianData(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer monteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.filter(t => t.is_active).map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name} {t.fgas_certificate_number && `(F-gas: ${t.fgas_certificate_number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Naam installatie*</Label>
                  <Input
                    value={installationData.name}
                    onChange={(e) => setInstallationData({ ...installationData, name: e.target.value })}
                    placeholder="bijv. Woonkamer split-unit"
                  />
                </div>
                <div>
                  <Label>Inbedrijfstellingsdatum*</Label>
                  <Input
                    type="date"
                    value={installationData.installation_date}
                    onChange={(e) => {
                      setInstallationData({ ...installationData, installation_date: e.target.value });
                      updateCommissioning("commissioning_date", e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Checklist Voorbereiding</h4>
                <CheckItem
                  label="Klant geïnformeerd over werkzaamheden"
                  description="Klant is op de hoogte van planning, duur en eventuele overlast"
                  checked={checklist.customer_informed}
                  onChange={(v) => updateChecklist("customer_informed", v)}
                />
                <CheckItem
                  label="Installatielocatie geïnspecteerd"
                  description="Binnen- en buitenlocatie beoordeeld op geschiktheid"
                  checked={checklist.location_inspected}
                  onChange={(v) => updateChecklist("location_inspected", v)}
                />
                <CheckItem
                  label="Elektrische capaciteit gecontroleerd"
                  description="Voldoende aansluitvermogen beschikbaar, eventueel nieuwe groep"
                  checked={checklist.electrical_capacity_checked}
                  onChange={(v) => updateChecklist("electrical_capacity_checked", v)}
                />
                <CheckItem
                  label="Condensafvoer gepland"
                  description="Route voor condensafvoer bepaald (riool, buitenmuur, pomp)"
                  checked={checklist.condensate_drain_planned}
                  onChange={(v) => updateChecklist("condensate_drain_planned", v)}
                />
              </div>

              <div>
                <Label>Opmerkingen voorbereiding</Label>
                <Textarea
                  value={checklist.notes_step1}
                  onChange={(e) => updateChecklist("notes_step1", e.target.value)}
                  placeholder="Bijzonderheden, afspraken met klant, etc."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Gereedschap registratie */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>BRL 100 Vereiste:</strong> Registreer het gebruikte meetgereedschap met serienummers en kalibratiedata voor traceerbaarheid.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Manometerset</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label>Merk/Type</Label>
                    <Input
                      value={commissioningData.tools.manometer_brand}
                      onChange={(e) => updateTools("manometer_brand", e.target.value)}
                      placeholder="bijv. Testo 557"
                    />
                  </div>
                  <div>
                    <Label>Serienummer*</Label>
                    <Input
                      value={commissioningData.tools.manometer_serial}
                      onChange={(e) => updateTools("manometer_serial", e.target.value)}
                      placeholder="SN-12345678"
                    />
                  </div>
                  <div>
                    <Label>Kalibratiedatum</Label>
                    <Input
                      type="date"
                      value={commissioningData.tools.manometer_calibration_date}
                      onChange={(e) => updateTools("manometer_calibration_date", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Vacuümpomp</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label>Merk/Type</Label>
                    <Input
                      value={commissioningData.tools.vacuum_pump_brand}
                      onChange={(e) => updateTools("vacuum_pump_brand", e.target.value)}
                      placeholder="bijv. Rothenberger Roairvac"
                    />
                  </div>
                  <div>
                    <Label>Serienummer</Label>
                    <Input
                      value={commissioningData.tools.vacuum_pump_serial}
                      onChange={(e) => updateTools("vacuum_pump_serial", e.target.value)}
                      placeholder="SN-12345678"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Elektronische Lekdetector</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label>Merk/Type</Label>
                    <Input
                      value={commissioningData.tools.leak_detector_brand}
                      onChange={(e) => updateTools("leak_detector_brand", e.target.value)}
                      placeholder="bijv. Inficon TEK-Mate"
                    />
                  </div>
                  <div>
                    <Label>Serienummer</Label>
                    <Input
                      value={commissioningData.tools.leak_detector_serial}
                      onChange={(e) => updateTools("leak_detector_serial", e.target.value)}
                      placeholder="SN-12345678"
                    />
                  </div>
                  <div>
                    <Label>Kalibratiedatum</Label>
                    <Input
                      type="date"
                      value={commissioningData.tools.leak_detector_calibration_date}
                      onChange={(e) => updateTools("leak_detector_calibration_date", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Koudemiddelweegschaal</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label>Merk/Type</Label>
                    <Input
                      value={commissioningData.tools.refrigerant_scale_brand}
                      onChange={(e) => updateTools("refrigerant_scale_brand", e.target.value)}
                      placeholder="bijv. CPS CC220"
                    />
                  </div>
                  <div>
                    <Label>Serienummer</Label>
                    <Input
                      value={commissioningData.tools.refrigerant_scale_serial}
                      onChange={(e) => updateTools("refrigerant_scale_serial", e.target.value)}
                      placeholder="SN-12345678"
                    />
                  </div>
                  <div>
                    <Label>Kalibratiedatum</Label>
                    <Input
                      type="date"
                      value={commissioningData.tools.refrigerant_scale_calibration_date}
                      onChange={(e) => updateTools("refrigerant_scale_calibration_date", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Koudemiddel Terugwinunit (optioneel)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label>Merk/Type</Label>
                    <Input
                      value={commissioningData.tools.recovery_unit_brand}
                      onChange={(e) => updateTools("recovery_unit_brand", e.target.value)}
                      placeholder="bijv. Mastercool 69100"
                    />
                  </div>
                  <div>
                    <Label>Serienummer</Label>
                    <Input
                      value={commissioningData.tools.recovery_unit_serial}
                      onChange={(e) => updateTools("recovery_unit_serial", e.target.value)}
                      placeholder="SN-12345678"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Materiaal */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label>Merk*</Label>
                  <Input
                    value={installationData.brand}
                    onChange={(e) => {
                      setInstallationData({ ...installationData, brand: e.target.value });
                      updateCommissioning("brand", e.target.value);
                    }}
                    placeholder="bijv. Daikin"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={installationData.installation_type}
                    onValueChange={(v) => setInstallationData({ ...installationData, installation_type: v as InstallationType })}
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

              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className="font-medium">Buitenunit</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Modelnummer buitenunit*</Label>
                    <Input
                      value={commissioningData.model_outdoor || installationData.model}
                      onChange={(e) => {
                        setInstallationData({ ...installationData, model: e.target.value });
                        updateCommissioning("model_outdoor", e.target.value);
                      }}
                      placeholder="bijv. RXM25N"
                    />
                  </div>
                  <div>
                    <Label>Serienummer buitenunit</Label>
                    <Input
                      value={commissioningData.serial_outdoor || installationData.serial_number || ""}
                      onChange={(e) => {
                        setInstallationData({ ...installationData, serial_number: e.target.value });
                        updateCommissioning("serial_outdoor", e.target.value);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className="font-medium">Binnenunit 1</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Modelnummer binnenunit*</Label>
                    <Input
                      value={commissioningData.model_indoor}
                      onChange={(e) => updateCommissioning("model_indoor", e.target.value)}
                      placeholder="bijv. FTXM25R"
                    />
                  </div>
                  <div>
                    <Label>Serienummer binnenunit</Label>
                    <Input
                      value={commissioningData.serial_indoor}
                      onChange={(e) => updateCommissioning("serial_indoor", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className="font-medium text-muted-foreground">Indien multisplit: Binnenunit 2</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Modelnummer binnenunit 2</Label>
                    <Input
                      value={commissioningData.model_indoor_2}
                      onChange={(e) => updateCommissioning("model_indoor_2", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Serienummer binnenunit 2</Label>
                    <Input
                      value={commissioningData.serial_indoor_2}
                      onChange={(e) => updateCommissioning("serial_indoor_2", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className="font-medium text-muted-foreground">Indien multisplit: Binnenunit 3</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Modelnummer binnenunit 3</Label>
                    <Input
                      value={commissioningData.model_indoor_3}
                      onChange={(e) => updateCommissioning("model_indoor_3", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Serienummer binnenunit 3</Label>
                    <Input
                      value={commissioningData.serial_indoor_3}
                      onChange={(e) => updateCommissioning("serial_indoor_3", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Checklist Materiaal</h4>
                <CheckItem
                  label="Apparatuur gecontroleerd op transportschade"
                  description="Binnen- en buitenunit visueel geïnspecteerd"
                  checked={checklist.equipment_checked}
                  onChange={(v) => updateChecklist("equipment_checked", v)}
                />
                <CheckItem
                  label="Koudemiddel type geverifieerd"
                  description="Type en hoeveelheid conform specificaties fabrikant"
                  checked={checklist.refrigerant_verified}
                  onChange={(v) => updateChecklist("refrigerant_verified", v)}
                />
                <CheckItem
                  label="Meetgereedschap gekalibreerd"
                  description="Manometerset, lekdetector en vacuümpomp in orde"
                  checked={checklist.tools_calibrated}
                  onChange={(v) => updateChecklist("tools_calibrated", v)}
                />
                <CheckItem
                  label="Veiligheidsuitrusting aanwezig"
                  description="PBM's, brandblusser (indien nodig), EHBO"
                  checked={checklist.safety_equipment_present}
                  onChange={(v) => updateChecklist("safety_equipment_present", v)}
                />
              </div>

              <div>
                <Label>Opmerkingen materiaal</Label>
                <Textarea
                  value={checklist.notes_step2}
                  onChange={(e) => updateChecklist("notes_step2", e.target.value)}
                  placeholder="Bijzonderheden materiaal, afwijkingen, etc."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 4: Buitenunit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-lg">
                <Label>Locatie omschrijving buitenunit</Label>
                <Input
                  value={installationData.location_description || ""}
                  onChange={(e) => setInstallationData({ ...installationData, location_description: e.target.value })}
                  placeholder="bijv. Achtergevel, naast achterdeur"
                />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Checklist Buitenunit</h4>
                <CheckItem
                  label="Locatie geschikt voor buitenunit"
                  description="Voldoende ventilatie, geen directe zonlicht, bereikbaar voor onderhoud"
                  checked={checklist.outdoor_location_suitable}
                  onChange={(v) => updateChecklist("outdoor_location_suitable", v)}
                />
                <CheckItem
                  label="Unit waterpas gemonteerd"
                  description="Gecontroleerd met waterpas, correct afgesteld"
                  checked={checklist.outdoor_mounted_level}
                  onChange={(v) => updateChecklist("outdoor_mounted_level", v)}
                />
                <CheckItem
                  label="Vrije ruimte rondom voldoende"
                  description="Minimaal 50cm aan zijkanten, 100cm aan voorzijde (of conform fabrikant)"
                  checked={checklist.outdoor_clearance_ok}
                  onChange={(v) => updateChecklist("outdoor_clearance_ok", v)}
                />
                <CheckItem
                  label="Trillingdempers geplaatst"
                  description="Rubberen voetjes of wandbeugel met demping gemonteerd"
                  checked={checklist.outdoor_vibration_dampened}
                  onChange={(v) => updateChecklist("outdoor_vibration_dampened", v)}
                />
              </div>

              <div>
                <Label>Opmerkingen buitenunit</Label>
                <Textarea
                  value={checklist.notes_step3}
                  onChange={(e) => updateChecklist("notes_step3", e.target.value)}
                  placeholder="Bijzonderheden montage buitenunit"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 5: Binnenunit */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Checklist Binnenunit</h4>
                <CheckItem
                  label="Locatie geschikt voor binnenunit"
                  description="Goede luchtverdeling, geen obstakels, bereikbaar voor onderhoud"
                  checked={checklist.indoor_location_suitable}
                  onChange={(v) => updateChecklist("indoor_location_suitable", v)}
                />
                <CheckItem
                  label="Unit waterpas gemonteerd"
                  description="Correct waterpas voor goede condensafvoer"
                  checked={checklist.indoor_mounted_level}
                  onChange={(v) => updateChecklist("indoor_mounted_level", v)}
                />
                <CheckItem
                  label="Luchtstroom ongehinderd"
                  description="Minimaal 15cm boven unit, 50cm onder unit vrij (of conform fabrikant)"
                  checked={checklist.indoor_airflow_ok}
                  onChange={(v) => updateChecklist("indoor_airflow_ok", v)}
                />
                <CheckItem
                  label="Condensafvoer aangesloten"
                  description="Leiding met afschot, sifon indien nodig, getest op doorloop"
                  checked={checklist.condensate_connected}
                  onChange={(v) => updateChecklist("condensate_connected", v)}
                />
              </div>

              <div>
                <Label>Opmerkingen binnenunit</Label>
                <Textarea
                  value={checklist.notes_step4}
                  onChange={(e) => updateChecklist("notes_step4", e.target.value)}
                  placeholder="Bijzonderheden montage binnenunit"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 6: Leidingwerk */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Checklist Leidingwerk</h4>
                <CheckItem
                  label="Leidingen geïsoleerd"
                  description="Vloeistof- en gasleiding volledig geïsoleerd, geen koudebrug"
                  checked={checklist.pipes_insulated}
                  onChange={(v) => updateChecklist("pipes_insulated", v)}
                />
                <CheckItem
                  label="Leidingen beschermd"
                  description="UV-bestendig, mechanisch beschermd waar nodig"
                  checked={checklist.pipes_protected}
                  onChange={(v) => updateChecklist("pipes_protected", v)}
                />
                <CheckItem
                  label="Lektest uitgevoerd"
                  description="Stikstoftest of elektronische lekdetectie uitgevoerd"
                  checked={checklist.pipes_leak_tested}
                  onChange={(v) => updateChecklist("pipes_leak_tested", v)}
                />
                <CheckItem
                  label="Elektrische aansluitingen gereed"
                  description="Voedingskabel en communicatiekabel correct aangesloten"
                  checked={checklist.electrical_connected}
                  onChange={(v) => updateChecklist("electrical_connected", v)}
                />
              </div>

              <div>
                <Label>Opmerkingen leidingwerk</Label>
                <Textarea
                  value={checklist.notes_step5}
                  onChange={(e) => updateChecklist("notes_step5", e.target.value)}
                  placeholder="Bijzonderheden leidingwerk, lektest resultaten"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 7: Vacuüm & Vullen */}
          {currentStep === 7 && (
            <div className="space-y-6">
              {/* Koudemiddel gegevens */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className="font-medium">Koudemiddel gegevens</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Installatienummer</Label>
                    <Input
                      value={commissioningData.installation_number}
                      onChange={(e) => updateCommissioning("installation_number", e.target.value)}
                      placeholder="INS-2026-001"
                    />
                  </div>
                  <div>
                    <Label>Type koudemiddel*</Label>
                    <Select
                      value={installationData.refrigerant_type}
                      onValueChange={(v) => {
                        setInstallationData({ 
                          ...installationData, 
                          refrigerant_type: v,
                          refrigerant_gwp: REFRIGERANT_GWP[v] || 0
                        });
                        updateCommissioning("refrigerant_type", v);
                      }}
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
                    <Label>Standaard inhoud (kg)*</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={commissioningData.standard_charge || installationData.refrigerant_charge_kg || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setInstallationData({ ...installationData, refrigerant_charge_kg: val });
                        updateCommissioning("standard_charge", e.target.value);
                      }}
                      placeholder="0.85"
                    />
                  </div>
                  <div>
                    <Label>Bijvulling (kg)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={commissioningData.additional_charge}
                      onChange={(e) => updateCommissioning("additional_charge", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <div className="p-3 bg-background rounded-lg border text-center">
                    <p className="text-xs text-muted-foreground">Totale vulling</p>
                    <p className="text-lg font-bold">
                      {(parseFloat(commissioningData.standard_charge || "0") + parseFloat(commissioningData.additional_charge || "0")).toFixed(3)} kg
                    </p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border text-center">
                    <p className="text-xs text-muted-foreground">CO₂-equivalent</p>
                    <p className="text-lg font-bold">
                      {(((parseFloat(commissioningData.standard_charge || "0") + parseFloat(commissioningData.additional_charge || "0")) * (installationData.refrigerant_gwp || 0)) / 1000).toFixed(2)} ton
                    </p>
                  </div>
                </div>
              </div>

              {((installationData.refrigerant_charge_kg || 0) * (installationData.refrigerant_gwp || 0) / 1000) >= 5 && (
                <div className="flex items-center gap-2 p-3 bg-orange-100 text-orange-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    ≥5 ton CO₂-eq: Periodieke lekcontrole verplicht (EU 517/2014)
                  </span>
                </div>
              )}

              {/* Werkzaamheden checkboxes */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className="font-medium">Uitgevoerde werkzaamheden</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pressure_test"
                      checked={commissioningData.pressure_test_done}
                      onCheckedChange={(v) => updateCommissioning("pressure_test_done", v as boolean)}
                    />
                    <Label htmlFor="pressure_test">Drukbeproeving</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="leak_test"
                      checked={commissioningData.leak_test_done}
                      onCheckedChange={(v) => updateCommissioning("leak_test_done", v as boolean)}
                    />
                    <Label htmlFor="leak_test">Lekdichtheidscontrole</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="vacuum"
                      checked={commissioningData.vacuum_done}
                      onCheckedChange={(v) => updateCommissioning("vacuum_done", v as boolean)}
                    />
                    <Label htmlFor="vacuum">Vacumeren</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="leak_detection"
                      checked={commissioningData.leak_detection_done}
                      onCheckedChange={(v) => updateCommissioning("leak_detection_done", v as boolean)}
                    />
                    <Label htmlFor="leak_detection">Lekdetectie</Label>
                  </div>
                </div>
              </div>

              {/* Vacumeerprocedure */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className="font-medium">Resultaten vacumeerprocedure</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Bereikte vacuümdruk</Label>
                      <Input
                        type="number"
                        value={commissioningData.vacuum_pressure}
                        onChange={(e) => updateCommissioning("vacuum_pressure", e.target.value)}
                        placeholder="500"
                      />
                    </div>
                    <div className="w-32">
                      <Label>Eenheid</Label>
                      <Select
                        value={commissioningData.vacuum_pressure_unit}
                        onValueChange={(v) => updateCommissioning("vacuum_pressure_unit", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pa/Micron">Pa/Micron</SelectItem>
                          <SelectItem value="mbar">mbar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Standtijd</Label>
                      <Input
                        type="number"
                        value={commissioningData.vacuum_hold_time}
                        onChange={(e) => updateCommissioning("vacuum_hold_time", e.target.value)}
                        placeholder="15"
                      />
                    </div>
                    <div className="w-32">
                      <Label>Eenheid</Label>
                      <Select
                        value={commissioningData.vacuum_hold_unit}
                        onValueChange={(v) => updateCommissioning("vacuum_hold_unit", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Min">Min</SelectItem>
                          <SelectItem value="Uur">Uur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drukbeproeving */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className="font-medium">Resultaten drukbeproeving</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Lage druk gedeelte</Label>
                      <Input
                        type="number"
                        value={commissioningData.low_pressure_value}
                        onChange={(e) => updateCommissioning("low_pressure_value", e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Label>Eenheid</Label>
                      <Select
                        value={commissioningData.low_pressure_unit}
                        onValueChange={(v) => updateCommissioning("low_pressure_unit", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kPa">kPa</SelectItem>
                          <SelectItem value="bar">bar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Hoge druk gedeelte</Label>
                      <Input
                        type="number"
                        value={commissioningData.high_pressure_value}
                        onChange={(e) => updateCommissioning("high_pressure_value", e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Label>Eenheid</Label>
                      <Select
                        value={commissioningData.high_pressure_unit}
                        onValueChange={(v) => updateCommissioning("high_pressure_unit", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kPa">kPa</SelectItem>
                          <SelectItem value="bar">bar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Standtijd</Label>
                      <Input
                        type="number"
                        value={commissioningData.pressure_hold_time}
                        onChange={(e) => updateCommissioning("pressure_hold_time", e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Label>Eenheid</Label>
                      <Select
                        value={commissioningData.pressure_hold_unit}
                        onValueChange={(v) => updateCommissioning("pressure_hold_unit", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Min">Min</SelectItem>
                          <SelectItem value="Uur">Uur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Checklist Vacuüm & Vullen</h4>
                <CheckItem
                  label="Vacuüm bereikt"
                  description="Systeem vacuüm getrokken tot <500 Pa (5 mbar)"
                  checked={checklist.vacuum_achieved}
                  onChange={(v) => updateChecklist("vacuum_achieved", v)}
                />
                <CheckItem
                  label="Vacuüm gehouden"
                  description="Minimaal 15 minuten vacuüm stabiel gebleven"
                  checked={checklist.vacuum_held}
                  onChange={(v) => updateChecklist("vacuum_held", v)}
                />
                <CheckItem
                  label="Koudemiddel gevuld"
                  description="Correct type en hoeveelheid conform fabrikantspecificatie"
                  checked={checklist.refrigerant_charged}
                  onChange={(v) => updateChecklist("refrigerant_charged", v)}
                />
                <CheckItem
                  label="Vulling geregistreerd"
                  description="Hoeveelheid, type en datum vastgelegd voor F-gas administratie"
                  checked={checklist.charge_recorded}
                  onChange={(v) => updateChecklist("charge_recorded", v)}
                />
              </div>

              <div>
                <Label>Opmerkingen vacuüm & vullen</Label>
                <Textarea
                  value={checklist.notes_step6}
                  onChange={(e) => updateChecklist("notes_step6", e.target.value)}
                  placeholder="Vacuümwaarde, bijvulling berekening, etc."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 8: Oplevering */}
          {currentStep === 8 && (
            <div className="space-y-6">
              {/* Installatiecontrole meetwaarden */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                <h4 className="font-medium">Installatiecontrole - Meetwaarden</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="w-48">Hoge druk</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={commissioningData.high_pressure_reading}
                        onChange={(e) => updateCommissioning("high_pressure_reading", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">bar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-48">Condensatietemperatuur</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={commissioningData.condensation_temp}
                        onChange={(e) => updateCommissioning("condensation_temp", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-48">Persgastemperatuur</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={commissioningData.discharge_temp}
                        onChange={(e) => updateCommissioning("discharge_temp", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-48">Buitentemperatuur</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={commissioningData.outdoor_temp}
                        onChange={(e) => updateCommissioning("outdoor_temp", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">°C</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="w-48">Lage druk</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={commissioningData.low_pressure_reading}
                        onChange={(e) => updateCommissioning("low_pressure_reading", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">bar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-48">Verdampingstemperatuur</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={commissioningData.evaporation_temp}
                        onChange={(e) => updateCommissioning("evaporation_temp", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-48">Zuiggastemperatuur</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={commissioningData.suction_temp}
                        onChange={(e) => updateCommissioning("suction_temp", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-48">Ruimtetemperatuur</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={commissioningData.indoor_temp}
                        onChange={(e) => updateCommissioning("indoor_temp", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-48">Uitblaastemp. binnenunit</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={commissioningData.outlet_temp}
                        onChange={(e) => updateCommissioning("outlet_temp", e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12">°C</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label>Garantie tot</Label>
                  <Input
                    type="date"
                    value={installationData.warranty_expires || ""}
                    onChange={(e) => setInstallationData({ ...installationData, warranty_expires: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Volgende onderhoudsbeurt</Label>
                  <Input
                    type="date"
                    value={installationData.next_maintenance_date || ""}
                    onChange={(e) => setInstallationData({ ...installationData, next_maintenance_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Checklist Oplevering</h4>
                <CheckItem
                  label="Koelfunctie getest"
                  description="Systeem koelt correct, temperatuurverschil gemeten"
                  checked={checklist.cooling_tested}
                  onChange={(v) => updateChecklist("cooling_tested", v)}
                />
                <CheckItem
                  label="Verwarmingsfunctie getest"
                  description="Systeem verwarmt correct (indien van toepassing)"
                  checked={checklist.heating_tested}
                  onChange={(v) => updateChecklist("heating_tested", v)}
                />
                <CheckItem
                  label="Bediening uitgelegd aan klant"
                  description="Afstandsbediening, app, filters reinigen toegelicht"
                  checked={checklist.controls_explained}
                  onChange={(v) => updateChecklist("controls_explained", v)}
                />
                <CheckItem
                  label="Documentatie overhandigd"
                  description="Handleiding, garantiebewijs, installatiecertificaat"
                  checked={checklist.documentation_handed}
                  onChange={(v) => updateChecklist("documentation_handed", v)}
                />
              </div>

              <div>
                <Label>Opmerkingen</Label>
                <Textarea
                  value={commissioningData.remarks}
                  onChange={(e) => updateCommissioning("remarks", e.target.value)}
                  placeholder="Opmerkingen klant, bijzonderheden, etc."
                  rows={4}
                />
              </div>

              {/* Summary */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <h4 className="font-medium">Samenvatting</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Werkbonnummer:</span>
                  <span>{commissioningData.werkbon_number || "-"}</span>
                  <span className="text-muted-foreground">Klant:</span>
                  <span>{customers.find(c => c.id === installationData.customer_id)?.contact_name || "-"}</span>
                  <span className="text-muted-foreground">Installatie:</span>
                  <span>{installationData.name || "-"}</span>
                  <span className="text-muted-foreground">Apparaat:</span>
                  <span>{installationData.brand} {commissioningData.model_outdoor}</span>
                  <span className="text-muted-foreground">Koudemiddel:</span>
                  <span>{installationData.refrigerant_type} - {(parseFloat(commissioningData.standard_charge || "0") + parseFloat(commissioningData.additional_charge || "0")).toFixed(3)} kg</span>
                  <span className="text-muted-foreground">CO₂-equivalent:</span>
                  <span>{(((parseFloat(commissioningData.standard_charge || "0") + parseFloat(commissioningData.additional_charge || "0")) * (installationData.refrigerant_gwp || 0)) / 1000).toFixed(2)} ton</span>
                </div>
              </div>

              {/* PDF Preview & QR Code */}
              {showPdfPreview && generatedQrCode && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Inbedrijfstellingsrapport gegenereerd!</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <img src={generatedQrCode} alt="QR Code" className="w-32 h-32 border rounded" />
                    <div className="text-sm text-green-800">
                      <p>Scan deze QR-code om het inbedrijfstellingsrapport te bekijken.</p>
                      <p className="mt-2">De PDF is gedownload naar uw computer.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleGeneratePDF}
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Genereer PDF Rapport
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleGeneratePDF}
                  className="flex-1"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Genereer QR Code
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={currentStep === 1 ? onCancel : () => setCurrentStep(currentStep - 1)}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {currentStep === 1 ? "Annuleren" : "Vorige"}
        </Button>
        
        {currentStep < steps.length ? (
          <Button onClick={() => setCurrentStep(currentStep + 1)}>
            Volgende
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleComplete}
            disabled={!canComplete()}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Installatie Afronden
          </Button>
        )}
      </div>
    </div>
  );
};

export default AircoInstallationWizard;
