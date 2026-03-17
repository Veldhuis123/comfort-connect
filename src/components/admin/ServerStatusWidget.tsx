import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Server, Cpu, HardDrive, Shield, ShieldCheck, ShieldAlert,
  RefreshCw, Loader2, Clock, Activity, Wifi, Unlock
} from "lucide-react";
import { api, ServerStatus } from "@/lib/api";
import { toast } from "sonner";

const ServerStatusWidget = () => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannedDialogOpen, setBannedDialogOpen] = useState(false);
  const [unbanningIP, setUnbanningIP] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getServerStatus();
      setStatus(data);
    } catch (err) {
      setError("Kan serverstatus niet ophalen");
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (ip: string) => {
    setUnbanningIP(ip);
    try {
      await api.unbanIP(ip);
      toast.success(`IP ${ip} is gedeblokkeerd`);
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kon IP niet deblokkeren");
    } finally {
      setUnbanningIP(null);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Server status laden...
        </CardContent>
      </Card>
    );
  }

  if (error && !status) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStatus} className="mt-2 gap-1">
            <RefreshCw className="w-3 h-3" /> Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const hasBannedIPs = status.fail2ban && status.fail2ban.bannedIPs.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium flex items-center gap-2">
          <Server className="w-4 h-4 text-muted-foreground" />
          Server Status
        </h2>
        <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading} className="gap-1 text-xs">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Vernieuwen
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Uptime */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Uptime</span>
            </div>
            <p className="text-xl font-bold font-heading">{status.uptime}</p>
            <p className="text-xs text-muted-foreground mt-1">{status.hostname}</p>
          </CardContent>
        </Card>

        {/* CPU */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">CPU Load</span>
            </div>
            <p className="text-xl font-bold font-heading">{status.cpu.loadAvg[0]}</p>
            <p className="text-xs text-muted-foreground mt-1">{status.cpu.cores} cores</p>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Geheugen</span>
            </div>
            <p className="text-xl font-bold font-heading">{status.memory.percent}%</p>
            <Progress value={status.memory.percent} className="h-1.5 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{status.memory.used} / {status.memory.total}</p>
          </CardContent>
        </Card>

        {/* Disk */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Opslag</span>
            </div>
            {status.disk ? (
              <>
                <p className="text-xl font-bold font-heading">{status.disk.percent}%</p>
                <Progress value={status.disk.percent} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{status.disk.used} / {status.disk.total}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Niet beschikbaar</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security & Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fail2ban */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Fail2ban
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {status.fail2ban ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Geblokkeerd</span>
                  <Badge
                    variant={status.fail2ban.currentlyBanned > 0 ? "destructive" : "secondary"}
                    className={hasBannedIPs ? "cursor-pointer hover:opacity-80" : ""}
                    onClick={hasBannedIPs ? () => setBannedDialogOpen(true) : undefined}
                  >
                    {status.fail2ban.currentlyBanned}
                    {hasBannedIPs && " — bekijk"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Totaal geblokkeerd</span>
                  <span className="font-medium">{status.fail2ban.totalBanned}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mislukte pogingen</span>
                  <span className="font-medium">{status.fail2ban.totalFailed}</span>
                </div>
                {hasBannedIPs && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-1 text-xs"
                    onClick={() => setBannedDialogOpen(true)}
                  >
                    <Shield className="w-3 h-3" />
                    {status.fail2ban.bannedIPs.length} geblokkeerde IP('s) beheren
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Niet actief</p>
            )}
          </CardContent>
        </Card>

        {/* UFW */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              Firewall (UFW)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {status.ufw ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={status.ufw.active ? "default" : "destructive"}>
                    {status.ufw.active ? "Actief" : "Inactief"}
                  </Badge>
                </div>
                <div className="space-y-1 mt-2">
                  {status.ufw.rules.slice(0, 6).map((rule, i) => (
                    <p key={i} className="text-xs text-muted-foreground font-mono">{rule}</p>
                  ))}
                  {status.ufw.rules.length > 6 && (
                    <p className="text-xs text-muted-foreground">+{status.ufw.rules.length - 6} meer...</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">Niet actief</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-500" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {status.services.map(svc => (
                <div key={svc.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate mr-2">
                    {svc.name.replace('.service', '').replace('comfort-connect.', 'cc-').replace('comfort-connect', 'backend')}
                  </span>
                  <Badge variant={svc.status === "active" ? "default" : "destructive"} className="text-xs">
                    {svc.status === "active" ? "Online" : svc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform info */}
      <p className="text-xs text-muted-foreground text-right">
        {status.platform} • Laatst bijgewerkt: {new Date(status.timestamp).toLocaleTimeString("nl-NL")}
      </p>

      {/* Banned IPs Dialog */}
      <Dialog open={bannedDialogOpen} onOpenChange={setBannedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Geblokkeerde IP-adressen
            </DialogTitle>
            <DialogDescription>
              Klik op "Deblokkeren" om een IP-adres te verwijderen uit de fail2ban banlist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {status.fail2ban?.bannedIPs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Geen geblokkeerde IP's</p>
            ) : (
              status.fail2ban?.bannedIPs.map(ip => (
                <div key={ip} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                    <span className="font-mono text-sm font-medium">{ip}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    disabled={unbanningIP === ip}
                    onClick={() => handleUnban(ip)}
                  >
                    {unbanningIP === ip ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                    Deblokkeren
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerStatusWidget;
