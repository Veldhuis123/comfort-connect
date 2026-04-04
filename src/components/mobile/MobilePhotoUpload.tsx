import { useState, useRef } from "react";
import { Camera, Image, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface BRLPhoto {
  id: string;
  file: File;
  preview: string;
  category: string;
}

const photoCategories = [
  { value: "buitenunit", label: "Buitenunit" },
  { value: "binnenunit", label: "Binnenunit" },
  { value: "leidingwerk", label: "Leidingwerk" },
  { value: "elektra", label: "Elektrische aansluiting" },
  { value: "typeplaatje", label: "Typeplaatje" },
  { value: "condensafvoer", label: "Condensafvoer" },
  { value: "overig", label: "Overig" },
];

interface Props {
  photos: BRLPhoto[];
  setPhotos: React.Dispatch<React.SetStateAction<BRLPhoto[]>>;
}

const MobilePhotoUpload = ({ photos, setPhotos }: Props) => {
  const [selectedCategory, setSelectedCategory] = useState("overig");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPhotos: BRLPhoto[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      category: selectedCategory,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const groupedPhotos = photoCategories
    .map(cat => ({ ...cat, photos: photos.filter(p => p.category === cat.value) }))
    .filter(cat => cat.photos.length > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Foto toevoegen</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Categorie</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {photoCategories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-5 w-5" />
              <span className="text-xs">Camera</span>
            </Button>
            <Button variant="outline" className="h-14 flex-col gap-1" onClick={() => fileInputRef.current?.click()}>
              <Image className="h-5 w-5" />
              <span className="text-xs">Bibliotheek</span>
            </Button>
          </div>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFiles(e.target.files)} />
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        </CardContent>
      </Card>

      {groupedPhotos.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Foto's ({photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {groupedPhotos.map(group => (
              <div key={group.value}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{group.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {group.photos.map(photo => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={photo.preview} alt={group.label} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MobilePhotoUpload;
