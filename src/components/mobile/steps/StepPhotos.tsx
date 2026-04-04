import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobilePhotoUpload, { type BRLPhoto } from "@/components/mobile/MobilePhotoUpload";

interface Props {
  photos: BRLPhoto[];
  setPhotos: React.Dispatch<React.SetStateAction<BRLPhoto[]>>;
  onComplete: () => void;
}

const StepPhotos = ({ photos, setPhotos, onComplete }: Props) => {
  return (
    <div className="space-y-4">
      <MobilePhotoUpload photos={photos} setPhotos={setPhotos} />
      <Button onClick={onComplete} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Foto's opslaan ({photos.length})
      </Button>
    </div>
  );
};

export default StepPhotos;
