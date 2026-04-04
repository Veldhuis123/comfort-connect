import { useState } from "react";
import { Plus, ChevronRight, Trash2, Clock, CheckCircle2, Send, FileEdit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { BRLReport, BRLReportStatus } from "@/lib/brlTypes";
import { getReportProgress } from "@/lib/brlTypes";

interface Props {
  reports: BRLReport[];
  onNewReport: () => void;
  onOpenReport: (id: string) => void;
  onDeleteReport: (id: string) => void;
}

const statusConfig: Record<BRLReportStatus, { label: string; icon: typeof Clock; color: string }> = {
  concept: { label: "Concept", icon: FileEdit, color: "bg-muted text-muted-foreground" },
  bezig: { label: "Bezig", icon: Clock, color: "bg-amber-100 text-amber-800" },
  voltooid: { label: "Voltooid", icon: CheckCircle2, color: "bg-green-100 text-green-800" },
  verzonden: { label: "Verzonden", icon: Send, color: "bg-blue-100 text-blue-800" },
};

const BRLOverview = ({ reports, onNewReport, onOpenReport, onDeleteReport }: Props) => {
  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <header className="bg-primary text-primary-foreground p-6 pb-8">
        <h1 className="text-2xl font-bold">BRL 100</h1>
        <p className="text-primary-foreground/80 text-sm mt-1">Inbedrijfstellingsrapporten</p>
      </header>

      <main className="p-4 -mt-4 space-y-3">
        <Button onClick={onNewReport} className="w-full h-14 text-base shadow-lg" size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Nieuwe inbedrijfstelling
        </Button>

        {reports.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <p className="text-sm">Nog geen rapporten. Start je eerste inbedrijfstelling.</p>
            </CardContent>
          </Card>
        )}

        {reports.map((report) => {
          const progress = getReportProgress(report);
          const cfg = statusConfig[report.status];
          const StatusIcon = cfg.icon;
          const date = new Date(report.updated_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

          return (
            <Card key={report.id} className="shadow-md border-0 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center" onClick={() => onOpenReport(report.id)}>
                  <div className="flex-1 p-4 cursor-pointer active:bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-foreground text-sm truncate max-w-[180px]">
                        {report.customer_data.customer_name || "Geen klant"}
                      </h3>
                      <Badge className={`text-xs ${cfg.color} border-0`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {report.customer_data.werkbon_number ? `#${report.customer_data.werkbon_number}` : "Geen werkbon"} · {date}
                    </p>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground font-medium w-8">{progress}%</span>
                    </div>
                  </div>
                  <div className="pr-2 flex items-center gap-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive/60 h-8 w-8" onClick={e => e.stopPropagation()}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rapport verwijderen?</AlertDialogTitle>
                          <AlertDialogDescription>Dit kan niet ongedaan worden gemaakt.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeleteReport(report.id)}>Verwijderen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
};

export default BRLOverview;
