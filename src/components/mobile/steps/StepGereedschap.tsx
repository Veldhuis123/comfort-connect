import { useEffect, useState } from "react";
import { Plus, Check, AlertTriangle, Wrench, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { BRLTool } from "@/lib/brlTypes";
import { isToolExpired } from "@/lib/brlTypes";
import { getTools, saveTools } from "@/lib/brlStorage";
import { installationsApi } from "@/lib/installationsApi";
import { useToast } from "@/hooks/use-toast";

interface Props {
  technicianId: string;
  selectedTools: string[];
  onUpdate: (techId: string, toolIds: string[]) => void;
  onComplete: () => void;
}

const StepGereedschap = ({ technicianId, selectedTools, onUpdate, onComplete }: Props) => {
  const [tools, setTools] = useState<BRLTool[]>(getTools);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddTool, setShowAddTool] = useState(false);
  const [newTool, setNewTool] = useState<Partial<BRLTool>>({});
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    const sync = async () => {
      setIsSyncing(true);
      try {
        const equipmentRows = await installationsApi.getEquipment();
        if (!active) return;
        const syncedTools = equipmentRows.filter(t => t.is_active !== false).map(t => ({
          id: String(t.id), name: t.name, brand: t.brand, serial: t.serial_number,
          calibration_date: t.calibration_date || "", calibration_expiry: t.calibration_valid_until || "",
        }));
        setTools(syncedTools);
        saveTools(syncedTools);
      } catch {
        if (active) toast({ title: "Offline cache gebruikt", description: "Kon gereedschap niet live ophalen." });
      } finally {
        if (active) setIsSyncing(false);
      }
    };
    sync();
    return () => { active = false; };
  }, [toast]);

  const toggleTool = (id: string) => {
    const next = selectedTools.includes(id) ? selectedTools.filter(t => t !== id) : [...selectedTools, id];
    onUpdate(technicianId, next);
  };

  const addTool = () => {
    if (!newTool.name) return;
    const tool: BRLTool = { id: crypto.randomUUID(), name: newTool.name || "", brand: newTool.brand || "", serial: newTool.serial || "", calibration_date: newTool.calibration_date || "", calibration_expiry: newTool.calibration_expiry || "" };
    const updated = [...tools, tool];
    setTools(updated);
    saveTools(updated);
    setNewTool({});
    setShowAddTool(false);
  };

  const deleteTool = (id: string) => {
    const updated = tools.filter(t => t.id !== id);
    setTools(updated);
    saveTools(updated);
    onUpdate(technicianId, selectedTools.filter(t => t !== id));
  };

  const expiredWarnings = tools.filter(t => selectedTools.includes(t.id) && isToolExpired(t)).map(t => `Kalibratie ${t.name} is verlopen!`);
  const isComplete = selectedTools.length > 0;

  return (
    <div className="space-y-4">
      {expiredWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{expiredWarnings.map((w, i) => <p key={i} className="text-sm">{w}</p>)}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Gereedschap selecteren</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground">BRL 100: Selecteer het gebruikte meetgereedschap. Serienummers en kalibratiedata worden meegenomen in het rapport.</p>
          {isSyncing && <p className="text-xs text-muted-foreground">Laden...</p>}
          {tools.map(tool => {
            const expired = isToolExpired(tool);
            const selected = selectedTools.includes(tool.id);
            return (
              <div key={tool.id} className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 ${selected ? "border-primary bg-primary/5" : ""}`} onClick={() => toggleTool(tool.id)}>
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

export default StepGereedschap;
