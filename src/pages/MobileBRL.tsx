import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import BRLOverview from "@/components/mobile/BRLOverview";
import BRLWizard from "@/components/mobile/BRLWizard";
import type { BRLReport } from "@/lib/brlTypes";
import { createNewReport, deleteReport, getReports, mergeReports, saveReport, saveReports } from "@/lib/brlStorage";
import { installationsApi } from "@/lib/installationsApi";
import { useSearchParams } from "react-router-dom";

const MobileBRL = () => {
  const { isAuthenticated, isLoading, login, logout } = useAuth();
  const [reports, setReports] = useState<BRLReport[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const activeReportId = searchParams.get("report");

  const activeReport = useMemo(
    () => (activeReportId ? reports.find((report) => report.id === activeReportId) ?? null : null),
    [activeReportId, reports],
  );

  const openWizard = useCallback(
    (reportId: string) => {
      setSearchParams({ report: reportId });
    },
    [setSearchParams],
  );

  const closeWizard = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const syncReportsFromServer = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const remoteReports = await installationsApi.getBRLReports();
      const merged = mergeReports(getReports(), remoteReports);
      saveReports(merged);
      setReports(merged);
    } catch {
      setReports(getReports());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const bootstrapSync = async () => {
      const localReports = getReports();
      setReports(localReports);

      await Promise.all(
        localReports.map((report) => installationsApi.saveBRLReport(report).catch(() => null)),
      );

      await syncReportsFromServer();
    };

    void bootstrapSync();
  }, [isAuthenticated, syncReportsFromServer]);

  useEffect(() => {
    if (activeReportId && !activeReport && reports.length > 0) {
      closeWizard();
    }
  }, [activeReport, activeReportId, closeWizard, reports.length]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void syncReportsFromServer();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncReportsFromServer();
      }
    }, 8000);

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [isAuthenticated, syncReportsFromServer]);

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
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground px-6 pb-6" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)' }}>
          <h1 className="text-2xl font-bold">BRL 100</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Inbedrijfstellingsrapport</p>
        </header>
        <main className="p-4 pt-4">
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
    void installationsApi.saveBRLReport(report).catch(() => null);
    openWizard(report.id);
  };

  const handleOpen = (id: string) => {
    openWizard(id);
  };

  const handleDelete = (id: string) => {
    deleteReport(id);
    setReports(getReports());
    void installationsApi.deleteBRLReport(id).catch(() => null);
  };

  const handleSave = (updated: BRLReport) => {
    saveReport(updated);
    setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
    void installationsApi.saveBRLReport(updated).catch(() => null);
  };

  const handleBack = () => {
    closeWizard();
  };

  if (activeReport) {
    return <BRLWizard report={activeReport} onBack={handleBack} onSave={handleSave} />;
  }

  return (
    <BRLOverview
      reports={reports}
      onNewReport={handleNew}
      onOpenReport={handleOpen}
      onDeleteReport={handleDelete}
      onLogout={logout}
    />
  );
};

export default MobileBRL;
