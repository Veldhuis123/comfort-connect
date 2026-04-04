import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import BRLOverview from "@/components/mobile/BRLOverview";
import BRLWizard from "@/components/mobile/BRLWizard";
import type { BRLReport } from "@/lib/brlTypes";
import { getReports, saveReport, deleteReport, createNewReport } from "@/lib/brlStorage";

type View = "overview" | "wizard";

const MobileBRL = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [view, setView] = useState<View>("overview");
  const [reports, setReports] = useState<BRLReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) setReports(getReports());
  }, [isAuthenticated]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@rv-installatie.nl" className="h-12 text-base" autoComplete="email" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Wachtwoord
                  </label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-12 text-base" autoComplete="current-password" required />
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

  const handleNew = () => {
    const report = createNewReport();
    saveReport(report);
    setReports(getReports());
    setActiveReportId(report.id);
    setView("wizard");
  };

  const handleOpen = (id: string) => {
    setActiveReportId(id);
    setView("wizard");
  };

  const handleDelete = (id: string) => {
    deleteReport(id);
    setReports(getReports());
  };

  const handleSave = (updated: BRLReport) => {
    saveReport(updated);
    setReports(getReports());
  };

  const handleBack = () => {
    setView("overview");
    setActiveReportId(null);
    setReports(getReports());
  };

  if (view === "wizard" && activeReportId) {
    const report = reports.find(r => r.id === activeReportId);
    if (report) {
      return <BRLWizard report={report} onBack={handleBack} onSave={handleSave} />;
    }
  }

  return (
    <BRLOverview
      reports={reports}
      onNewReport={handleNew}
      onOpenReport={handleOpen}
      onDeleteReport={handleDelete}
    />
  );
};

export default MobileBRL;
