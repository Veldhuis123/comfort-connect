import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, Trash2, Copy, FileText, Save, Download, Zap, Grid3X3
} from "lucide-react";
import { 
  EATON_COMPONENTS, COMPONENT_CATEGORIES, COMMON_GROUP_LABELS,
  type EatonComponent, type GroepenkastConfig, type GroepenkastRow, type SelectedComponent,
  generateConfigId, generateRowId, generateComponentId
} from "@/lib/eatonProducts";
import { generateGroepenverklaringPdf } from "@/lib/groepenverklaringPdf";
import { toast } from "@/hooks/use-toast";

const emptyConfig = (): GroepenkastConfig => ({
  id: generateConfigId(),
  name: "Nieuwe Groepenkast",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  rows: [{ id: generateRowId(), label: "Rij 1", components: [] }],
});

const GroepenkastConfigurator = () => {
  const [configs, setConfigs] = useState<GroepenkastConfig[]>(() => {
    try {
      const stored = localStorage.getItem("rv_groepenkasten");
      return stored ? JSON.parse(stored) : [emptyConfig()];
    } catch { return [emptyConfig()]; }
  });
  const [activeConfigIndex, setActiveConfigIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("installatieautomaat");

  const config = configs[activeConfigIndex] || emptyConfig();

  const saveConfigs = useCallback((updated: GroepenkastConfig[]) => {
    setConfigs(updated);
    localStorage.setItem("rv_groepenkasten", JSON.stringify(updated));
  }, []);

  const updateConfig = (patch: Partial<GroepenkastConfig>) => {
    const updated = [...configs];
    updated[activeConfigIndex] = { ...config, ...patch, updatedAt: new Date().toISOString() };
    saveConfigs(updated);
  };

  const addRow = () => {
    updateConfig({ rows: [...config.rows, { id: generateRowId(), label: `Rij ${config.rows.length + 1}`, components: [] }] });
  };

  const removeRow = (rowId: string) => {
    updateConfig({ rows: config.rows.filter(r => r.id !== rowId) });
  };

  const addComponent = (rowId: string, component: EatonComponent, label: string) => {
    updateConfig({
      rows: config.rows.map(r => r.id === rowId ? {
        ...r, components: [...r.components, { id: generateComponentId(), componentId: component.id, label, quantity: 1 }]
      } : r)
    });
  };

  const removeComponent = (rowId: string, compId: string) => {
    updateConfig({
      rows: config.rows.map(r => r.id === rowId ? {
        ...r, components: r.components.filter(c => c.id !== compId)
      } : r)
    });
  };

  const updateComponentLabel = (rowId: string, compId: string, label: string) => {
    updateConfig({
      rows: config.rows.map(r => r.id === rowId ? {
        ...r, components: r.components.map(c => c.id === compId ? { ...c, label } : c)
      } : r)
    });
  };

  const filteredComponents = EATON_COMPONENTS.filter(c => c.category === selectedCategory);

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

  const addNewConfig = () => {
    const updated = [...configs, emptyConfig()];
    saveConfigs(updated);
    setActiveConfigIndex(updated.length - 1);
  };

  const duplicateConfig = () => {
    const copy = { ...config, id: generateConfigId(), name: config.name + " (kopie)", createdAt: new Date().toISOString() };
    const updated = [...configs, copy];
    saveConfigs(updated);
    setActiveConfigIndex(updated.length - 1);
  };

  const deleteConfig = () => {
    if (configs.length <= 1) return;
    const updated = configs.filter((_, i) => i !== activeConfigIndex);
    saveConfigs(updated);
    setActiveConfigIndex(Math.max(0, activeConfigIndex - 1));
  };

  const handleExportPdf = async () => {
    try {
      await generateGroepenverklaringPdf(config);
      toast({ title: "PDF geëxporteerd", description: "Groepenverklaring is gedownload" });
    } catch (err) {
      toast({ title: "Fout", description: "Kon PDF niet genereren", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Groepenkast Configurator</h1>
          <p className="text-sm text-muted-foreground">Stel een Eaton groepenkast samen met artikelnummers en prijzen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addNewConfig}><Plus className="w-4 h-4 mr-1" />Nieuw</Button>
          <Button variant="outline" size="sm" onClick={duplicateConfig}><Copy className="w-4 h-4 mr-1" />Kopieer</Button>
          <Button size="sm" onClick={handleExportPdf}><FileText className="w-4 h-4 mr-1" />Groepenverklaring</Button>
        </div>
      </div>

      {/* Config selector */}
      {configs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {configs.map((c, i) => (
            <Button key={c.id} variant={i === activeConfigIndex ? "default" : "outline"} size="sm" onClick={() => setActiveConfigIndex(i)}>
              {c.name}
            </Button>
          ))}
        </div>
      )}

      {/* Config details */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Config info */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Naam</label>
                  <Input value={config.name} onChange={e => updateConfig({ name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Klant</label>
                  <Input value={config.customer || ""} onChange={e => updateConfig({ customer: e.target.value })} placeholder="Klantnaam" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Adres</label>
                <Input value={config.address || ""} onChange={e => updateConfig({ address: e.target.value })} placeholder="Installatieadres" />
              </div>
            </CardContent>
          </Card>

          {/* Rows */}
          {config.rows.map((row, rowIdx) => (
            <Card key={row.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                    <Input 
                      value={row.label} 
                      onChange={e => updateConfig({ rows: config.rows.map(r => r.id === row.id ? { ...r, label: e.target.value } : r) })}
                      className="h-7 w-32 text-sm font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {row.components.reduce((s, c) => { const comp = EATON_COMPONENTS.find(e => e.id === c.componentId); return s + (comp?.modules || 0); }, 0)} TE
                    </Badge>
                    {config.rows.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRow(row.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-4">
                {row.components.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">Geen componenten — voeg toe via het paneel rechts</p>
                ) : (
                  <div className="space-y-2">
                    {row.components.map(comp => {
                      const eatonComp = EATON_COMPONENTS.find(e => e.id === comp.componentId);
                      if (!eatonComp) return null;
                      return (
                        <div key={comp.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-sm">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <Input 
                            value={comp.label} 
                            onChange={e => updateComponentLabel(row.id, comp.id, e.target.value)}
                            className="h-6 text-xs flex-1 min-w-0"
                            placeholder="Groep label"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{eatonComp.articleNumber}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{eatonComp.modules}TE</Badge>
                          <span className="text-xs font-medium whitespace-nowrap">€{eatonComp.price.toFixed(2)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeComponent(row.id, comp.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addRow} className="w-full"><Plus className="w-4 h-4 mr-2" />Rij toevoegen</Button>
        </div>

        {/* Component picker */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Component toevoegen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {filteredComponents.map(comp => (
                  <div key={comp.id} className="p-2 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{comp.name}</p>
                        <p className="text-[10px] text-muted-foreground">{comp.articleNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{comp.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold">€{comp.price.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">{comp.modules}TE</p>
                      </div>
                    </div>
                    {/* Add to row buttons */}
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {config.rows.map((row, i) => (
                        <Button 
                          key={row.id} 
                          variant="outline" 
                          size="sm" 
                          className="h-5 text-[10px] px-1.5"
                          onClick={() => addComponent(row.id, comp, "")}
                        >
                          + {row.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Samenvatting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Totaal modules</span>
                <span className="font-medium">{totalModules} TE</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Componenten</span>
                <span className="font-medium">{config.rows.reduce((s, r) => s + r.components.length, 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Totaalprijs (excl. BTW)</span>
                <span className="text-accent">€{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Incl. 21% BTW</span>
                <span>€{(totalPrice * 1.21).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick labels */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Veelgebruikte labels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {COMMON_GROUP_LABELS.slice(0, 15).map(label => (
                  <Badge key={label} variant="outline" className="text-[10px] cursor-default">{label}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes */}
      <Card>
        <CardContent className="pt-4">
          <label className="text-xs font-medium text-muted-foreground">Opmerkingen</label>
          <Textarea 
            value={config.notes || ""} 
            onChange={e => updateConfig({ notes: e.target.value })} 
            placeholder="Extra opmerkingen voor deze groepenkast..."
            rows={2}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default GroepenkastConfigurator;
