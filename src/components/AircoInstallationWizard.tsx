import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertTriangle, Camera
} from "lucide-react";
import {
  Customer,
  Technician,
  CreateInstallation,
  REFRIGERANT_GWP,
  REFRIGERANT_OPTIONS,
  InstallationType,
} from "@/lib/installationsApi";

interface AircoInstallationWizardProps {
  customers: Customer[];
  technicians: Technician[];
  onComplete: (data: CreateInstallation & { brl_checklist: BRLChecklist }) => void;
  onCancel: () => void;
}

interface BRLChecklist {
  // Stap 1: Voorbereiding
  customer_informed: boolean;
  location_inspected: boolean;
  electrical_capacity_checked: boolean;
  condensate_drain_planned: boolean;
  
  // Stap 2: Materiaal controle
  equipment_checked: boolean;
  refrigerant_verified: boolean;
  tools_calibrated: boolean;
  safety_equipment_present: boolean;
  
  // Stap 3: Installatie buitenunit
  outdoor_location_suitable: boolean;
  outdoor_mounted_level: boolean;
  outdoor_clearance_ok: boolean;
  outdoor_vibration_dampened: boolean;
  
  // Stap 4: Installatie binnenunit
  indoor_location_suitable: boolean;
  indoor_mounted_level: boolean;
  indoor_airflow_ok: boolean;
  condensate_connected: boolean;
  
  // Stap 5: Leidingwerk
  pipes_insulated: boolean;
  pipes_protected: boolean;
  pipes_leak_tested: boolean;
  electrical_connected: boolean;
  
  // Stap 6: Vacuümtrekken & vullen
  vacuum_achieved: boolean;
  vacuum_held: boolean;
  refrigerant_charged: boolean;
  charge_recorded: boolean;
  
  // Stap 7: Testen & oplevering
  cooling_tested: boolean;
  heating_tested: boolean;
  controls_explained: boolean;
  documentation_handed: boolean;
  
  // Opmerkingen per stap
  notes_step1: string;
  notes_step2: string;
  notes_step3: string;
  notes_step4: string;
  notes_step5: string;
  notes_step6: string;
  notes_step7: string;
}

const defaultChecklist: BRLChecklist = {
  customer_informed: false,
  location_inspected: false,
  electrical_capacity_checked: false,
  condensate_drain_planned: false,
  equipment_checked: false,
  refrigerant_verified: false,
  tools_calibrated: false,
  safety_equipment_present: false,
  outdoor_location_suitable: false,
  outdoor_mounted_level: false,
  outdoor_clearance_ok: false,
  outdoor_vibration_dampened: false,
  indoor_location_suitable: false,
  indoor_mounted_level: false,
  indoor_airflow_ok: false,
  condensate_connected: false,
  pipes_insulated: false,
  pipes_protected: false,
  pipes_leak_tested: false,
  electrical_connected: false,
  vacuum_achieved: false,
  vacuum_held: false,
  refrigerant_charged: false,
  charge_recorded: false,
  cooling_tested: false,
  heating_tested: false,
  controls_explained: false,
  documentation_handed: false,
  notes_step1: "",
  notes_step2: "",
  notes_step3: "",
  notes_step4: "",
  notes_step5: "",
  notes_step6: "",
  notes_step7: "",
};

const steps = [
  { id: 1, title: "Voorbereiding", icon: ClipboardCheck },
  { id: 2, title: "Materiaal", icon: Wrench },
  { id: 3, title: "Buitenunit", icon: Thermometer },
  { id: 4, title: "Binnenunit", icon: Thermometer },
  { id: 5, title: "Leidingwerk", icon: Wrench },
  { id: 6, title: "Vacuüm & Vullen", icon: Thermometer },
  { id: 7, title: "Oplevering", icon: FileCheck },
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

  const getStepCompletion = (step: number): number => {
    const stepChecks: Record<number, (keyof BRLChecklist)[]> = {
      1: ["customer_informed", "location_inspected", "electrical_capacity_checked", "condensate_drain_planned"],
      2: ["equipment_checked", "refrigerant_verified", "tools_calibrated", "safety_equipment_present"],
      3: ["outdoor_location_suitable", "outdoor_mounted_level", "outdoor_clearance_ok", "outdoor_vibration_dampened"],
      4: ["indoor_location_suitable", "indoor_mounted_level", "indoor_airflow_ok", "condensate_connected"],
      5: ["pipes_insulated", "pipes_protected", "pipes_leak_tested", "electrical_connected"],
      6: ["vacuum_achieved", "vacuum_held", "refrigerant_charged", "charge_recorded"],
      7: ["cooling_tested", "heating_tested", "controls_explained", "documentation_handed"],
    };
    
    const checks = stepChecks[step] || [];
    const completed = checks.filter((key) => checklist[key] === true).length;
    return checks.length > 0 ? Math.round((completed / checks.length) * 100) : 0;
  };

  const isStepComplete = (step: number): boolean => getStepCompletion(step) === 100;

  const canComplete = (): boolean => {
    // Check all mandatory fields
    if (!installationData.customer_id || !installationData.name || 
        !installationData.brand || !installationData.model ||
        !installationData.refrigerant_charge_kg || !installationData.installed_by_technician_id) {
      return false;
    }
    // All steps must be complete
    return steps.every((_, i) => isStepComplete(i + 1));
  };

  const handleComplete = () => {
    onComplete({ ...installationData, brl_checklist: checklist });
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
          <h2 className="text-xl font-bold">BRL 100 Installatie Stappenplan</h2>
          <p className="text-sm text-muted-foreground">Airco installatie volgens certificeringsrichtlijn</p>
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
              className={`flex-1 min-w-[100px] p-2 rounded-lg border-2 transition-all ${
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
            {currentStep === 1 && "Controleer voorbereidende werkzaamheden"}
            {currentStep === 2 && "Controleer materiaal en gereedschap"}
            {currentStep === 3 && "Installeer en controleer buitenunit"}
            {currentStep === 4 && "Installeer en controleer binnenunit"}
            {currentStep === 5 && "Leg leidingwerk aan en test"}
            {currentStep === 6 && "Vacuümtrekken en koudemiddel vullen"}
            {currentStep === 7 && "Test systeem en lever op aan klant"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Voorbereiding + Basisgegevens */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <label className="text-sm font-medium">Klant*</label>
                  <Select
                    value={String(installationData.customer_id || "")}
                    onValueChange={(v) => setInstallationData({ ...installationData, customer_id: Number(v) })}
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
                  <label className="text-sm font-medium">Uitvoerend monteur*</label>
                  <Select
                    value={String(installationData.installed_by_technician_id || "")}
                    onValueChange={(v) => setInstallationData({ ...installationData, installed_by_technician_id: Number(v) })}
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
                  <label className="text-sm font-medium">Naam installatie*</label>
                  <Input
                    value={installationData.name}
                    onChange={(e) => setInstallationData({ ...installationData, name: e.target.value })}
                    placeholder="bijv. Woonkamer split-unit"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Installatiedatum*</label>
                  <Input
                    type="date"
                    value={installationData.installation_date}
                    onChange={(e) => setInstallationData({ ...installationData, installation_date: e.target.value })}
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
                <label className="text-sm font-medium">Opmerkingen voorbereiding</label>
                <Textarea
                  value={checklist.notes_step1}
                  onChange={(e) => updateChecklist("notes_step1", e.target.value)}
                  placeholder="Bijzonderheden, afspraken met klant, etc."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Materiaal */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <label className="text-sm font-medium">Merk*</label>
                  <Input
                    value={installationData.brand}
                    onChange={(e) => setInstallationData({ ...installationData, brand: e.target.value })}
                    placeholder="bijv. Daikin"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Model*</label>
                  <Input
                    value={installationData.model}
                    onChange={(e) => setInstallationData({ ...installationData, model: e.target.value })}
                    placeholder="bijv. Perfera FTXM25"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Serienummer</label>
                  <Input
                    value={installationData.serial_number || ""}
                    onChange={(e) => setInstallationData({ ...installationData, serial_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
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
                <label className="text-sm font-medium">Opmerkingen materiaal</label>
                <Textarea
                  value={checklist.notes_step2}
                  onChange={(e) => updateChecklist("notes_step2", e.target.value)}
                  placeholder="Bijzonderheden materiaal, afwijkingen, etc."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Buitenunit */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="text-sm font-medium">Locatie omschrijving buitenunit</label>
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
                <label className="text-sm font-medium">Opmerkingen buitenunit</label>
                <Textarea
                  value={checklist.notes_step3}
                  onChange={(e) => updateChecklist("notes_step3", e.target.value)}
                  placeholder="Bijzonderheden montage buitenunit"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 4: Binnenunit */}
          {currentStep === 4 && (
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
                <label className="text-sm font-medium">Opmerkingen binnenunit</label>
                <Textarea
                  value={checklist.notes_step4}
                  onChange={(e) => updateChecklist("notes_step4", e.target.value)}
                  placeholder="Bijzonderheden montage binnenunit"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 5: Leidingwerk */}
          {currentStep === 5 && (
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
                <label className="text-sm font-medium">Opmerkingen leidingwerk</label>
                <Textarea
                  value={checklist.notes_step5}
                  onChange={(e) => updateChecklist("notes_step5", e.target.value)}
                  placeholder="Bijzonderheden leidingwerk, lektest resultaten"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 6: Vacuüm & Vullen */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <label className="text-sm font-medium">Koudemiddel*</label>
                  <Select
                    value={installationData.refrigerant_type}
                    onValueChange={(v) => setInstallationData({ 
                      ...installationData, 
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
                    value={installationData.refrigerant_charge_kg || ""}
                    onChange={(e) => setInstallationData({ 
                      ...installationData, 
                      refrigerant_charge_kg: parseFloat(e.target.value) || 0 
                    })}
                    placeholder="bijv. 0.85"
                  />
                </div>
                <div className="flex items-end">
                  <div className="p-3 bg-background rounded-lg border w-full text-center">
                    <p className="text-xs text-muted-foreground">CO₂-equivalent</p>
                    <p className="text-lg font-bold">
                      {((installationData.refrigerant_charge_kg || 0) * (installationData.refrigerant_gwp || 0) / 1000).toFixed(2)} ton
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
                <label className="text-sm font-medium">Opmerkingen vacuüm & vullen</label>
                <Textarea
                  value={checklist.notes_step6}
                  onChange={(e) => updateChecklist("notes_step6", e.target.value)}
                  placeholder="Vacuümwaarde, bijvulling berekening, etc."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 7: Oplevering */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <label className="text-sm font-medium">Garantie tot</label>
                  <Input
                    type="date"
                    value={installationData.warranty_expires || ""}
                    onChange={(e) => setInstallationData({ ...installationData, warranty_expires: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Volgende onderhoudsbeurt</label>
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
                <label className="text-sm font-medium">Opmerkingen oplevering</label>
                <Textarea
                  value={checklist.notes_step7}
                  onChange={(e) => updateChecklist("notes_step7", e.target.value)}
                  placeholder="Opmerkingen klant, bijzonderheden, etc."
                  rows={3}
                />
              </div>

              {/* Summary */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <h4 className="font-medium">Samenvatting</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Klant:</span>
                  <span>{customers.find(c => c.id === installationData.customer_id)?.contact_name || "-"}</span>
                  <span className="text-muted-foreground">Installatie:</span>
                  <span>{installationData.name || "-"}</span>
                  <span className="text-muted-foreground">Apparaat:</span>
                  <span>{installationData.brand} {installationData.model}</span>
                  <span className="text-muted-foreground">Koudemiddel:</span>
                  <span>{installationData.refrigerant_type} - {installationData.refrigerant_charge_kg} kg</span>
                  <span className="text-muted-foreground">CO₂-equivalent:</span>
                  <span>{((installationData.refrigerant_charge_kg || 0) * (installationData.refrigerant_gwp || 0) / 1000).toFixed(2)} ton</span>
                </div>
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
