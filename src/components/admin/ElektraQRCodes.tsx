import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, QrCode, Plus, Trash2, Copy } from "lucide-react";
import { type GroepenkastConfig } from "@/lib/eatonProducts";
import QRCode from "qrcode";
import { toast } from "@/hooks/use-toast";

interface QRConfig {
  id: string;
  label: string;
  configId: string;
  url: string;
  createdAt: string;
}

const ElektraQRCodes = () => {
  const [qrConfigs, setQrConfigs] = useState<QRConfig[]>(() => {
    try {
      const stored = localStorage.getItem("rv_elektra_qrcodes");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [groepenkasten, setGroepenkasten] = useState<GroepenkastConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [label, setLabel] = useState("");
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("rv_groepenkasten");
      setGroepenkasten(stored ? JSON.parse(stored) : []);
    } catch { setGroepenkasten([]); }
  }, []);

  useEffect(() => {
    qrConfigs.forEach(async (qr) => {
      if (!qrImages[qr.id]) {
        const dataUrl = await QRCode.toDataURL(qr.url, { width: 256, margin: 2, color: { dark: "#1e293b" } });
        setQrImages(prev => ({ ...prev, [qr.id]: dataUrl }));
      }
    });
  }, [qrConfigs]);

  const save = (updated: QRConfig[]) => {
    setQrConfigs(updated);
    localStorage.setItem("rv_elektra_qrcodes", JSON.stringify(updated));
  };

  const addQR = () => {
    if (!selectedConfig || !label) return;
    const config = groepenkasten.find(g => g.id === selectedConfig);
    if (!config) return;
    
    const id = `qr-${Date.now()}`;
    // URL naar publieke documentatie pagina
    const url = `${window.location.origin}/meterkast/${id}`;
    const newQR: QRConfig = { id, label, configId: selectedConfig, url, createdAt: new Date().toISOString() };
    save([...qrConfigs, newQR]);
    setLabel("");
    toast({ title: "QR-code aangemaakt" });
  };

  const deleteQR = (id: string) => {
    save(qrConfigs.filter(q => q.id !== id));
  };

  const downloadQR = async (qr: QRConfig) => {
    const dataUrl = await QRCode.toDataURL(qr.url, { width: 512, margin: 2, color: { dark: "#1e293b" } });
    const link = document.createElement("a");
    link.download = `qr-${qr.label.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL gekopieerd" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">QR-codes Meterkast</h1>
        <p className="text-sm text-muted-foreground">Genereer QR-codes voor op de meterkast met link naar documentatie & groepenverklaring</p>
      </div>

      {/* Create new QR */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Nieuwe QR-code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Label</label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="bijv. Meterkast woning" className="mt-1" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground">Groepenkast</label>
              <select 
                value={selectedConfig} 
                onChange={e => setSelectedConfig(e.target.value)}
                className="mt-1 w-full h-9 px-3 border border-input rounded-md text-sm bg-background"
              >
                <option value="">Selecteer...</option>
                {groepenkasten.map(g => (
                  <option key={g.id} value={g.id}>{g.name}{g.customer ? ` — ${g.customer}` : ""}</option>
                ))}
              </select>
            </div>
            <Button onClick={addQR} disabled={!selectedConfig || !label}>
              <Plus className="w-4 h-4 mr-1" />Aanmaken
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR list */}
      {qrConfigs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <QrCode className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nog geen QR-codes aangemaakt</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrConfigs.map(qr => (
            <Card key={qr.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{qr.label}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(qr.createdAt).toLocaleDateString("nl-NL")}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {groepenkasten.find(g => g.id === qr.configId)?.name || "Onbekend"}
                  </Badge>
                </div>
                
                {qrImages[qr.id] && (
                  <div className="flex justify-center">
                    <img src={qrImages[qr.id]} alt={`QR ${qr.label}`} className="w-32 h-32" />
                  </div>
                )}

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
                  <span className="truncate flex-1">{qr.url}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyUrl(qr.url)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>

                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => downloadQR(qr)}>
                    <Download className="w-3 h-3 mr-1" />Download
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteQR(qr.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ElektraQRCodes;
