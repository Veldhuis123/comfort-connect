import { useState, useEffect } from "react";
import { api, InstallationSettingsResponse, CapacityPricing, PipeDiameterPricing } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Save, RefreshCw, Euro, Clock, Wrench, Zap, 
  Thermometer, Plus, Trash2, Cable, Settings, Percent 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingGroup {
  title: string;
  icon: React.ReactNode;
  settings: string[];
}

const settingGroups: SettingGroup[] = [
  {
    title: "Arbeid",
    icon: <Clock className="w-4 h-4" />,
    settings: ["hourly_rate", "travel_cost", "min_hours"]
  },
  {
    title: "Leidingen & Goot",
    icon: <Wrench className="w-4 h-4" />,
    settings: ["pipe_included_meters", "cable_duct_per_meter"]
  },
  {
    title: "Montage",
    icon: <Thermometer className="w-4 h-4" />,
    settings: ["mounting_bracket", "wall_bracket", "condensate_pump"]
  },
  {
    title: "Elektra",
    icon: <Zap className="w-4 h-4" />,
    settings: ["electrical_group", "fuse_upgrade"]
  },
  {
    title: "Overig",
    icon: <Euro className="w-4 h-4" />,
    settings: ["small_materials", "vacuum_nitrogen", "vat_rate"]
  }
];

const globalSettingGroups: SettingGroup[] = [
  {
    title: "Marge",
    icon: <Percent className="w-4 h-4" />,
    settings: ["margin_percent"]
  },
  {
    title: "Installatie Basis",
    icon: <Settings className="w-4 h-4" />,
    settings: ["base_installation_small", "base_installation_large", "multisplit_per_room", "extra_unit_discount"]
  }
];

const settingLabels: Record<string, string> = {
  hourly_rate: "Uurtarief excl. BTW",
  travel_cost: "Voorrijkosten excl. BTW",
  min_hours: "Minimum uren",
  pipe_included_meters: "Inbegrepen meters",
  cable_duct_per_meter: "Goot per meter excl. BTW",
  mounting_bracket: "Montagebeugel buiten excl. BTW",
  wall_bracket: "Wandbeugel binnen excl. BTW",
  condensate_pump: "Condenspomp excl. BTW",
  electrical_group: "Groep meterkast excl. BTW",
  fuse_upgrade: "Zekering upgrade excl. BTW",
  small_materials: "Klein materiaal excl. BTW",
  vacuum_nitrogen: "Vacuüm & stikstof excl. BTW",
  vat_rate: "BTW percentage",
  // Global settings
  margin_percent: "Globale marge %",
  base_installation_small: "Basis installatie ≤40m² excl. BTW",
  base_installation_large: "Basis installatie >40m² excl. BTW",
  multisplit_per_room: "Multi-split per ruimte excl. BTW",
  extra_unit_discount: "Korting extra units (factor)"
};

const AdminPricing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [globalSettings, setGlobalSettings] = useState<Record<string, number>>({});
  const [capacityPricing, setCapacityPricing] = useState<CapacityPricing[]>([]);
  const [pipePricing, setPipePricing] = useState<PipeDiameterPricing[]>([]);
  const category = "airco";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, globalRes, capacityRes, pipeRes] = await Promise.all([
        api.getInstallationSettings(category),
        api.getInstallationSettings("global").catch(() => ({ settings: {} })),
        api.getCapacityPricing(category),
        api.getPipeDiameterPricing(category).catch(() => [])
      ]);
      
      // Convert settings object to flat key-value pairs
      const flatSettings: Record<string, number> = {};
      Object.entries(settingsRes.settings).forEach(([key, val]) => {
        flatSettings[key] = val.value;
      });
      setSettings(flatSettings);
      
      // Global settings
      const flatGlobal: Record<string, number> = {};
      Object.entries(globalRes.settings || {}).forEach(([key, val]) => {
        flatGlobal[key] = (val as { value: number }).value;
      });
      setGlobalSettings(flatGlobal);
      
      setCapacityPricing(capacityRes);
      setPipePricing(pipeRes);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon instellingen niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0
    }));
  };

  const handleGlobalSettingChange = (key: string, value: string) => {
    setGlobalSettings(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.updateInstallationSettings(category, settings);
      toast({
        title: "Opgeslagen",
        description: "Installatie-instellingen zijn bijgewerkt",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon instellingen niet opslaan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGlobalSettings = async () => {
    setSaving(true);
    try {
      await api.updateInstallationSettings("global", globalSettings);
      toast({
        title: "Opgeslagen",
        description: "Globale instellingen zijn bijgewerkt",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon globale instellingen niet opslaan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCapacityChange = (index: number, field: keyof CapacityPricing, value: string) => {
    setCapacityPricing(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: parseFloat(value) || 0
      };
      return updated;
    });
  };

  const handleAddCapacity = () => {
    const lastRow = capacityPricing[capacityPricing.length - 1];
    setCapacityPricing(prev => [...prev, {
      min_capacity: lastRow ? lastRow.max_capacity + 0.01 : 0,
      max_capacity: lastRow ? lastRow.max_capacity + 5 : 5,
      extra_hours: 0,
      extra_materials: 0,
      notes: ""
    }]);
  };

  const handleRemoveCapacity = (index: number) => {
    setCapacityPricing(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveCapacity = async () => {
    setSaving(true);
    try {
      await api.updateCapacityPricing(category, capacityPricing);
      toast({
        title: "Opgeslagen",
        description: "Capaciteitsprijzen zijn bijgewerkt",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon capaciteitsprijzen niet opslaan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Pipe diameter handlers
  const handlePipeChange = (index: number, field: keyof PipeDiameterPricing, value: string) => {
    setPipePricing(prev => {
      const updated = [...prev];
      if (field === 'liquid_line' || field === 'suction_line' || field === 'notes') {
        updated[index] = { ...updated[index], [field]: value };
      } else {
        updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
      }
      return updated;
    });
  };

  const handleAddPipe = () => {
    const lastRow = pipePricing[pipePricing.length - 1];
    setPipePricing(prev => [...prev, {
      min_capacity: lastRow ? lastRow.max_capacity + 0.01 : 0,
      max_capacity: lastRow ? lastRow.max_capacity + 3.5 : 3.5,
      liquid_line: '1/4"',
      suction_line: '3/8"',
      price_per_meter: 35,
      notes: ""
    }]);
  };

  const handleRemovePipe = (index: number) => {
    setPipePricing(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePipes = async () => {
    setSaving(true);
    try {
      await api.updatePipeDiameterPricing(category, pipePricing);
      toast({
        title: "Opgeslagen",
        description: "Leidingprijzen zijn bijgewerkt",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon leidingprijzen niet opslaan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Laden...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prijsbeheer Airco</CardTitle>
              <CardDescription>
                Beheer installatie-instellingen, uurtarieven en materiaalkosten
                <span className="block text-xs mt-1 font-medium text-accent">💡 Alle bedragen exclusief BTW</span>
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Vernieuwen
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="global">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="global">Globaal</TabsTrigger>
          <TabsTrigger value="settings">Airco Instellingen</TabsTrigger>
          <TabsTrigger value="pipes">Leidingdiameters</TabsTrigger>
          <TabsTrigger value="capacity">Capaciteit</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4">
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" />
                Globale Marge & Installatieprijzen
              </CardTitle>
              <CardDescription>
                Deze instellingen worden toegepast op alle calculators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {globalSettingGroups.map((group) => (
                <div key={group.title} className="mb-6 last:mb-0">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                    {group.icon}
                    {group.title}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.settings.map((key) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`global-${key}`} className="text-sm">
                          {settingLabels[key] || key}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {key.includes("percent") ? "%" : key.includes("factor") || key.includes("discount") ? "" : "€"}
                          </span>
                          <Input
                            id={`global-${key}`}
                            type="number"
                            step={key.includes("factor") || key.includes("discount") ? "0.05" : "0.01"}
                            value={globalSettings[key] ?? (key.includes("factor") ? 1 : 0)}
                            onChange={(e) => handleGlobalSettingChange(key, e.target.value)}
                            className="pl-7"
                          />
                        </div>
                        {key === "margin_percent" && (
                          <p className="text-xs text-muted-foreground">
                            Wordt toegepast op alle producten zonder eigen marge
                          </p>
                        )}
                        {key === "extra_unit_discount" && (
                          <p className="text-xs text-muted-foreground">
                            0.80 = 20% korting op extra units
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveGlobalSettings} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Opslaan..." : "Globale instellingen opslaan"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {settingGroups.map((group) => (
            <Card key={group.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {group.icon}
                  {group.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.settings.map((key) => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={key} className="text-sm">
                        {settingLabels[key] || key}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {key === "vat_rate" ? "%" : key.includes("hours") || key.includes("meters") ? "" : "€"}
                        </span>
                        <Input
                          id={key}
                          type="number"
                          step="0.01"
                          value={settings[key] ?? 0}
                          onChange={(e) => handleSettingChange(key, e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Opslaan..." : "Instellingen opslaan"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="pipes" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Cable className="w-5 h-5" />
                <div>
                  <CardTitle className="text-base">Leidingdiameter per vermogensklasse</CardTitle>
                  <CardDescription>
                    Prijs per meter afhankelijk van unit-vermogen (excl. BTW)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min kW</TableHead>
                    <TableHead>Max kW</TableHead>
                    <TableHead>Vloeistof</TableHead>
                    <TableHead>Zuig</TableHead>
                    <TableHead>€/meter</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipePricing.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.min_capacity}
                          onChange={(e) => handlePipeChange(index, "min_capacity", e.target.value)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.max_capacity}
                          onChange={(e) => handlePipeChange(index, "max_capacity", e.target.value)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.liquid_line}
                          onChange={(e) => handlePipeChange(index, "liquid_line", e.target.value)}
                          className="w-20"
                          placeholder='1/4"'
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.suction_line}
                          onChange={(e) => handlePipeChange(index, "suction_line", e.target.value)}
                          className="w-20"
                          placeholder='3/8"'
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="1"
                          value={row.price_per_meter}
                          onChange={(e) => handlePipeChange(index, "price_per_meter", e.target.value)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePipe(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={handleAddPipe}>
                  <Plus className="w-4 h-4 mr-2" />
                  Rij toevoegen
                </Button>
                <Button onClick={handleSavePipes} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Opslaan..." : "Leidingprijzen opslaan"}
                </Button>
              </div>

              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <p><strong>💡 Tip:</strong> Standaard leidingdiameters:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Tot 3.5 kW: 1/4" x 3/8" (6.35mm x 9.52mm)</li>
                  <li>3.5-5 kW: 1/4" x 1/2" (6.35mm x 12.7mm)</li>
                  <li>5-7 kW: 3/8" x 5/8" (9.52mm x 15.88mm)</li>
                  <li>&gt;7 kW: 3/8" x 3/4" (9.52mm x 19.05mm)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Capaciteit-afhankelijke extra's</CardTitle>
              <CardDescription>
                Extra uren en materiaalkosten per vermogensklasse (excl. BTW)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min kW</TableHead>
                    <TableHead>Max kW</TableHead>
                    <TableHead>Extra uren</TableHead>
                    <TableHead>Extra materiaal (€)</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capacityPricing.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.min_capacity}
                          onChange={(e) => handleCapacityChange(index, "min_capacity", e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.max_capacity}
                          onChange={(e) => handleCapacityChange(index, "max_capacity", e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.5"
                          value={row.extra_hours}
                          onChange={(e) => handleCapacityChange(index, "extra_hours", e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="5"
                          value={row.extra_materials}
                          onChange={(e) => handleCapacityChange(index, "extra_materials", e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCapacity(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={handleAddCapacity}>
                  <Plus className="w-4 h-4 mr-2" />
                  Rij toevoegen
                </Button>
                <Button onClick={handleSaveCapacity} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Opslaan..." : "Capaciteitsprijzen opslaan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPricing;
