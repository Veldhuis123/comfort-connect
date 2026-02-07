import { useState, useEffect } from "react";
import { api, InstallationSettingsResponse, CapacityPricing } from "@/lib/api";
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
  Thermometer, Plus, Trash2 
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
    settings: ["pipe_per_meter", "pipe_included_meters", "cable_duct_per_meter"]
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

const settingLabels: Record<string, string> = {
  hourly_rate: "Uurtarief",
  travel_cost: "Voorrijkosten",
  min_hours: "Minimum uren",
  pipe_per_meter: "Leiding per meter",
  pipe_included_meters: "Inbegrepen meters",
  cable_duct_per_meter: "Goot per meter",
  mounting_bracket: "Montagebeugel buiten",
  wall_bracket: "Wandbeugel binnen",
  condensate_pump: "Condenspomp",
  electrical_group: "Groep meterkast",
  fuse_upgrade: "Zekering upgrade",
  small_materials: "Klein materiaal",
  vacuum_nitrogen: "Vacuüm & stikstof",
  vat_rate: "BTW percentage"
};

const AdminPricing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [capacityPricing, setCapacityPricing] = useState<CapacityPricing[]>([]);
  const category = "airco";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, capacityRes] = await Promise.all([
        api.getInstallationSettings(category),
        api.getCapacityPricing(category)
      ]);
      
      // Convert settings object to flat key-value pairs
      const flatSettings: Record<string, number> = {};
      Object.entries(settingsRes.settings).forEach(([key, val]) => {
        flatSettings[key] = val.value;
      });
      setSettings(flatSettings);
      setCapacityPricing(capacityRes);
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
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Vernieuwen
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">Installatie-instellingen</TabsTrigger>
          <TabsTrigger value="capacity">Capaciteit-prijzen</TabsTrigger>
        </TabsList>

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
                          className={key === "vat_rate" || key.includes("hours") || key.includes("meters") ? "pl-7" : "pl-7"}
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

        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Capaciteit-afhankelijke prijzen</CardTitle>
              <CardDescription>
                Extra uren en materiaalkosten per vermogensklasse
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
