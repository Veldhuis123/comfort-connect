import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Calendar, Grid3X3, Zap } from "lucide-react";
import { type GroepenkastConfig, EATON_COMPONENTS } from "@/lib/eatonProducts";
import { generateGroepenverklaringPdf } from "@/lib/groepenverklaringPdf";
import { toast } from "@/hooks/use-toast";

interface Props {
  onOpenConfigurator: (index?: number) => void;
}

const ElektraGroepenkasten = ({ onOpenConfigurator }: Props) => {
  const [configs, setConfigs] = useState<GroepenkastConfig[]>(() => {
    try {
      const stored = localStorage.getItem("rv_groepenkasten");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const refresh = () => {
    try {
      const stored = localStorage.getItem("rv_groepenkasten");
      setConfigs(stored ? JSON.parse(stored) : []);
    } catch { setConfigs([]); }
  };

  const deleteConfig = (index: number) => {
    if (!confirm("Weet je zeker dat je deze groepenkast wilt verwijderen?")) return;
    const updated = configs.filter((_, i) => i !== index);
    localStorage.setItem("rv_groepenkasten", JSON.stringify(updated));
    setConfigs(updated);
  };

  const getConfigStats = (config: GroepenkastConfig) => {
    const totalComponents = config.rows.reduce((s, r) => s + r.components.length, 0);
    const totalModules = config.rows.reduce((sum, row) =>
      sum + row.components.reduce((s, c) => {
        const comp = EATON_COMPONENTS.find(e => e.id === c.componentId);
        return s + (comp?.modules || 0) * c.quantity;
      }, 0), 0);
    const totalPrice = config.rows.reduce((sum, row) =>
      sum + row.components.reduce((s, c) => {
        const comp = EATON_COMPONENTS.find(e => e.id === c.componentId);
        return s + (comp?.price || 0) * c.quantity;
      }, 0), 0);
    return { totalComponents, totalModules, totalPrice };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Groepenkasten</h1>
          <p className="text-sm text-muted-foreground">Overzicht van alle geconfigureerde Eaton groepenkasten</p>
        </div>
        <Button onClick={() => onOpenConfigurator()}><Zap className="w-4 h-4 mr-2" />Nieuwe kast</Button>
      </div>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Grid3X3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nog geen groepenkasten geconfigureerd</p>
            <Button variant="outline" className="mt-4" onClick={() => onOpenConfigurator()}>Eerste kast aanmaken</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config, i) => {
            const stats = getConfigStats(config);
            return (
              <Card key={config.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onOpenConfigurator(i)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">{config.name}</CardTitle>
                    <Badge variant="secondary" className="text-[10px]">{stats.totalModules} TE</Badge>
                  </div>
                  {config.customer && <p className="text-xs text-muted-foreground">{config.customer}</p>}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{stats.totalComponents} groepen</span>
                    <span className="font-medium text-foreground">€{stats.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(config.updatedAt).toLocaleDateString("nl-NL")}
                  </div>
                  <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={async () => {
                      await generateGroepenverklaringPdf(config);
                      toast({ title: "PDF geëxporteerd" });
                    }}>
                      <FileText className="w-3 h-3 mr-1" />PDF
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => deleteConfig(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ElektraGroepenkasten;
