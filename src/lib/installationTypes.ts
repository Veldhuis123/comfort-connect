// Gereedschap registratie
export interface ToolRegistration {
  manometer_brand: string;
  manometer_serial: string;
  manometer_calibration_date: string;
  vacuum_pump_brand: string;
  vacuum_pump_serial: string;
  leak_detector_brand: string;
  leak_detector_serial: string;
  leak_detector_calibration_date: string;
  refrigerant_scale_brand: string;
  refrigerant_scale_serial: string;
  refrigerant_scale_calibration_date: string;
  recovery_unit_brand: string;
  recovery_unit_serial: string;
}

// Inbedrijfstellingsrapport data
export interface CommissioningData {
  // Header
  werkbon_number: string;
  date: string;
  
  // Bedrijfsgegevens
  company_name: string;
  company_address: string;
  company_postal: string;
  company_city: string;
  technician_name: string;
  technician_certificate: string;
  
  // Klantgegevens
  customer_name: string;
  customer_contact: string;
  customer_address: string;
  customer_postal: string;
  customer_city: string;
  customer_phone: string;
  
  // Installatiegegevens
  brand: string;
  model_outdoor: string;
  serial_outdoor: string;
  model_indoor: string;
  serial_indoor: string;
  
  // Multi-split units (optioneel)
  model_indoor_2: string;
  serial_indoor_2: string;
  model_indoor_3: string;
  serial_indoor_3: string;
  
  // Koudemiddel
  installation_number: string;
  refrigerant_type: string;
  standard_charge: string;
  additional_charge: string;
  commissioning_date: string;
  
  // Werkzaamheden checkboxes
  pressure_test_done: boolean;
  leak_test_done: boolean;
  vacuum_done: boolean;
  leak_detection_done: boolean;
  
  // Vacumeerprocedure
  vacuum_pressure: string;
  vacuum_pressure_unit: string;
  vacuum_hold_time: string;
  vacuum_hold_unit: string;
  
  // Drukbeproeving
  low_pressure_value: string;
  low_pressure_unit: string;
  high_pressure_value: string;
  high_pressure_unit: string;
  pressure_hold_time: string;
  pressure_hold_unit: string;
  
  // Installatiecontrole
  high_pressure_reading: string;
  condensation_temp: string;
  discharge_temp: string;
  low_pressure_reading: string;
  evaporation_temp: string;
  suction_temp: string;
  outdoor_temp: string;
  indoor_temp: string;
  outlet_temp: string;
  
  // Gereedschap
  tools: ToolRegistration;
  
  // Opmerkingen
  remarks: string;
}

export interface BRLChecklist {
  // Stap 1: Voorbereiding
  customer_informed: boolean;
  location_inspected: boolean;
  electrical_capacity_checked: boolean;
  condensate_drain_planned: boolean;
  
  // Stap 2: Materiaal controle
  equipment_checked: boolean;
  refrigerant_verified: boolean;
  tools_calibrated: boolean;
  safety_equipment_present: boolean;
  
  // Stap 3: Installatie buitenunit
  outdoor_location_suitable: boolean;
  outdoor_mounted_level: boolean;
  outdoor_clearance_ok: boolean;
  outdoor_vibration_dampened: boolean;
  
  // Stap 4: Installatie binnenunit
  indoor_location_suitable: boolean;
  indoor_mounted_level: boolean;
  indoor_airflow_ok: boolean;
  condensate_connected: boolean;
  
  // Stap 5: Leidingwerk
  pipes_insulated: boolean;
  pipes_protected: boolean;
  pipes_leak_tested: boolean;
  electrical_connected: boolean;
  
  // Stap 6: Vacuümtrekken & vullen
  vacuum_achieved: boolean;
  vacuum_held: boolean;
  refrigerant_charged: boolean;
  charge_recorded: boolean;
  
  // Stap 7: Testen & oplevering
  cooling_tested: boolean;
  heating_tested: boolean;
  controls_explained: boolean;
  documentation_handed: boolean;
  
  // Opmerkingen per stap
  notes_step1: string;
  notes_step2: string;
  notes_step3: string;
  notes_step4: string;
  notes_step5: string;
  notes_step6: string;
  notes_step7: string;
}

export const defaultTools: ToolRegistration = {
  manometer_brand: "",
  manometer_serial: "",
  manometer_calibration_date: "",
  vacuum_pump_brand: "",
  vacuum_pump_serial: "",
  leak_detector_brand: "",
  leak_detector_serial: "",
  leak_detector_calibration_date: "",
  refrigerant_scale_brand: "",
  refrigerant_scale_serial: "",
  refrigerant_scale_calibration_date: "",
  recovery_unit_brand: "",
  recovery_unit_serial: "",
};

export const defaultCommissioningData: CommissioningData = {
  werkbon_number: "",
  date: new Date().toISOString().split("T")[0],
  company_name: "R. Veldhuis Installatie",
  company_address: "",
  company_postal: "",
  company_city: "",
  technician_name: "",
  technician_certificate: "",
  customer_name: "",
  customer_contact: "",
  customer_address: "",
  customer_postal: "",
  customer_city: "",
  customer_phone: "",
  brand: "",
  model_outdoor: "",
  serial_outdoor: "",
  model_indoor: "",
  serial_indoor: "",
  model_indoor_2: "",
  serial_indoor_2: "",
  model_indoor_3: "",
  serial_indoor_3: "",
  installation_number: "",
  refrigerant_type: "R32",
  standard_charge: "",
  additional_charge: "",
  commissioning_date: new Date().toISOString().split("T")[0],
  pressure_test_done: false,
  leak_test_done: false,
  vacuum_done: false,
  leak_detection_done: false,
  vacuum_pressure: "",
  vacuum_pressure_unit: "Pa/Micron",
  vacuum_hold_time: "",
  vacuum_hold_unit: "Min",
  low_pressure_value: "",
  low_pressure_unit: "kPa",
  high_pressure_value: "",
  high_pressure_unit: "kPa",
  pressure_hold_time: "",
  pressure_hold_unit: "Min",
  high_pressure_reading: "",
  condensation_temp: "",
  discharge_temp: "",
  low_pressure_reading: "",
  evaporation_temp: "",
  suction_temp: "",
  outdoor_temp: "",
  indoor_temp: "",
  outlet_temp: "",
  tools: defaultTools,
  remarks: "",
};

export const defaultChecklist: BRLChecklist = {
  customer_informed: false,
  location_inspected: false,
  electrical_capacity_checked: false,
  condensate_drain_planned: false,
  equipment_checked: false,
  refrigerant_verified: false,
  tools_calibrated: false,
  safety_equipment_present: false,
  outdoor_location_suitable: false,
  outdoor_mounted_level: false,
  outdoor_clearance_ok: false,
  outdoor_vibration_dampened: false,
  indoor_location_suitable: false,
  indoor_mounted_level: false,
  indoor_airflow_ok: false,
  condensate_connected: false,
  pipes_insulated: false,
  pipes_protected: false,
  pipes_leak_tested: false,
  electrical_connected: false,
  vacuum_achieved: false,
  vacuum_held: false,
  refrigerant_charged: false,
  charge_recorded: false,
  cooling_tested: false,
  heating_tested: false,
  controls_explained: false,
  documentation_handed: false,
  notes_step1: "",
  notes_step2: "",
  notes_step3: "",
  notes_step4: "",
  notes_step5: "",
  notes_step6: "",
  notes_step7: "",
};
