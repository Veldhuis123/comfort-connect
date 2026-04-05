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
  { id: 0, label: "Voorbereiding", icon: "ClipboardCheck" },
  { id: 1, label: "Gereedschap", icon: "Settings" },
  { id: 2, label: "Materiaal", icon: "Wrench" },
  { id: 3, label: "Buitenunit", icon: "Thermometer" },
  { id: 4, label: "Binnenunit", icon: "Thermometer" },
  { id: 5, label: "Leidingwerk", icon: "Wrench" },
  { id: 6, label: "Vacuüm & Vullen", icon: "Thermometer" },
  { id: 7, label: "Oplevering", icon: "FileCheck" },
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
