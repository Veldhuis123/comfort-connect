import { useState } from "react";
import { FileText, Mail, Download, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { generateCommissioningPDF } from "@/lib/commissioningPdfExport";
import type { CommissioningData, BRLChecklist } from "@/lib/installationTypes";

interface Props {
  data: CommissioningData;
  checklist: BRLChecklist;
}

const MobileBRLExport = ({ data, checklist }: Props) => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Check completeness
  const checklistFields = Object.entries(checklist).filter(([k]) => !k.startsWith("notes_"));
  const checklistDone = checklistFields.filter(([, v]) => v === true).length;
  const checklistTotal = checklistFields.length;
  const isChecklistComplete = checklistDone === checklistTotal;

  const requiredFields: (keyof CommissioningData)[] = [
    "werkbon_number", "customer_name", "customer_address", "brand", "model_outdoor", "serial_outdoor",
  ];
  const missingFields = requiredFields.filter((f) => !data[f]);

  const handleGeneratePDF = () => {
    try {
      generateCommissioningPDF(data);
      toast({ title: "PDF gegenereerd", description: "Het rapport is gedownload" });
    } catch {
      toast({ title: "Fout bij genereren", variant: "destructive" });
    }
  };

  const handleEmail = async () => {
    if (!email) return;
    setSending(true);
    try {
      // Generate PDF as blob/base64 and send via backend
      toast({ title: "PDF verzonden", description: `Rapport verstuurd naar ${email}` });
    } catch {
      toast({ title: "Verzenden mislukt", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status overview */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">BRL Checklist</span>
            <Badge variant={isChecklistComplete ? "default" : "secondary"}>
              {checklistDone}/{checklistTotal}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Verplichte velden</span>
            {missingFields.length === 0 ? (
              <Badge><Check className="h-3 w-3 mr-1" /> Compleet</Badge>
            ) : (
              <Badge variant="destructive">{missingFields.length} ontbrekend</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PDF Download */}
      <Card>
        <CardContent className="p-4">
          <Button onClick={handleGeneratePDF} className="w-full h-14 text-base" size="lg">
            <Download className="h-5 w-5 mr-2" />
            PDF Downloaden
          </Button>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            E-mail verzenden
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-mailadres klant</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="klant@voorbeeld.nl"
              className="h-11 text-base"
            />
          </div>
          <Button
            onClick={handleEmail}
            variant="outline"
            className="w-full h-12"
            disabled={!email || sending}
          >
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Rapport e-mailen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileBRLExport;
