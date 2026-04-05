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
  { key: "vacuum_achieved" as const, label: "Vacuüm bereikt", desc: "Systeem vacuüm getrokken tot <500 Pa (5 mbar)" },
  { key: "vacuum_held" as const, label: "Vacuüm gehouden", desc: "Minimaal 15 minuten vacuüm stabiel gebleven" },
  { key: "refrigerant_charged" as const, label: "Koudemiddel gevuld", desc: "Correct type en hoeveelheid conform fabrikantspecificatie" },
  { key: "charge_recorded" as const, label: "Vulling geregistreerd", desc: "Hoeveelheid, type en datum vastgelegd voor F-gas administratie" },
];

const StepVacuumVullen = ({ data, setData, checklist, setChecklist, onComplete }: Props) => {
  const updateField = (key: keyof CommissioningData, value: string) => { setData({ ...data, [key]: value }); };
  const allChecked = items.every(i => checklist[i.key]);

  const standard = parseFloat(data.standard_charge || "0");
  const additional = parseFloat(data.additional_charge || "0");
  const total = standard + additional;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Koudemiddel gegevens</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fabrieksvulling (g)</Label>
              <Input type="number" inputMode="decimal" value={data.standard_charge} onChange={e => updateField("standard_charge", e.target.value)} className="h-11 text-base" placeholder="850" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Bijvulling (g)</Label>
              <Input type="number" inputMode="decimal" value={data.additional_charge} onChange={e => updateField("additional_charge", e.target.value)} className="h-11 text-base" placeholder="0" />
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">Totaal</p>
              <p className="font-bold">{total.toFixed(0)} g</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Vacuümprocedure</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Vacuümdruk (Pa/Micron)</Label>
              <Input type="number" inputMode="decimal" value={data.vacuum_pressure} onChange={e => updateField("vacuum_pressure", e.target.value)} className="h-11 text-base" placeholder="500" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Houdtijd (min)</Label>
              <Input type="number" inputMode="decimal" value={data.vacuum_hold_time} onChange={e => updateField("vacuum_hold_time", e.target.value)} className="h-11 text-base" placeholder="15" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Checklist Vacuüm & Vullen</CardTitle></CardHeader>
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
          <Textarea placeholder="Opmerkingen vacuüm & vullen..." value={checklist.notes_step6} onChange={e => setChecklist(prev => ({ ...prev, notes_step6: e.target.value }))} rows={2} className="mt-2" />
        </CardContent>
      </Card>

      <Button onClick={onComplete} disabled={!allChecked} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Stap voltooien
      </Button>
    </div>
  );
};

export default StepVacuumVullen;
