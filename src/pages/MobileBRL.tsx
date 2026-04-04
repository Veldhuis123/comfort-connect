import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ClipboardCheck, FileText, Thermometer, Send, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MobileBRLChecklist from "@/components/mobile/MobileBRLChecklist";
import MobileCommissioning from "@/components/mobile/MobileCommissioning";
import MobileTesto from "@/components/mobile/MobileTesto";
import MobileBRLExport from "@/components/mobile/MobileBRLExport";
import { defaultCommissioningData, defaultChecklist, type CommissioningData, type BRLChecklist } from "@/lib/installationTypes";

type MobileTab = "home" | "checklist" | "commissioning" | "testo" | "export";

const MobileBRL = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [commissioningData, setCommissioningData] = useState<CommissioningData>(defaultCommissioningData);
  const [checklist, setChecklist] = useState<BRLChecklist>(defaultChecklist);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">Toegang beperkt</h1>
          <p className="text-muted-foreground">Je moet ingelogd zijn om de BRL app te gebruiken.</p>
          <Button onClick={() => navigate("/admin/login")} className="mt-4">
            Inloggen
          </Button>
        </div>
      </div>
    );
  }

  if (activeTab !== "home") {
    return (
      <div className="min-h-screen bg-background safe-area-inset">
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 flex items-center gap-3 shadow-md">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => setActiveTab("home")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">
            {activeTab === "checklist" && "BRL Checklist"}
            {activeTab === "commissioning" && "Inbedrijfstelling"}
            {activeTab === "testo" && "Testo 558s"}
            {activeTab === "export" && "PDF & Verzenden"}
          </h1>
        </header>
        <main className="p-4 pb-20">
          {activeTab === "checklist" && <MobileBRLChecklist checklist={checklist} setChecklist={setChecklist} />}
          {activeTab === "commissioning" && <MobileCommissioning data={commissioningData} setData={setCommissioningData} />}
          {activeTab === "testo" && <MobileTesto data={commissioningData} setData={setCommissioningData} />}
          {activeTab === "export" && <MobileBRLExport data={commissioningData} checklist={checklist} />}
        </main>
      </div>
    );
  }

  const menuItems = [
    { id: "checklist" as MobileTab, icon: ClipboardCheck, label: "BRL Checklist", description: "7-stappen installatie checklist", color: "bg-accent" },
    { id: "commissioning" as MobileTab, icon: FileText, label: "Inbedrijfstelling", description: "Rapport invullen & ondertekenen", color: "bg-primary" },
    { id: "testo" as MobileTab, icon: Thermometer, label: "Testo 558s", description: "Meetwaarden invoeren / importeren", color: "bg-emerald-600" },
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
                <p className="text-sm text-muted-foreground">{item.description}</p>
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
