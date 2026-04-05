import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { CommissioningData, BRLChecklist } from "@/lib/installationTypes";

interface Props {
  data: CommissioningData;
  setData: (data: CommissioningData) => void;
  checklist: BRLChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<BRLChecklist>>;
  onComplete: () => void;
}

const items = [
  { key: "pipes_insulated" as const, label: "Leidingen geïsoleerd", desc: "Vloeistof- en gasleiding volledig geïsoleerd, geen koudebrug" },
  { key: "pipes_protected" as const, label: "Leidingen beschermd", desc: "UV-bestendig, mechanisch beschermd waar nodig" },
  { key: "pipes_leak_tested" as const, label: "Lektest uitgevoerd", desc: "Stikstoftest of elektronische lekdetectie uitgevoerd" },
  { key: "electrical_connected" as const, label: "Elektrische aansluitingen gereed", desc: "Voedingskabel en communicatiekabel correct aangesloten" },
];

const StepLeidingwerk = ({ data, setData, checklist, setChecklist, onComplete }: Props) => {
  const updateField = (key: keyof CommissioningData, value: string) => { setData({ ...data, [key]: value }); };
  const allChecked = items.every(i => checklist[i.key]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Checklist Leidingwerk</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {items.map(item => (
            <label key={item.key} className="flex items-start gap-3 py-2 px-2 rounded-lg cursor-pointer active:bg-muted/50">
              <Checkbox checked={checklist[item.key] as boolean} onCheckedChange={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))} className="h-6 w-6 mt-0.5" />
              <div>
                <span className="text-sm font-medium">{item.label}</span>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </label>
          ))}
          <Textarea placeholder="Opmerkingen leidingwerk..." value={checklist.notes_step5} onChange={e => setChecklist(prev => ({ ...prev, notes_step5: e.target.value }))} rows={2} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Drukbeproeving</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Lage druk (kPa)</Label>
              <Input type="number" inputMode="decimal" value={data.low_pressure_value} onChange={e => updateField("low_pressure_value", e.target.value)} className="h-11 text-base" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hoge druk (kPa)</Label>
              <Input type="number" inputMode="decimal" value={data.high_pressure_value} onChange={e => updateField("high_pressure_value", e.target.value)} className="h-11 text-base" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Drukhoudtijd (min)</Label>
            <Input type="number" inputMode="decimal" value={data.pressure_hold_time} onChange={e => updateField("pressure_hold_time", e.target.value)} className="h-11 text-base" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={onComplete} disabled={!allChecked} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Stap voltooien
      </Button>
    </div>
  );
};

export default StepLeidingwerk;
