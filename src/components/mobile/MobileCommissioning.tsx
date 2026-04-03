import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { CommissioningData } from "@/lib/installationTypes";

interface Props {
  data: CommissioningData;
  setData: React.Dispatch<React.SetStateAction<CommissioningData>>;
}

type SectionId = "header" | "customer" | "equipment" | "refrigerant" | "tests" | "readings" | "tools" | "remarks";

interface FieldDef {
  key: keyof CommissioningData;
  label: string;
  type?: "text" | "date" | "number" | "checkbox";
  unit?: string;
}

const sections: { id: SectionId; title: string; fields: FieldDef[] }[] = [
  {
    id: "header",
    title: "Algemeen",
    fields: [
      { key: "werkbon_number", label: "Werkbon nummer" },
      { key: "date", label: "Datum", type: "date" },
      { key: "technician_name", label: "Monteur" },
      { key: "technician_certificate", label: "Certificaat nr." },
    ],
  },
  {
    id: "customer",
    title: "Klantgegevens",
    fields: [
      { key: "customer_name", label: "Naam" },
      { key: "customer_address", label: "Adres" },
      { key: "customer_postal", label: "Postcode" },
      { key: "customer_city", label: "Plaats" },
      { key: "customer_phone", label: "Telefoon" },
    ],
  },
  {
    id: "equipment",
    title: "Apparatuur",
    fields: [
      { key: "brand", label: "Merk" },
      { key: "model_outdoor", label: "Model buitenunit" },
      { key: "serial_outdoor", label: "Serienr. buitenunit" },
      { key: "model_indoor", label: "Model binnenunit" },
      { key: "serial_indoor", label: "Serienr. binnenunit" },
    ],
  },
  {
    id: "refrigerant",
    title: "Koudemiddel",
    fields: [
      { key: "refrigerant_type", label: "Type" },
      { key: "standard_charge", label: "Fabrieksvulling (g)" },
      { key: "additional_charge", label: "Bijvulling (g)" },
      { key: "installation_number", label: "Installatienummer" },
    ],
  },
  {
    id: "tests",
    title: "Werkzaamheden",
    fields: [
      { key: "pressure_test_done", label: "Druktest uitgevoerd", type: "checkbox" },
      { key: "leak_test_done", label: "Lektest uitgevoerd", type: "checkbox" },
      { key: "vacuum_done", label: "Vacuüm getrokken", type: "checkbox" },
      { key: "leak_detection_done", label: "Lekdetectie gedaan", type: "checkbox" },
      { key: "vacuum_pressure", label: "Vacuümdruk (Pa)" },
      { key: "vacuum_hold_time", label: "Houdtijd (min)" },
      { key: "low_pressure_value", label: "Lagedruk (kPa)" },
      { key: "high_pressure_value", label: "Hogedruk (kPa)" },
      { key: "pressure_hold_time", label: "Houdtijd druk (min)" },
    ],
  },
  {
    id: "readings",
    title: "Meetwaarden",
    fields: [
      { key: "high_pressure_reading", label: "Hogedruk" },
      { key: "condensation_temp", label: "Condensatietemperatuur" },
      { key: "discharge_temp", label: "Perstemperatuur" },
      { key: "low_pressure_reading", label: "Lagedruk" },
      { key: "evaporation_temp", label: "Verdampingstemperatuur" },
      { key: "suction_temp", label: "Zuigtemperatuur" },
      { key: "outdoor_temp", label: "Buitentemperatuur" },
      { key: "indoor_temp", label: "Binnentemperatuur" },
      { key: "outlet_temp", label: "Uitblaastemperatuur" },
    ],
  },
];

const MobileCommissioning = ({ data, setData }: Props) => {
  const [expandedSection, setExpandedSection] = useState<SectionId>("header");

  const updateField = (key: keyof CommissioningData, value: string | boolean) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const isExpanded = expandedSection === section.id;
        return (
          <Card key={section.id} className="border">
            <CardHeader
              className="p-4 cursor-pointer"
              onClick={() => setExpandedSection(isExpanded ? ("" as SectionId) : section.id)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{section.title}</CardTitle>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                {section.fields.map((field) => {
                  if (field.type === "checkbox") {
                    return (
                      <label key={field.key} className="flex items-center gap-3 py-2 cursor-pointer">
                        <Checkbox
                          checked={data[field.key] as boolean}
                          onCheckedChange={(v) => updateField(field.key, !!v)}
                          className="h-6 w-6"
                        />
                        <span className="text-sm">{field.label}</span>
                      </label>
                    );
                  }
                  return (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{field.label}</Label>
                      <Input
                        type={field.type || "text"}
                        value={data[field.key] as string}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="h-11 text-base"
                      />
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Opmerkingen altijd zichtbaar */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-xs text-muted-foreground">Opmerkingen</Label>
          <Textarea
            value={data.remarks}
            onChange={(e) => updateField("remarks", e.target.value)}
            rows={3}
            className="mt-1 text-base"
            placeholder="Eventuele opmerkingen..."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileCommissioning;
