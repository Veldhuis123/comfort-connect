import { Check, X, Download, Mail, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateCommissioningPDF } from "@/lib/commissioningPdfExport";
import { WIZARD_STEPS, type BRLReport } from "@/lib/brlTypes";
import { getTechnicians, getTools } from "@/lib/brlStorage";
import { useState } from "react";

interface Props {
  report: BRLReport;
  onUpdateEmail: (email: string) => void;
  onMarkSent: () => void;
}

const StepReview = ({ report, onUpdateEmail, onMarkSent }: Props) => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const allComplete = report.steps_completed.slice(0, 6).every(Boolean);

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

  return (
    <div className="space-y-4">
      {/* Stappen overzicht */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Stappen controle</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {WIZARD_STEPS.slice(0, 6).map((step, i) => (
            <div key={step.id} className="flex items-center justify-between py-1">
              <span className="text-sm">{step.label}</span>
              {report.steps_completed[i] ? (
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
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Samenvatting</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 text-sm space-y-1">
          <p><span className="text-muted-foreground">Klant:</span> {report.customer_data.customer_name || "—"}</p>
          <p><span className="text-muted-foreground">Adres:</span> {report.customer_data.customer_address || "—"}</p>
          <p><span className="text-muted-foreground">Monteur:</span> {technician?.name || "—"}</p>
          <p><span className="text-muted-foreground">Apparaat:</span> {report.customer_data.brand} {report.customer_data.model_outdoor}</p>
          <p><span className="text-muted-foreground">Serienr.:</span> {report.customer_data.serial_outdoor || "—"}</p>
          <p><span className="text-muted-foreground">Foto's:</span> {report.photos.length}</p>
          <p><span className="text-muted-foreground">Gereedschap:</span> {tools.map(t => t.name).join(", ") || "—"}</p>
        </CardContent>
      </Card>

      {/* PDF & Email */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Button onClick={handleDownload} className="w-full h-14 text-base" size="lg" disabled={!allComplete}>
            <Download className="h-5 w-5 mr-2" />
            {allComplete ? "PDF Downloaden" : "Voltooi alle stappen eerst"}
          </Button>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-mail klant</Label>
            <Input
              type="email"
              value={report.customer_email}
              onChange={e => onUpdateEmail(e.target.value)}
              placeholder="klant@voorbeeld.nl"
              className="h-11 text-base"
            />
          </div>
          <Button
            onClick={handleEmail}
            variant="outline"
            className="w-full h-12"
            disabled={!report.customer_email || !allComplete || sending}
          >
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Rapport e-mailen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StepReview;
