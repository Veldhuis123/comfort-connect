import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ClipboardCheck, FileText, Thermometer, Send, Loader2, Lock, Mail, Camera, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import MobileBRLChecklist from "@/components/mobile/MobileBRLChecklist";
import MobileCommissioning from "@/components/mobile/MobileCommissioning";
import MobileTesto from "@/components/mobile/MobileTesto";
import MobileBRLExport from "@/components/mobile/MobileBRLExport";
import MobileCustomerSelector from "@/components/mobile/MobileCustomerSelector";
import MobilePhotoUpload, { type BRLPhoto } from "@/components/mobile/MobilePhotoUpload";
import { defaultCommissioningData, defaultChecklist, type CommissioningData, type BRLChecklist } from "@/lib/installationTypes";

type MobileTab = "home" | "customer" | "checklist" | "commissioning" | "testo" | "photos" | "export";

const MobileBRL = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [commissioningData, setCommissioningData] = useState<CommissioningData>(defaultCommissioningData);
  const [checklist, setChecklist] = useState<BRLChecklist>(defaultChecklist);
  const [photos, setPhotos] = useState<BRLPhoto[]>([]);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Inloggen mislukt");
    } finally {
      setLoginLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Login screen - inline, stays on /brl
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background safe-area-inset">
        <header className="bg-primary text-primary-foreground p-6 pb-8">
          <h1 className="text-2xl font-bold">BRL 100</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Inbedrijfstellingsrapport</p>
        </header>
        <main className="p-4 -mt-4">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Inloggen</CardTitle>
              <CardDescription>Log in om de BRL app te gebruiken</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{loginError}</div>
                )}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> E-mail
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@rv-installatie.nl"
                    className="h-12 text-base"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Wachtwoord
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 text-base"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base" disabled={loginLoading}>
                  {loginLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  {loginLoading ? "Bezig..." : "Inloggen"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Sub-pages
  if (activeTab !== "home") {
    const titles: Record<string, string> = {
      customer: "Klant selecteren",
      checklist: "BRL Checklist",
      commissioning: "Inbedrijfstelling",
      testo: "Testo 558s",
      photos: "Foto's",
      export: "PDF & Verzenden",
    };

    return (
      <div className="min-h-screen bg-background safe-area-inset">
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 flex items-center gap-3 shadow-md">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => setActiveTab("home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">{titles[activeTab]}</h1>
        </header>
        <main className="p-4 pb-20">
          {activeTab === "customer" && <MobileCustomerSelector data={commissioningData} setData={setCommissioningData} />}
          {activeTab === "checklist" && <MobileBRLChecklist checklist={checklist} setChecklist={setChecklist} />}
          {activeTab === "commissioning" && <MobileCommissioning data={commissioningData} setData={setCommissioningData} />}
          {activeTab === "testo" && <MobileTesto data={commissioningData} setData={setCommissioningData} />}
          {activeTab === "photos" && <MobilePhotoUpload photos={photos} setPhotos={setPhotos} />}
          {activeTab === "export" && <MobileBRLExport data={commissioningData} checklist={checklist} />}
        </main>
      </div>
    );
  }

  // Home menu
  const menuItems = [
    { id: "customer" as MobileTab, icon: Users, label: "Klant selecteren", description: "Klant ophalen uit e-Boekhouden", color: "bg-blue-600", badge: commissioningData.customer_name || undefined },
    { id: "checklist" as MobileTab, icon: ClipboardCheck, label: "BRL Checklist", description: "7-stappen installatie checklist", color: "bg-accent" },
    { id: "commissioning" as MobileTab, icon: FileText, label: "Inbedrijfstelling", description: "Rapport invullen & ondertekenen", color: "bg-primary" },
    { id: "testo" as MobileTab, icon: Thermometer, label: "Testo 558s", description: "Meetwaarden invoeren / importeren", color: "bg-emerald-600" },
    { id: "photos" as MobileTab, icon: Camera, label: "Foto's", description: `${photos.length} foto's toegevoegd`, color: "bg-violet-600" },
    { id: "export" as MobileTab, icon: Send, label: "PDF & Verzenden", description: "Rapport genereren & e-mailen", color: "bg-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <header className="bg-primary text-primary-foreground p-6 pb-8">
        <h1 className="text-2xl font-bold">BRL 100</h1>
        <p className="text-primary-foreground/80 text-sm mt-1">Inbedrijfstellingsrapport & Checklist</p>
      </header>

      <main className="p-4 -mt-4 space-y-3">
        {menuItems.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer active:scale-[0.98] transition-transform border-0 shadow-md"
            onClick={() => setActiveTab(item.id)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`${item.color} text-white p-3 rounded-xl`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.badge || item.description}</p>
              </div>
              <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
};

export default MobileBRL;
