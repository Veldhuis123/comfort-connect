import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { BRLChecklist } from "@/lib/installationTypes";

interface Props {
  checklist: BRLChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<BRLChecklist>>;
}

interface StepConfig {
  title: string;
  fields: { key: keyof BRLChecklist; label: string }[];
  notesKey: keyof BRLChecklist;
}

const steps: StepConfig[] = [
  {
    title: "1. Voorbereiding",
    fields: [
      { key: "customer_informed", label: "Klant geïnformeerd" },
      { key: "location_inspected", label: "Locatie geïnspecteerd" },
      { key: "electrical_capacity_checked", label: "Elektrische capaciteit gecontroleerd" },
      { key: "condensate_drain_planned", label: "Condensafvoer gepland" },
    ],
    notesKey: "notes_step1",
  },
  {
    title: "2. Materiaal controle",
    fields: [
      { key: "equipment_checked", label: "Apparatuur gecontroleerd" },
      { key: "refrigerant_verified", label: "Koudemiddel geverifieerd" },
      { key: "tools_calibrated", label: "Gereedschap gekalibreerd" },
      { key: "safety_equipment_present", label: "Veiligheidsuitrusting aanwezig" },
    ],
    notesKey: "notes_step2",
  },
  {
    title: "3. Buitenunit",
    fields: [
      { key: "outdoor_location_suitable", label: "Locatie geschikt" },
      { key: "outdoor_mounted_level", label: "Waterpas gemonteerd" },
      { key: "outdoor_clearance_ok", label: "Vrije ruimte voldoende" },
      { key: "outdoor_vibration_dampened", label: "Trillingdemping aangebracht" },
    ],
    notesKey: "notes_step3",
  },
  {
    title: "4. Binnenunit",
    fields: [
      { key: "indoor_location_suitable", label: "Locatie geschikt" },
      { key: "indoor_mounted_level", label: "Waterpas gemonteerd" },
      { key: "indoor_airflow_ok", label: "Luchtstroom vrij" },
      { key: "condensate_connected", label: "Condensafvoer aangesloten" },
    ],
    notesKey: "notes_step4",
  },
  {
    title: "5. Leidingwerk",
    fields: [
      { key: "pipes_insulated", label: "Leidingen geïsoleerd" },
      { key: "pipes_protected", label: "Leidingen beschermd" },
      { key: "pipes_leak_tested", label: "Lektest uitgevoerd" },
      { key: "electrical_connected", label: "Elektrisch aangesloten" },
    ],
    notesKey: "notes_step5",
  },
  {
    title: "6. Vacuüm & vullen",
    fields: [
      { key: "vacuum_achieved", label: "Vacuüm bereikt" },
      { key: "vacuum_held", label: "Vacuüm gehouden" },
      { key: "refrigerant_charged", label: "Koudemiddel gevuld" },
      { key: "charge_recorded", label: "Vulling geregistreerd" },
    ],
    notesKey: "notes_step6",
  },
  {
    title: "7. Testen & oplevering",
    fields: [
      { key: "cooling_tested", label: "Koeling getest" },
      { key: "heating_tested", label: "Verwarming getest" },
      { key: "controls_explained", label: "Bediening uitgelegd" },
      { key: "documentation_handed", label: "Documentatie overhandigd" },
    ],
    notesKey: "notes_step7",
  },
];

const MobileBRLChecklist = ({ checklist, setChecklist }: Props) => {
  const [expandedStep, setExpandedStep] = useState(0);

  const getStepProgress = (step: StepConfig) => {
    const checked = step.fields.filter((f) => checklist[f.key] === true).length;
    return { checked, total: step.fields.length };
  };

  const toggleField = (key: keyof BRLChecklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const { checked, total } = getStepProgress(step);
        const isComplete = checked === total;
        const isExpanded = expandedStep === idx;

        return (
          <Card key={idx} className={`border ${isComplete ? "border-green-300 bg-green-50/50" : "border-border"}`}>
            <CardHeader
              className="p-4 cursor-pointer"
              onClick={() => setExpandedStep(isExpanded ? -1 : idx)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {isComplete && <Check className="h-4 w-4 text-green-600" />}
                  {step.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                    {checked}/{total}
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                {step.fields.map((field) => (
                  <label key={field.key} className="flex items-center gap-3 py-2 active:bg-muted/50 rounded-lg px-2 -mx-2 cursor-pointer">
                    <Checkbox
                      checked={checklist[field.key] as boolean}
                      onCheckedChange={() => toggleField(field.key)}
                      className="h-6 w-6"
                    />
                    <span className="text-sm">{field.label}</span>
                  </label>
                ))}
                <Textarea
                  placeholder="Opmerkingen..."
                  value={checklist[step.notesKey] as string}
                  onChange={(e) => setChecklist((prev) => ({ ...prev, [step.notesKey]: e.target.value }))}
                  className="mt-2 text-sm"
                  rows={2}
                />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default MobileBRLChecklist;
