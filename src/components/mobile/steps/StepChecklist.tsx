import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileBRLChecklist from "@/components/mobile/MobileBRLChecklist";
import type { BRLChecklist } from "@/lib/installationTypes";

interface Props {
  checklist: BRLChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<BRLChecklist>>;
  onComplete: () => void;
}

const StepChecklist = ({ checklist, setChecklist, onComplete }: Props) => {
  const checklistFields = Object.entries(checklist).filter(([k]) => !k.startsWith("notes_"));
  const done = checklistFields.filter(([, v]) => v === true).length;
  const total = checklistFields.length;
  const isComplete = done === total;

  return (
    <div className="space-y-4">
      <MobileBRLChecklist checklist={checklist} setChecklist={setChecklist} />
      <Button onClick={onComplete} disabled={!isComplete} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Checklist voltooid ({done}/{total})
      </Button>
    </div>
  );
};

export default StepChecklist;
