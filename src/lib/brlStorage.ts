import type { BRLReport, BRLTechnician, BRLTool } from "./brlTypes";
import { defaultCommissioningData, defaultChecklist } from "./installationTypes";

const REPORTS_KEY = "brl_reports";
const TECHNICIANS_KEY = "brl_technicians";
const TOOLS_KEY = "brl_tools";

// Reports
export const getReports = (): BRLReport[] => {
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) || "[]");
  } catch { return []; }
};

export const saveReports = (reports: BRLReport[]) => {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

export const saveReport = (report: BRLReport) => {
  const reports = getReports();
  const idx = reports.findIndex(r => r.id === report.id);
  if (idx >= 0) reports[idx] = { ...report, updated_at: new Date().toISOString() };
  else reports.unshift(report);
  saveReports(reports);
};

export const deleteReport = (id: string) => {
  saveReports(getReports().filter(r => r.id !== id));
};

export const createNewReport = (): BRLReport => ({
  id: crypto.randomUUID(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  status: "concept",
  current_step: 0,
  steps_completed: [false, false, false, false, false, false, false],
  customer_data: { ...defaultCommissioningData },
  technician_id: "",
  selected_tools: [],
  checklist: { ...defaultChecklist },
  photos: [],
  customer_email: "",
});

// Technicians
export const getTechnicians = (): BRLTechnician[] => {
  try {
    return JSON.parse(localStorage.getItem(TECHNICIANS_KEY) || "[]");
  } catch { return []; }
};

export const saveTechnicians = (techs: BRLTechnician[]) => {
  localStorage.setItem(TECHNICIANS_KEY, JSON.stringify(techs));
};

// Tools
export const getTools = (): BRLTool[] => {
  try {
    return JSON.parse(localStorage.getItem(TOOLS_KEY) || "[]");
  } catch { return []; }
};

export const saveTools = (tools: BRLTool[]) => {
  localStorage.setItem(TOOLS_KEY, JSON.stringify(tools));
};
