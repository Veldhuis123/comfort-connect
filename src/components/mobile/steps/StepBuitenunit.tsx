import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { BRLChecklist } from "@/lib/installationTypes";

interface Props {
  checklist: BRLChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<BRLChecklist>>;
  onComplete: () => void;
}

const items = [
  { key: "outdoor_location_suitable" as const, label: "Locatie geschikt voor buitenunit", desc: "Voldoende ventilatie, geen directe zonlicht, bereikbaar voor onderhoud" },
  { key: "outdoor_mounted_level" as const, label: "Unit waterpas gemonteerd", desc: "Gecontroleerd met waterpas, correct afgesteld" },
  { key: "outdoor_clearance_ok" as const, label: "Vrije ruimte rondom voldoende", desc: "Minimaal 50cm aan zijkanten, 100cm aan voorzijde" },
  { key: "outdoor_vibration_dampened" as const, label: "Trillingdempers geplaatst", desc: "Rubberen voetjes of wandbeugel met demping gemonteerd" },
];

const StepBuitenunit = ({ checklist, setChecklist, onComplete }: Props) => {
  const allChecked = items.every(i => checklist[i.key]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Checklist Buitenunit</CardTitle></CardHeader>
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
          <Textarea placeholder="Opmerkingen buitenunit..." value={checklist.notes_step3} onChange={e => setChecklist(prev => ({ ...prev, notes_step3: e.target.value }))} rows={2} className="mt-2" />
        </CardContent>
      </Card>

      <Button onClick={onComplete} disabled={!allChecked} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Stap voltooien ({items.filter(i => checklist[i.key]).length}/{items.length})
      </Button>
    </div>
  );
};

export default StepBuitenunit;
