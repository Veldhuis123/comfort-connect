import { apiRequest, API_URL, getAuthToken } from "./api";

// =============================================
// Types
// =============================================

export interface Customer {
  id: number;
  company_name: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  address_street: string;
  address_number: string;
  address_postal: string;
  address_city: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomer {
  company_name?: string;
  contact_name: string;
  email: string;
  phone?: string;
  address_street: string;
  address_number: string;
  address_postal: string;
  address_city: string;
  notes?: string;
}

export interface Technician {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  fgas_certificate_number: string | null;
  fgas_certificate_expires: string | null;
  brl_certificate_number: string | null;
  brl_certificate_expires: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTechnician {
  name: string;
  email?: string;
  phone?: string;
  fgas_certificate_number?: string;
  fgas_certificate_expires?: string;
  brl_certificate_number?: string;
  brl_certificate_expires?: string;
}

export type InstallationType = 'airco' | 'warmtepomp' | 'koeling' | 'ventilatie' | 'overig';
export type InstallationStatus = 'actief' | 'onderhoud_nodig' | 'storing' | 'buiten_gebruik' | 'verwijderd';

export interface Installation {
  id: number;
  qr_code: string;
  customer_id: number;
  name: string;
  location_description: string | null;
  installation_type: InstallationType;
  brand: string;
  model: string;
  serial_number: string | null;
  refrigerant_type: string;
  refrigerant_gwp: number;
  refrigerant_charge_kg: number;
  co2_equivalent: number;
  installation_date: string;
  warranty_expires: string | null;
  next_maintenance_date: string | null;
  next_leak_check_date: string | null;
  status: InstallationStatus;
  installed_by_technician_id: number | null;
  photos: string[];
  documents: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string;
  customer_city?: string;
  technician_name?: string;
}

export interface CreateInstallation {
  customer_id: number;
  name: string;
  location_description?: string;
  installation_type: InstallationType;
  brand: string;
  model: string;
  serial_number?: string;
  refrigerant_type: string;
  refrigerant_gwp: number;
  refrigerant_charge_kg: number;
  installation_date: string;
  warranty_expires?: string;
  next_maintenance_date?: string;
  installed_by_technician_id?: number;
  notes?: string;
}

export type FGasActivityType = 'installatie' | 'bijvullen' | 'terugwinnen' | 'lekcontrole' | 'reparatie' | 'onderhoud' | 'verwijdering';

export interface FGasLog {
  id: number;
  installation_id: number;
  technician_id: number;
  activity_type: FGasActivityType;
  refrigerant_type: string;
  refrigerant_gwp: number;
  quantity_kg: number | null;
  is_addition: boolean;
  new_total_charge_kg: number | null;
  leak_detected: boolean | null;
  leak_location: string | null;
  leak_repaired: boolean | null;
  co2_equivalent: number;
  result: 'goed' | 'aandacht' | 'kritiek';
  notes: string | null;
  performed_at: string;
  created_at: string;
  // Joined
  technician_name?: string;
  fgas_certificate_number?: string;
}

export interface CreateFGasLog {
  technician_id: number;
  activity_type: FGasActivityType;
  refrigerant_type: string;
  refrigerant_gwp: number;
  quantity_kg?: number;
  is_addition?: boolean;
  new_total_charge_kg?: number;
  leak_detected?: boolean;
  leak_location?: string;
  leak_repaired?: boolean;
  result?: 'goed' | 'aandacht' | 'kritiek';
  notes?: string;
  performed_at: string;
}

export interface MaintenanceRecord {
  id: number;
  installation_id: number;
  technician_id: number;
  maintenance_type: 'periodiek' | 'storing' | 'garantie' | 'keuring';
  description: string;
  parts_replaced: string[];
  labor_hours: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  status: 'gepland' | 'uitgevoerd' | 'geannuleerd';
  performed_at: string;
  next_maintenance_date: string | null;
  created_at: string;
  technician_name?: string;
}

export interface CreateMaintenanceRecord {
  technician_id: number;
  maintenance_type: 'periodiek' | 'storing' | 'garantie' | 'keuring';
  description: string;
  parts_replaced?: string[];
  labor_hours?: number;
  parts_cost?: number;
  total_cost?: number;
  performed_at: string;
  next_maintenance_date?: string;
}

export type FaultType = 'niet_koelen' | 'niet_verwarmen' | 'geluid' | 'lekkage' | 'geur' | 'foutcode' | 'overig';
export type FaultUrgency = 'laag' | 'normaal' | 'hoog' | 'spoed';
export type FaultStatus = 'nieuw' | 'in_behandeling' | 'gepland' | 'opgelost' | 'gesloten';

export interface FaultReport {
  id: number;
  installation_id: number;
  reporter_name: string;
  reporter_phone: string | null;
  reporter_email: string | null;
  fault_type: FaultType;
  error_code: string | null;
  description: string;
  urgency: FaultUrgency;
  status: FaultStatus;
  assigned_technician_id: number | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  installation_name?: string;
  brand?: string;
  model?: string;
  customer_name?: string;
  customer_phone?: string;
  assigned_technician_name?: string;
}

export interface CreateFaultReport {
  reporter_name: string;
  reporter_phone?: string;
  reporter_email?: string;
  fault_type: FaultType;
  error_code?: string;
  description: string;
  urgency?: FaultUrgency;
}

export interface InstallationStats {
  totalInstallations: number;
  maintenanceDue: number;
  leakCheckDue: number;
  openFaults: number;
  totalCO2Equivalent: number;
}

export interface PublicInstallation {
  id: number;
  name: string;
  location_description: string | null;
  installation_type: InstallationType;
  brand: string;
  model: string;
  installation_date: string;
  warranty_expires: string | null;
  next_maintenance_date: string | null;
  status: InstallationStatus;
  customer_name: string;
  customer_city: string;
  recent_maintenance: Array<{
    maintenance_type: string;
    description: string;
    performed_at: string;
  }>;
}

// =============================================
// API Endpoints
// =============================================

export const installationsApi = {
  // Customers
  getCustomers: () => apiRequest<Customer[]>('/installations/customers'),
  createCustomer: (data: CreateCustomer) =>
    apiRequest<{ id: number }>('/installations/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: number, data: Partial<CreateCustomer>) =>
    apiRequest('/installations/customers/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: number) =>
    apiRequest('/installations/customers/' + id, { method: 'DELETE' }),

  // Technicians
  getTechnicians: () => apiRequest<Technician[]>('/installations/technicians'),
  createTechnician: (data: CreateTechnician) =>
    apiRequest<{ id: number }>('/installations/technicians', { method: 'POST', body: JSON.stringify(data) }),
  updateTechnician: (id: number, data: Partial<CreateTechnician & { is_active: boolean }>) =>
    apiRequest('/installations/technicians/' + id, { method: 'PUT', body: JSON.stringify(data) }),

  // Installations
  getInstallations: () => apiRequest<Installation[]>('/installations'),
  getInstallation: (id: number) => apiRequest<Installation>('/installations/' + id),
  createInstallation: (data: CreateInstallation) =>
    apiRequest<{ id: number; qr_code: string }>('/installations', { method: 'POST', body: JSON.stringify(data) }),
  updateInstallation: (id: number, data: Partial<Installation>) =>
    apiRequest('/installations/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInstallation: (id: number) =>
    apiRequest('/installations/' + id, { method: 'DELETE' }),

  // Public QR endpoints (no auth required)
  getInstallationByQR: (qrCode: string) =>
    fetch(`${API_URL}/installations/qr/${qrCode}`).then(res => {
      if (!res.ok) throw new Error('Installatie niet gevonden');
      return res.json() as Promise<PublicInstallation>;
    }),
  submitFaultReport: (qrCode: string, data: CreateFaultReport) =>
    fetch(`${API_URL}/installations/qr/${qrCode}/fault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => {
      if (!res.ok) throw new Error('Kon melding niet versturen');
      return res.json() as Promise<{ id: number; message: string }>;
    }),

  // F-Gas logs
  getFGasLogs: (installationId: number) =>
    apiRequest<FGasLog[]>('/installations/' + installationId + '/fgas'),
  createFGasLog: (installationId: number, data: CreateFGasLog) =>
    apiRequest<{ id: number }>('/installations/' + installationId + '/fgas', { method: 'POST', body: JSON.stringify(data) }),

  // Maintenance records
  getMaintenanceRecords: (installationId: number) =>
    apiRequest<MaintenanceRecord[]>('/installations/' + installationId + '/maintenance'),
  createMaintenanceRecord: (installationId: number, data: CreateMaintenanceRecord) =>
    apiRequest<{ id: number }>('/installations/' + installationId + '/maintenance', { method: 'POST', body: JSON.stringify(data) }),

  // Fault reports
  getAllFaultReports: () => apiRequest<FaultReport[]>('/installations/faults/all'),
  updateFaultReport: (id: number, data: { status?: FaultStatus; assigned_technician_id?: number; resolution_notes?: string }) =>
    apiRequest('/installations/faults/' + id, { method: 'PATCH', body: JSON.stringify(data) }),

  // Stats
  getStats: () => apiRequest<InstallationStats>('/installations/stats/summary'),
};

// =============================================
// GWP Reference Data
// =============================================

export const REFRIGERANT_GWP: Record<string, number> = {
  'R32': 675,
  'R410A': 2088,
  'R290': 3,
  'R134a': 1430,
  'R404A': 3922,
  'R407C': 1774,
  'R22': 1810,
  'R717': 0, // Ammonia
  'R744': 1, // CO2
};

export const REFRIGERANT_OPTIONS = Object.keys(REFRIGERANT_GWP);
