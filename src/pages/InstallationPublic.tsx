import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Thermometer, Calendar, MapPin, Wrench, AlertTriangle, 
  CheckCircle2, Phone, Mail, Building2, Shield, Zap,
  FileText, Download, ClipboardList
} from "lucide-react";
import {
  installationsApi,
  PublicInstallation,
  CreateFaultReport,
  FaultType,
  FaultUrgency,
} from "@/lib/installationsApi";

const faultTypeLabels: Record<string, Record<FaultType, string>> = {
  default: {
    niet_koelen: "Koelt niet",
    niet_verwarmen: "Verwarmt niet",
    geluid: "Vreemd geluid",
    lekkage: "Water- of gaslekkage",
    geur: "Vreemde geur",
    foutcode: "Foutcode op display",
    overig: "Overig",
  },
  elektra: {
    niet_koelen: "Groep valt uit",
    niet_verwarmen: "Aardlekschakelaar slaat af",
    geluid: "Vreemd geluid uit kast",
    lekkage: "Brandgeur",
    geur: "Vonken/rook",
    foutcode: "Overig elektrisch probleem",
    overig: "Overig",
  },
};

const urgencyLabels: Record<FaultUrgency, string> = {
  laag: "Laag - Kan wachten",
  normaal: "Normaal - Binnen een week",
  hoog: "Hoog - Zo snel mogelijk",
  spoed: "Spoed - Acuut probleem",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  actief: { label: "Actief", color: "bg-green-500" },
  onderhoud_nodig: { label: "Onderhoud nodig", color: "bg-yellow-500" },
  storing: { label: "Storing", color: "bg-red-500" },
  buiten_gebruik: { label: "Buiten gebruik", color: "bg-gray-500" },
};

const installationTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  airco: { label: "Airco-installatie", icon: <Thermometer className="w-6 h-6" />, color: "from-blue-600 to-blue-800" },
  warmtepomp: { label: "Warmtepomp", icon: <Thermometer className="w-6 h-6" />, color: "from-orange-600 to-orange-800" },
  koeling: { label: "Koelinstallatie", icon: <Thermometer className="w-6 h-6" />, color: "from-cyan-600 to-cyan-800" },
  elektra: { label: "Elektra-installatie", icon: <Zap className="w-6 h-6" />, color: "from-amber-600 to-amber-800" },
  ventilatie: { label: "Ventilatie", icon: <Thermometer className="w-6 h-6" />, color: "from-green-600 to-green-800" },
  overig: { label: "Installatie", icon: <Wrench className="w-6 h-6" />, color: "from-gray-600 to-gray-800" },
};

const InstallationPublic = () => {
  const { qrCode } = useParams<{ qrCode: string }>();
  const { toast } = useToast();
  
  const [installation, setInstallation] = useState<PublicInstallation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFaultForm, setShowFaultForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "docs" | "storing">("info");
  
  const [faultForm, setFaultForm] = useState<CreateFaultReport>({
    reporter_name: "",
    fault_type: "overig",
    description: "",
    urgency: "normaal",
  });

  useEffect(() => {
    const fetchInstallation = async () => {
      if (!qrCode) {
        setError("Geen QR code gevonden");
        setLoading(false);
        return;
      }
      try {
        const data = await installationsApi.getInstallationByQR(qrCode);
        setInstallation(data);
      } catch {
        setError("Installatie niet gevonden. Controleer of de QR code correct is.");
      } finally {
        setLoading(false);
      }
    };
    fetchInstallation();
  }, [qrCode]);

  const handleSubmitFault = async () => {
    if (!qrCode || !faultForm.reporter_name || !faultForm.description) {
      toast({ title: "Vul alle verplichte velden in", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await installationsApi.submitFaultReport(qrCode, faultForm);
      setSubmitted(true);
      toast({ title: "Storingsmelding verzonden!" });
    } catch {
      toast({ title: "Fout", description: "Kon melding niet versturen.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Installatie ophalen...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !installation) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Niet gevonden</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeConfig = installationTypeConfig[installation.installation_type] || installationTypeConfig.overig;
  const statusInfo = statusLabels[installation.status] || statusLabels.actief;
  const currentFaultLabels = installation.installation_type === 'elektra' 
    ? faultTypeLabels.elektra : faultTypeLabels.default;
  const isElektra = installation.installation_type === 'elektra';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className={`bg-gradient-to-r ${typeConfig.color} text-white py-6 px-4`}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              {typeConfig.icon}
            </div>
            <div>
              <h1 className="text-xl font-bold">R. Veldhuis Installatie</h1>
              <p className="text-sm opacity-80">{typeConfig.label}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-md mx-auto px-4 -mt-3">
        <div className="bg-background rounded-xl shadow-lg border border-border flex overflow-hidden">
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "info" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <ClipboardList className="w-4 h-4 mx-auto mb-1" />
            Info
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "docs" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <FileText className="w-4 h-4 mx-auto mb-1" />
            {isElektra ? "Groepen" : "Rapport"}
          </button>
          <button
            onClick={() => setActiveTab("storing")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "storing" ? "bg-orange-600 text-white" : "hover:bg-muted"}`}
          >
            <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
            Storing
          </button>
        </div>
      </div>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* === INFO TAB === */}
        {activeTab === "info" && (
          <>
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{installation.name}</CardTitle>
                    <CardDescription>{installation.brand} {installation.model}</CardDescription>
                  </div>
                  <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {installation.location_description && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>{installation.location_description}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>{installation.customer_name} • {installation.customer_city}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Geïnstalleerd: {new Date(installation.installation_date).toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {installation.warranty_expires && (
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span>Garantie t/m: {new Date(installation.warranty_expires).toLocaleDateString('nl-NL')}</span>
                  </div>
                )}
                {installation.next_maintenance_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Wrench className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {isElektra ? "Volgende keuring" : "Volgende onderhoud"}: {new Date(installation.next_maintenance_date).toLocaleDateString('nl-NL')}
                      {new Date(installation.next_maintenance_date) < new Date() && (
                        <span className="text-orange-600 ml-2">(verlopen)</span>
                      )}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Maintenance */}
            {installation.recent_maintenance && installation.recent_maintenance.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    {isElektra ? "Keuringshistorie" : "Onderhoudshistorie"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {installation.recent_maintenance.map((record, index) => (
                      <div key={index} className="border-l-2 border-primary/30 pl-3 py-1">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium capitalize">{record.maintenance_type}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(record.performed_at).toLocaleDateString('nl-NL')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{record.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* === DOCS TAB (Groepenverklaring for elektra, Rapport for airco) === */}
        {activeTab === "docs" && (
          <>
            {isElektra && installation.groepenverklaring ? (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Groepenverklaring
                  </CardTitle>
                  <CardDescription>{installation.groepenverklaring.kast_naam}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {installation.groepenverklaring.rows.map((row) => (
                      <div key={row.row_number} className="border border-border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-3 py-2 text-xs font-medium">
                          Rij {row.row_number}
                        </div>
                        <div className="divide-y divide-border">
                          {row.components.map((comp, ci) => (
                            <div key={ci} className="px-3 py-2 flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium">{comp.label}</span>
                                <span className="text-muted-foreground ml-2 text-xs">{comp.type} {comp.amperage}</span>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">{comp.article}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {installation.groepenverklaring.keuring_datum && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2 text-green-700 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Gekeurd op {new Date(installation.groepenverklaring.keuring_datum).toLocaleDateString('nl-NL')}
                        </div>
                        {installation.groepenverklaring.keurmeester && (
                          <p className="text-green-600 text-xs mt-1">Keurmeester: {installation.groepenverklaring.keurmeester}</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : !isElektra ? (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Inbedrijfstellingsrapport
                  </CardTitle>
                  <CardDescription>Technische gegevens van uw installatie</CardDescription>
                </CardHeader>
                <CardContent>
                  {installation.commissioning_report ? (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(installation.commissioning_report as Record<string, string>).slice(0, 10).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-xs text-muted-foreground">{key.replace(/_/g, ' ')}</p>
                            <p className="font-medium">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nog geen rapport beschikbaar voor deze installatie.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nog geen groepenverklaring beschikbaar.</p>
                </CardContent>
              </Card>
            )}

            {/* Documents list */}
            {installation.documents && installation.documents.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Documenten</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {installation.documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border border-border">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span>{doc.name}</span>
                          <Badge variant="secondary" className="text-xs">{doc.type}</Badge>
                        </div>
                        {doc.url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* === STORING TAB === */}
        {activeTab === "storing" && (
          <>
            {!submitted ? (
              <Card className="border-orange-200 bg-orange-50/50 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="w-4 h-4" />
                    {isElektra ? "Elektrisch probleem melden" : "Storing melden"}
                  </CardTitle>
                  <CardDescription>
                    {isElektra 
                      ? "Meld hier een elektrisch probleem aan uw installatie."
                      : "Heeft uw installatie een probleem? Meld het hier direct."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Uw naam *</label>
                      <Input
                        value={faultForm.reporter_name}
                        onChange={(e) => setFaultForm({ ...faultForm, reporter_name: e.target.value })}
                        placeholder="Vul uw naam in"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">Telefoon</label>
                        <Input
                          value={faultForm.reporter_phone || ""}
                          onChange={(e) => setFaultForm({ ...faultForm, reporter_phone: e.target.value })}
                          placeholder="06-12345678"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">E-mail</label>
                        <Input
                          type="email"
                          value={faultForm.reporter_email || ""}
                          onChange={(e) => setFaultForm({ ...faultForm, reporter_email: e.target.value })}
                          placeholder="uw@email.nl"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Type probleem *</label>
                      <Select
                        value={faultForm.fault_type}
                        onValueChange={(v) => setFaultForm({ ...faultForm, fault_type: v as FaultType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(currentFaultLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Urgentie</label>
                      <Select
                        value={faultForm.urgency}
                        onValueChange={(v) => setFaultForm({ ...faultForm, urgency: v as FaultUrgency })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(urgencyLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Omschrijving probleem *</label>
                      <Textarea
                        value={faultForm.description}
                        onChange={(e) => setFaultForm({ ...faultForm, description: e.target.value })}
                        placeholder={isElektra 
                          ? "Beschrijf het elektrische probleem zo duidelijk mogelijk..."
                          : "Beschrijf het probleem zo duidelijk mogelijk..."}
                        rows={4}
                      />
                    </div>
                    
                    <Button
                      onClick={handleSubmitFault}
                      disabled={submitting}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      {submitting ? "Verzenden..." : "Melding versturen"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-700 mb-2">Melding ontvangen!</h3>
                  <p className="text-sm text-green-600">Wij nemen zo snel mogelijk contact met u op.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="tel:+31613629947" className="flex items-center gap-3 text-sm hover:text-primary">
              <Phone className="w-4 h-4" />
              <span>06-13629947</span>
            </a>
            <a href="mailto:info@rv-installatie.nl" className="flex items-center gap-3 text-sm hover:text-primary">
              <Mail className="w-4 h-4" />
              <span>info@rv-installatie.nl</span>
            </a>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>© {new Date().getFullYear()} R. Veldhuis Installatie</p>
          <p className="mt-1">Airco • Elektra • Verwarming</p>
        </div>
      </main>
    </div>
  );
};

export default InstallationPublic;