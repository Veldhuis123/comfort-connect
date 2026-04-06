import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Calculator, Loader2, Wind, Sun, Battery, Car, Wifi, Cable } from "lucide-react";
import { 
  CalculatorSettings, 
  defaultCalculatorSettings, 
  fetchCalculatorSettings, 
  saveCalculatorSettings 
} from "@/lib/calculatorSettings";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const [calculatorSettings, setCalculatorSettings] = useState<CalculatorSettings>(defaultCalculatorSettings);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCalculatorSettings().then(setCalculatorSettings);
  }, []);

  const handleUpdate = (
    key: keyof CalculatorSettings,
    field: "enabled" | "name",
    value: boolean | string
  ) => {
    setCalculatorSettings(prev => {
      const newSettings = {
        ...prev,
        [key]: { ...prev[key], [field]: value }
      };
      
      setSaving(true);
      saveCalculatorSettings(newSettings)
        .then(() => {
          toast({ title: "Opgeslagen", description: "Calculator instellingen bijgewerkt" });
        })
        .catch(() => {
          toast({ title: "Fout", description: "Kon instellingen niet opslaan", variant: "destructive" });
        })
        .finally(() => setSaving(false));
      
      return newSettings;
    });
  };

  const calculators = [
    { key: "airco" as const, icon: Wind, desc: "Airconditioning met productselectie" },
    { key: "pv" as const, icon: Sun, desc: "Zonnepanelen met terugverdientijd" },
    { key: "battery" as const, icon: Battery, desc: "Thuisaccu berekening" },
    { key: "charging" as const, icon: Car, desc: "Laadpalen besparing" },
    { key: "unifi" as const, icon: Wifi, desc: "UniFi netwerk & camera's" },
    { key: "schema" as const, icon: Cable, desc: "Interactief installatieschema" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Website Instellingen</h1>
        <p className="text-sm text-muted-foreground">Bepaal welke modules zichtbaar zijn op de website</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="w-5 h-5" />
            Calculator Modules
            {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <CardDescription>Bepaal welke calculatoren zichtbaar zijn op de website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {calculators.map(({ key, icon: Icon, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <Input
                    value={calculatorSettings[key].name}
                    onChange={(e) => handleUpdate(key, "name", e.target.value)}
                    className="font-medium h-7 w-36 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {calculatorSettings[key].enabled ? "Actief" : "Uit"}
                </span>
                <Switch
                  checked={calculatorSettings[key].enabled}
                  onCheckedChange={(checked) => handleUpdate(key, "enabled", checked)}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
            💡 Wijzigingen worden direct opgeslagen op de server en gelden voor alle bezoekers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
