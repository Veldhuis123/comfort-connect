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
  { key: "indoor_location_suitable" as const, label: "Locatie geschikt voor binnenunit", desc: "Goede luchtverdeling, geen obstakels, bereikbaar voor onderhoud" },
  { key: "indoor_mounted_level" as const, label: "Unit waterpas gemonteerd", desc: "Correct waterpas voor goede condensafvoer" },
  { key: "indoor_airflow_ok" as const, label: "Luchtstroom ongehinderd", desc: "Minimaal 15cm boven unit, 50cm onder unit vrij" },
  { key: "condensate_connected" as const, label: "Condensafvoer aangesloten", desc: "Leiding met afschot, sifon indien nodig, getest op doorloop" },
];

const StepBinnenunit = ({ checklist, setChecklist, onComplete }: Props) => {
  const allChecked = items.every(i => checklist[i.key]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Checklist Binnenunit</CardTitle></CardHeader>
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
          <Textarea placeholder="Opmerkingen binnenunit..." value={checklist.notes_step4} onChange={e => setChecklist(prev => ({ ...prev, notes_step4: e.target.value }))} rows={2} className="mt-2" />
        </CardContent>
      </Card>

      <Button onClick={onComplete} disabled={!allChecked} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Stap voltooien ({items.filter(i => checklist[i.key]).length}/{items.length})
      </Button>
    </div>
  );
};

export default StepBinnenunit;
