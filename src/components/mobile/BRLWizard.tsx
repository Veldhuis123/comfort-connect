import { useState, useEffect } from "react";
import { ArrowLeft, Check, Users, Wrench, Cpu, ClipboardCheck, Thermometer, Camera, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WIZARD_STEPS, type BRLReport, getReportProgress } from "@/lib/brlTypes";
import { saveReport } from "@/lib/brlStorage";
import { defaultChecklist, type BRLChecklist } from "@/lib/installationTypes";
import type { BRLPhoto } from "@/components/mobile/MobilePhotoUpload";
import StepCustomer from "./steps/StepCustomer";
import StepTechnician from "./steps/StepTechnician";
import StepEquipment from "./steps/StepEquipment";
import StepChecklist from "./steps/StepChecklist";
import StepMeasurements from "./steps/StepMeasurements";
import StepPhotos from "./steps/StepPhotos";
import StepReview from "./steps/StepReview";

const stepIcons = [Users, Wrench, Cpu, ClipboardCheck, Thermometer, Camera, Send];

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

  // Auto-save on changes
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
    
    // Auto advance to next step
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setActiveStep(stepIndex + 1);
    }
  };

  const updateReport = (partial: Partial<BRLReport>) => {
    setReport(prev => {
      const updated = { ...prev, ...partial };
      saveReport(updated);
      return updated;
    });
  };

  const progress = getReportProgress(report);

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <StepCustomer
            data={report.customer_data}
            setData={d => updateReport({ customer_data: d })}
            onComplete={() => completeStep(0)}
          />
        );
      case 1:
        return (
          <StepTechnician
            technicianId={report.technician_id}
            selectedTools={report.selected_tools}
            onUpdate={(techId, toolIds) => updateReport({ technician_id: techId, selected_tools: toolIds })}
            onComplete={() => completeStep(1)}
          />
        );
      case 2:
        return (
          <StepEquipment
            data={report.customer_data}
            setData={d => updateReport({ customer_data: d })}
            onComplete={() => completeStep(2)}
          />
        );
      case 3:
        return (
          <StepChecklist
            checklist={checklist}
            setChecklist={setChecklist}
            onComplete={() => completeStep(3)}
          />
        );
      case 4:
        return (
          <StepMeasurements
            data={report.customer_data}
            setData={v => {
              if (typeof v === 'function') {
                setReport(prev => {
                  const newData = v(prev.customer_data);
                  return { ...prev, customer_data: newData };
                });
              } else {
                updateReport({ customer_data: v });
              }
            }}
            onComplete={() => completeStep(4)}
          />
        );
      case 5:
        return (
          <StepPhotos
            photos={photos}
            setPhotos={setPhotos}
            onComplete={() => completeStep(5)}
          />
        );
      case 6:
        return (
          <StepReview
            report={{ ...report, checklist, photos }}
            onUpdateEmail={email => updateReport({ customer_email: email })}
            onMarkSent={() => updateReport({ status: "verzonden" })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-3 p-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center h-10 w-10 rounded-lg text-primary-foreground hover:bg-primary-foreground/20 active:bg-primary-foreground/30 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">
              {report.customer_data.customer_name || "Nieuw rapport"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={progress} className="h-1.5 flex-1 bg-primary-foreground/20" />
              <span className="text-xs text-primary-foreground/80">{progress}%</span>
            </div>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex px-2 pb-2 gap-1 overflow-x-auto">
          {WIZARD_STEPS.map((step, i) => {
            const Icon = stepIcons[i];
            const completed = report.steps_completed[i];
            const active = activeStep === i;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(i)}
                className={`flex flex-col items-center min-w-[52px] py-1.5 px-1 rounded-lg text-xs transition-colors ${
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
                <span className="mt-0.5 leading-tight text-center" style={{ fontSize: "9px" }}>{step.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <main className="p-4 pb-20">
        {renderStep()}
      </main>
    </div>
  );
};

export default BRLWizard;
