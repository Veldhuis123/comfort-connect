import { useState } from "react";
import { Check, X, Download, Mail, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateCommissioningPDF } from "@/lib/commissioningPdfExport";
import { WIZARD_STEPS, type BRLReport } from "@/lib/brlTypes";
import { getTechnicians, getTools } from "@/lib/brlStorage";
import MobilePhotoUpload, { type BRLPhoto } from "@/components/mobile/MobilePhotoUpload";
import MobileTesto from "@/components/mobile/MobileTesto";
import type { CommissioningData, BRLChecklist } from "@/lib/installationTypes";

interface Props {
  report: BRLReport;
  data: CommissioningData;
  setData: (data: CommissioningData) => void;
  checklist: BRLChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<BRLChecklist>>;
  photos: BRLPhoto[];
  setPhotos: React.Dispatch<React.SetStateAction<BRLPhoto[]>>;
  onUpdateEmail: (email: string) => void;
  onMarkSent: () => void;
  onComplete: () => void;
}

const opleveringItems = [
  { key: "cooling_tested" as const, label: "Koeling getest", desc: "Koelfunctie getest en goed bevonden" },
  { key: "heating_tested" as const, label: "Verwarming getest", desc: "Verwarmingsfunctie getest en goed bevonden" },
  { key: "controls_explained" as const, label: "Bediening uitgelegd", desc: "Klant is geïnstrueerd over bediening en afstandsbediening" },
  { key: "documentation_handed" as const, label: "Documentatie overhandigd", desc: "Handleiding en garantiecertificaat afgegeven" },
];

const StepOplevering = ({ report, data, setData, checklist, setChecklist, photos, setPhotos, onUpdateEmail, onMarkSent, onComplete }: Props) => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const allPrevComplete = report.steps_completed.slice(0, 7).every(Boolean);
  const allOplChecked = opleveringItems.every(i => checklist[i.key]);

  const technician = getTechnicians().find(t => t.id === report.technician_id);
  const tools = getTools().filter(t => report.selected_tools.includes(t.id));

  const handleDownload = async () => {
    try {
      const { doc } = await generateCommissioningPDF(report.customer_data, report.customer_data.customer_name || "BRL-rapport");
      doc.save(`BRL-rapport-${report.customer_data.werkbon_number || "concept"}.pdf`);
      toast({ title: "PDF gedownload" });
    } catch {
      toast({ title: "PDF fout", variant: "destructive" });
    }
  };

  const handleEmail = async () => {
    if (!report.customer_email) return;
    setSending(true);
    try {
      toast({ title: "PDF verzonden", description: `Rapport verstuurd naar ${report.customer_email}` });
      onMarkSent();
    } catch {
      toast({ title: "Verzenden mislukt", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const updateMeasurement = (key: keyof CommissioningData, value: string) => {
    setData({ ...data, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Meetwaarden */}
      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Meetwaarden na inbedrijfstelling</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <MobileTesto data={data} setData={(fn) => {
            if (typeof fn === 'function') {
              setData(fn(data));
            } else {
              setData(fn);
            }
          }} />
        </CardContent>
      </Card>

      {/* Checklist Oplevering */}
      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Checklist Oplevering</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {opleveringItems.map(item => (
            <label key={item.key} className="flex items-start gap-3 py-2 px-2 rounded-lg cursor-pointer active:bg-muted/50">
              <Checkbox checked={checklist[item.key] as boolean} onCheckedChange={() => setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))} className="h-6 w-6 mt-0.5" />
              <div>
                <span className="text-sm font-medium">{item.label}</span>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </label>
          ))}
          <Textarea placeholder="Opmerkingen oplevering..." value={checklist.notes_step7} onChange={e => setChecklist(prev => ({ ...prev, notes_step7: e.target.value }))} rows={2} className="mt-2" />
        </CardContent>
      </Card>

      {/* Foto's */}
      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Foto's ({photos.length})</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <MobilePhotoUpload photos={photos} setPhotos={setPhotos} />
        </CardContent>
      </Card>

      {/* Stappen controle */}
      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Stappen controle</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {WIZARD_STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center justify-between py-1">
              <span className="text-sm">{step.label}</span>
              {report.steps_completed[i] || (i === 7 && allOplChecked) ? (
                <Badge className="bg-green-100 text-green-800 border-0"><Check className="h-3 w-3 mr-1" /> Klaar</Badge>
              ) : (
                <Badge variant="secondary"><X className="h-3 w-3 mr-1" /> Open</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Samenvatting */}
      <Card>
        <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Samenvatting</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 text-sm space-y-1">
          <p><span className="text-muted-foreground">Werkbon:</span> {report.customer_data.werkbon_number || "—"}</p>
          <p><span className="text-muted-foreground">Klant:</span> {report.customer_data.customer_name || "—"}</p>
          <p><span className="text-muted-foreground">Adres:</span> {report.customer_data.customer_address || "—"}</p>
          <p><span className="text-muted-foreground">Monteur:</span> {technician?.name || data.technician_name || "—"}</p>
          <p><span className="text-muted-foreground">Apparaat:</span> {report.customer_data.brand} {report.customer_data.model_outdoor}</p>
          <p><span className="text-muted-foreground">Serienr.:</span> {report.customer_data.serial_outdoor || "—"}</p>
          <p><span className="text-muted-foreground">Foto's:</span> {photos.length}</p>
          <p><span className="text-muted-foreground">Gereedschap:</span> {tools.map(t => t.name).join(", ") || "—"}</p>
        </CardContent>
      </Card>

      {/* PDF & Email */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Button onClick={handleDownload} className="w-full h-14 text-base" size="lg" disabled={!allPrevComplete}>
            <Download className="h-5 w-5 mr-2" />
            {allPrevComplete ? "PDF Downloaden" : "Voltooi alle stappen eerst"}
          </Button>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-mail klant</Label>
            <Input type="email" value={report.customer_email} onChange={e => onUpdateEmail(e.target.value)} placeholder="klant@voorbeeld.nl" className="h-11 text-base" />
          </div>
          <Button onClick={handleEmail} variant="outline" className="w-full h-12" disabled={!report.customer_email || !allPrevComplete || sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Rapport e-mailen
          </Button>
        </CardContent>
      </Card>

      <Button onClick={onComplete} disabled={!allOplChecked} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Oplevering voltooien
      </Button>
    </div>
  );
};

export default StepOplevering;
