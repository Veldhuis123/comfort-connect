import { useState, lazy, Suspense } from "react";
import { Thermometer, Upload, Keyboard, Info, Bluetooth } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { CommissioningData } from "@/lib/installationTypes";

const TestoBLE = lazy(() => import("./TestoBLE"));

interface Props {
  data: CommissioningData;
  setData: React.Dispatch<React.SetStateAction<CommissioningData>>;
}

interface TestoReading {
  label: string;
  dataKey: keyof CommissioningData;
  unit: string;
}

const readings: TestoReading[] = [
  { label: "Hogedruk", dataKey: "high_pressure_reading", unit: "bar" },
  { label: "Condensatietemperatuur", dataKey: "condensation_temp", unit: "°C" },
  { label: "Perstemperatuur", dataKey: "discharge_temp", unit: "°C" },
  { label: "Lagedruk", dataKey: "low_pressure_reading", unit: "bar" },
  { label: "Verdampingstemperatuur", dataKey: "evaporation_temp", unit: "°C" },
  { label: "Zuigtemperatuur", dataKey: "suction_temp", unit: "°C" },
  { label: "Buitentemperatuur", dataKey: "outdoor_temp", unit: "°C" },
  { label: "Binnentemperatuur", dataKey: "indoor_temp", unit: "°C" },
  { label: "Uitblaastemperatuur", dataKey: "outlet_temp", unit: "°C" },
  { label: "Vacuümdruk", dataKey: "vacuum_pressure", unit: "Pa" },
];

const MobileTesto = ({ data, setData }: Props) => {
  const [mode, setMode] = useState<"manual" | "import" | "ble">("manual");
  const { toast } = useToast();

  const updateReading = (key: keyof CommissioningData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n");
      
      // Testo CSV export typically has header + data rows
      // Try to parse common Testo export formats
      const updates: Partial<CommissioningData> = {};
      
      for (const line of lines) {
        const cols = line.split(";").map((c) => c.trim());
        const label = cols[0]?.toLowerCase() || "";
        const value = cols[1]?.replace(",", ".") || "";

        if (label.includes("high") || label.includes("hoge")) updates.high_pressure_reading = value;
        if (label.includes("low") || label.includes("lage")) updates.low_pressure_reading = value;
        if (label.includes("condensat")) updates.condensation_temp = value;
        if (label.includes("discharge") || label.includes("pers")) updates.discharge_temp = value;
        if (label.includes("evaporat") || label.includes("verdamp")) updates.evaporation_temp = value;
        if (label.includes("suction") || label.includes("zuig")) updates.suction_temp = value;
        if (label.includes("ambient") || label.includes("buiten")) updates.outdoor_temp = value;
        if (label.includes("vacuum") || label.includes("vacuüm")) updates.vacuum_pressure = value;
      }

      setData((prev) => ({ ...prev, ...updates }));
      toast({ title: "Testo data geïmporteerd", description: `${Object.keys(updates).length} waarden overgenomen` });
    } catch {
      toast({ title: "Import mislukt", description: "Controleer het bestandsformaat", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="border-accent/30 bg-accent/5">
        <Info className="h-4 w-4 text-accent" />
        <AlertDescription className="text-sm">
          <strong>Testo 558s</strong> — Exporteer meetwaarden als CSV via de Testo Smart App en importeer ze hier, of voer ze handmatig in.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
          className="h-12"
        >
          <Keyboard className="h-4 w-4 mr-2" />
          Handmatig
        </Button>
        <Button
          variant={mode === "import" ? "default" : "outline"}
          onClick={() => setMode("import")}
          className="h-12"
        >
          <Upload className="h-4 w-4 mr-2" />
          CSV Import
        </Button>
      </div>

      {mode === "import" && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Exporteer vanuit de <strong>Testo Smart App</strong> → Meting → Delen → CSV. Upload het bestand hieronder.
            </p>
            <label className="block">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleCSVImport}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
              />
            </label>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-accent" />
            Meetwaarden
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {readings.map((reading) => (
            <div key={reading.dataKey} className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{reading.label}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={data[reading.dataKey] as string}
                  onChange={(e) => updateReading(reading.dataKey, e.target.value)}
                  className="h-11 text-base"
                  placeholder="—"
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right mt-5">{reading.unit}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileTesto;
