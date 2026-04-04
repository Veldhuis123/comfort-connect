import { useEffect, useState } from "react";
import { Plus, Check, AlertTriangle, Wrench, User, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { BRLTechnician, BRLTool } from "@/lib/brlTypes";
import { isCertificateExpired, isToolExpired } from "@/lib/brlTypes";
import { getTechnicians, saveTechnicians, getTools, saveTools } from "@/lib/brlStorage";
import { installationsApi, type Equipment, type Technician } from "@/lib/installationsApi";
import { useToast } from "@/hooks/use-toast";

interface Props {
  technicianId: string;
  selectedTools: string[];
  onUpdate: (techId: string, toolIds: string[]) => void;
  onComplete: () => void;
}

const StepTechnician = ({ technicianId, selectedTools, onUpdate, onComplete }: Props) => {
  const [technicians, setTechnicians] = useState<BRLTechnician[]>(getTechnicians);
  const [tools, setTools] = useState<BRLTool[]>(getTools);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddTech, setShowAddTech] = useState(false);
  const [showAddTool, setShowAddTool] = useState(false);
  const [newTech, setNewTech] = useState<Partial<BRLTechnician>>({});
  const [newTool, setNewTool] = useState<Partial<BRLTool>>({});
  const { toast } = useToast();

  const mapTechnicianToBRL = (tech: Technician): BRLTechnician => ({
    id: String(tech.id),
    name: tech.name,
    certificate_number: tech.brl_certificate_number || tech.fgas_certificate_number || "",
    certificate_expiry: tech.brl_certificate_expires || tech.fgas_certificate_expires || "",
    phone: tech.phone || "",
  });

  const mapEquipmentToBRL = (tool: Equipment): BRLTool => ({
    id: String(tool.id),
    name: tool.name,
    brand: tool.brand,
    serial: tool.serial_number,
    calibration_date: tool.calibration_date || "",
    calibration_expiry: tool.calibration_valid_until || "",
  });

  useEffect(() => {
    let active = true;

    const syncExistingData = async () => {
      setIsSyncing(true);
      try {
        const [technicianRows, equipmentRows] = await Promise.all([
          installationsApi.getTechnicians(),
          installationsApi.getEquipment(),
        ]);

        if (!active) return;

        const syncedTechnicians = technicianRows
          .filter((tech) => tech.is_active !== false)
          .map(mapTechnicianToBRL);
        const syncedTools = equipmentRows
          .filter((tool) => tool.is_active !== false)
          .map(mapEquipmentToBRL);

        setTechnicians(syncedTechnicians);
        setTools(syncedTools);
        saveTechnicians(syncedTechnicians);
        saveTools(syncedTools);
      } catch {
        if (!active) return;
        toast({
          title: "Offline cache gebruikt",
          description: "Kon monteurs en gereedschap niet live ophalen.",
        });
      } finally {
        if (active) setIsSyncing(false);
      }
    };

    syncExistingData();

    return () => {
      active = false;
    };
  }, [toast]);

  const addTechnician = () => {
    if (!newTech.name) return;
    const tech: BRLTechnician = {
      id: crypto.randomUUID(),
      name: newTech.name || "",
      certificate_number: newTech.certificate_number || "",
      certificate_expiry: newTech.certificate_expiry || "",
      phone: newTech.phone || "",
    };
    const updated = [...technicians, tech];
    setTechnicians(updated);
    saveTechnicians(updated);
    setNewTech({});
    setShowAddTech(false);
  };

  const addTool = () => {
    if (!newTool.name) return;
    const tool: BRLTool = {
      id: crypto.randomUUID(),
      name: newTool.name || "",
      brand: newTool.brand || "",
      serial: newTool.serial || "",
      calibration_date: newTool.calibration_date || "",
      calibration_expiry: newTool.calibration_expiry || "",
    };
    const updated = [...tools, tool];
    setTools(updated);
    saveTools(updated);
    setNewTool({});
    setShowAddTool(false);
  };

  const toggleTool = (id: string) => {
    const next = selectedTools.includes(id) ? selectedTools.filter(t => t !== id) : [...selectedTools, id];
    onUpdate(technicianId, next);
  };

  const deleteTech = (id: string) => {
    const updated = technicians.filter(t => t.id !== id);
    setTechnicians(updated);
    saveTechnicians(updated);
    if (technicianId === id) onUpdate("", selectedTools);
  };

  const deleteTool = (id: string) => {
    const updated = tools.filter(t => t.id !== id);
    setTools(updated);
    saveTools(updated);
    onUpdate(technicianId, selectedTools.filter(t => t !== id));
  };

  const expiredWarnings = [
    ...technicians.filter(t => t.id === technicianId && isCertificateExpired(t)).map(t => `Certificaat ${t.name} is verlopen!`),
    ...tools.filter(t => selectedTools.includes(t.id) && isToolExpired(t)).map(t => `Kalibratie ${t.name} is verlopen!`),
  ];

  const isComplete = !!technicianId && selectedTools.length > 0;

  return (
    <div className="space-y-4">
      {expiredWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {expiredWarnings.map((w, i) => <p key={i} className="text-sm">{w}</p>)}
          </AlertDescription>
        </Alert>
      )}

      {/* Monteur selectie */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Monteur
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {isSyncing && <p className="text-xs text-muted-foreground">Monteurs worden geladen...</p>}
          {technicians.length === 0 && !showAddTech && (
            <p className="text-sm text-muted-foreground text-center py-4">Nog geen monteurs. Voeg hieronder een monteur toe.</p>
          )}
          {technicians.map(tech => {
            const expired = isCertificateExpired(tech);
            return (
              <div
                key={tech.id}
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 ${technicianId === tech.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => onUpdate(tech.id, selectedTools)}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{tech.name}</p>
                  <p className="text-xs text-muted-foreground">Cert: {tech.certificate_number || "—"}</p>
                </div>
                {expired && <Badge variant="destructive" className="text-xs">Verlopen</Badge>}
                {technicianId === tech.id && <Check className="h-4 w-4 text-primary" />}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); deleteTech(tech.id); }}>
                  <Trash2 className="h-3 w-3 text-destructive/60" />
                </Button>
              </div>
            );
          })}

          {showAddTech ? (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <Input placeholder="Naam" value={newTech.name || ""} onChange={e => setNewTech({ ...newTech, name: e.target.value })} className="h-10" />
              <Input placeholder="Certificaatnr." value={newTech.certificate_number || ""} onChange={e => setNewTech({ ...newTech, certificate_number: e.target.value })} className="h-10" />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Certificaat geldig t/m</Label>
                <Input type="date" value={newTech.certificate_expiry || ""} onChange={e => setNewTech({ ...newTech, certificate_expiry: e.target.value })} className="h-10" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addTechnician} className="flex-1">Opslaan</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddTech(false)}>Annuleren</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowAddTech(true)}>
              <Plus className="h-4 w-4 mr-2" /> Monteur toevoegen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Gereedschap selectie */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Gereedschap
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {isSyncing && <p className="text-xs text-muted-foreground">Gereedschap wordt geladen...</p>}
          {tools.length === 0 && !showAddTool && (
            <p className="text-sm text-muted-foreground text-center py-4">Nog geen gereedschap. Voeg hieronder gereedschap toe.</p>
          )}
          {tools.map(tool => {
            const expired = isToolExpired(tool);
            const selected = selectedTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 ${selected ? "border-primary bg-primary/5" : ""}`}
                onClick={() => toggleTool(tool.id)}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">{tool.brand} · {tool.serial || "—"}</p>
                </div>
                {expired && <Badge variant="destructive" className="text-xs">Verlopen</Badge>}
                {selected && <Check className="h-4 w-4 text-primary" />}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); deleteTool(tool.id); }}>
                  <Trash2 className="h-3 w-3 text-destructive/60" />
                </Button>
              </div>
            );
          })}

          {showAddTool ? (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <Input placeholder="Naam (bijv. Manometer)" value={newTool.name || ""} onChange={e => setNewTool({ ...newTool, name: e.target.value })} className="h-10" />
              <Input placeholder="Merk" value={newTool.brand || ""} onChange={e => setNewTool({ ...newTool, brand: e.target.value })} className="h-10" />
              <Input placeholder="Serienummer" value={newTool.serial || ""} onChange={e => setNewTool({ ...newTool, serial: e.target.value })} className="h-10" />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Kalibratie geldig t/m</Label>
                <Input type="date" value={newTool.calibration_expiry || ""} onChange={e => setNewTool({ ...newTool, calibration_expiry: e.target.value })} className="h-10" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addTool} className="flex-1">Opslaan</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddTool(false)}>Annuleren</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowAddTool(true)}>
              <Plus className="h-4 w-4 mr-2" /> Gereedschap toevoegen
            </Button>
          )}
        </CardContent>
      </Card>

      <Button onClick={onComplete} disabled={!isComplete} className="w-full h-12 text-base">
        <Check className="h-4 w-4 mr-2" /> Stap voltooien
      </Button>
    </div>
  );
};

export default StepTechnician;
