import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileTesto from "@/components/mobile/MobileTesto";
import type { CommissioningData } from "@/lib/installationTypes";

interface Props {
  data: CommissioningData;
  setData: React.Dispatch<React.SetStateAction<CommissioningData>>;
  onComplete: () => void;
}

const StepMeasurements = ({ data, setData, onComplete }: Props) => {
  const hasReadings = !!(data.high_pressure_reading || data.low_pressure_reading || data.condensation_temp);

  return (
    <div className="space-y-4">
      <MobileTesto data={data} setData={setData} />
      <Button onClick={onComplete} disabled={!hasReadings} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Meetwaarden opslaan
      </Button>
    </div>
  );
};

export default StepMeasurements;
