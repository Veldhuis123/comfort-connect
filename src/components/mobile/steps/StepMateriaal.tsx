import { useState, useRef, useEffect, useCallback } from "react";
import { Check, ScanLine, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { CommissioningData, BRLChecklist } from "@/lib/installationTypes";

interface Props {
  data: CommissioningData;
  setData: (data: CommissioningData) => void;
  checklist: BRLChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<BRLChecklist>>;
  onComplete: () => void;
}

const brands = ["Daikin", "Mitsubishi Electric", "Mitsubishi Heavy", "Samsung", "LG", "Toshiba", "Panasonic", "Haier", "Gree", "Midea", "Anders"];

const StepMateriaal = ({ data, setData, checklist, setChecklist, onComplete }: Props) => {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [scanTarget, setScanTarget] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const updateField = (key: keyof CommissioningData, value: string) => { setData({ ...data, [key]: value }); };

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanning(false); setScanTarget(null);
  }, []);

  useEffect(() => { return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }; }, []);

  const startScanning = async (target: string) => {
    setScanTarget(target); setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix'] });
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try { const barcodes = await detector.detect(videoRef.current); if (barcodes.length > 0) { updateField(target as keyof CommissioningData, barcodes[0].rawValue); toast({ title: "Gescand!", description: barcodes[0].rawValue }); stopScanning(); } } catch {}
        }, 300);
      } else { toast({ title: "Barcode scanner niet beschikbaar", description: "Voer het serienummer handmatig in." }); }
    } catch { toast({ title: "Camera kon niet worden geopend", variant: "destructive" }); stopScanning(); }
  };

  const checklistItems = [
    { key: "equipment_checked" as const, label: "Apparatuur gecontroleerd op transportschade", desc: "Binnen- en buitenunit visueel geïnspecteerd" },
    { key: "refrigerant_verified" as const, label: "Koudemiddel type geverifieerd", desc: "Type en hoeveelheid conform specificaties fabrikant" },
    { key: "tools_calibrated" as const, label: "Meetgereedschap gekalibreerd", desc: "Manometerset, lekdetector en vacuümpomp in orde" },
    { key: "safety_equipment_present" as const, label: "Veiligheidsuitrusting aanwezig", desc: "PBM's, brandblusser (indien nodig), EHBO" },
  ];

  const isComplete = !!data.brand && !!data.model_outdoor && !!data.serial_outdoor;

  return (
    <div className="space-y-4">
      {scanning && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="relative flex-1">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
            <div className="absolute inset-0 flex items-center justify-center"><div className="w-64 h-32 border-2 border-white/80 rounded-lg" /></div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-center py-3 text-sm"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Richt op barcode...</div>
          </div>
          <div className="bg-black p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
            <Button onClick={stopScanning} variant="outline" className="w-full h-12 text-base text-white border-white/40 hover:bg-white/10"><X className="h-4 w-4 mr-2" /> Sluiten</Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Merk & Type</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Merk*</Label>
            <Select value={data.brand} onValueChange={v => updateField("brand", v)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecteer merk" /></SelectTrigger>
              <SelectContent>{brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Koudemiddel</Label>
            <Select value={data.refrigerant_type} onValueChange={v => updateField("refrigerant_type", v)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{["R32", "R410A", "R290", "R134a", "R407C"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Buitenunit</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Model*</Label>
            <Input value={data.model_outdoor} onChange={e => updateField("model_outdoor", e.target.value)} className="h-11 text-base" placeholder="bijv. RXM25N" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Serienummer*</Label>
            <div className="flex gap-2">
              <Input value={data.serial_outdoor} onChange={e => updateField("serial_outdoor", e.target.value)} className="h-11 text-base flex-1" />
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => startScanning("serial_outdoor")}><ScanLine className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Binnenunit 1</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Model</Label>
            <Input value={data.model_indoor} onChange={e => updateField("model_indoor", e.target.value)} className="h-11 text-base" placeholder="bijv. FTXM25R" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Serienummer</Label>
            <div className="flex gap-2">
              <Input value={data.serial_indoor} onChange={e => updateField("serial_indoor", e.target.value)} className="h-11 text-base flex-1" />
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => startScanning("serial_indoor")}><ScanLine className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Materiaal */}
      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Checklist Materiaal</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {checklistItems.map(item => (
            <label key={item.key} className="flex items-start gap-3 py-2 px-2 rounded-lg cursor-pointer active:bg-muted/50">
              <Checkbox checked={checklist[item.key] as boolean} onCheckedChange={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))} className="h-6 w-6 mt-0.5" />
              <div>
                <span className="text-sm font-medium">{item.label}</span>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </label>
          ))}
          <Textarea placeholder="Opmerkingen materiaal..." value={checklist.notes_step2} onChange={e => setChecklist(prev => ({ ...prev, notes_step2: e.target.value }))} rows={2} className="mt-2" />
        </CardContent>
      </Card>

      <Button onClick={onComplete} disabled={!isComplete} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Stap voltooien
      </Button>
    </div>
  );
};

export default StepMateriaal;
