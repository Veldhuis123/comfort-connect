import { useCallback } from "react";
import { Check, ScanLine, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import type { CommissioningData } from "@/lib/installationTypes";

interface Props {
  data: CommissioningData;
  setData: (data: CommissioningData) => void;
  onComplete: () => void;
}

const brands = ["Daikin", "Mitsubishi Electric", "Mitsubishi Heavy", "Samsung", "LG", "Toshiba", "Panasonic", "Haier", "Gree", "Midea", "Anders"];

const StepEquipment = ({ data, setData, onComplete }: Props) => {
  const updateField = (key: keyof CommissioningData, value: string) => {
    setData({ ...data, [key]: value });
  };

  const onDetected = useCallback((target: string, value: string) => {
    updateField(target as keyof CommissioningData, value);
  }, [data, setData]);

  const { scanning, videoRef, startScanning, stopScanning } = useBarcodeScanner(onDetected);

  const isComplete = !!data.brand && !!data.model_outdoor && !!data.serial_outdoor;

  return (
    <div className="space-y-4">
      {scanning && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="relative flex-1">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-32 border-2 border-white/80 rounded-lg" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-center py-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Richt op barcode of serienummer...
            </div>
          </div>
          <div className="bg-black p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
            <Button onClick={stopScanning} variant="outline" className="w-full h-12 text-base text-white border-white/40 hover:bg-white/10">
              <X className="h-4 w-4 mr-2" /> Sluiten
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Merk & Model</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Merk</Label>
            <Select value={data.brand} onValueChange={v => updateField("brand", v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecteer merk" /></SelectTrigger>
              <SelectContent>
                {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Koudemiddel</Label>
            <Select value={data.refrigerant_type} onValueChange={v => updateField("refrigerant_type", v)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["R32", "R410A", "R290", "R134a", "R407C"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Buitenunit</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Model</Label>
            <Input value={data.model_outdoor} onChange={e => updateField("model_outdoor", e.target.value)} className="h-11 text-base" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Serienummer</Label>
            <div className="flex gap-2">
              <Input value={data.serial_outdoor} onChange={e => updateField("serial_outdoor", e.target.value)} className="h-11 text-base flex-1" />
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => startScanning("serial_outdoor")}>
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fabrieksvulling (g)</Label>
            <Input type="number" inputMode="decimal" value={data.standard_charge} onChange={e => updateField("standard_charge", e.target.value)} className="h-11 text-base" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bijvulling (g)</Label>
            <Input type="number" inputMode="decimal" value={data.additional_charge} onChange={e => updateField("additional_charge", e.target.value)} className="h-11 text-base" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Binnenunit</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Model</Label>
            <Input value={data.model_indoor} onChange={e => updateField("model_indoor", e.target.value)} className="h-11 text-base" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Serienummer</Label>
            <div className="flex gap-2">
              <Input value={data.serial_indoor} onChange={e => updateField("serial_indoor", e.target.value)} className="h-11 text-base flex-1" />
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => startScanning("serial_indoor")}>
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onComplete} disabled={!isComplete} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Stap voltooien
      </Button>
    </div>
  );
};

export default StepEquipment;
