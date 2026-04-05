import { useState, useEffect } from "react";
import { ArrowLeft, Check, ClipboardCheck, Settings, Wrench, Thermometer, FileCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WIZARD_STEPS, type BRLReport, getReportProgress } from "@/lib/brlTypes";
import { saveReport } from "@/lib/brlStorage";
import { defaultChecklist, type BRLChecklist } from "@/lib/installationTypes";
import type { BRLPhoto } from "@/components/mobile/MobilePhotoUpload";
import StepVoorbereiding from "./steps/StepVoorbereiding";
import StepGereedschap from "./steps/StepGereedschap";
import StepMateriaal from "./steps/StepMateriaal";
import StepBuitenunit from "./steps/StepBuitenunit";
import StepBinnenunit from "./steps/StepBinnenunit";
import StepLeidingwerk from "./steps/StepLeidingwerk";
import StepVacuumVullen from "./steps/StepVacuumVullen";
import StepOplevering from "./steps/StepOplevering";

const stepIcons = [ClipboardCheck, Settings, Wrench, Thermometer, Thermometer, Wrench, Thermometer, FileCheck];

interface Props {
  report: BRLReport;
  onBack: () => void;
  onSave: (report: BRLReport) => void;
}

const BRLWizard = ({ report: initialReport, onBack, onSave }: Props) => {
  const [report, setReport] = useState<BRLReport>(initialReport);
  const [activeStep, setActiveStep] = useState(initialReport.current_step);
  const [checklist, setChecklist] = useState<BRLChecklist>(initialReport.checklist || { ...defaultChecklist });
  const [photos, setPhotos] = useState<BRLPhoto[]>(initialReport.photos || []);

  useEffect(() => {
    const updated = { ...report, current_step: activeStep, checklist, photos };
    saveReport(updated);
  }, [report, activeStep, checklist, photos]);

  const completeStep = (stepIndex: number) => {
    const updated = { ...report };
    updated.steps_completed = [...updated.steps_completed];
    updated.steps_completed[stepIndex] = true;
    updated.status = updated.steps_completed.every(Boolean) ? "voltooid" : "bezig";
    updated.checklist = checklist;
    updated.photos = photos;
    setReport(updated);
    onSave(updated);
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setActiveStep(stepIndex + 1);
    }
  };

  const updateReport = (partial: Partial<BRLReport>) => {
    setReport(prev => {
      const updated = { ...prev, ...partial };
      saveReport(updated);
      onSave(updated);
      return updated;
    });
  };

  const progress = getReportProgress(report);

  const renderStep = () => {
    const commonProps = {
      data: report.customer_data,
      setData: (d: typeof report.customer_data) => updateReport({ customer_data: d }),
    };

    switch (activeStep) {
      case 0:
        return (
          <StepVoorbereiding
            {...commonProps}
            checklist={checklist}
            setChecklist={setChecklist}
            technicianId={report.technician_id}
            onUpdateTechnician={(id) => updateReport({ technician_id: id })}
            onComplete={() => completeStep(0)}
          />
        );
      case 1:
        return (
          <StepGereedschap
            technicianId={report.technician_id}
            selectedTools={report.selected_tools}
            onUpdate={(techId, toolIds) => updateReport({ technician_id: techId, selected_tools: toolIds })}
            onComplete={() => completeStep(1)}
          />
        );
      case 2:
        return (
          <StepMateriaal
            {...commonProps}
            checklist={checklist}
            setChecklist={setChecklist}
            onComplete={() => completeStep(2)}
          />
        );
      case 3:
        return (
          <StepBuitenunit
            checklist={checklist}
            setChecklist={setChecklist}
            onComplete={() => completeStep(3)}
          />
        );
      case 4:
        return (
          <StepBinnenunit
            checklist={checklist}
            setChecklist={setChecklist}
            onComplete={() => completeStep(4)}
          />
        );
      case 5:
        return (
          <StepLeidingwerk
            {...commonProps}
            checklist={checklist}
            setChecklist={setChecklist}
            onComplete={() => completeStep(5)}
          />
        );
      case 6:
        return (
          <StepVacuumVullen
            {...commonProps}
            checklist={checklist}
            setChecklist={setChecklist}
            onComplete={() => completeStep(6)}
          />
        );
      case 7:
        return (
          <StepOplevering
            report={{ ...report, checklist, photos }}
            data={report.customer_data}
            setData={(d: typeof report.customer_data) => updateReport({ customer_data: d })}
            checklist={checklist}
            setChecklist={setChecklist}
            photos={photos}
            setPhotos={setPhotos}
            onUpdateEmail={email => updateReport({ customer_email: email })}
            onMarkSent={() => updateReport({ status: "verzonden" })}
            onComplete={() => completeStep(7)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-md pt-safe-top" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Terug naar overzicht"
            className="relative z-20 flex items-center justify-center h-11 w-11 rounded-xl text-primary-foreground hover:bg-primary-foreground/20 active:bg-primary-foreground/30 transition-colors shrink-0"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">
              {report.customer_data.werkbon_number || report.customer_data.customer_name || "Nieuw rapport"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={progress} className="h-1.5 flex-1 bg-primary-foreground/20" />
              <span className="text-xs text-primary-foreground/80">{progress}%</span>
            </div>
          </div>
        </div>

        <div className="flex px-2 pb-3 gap-1 overflow-x-auto">
          {WIZARD_STEPS.map((step, i) => {
            const Icon = stepIcons[i];
            const completed = report.steps_completed[i];
            const active = activeStep === i;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(i)}
                className={`flex flex-col items-center min-w-[52px] py-1.5 px-1 rounded-xl text-xs transition-colors ${
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : completed
                    ? "text-primary-foreground/80"
                    : "text-primary-foreground/40"
                }`}
              >
                <div className="relative">
                  <Icon className="h-4 w-4" />
                  {completed && (
                    <Check className="h-3 w-3 absolute -top-1 -right-1 text-green-300" />
                  )}
                </div>
                <span className="mt-0.5 leading-tight text-center whitespace-nowrap" style={{ fontSize: "8px" }}>{step.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="p-4 pb-24">
        {renderStep()}
      </main>
    </div>
  );
};

export default BRLWizard;
