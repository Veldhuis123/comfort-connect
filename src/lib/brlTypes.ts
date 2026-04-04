import type { CommissioningData, BRLChecklist } from "@/lib/installationTypes";
import type { BRLPhoto } from "@/components/mobile/MobilePhotoUpload";

export type BRLReportStatus = "concept" | "bezig" | "voltooid" | "verzonden";

export interface BRLTechnician {
  id: string;
  name: string;
  certificate_number: string;
  certificate_expiry: string;
  phone?: string;
}

export interface BRLTool {
  id: string;
  name: string;
  brand: string;
  serial: string;
  calibration_date: string;
  calibration_expiry: string;
}

export interface BRLReport {
  id: string;
  created_at: string;
  updated_at: string;
  status: BRLReportStatus;
  current_step: number;
  
  // Step completion tracking
  steps_completed: boolean[];
  
  // Data per step
  customer_data: CommissioningData;
  technician_id: string;
  selected_tools: string[];
  checklist: BRLChecklist;
  photos: BRLPhoto[];
  customer_email: string;
}

export const WIZARD_STEPS = [
  { id: 0, label: "Klant", icon: "Users" },
  { id: 1, label: "Monteur & Gereedschap", icon: "Wrench" },
  { id: 2, label: "Apparatuur", icon: "Cpu" },
  { id: 3, label: "BRL Checklist", icon: "ClipboardCheck" },
  { id: 4, label: "Meetwaarden", icon: "Thermometer" },
  { id: 5, label: "Foto's", icon: "Camera" },
  { id: 6, label: "Controle & Verzenden", icon: "Send" },
] as const;

export const isToolExpired = (tool: BRLTool): boolean => {
  if (!tool.calibration_expiry) return false;
  return new Date(tool.calibration_expiry) < new Date();
};

export const isCertificateExpired = (tech: BRLTechnician): boolean => {
  if (!tech.certificate_expiry) return false;
  return new Date(tech.certificate_expiry) < new Date();
};

export const getReportProgress = (report: BRLReport): number => {
  const completed = report.steps_completed.filter(Boolean).length;
  return Math.round((completed / WIZARD_STEPS.length) * 100);
};
