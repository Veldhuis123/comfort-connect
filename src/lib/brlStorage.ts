import type { BRLReport, BRLTechnician, BRLTool } from "./brlTypes";
import { defaultCommissioningData, defaultChecklist } from "./installationTypes";

const REPORTS_KEY = "brl_reports";
const TECHNICIANS_KEY = "brl_technicians";
const TOOLS_KEY = "brl_tools";

const normalizeReport = (report: Partial<BRLReport> & { id: string }): BRLReport => ({
  id: report.id,
  created_at: report.created_at || new Date().toISOString(),
  updated_at: report.updated_at || new Date().toISOString(),
  status: report.status || "concept",
  current_step: typeof report.current_step === "number" ? report.current_step : 0,
  steps_completed: Array.isArray(report.steps_completed)
    ? report.steps_completed.length === 8 ? report.steps_completed : [...(report.steps_completed || []), ...Array(8).fill(false)].slice(0, 8)
    : [false, false, false, false, false, false, false, false],
  customer_data: { ...defaultCommissioningData, ...(report.customer_data || {}) },
  technician_id: report.technician_id || "",
  selected_tools: Array.isArray(report.selected_tools) ? report.selected_tools : [],
  checklist: { ...defaultChecklist, ...(report.checklist || {}) },
  photos: Array.isArray(report.photos) ? report.photos : [],
  customer_email: report.customer_email || "",
});

// Reports
export const getReports = (): BRLReport[] => {
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) || "[]").map(normalizeReport);
  } catch { return []; }
};

export const saveReports = (reports: BRLReport[]) => {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.map(normalizeReport)));
};

export const saveReport = (report: BRLReport) => {
  const reports = getReports();
  const idx = reports.findIndex(r => r.id === report.id);
  const normalized = normalizeReport({ ...report, updated_at: new Date().toISOString() });
  if (idx >= 0) reports[idx] = normalized;
  else reports.unshift(normalized);
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
  steps_completed: [false, false, false, false, false, false, false, false],
  customer_data: { ...defaultCommissioningData, werkbon_number: "" },
  technician_id: "",
  selected_tools: [],
  checklist: { ...defaultChecklist },
  photos: [],
  customer_email: "",
});

export const mergeReports = (localReports: BRLReport[], remoteReports: BRLReport[]): BRLReport[] => {
  const merged = new Map<string, BRLReport>();

  [...localReports, ...remoteReports]
    .map(normalizeReport)
    .forEach((report) => {
      const existing = merged.get(report.id);
      if (!existing || new Date(report.updated_at).getTime() >= new Date(existing.updated_at).getTime()) {
        merged.set(report.id, report);
      }
    });

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
};

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
