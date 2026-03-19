// Eaton groepenkast componenten database
// Prijzen zijn indicatief (excl. BTW)

export type ComponentCategory = 'kast' | 'aardlekschakelaar' | 'aardlekautomaat' | 'installatieautomaat' | 'hoofdschakelaar' | 'overspanningsbeveiliging' | 'aansluitklem' | 'kam' | 'overig';

export interface EatonComponent {
  id: string;
  articleNumber: string;
  name: string;
  category: ComponentCategory;
  description: string;
  amperage?: number;
  poles?: number;
  characteristic?: string; // B, C, D
  sensitivity?: number; // mA for RCD
  modules: number; // DIN rail modules width
  price: number; // excl. BTW
}

export interface GroepenkastConfig {
  id: string;
  name: string;
  customer?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  rows: GroepenkastRow[];
  notes?: string;
}

export interface GroepenkastRow {
  id: string;
  label: string;
  components: SelectedComponent[];
}

export interface SelectedComponent {
  id: string;
  componentId: string;
  label: string; // user-assigned label e.g. "Verlichting keuken"
  quantity: number;
}

// Eaton product catalog - common residential components
export const EATON_COMPONENTS: EatonComponent[] = [
  // Kasten
  { id: 'kast-1r-12', articleNumber: 'BC-O-1/12-TW-ECO', name: 'Verdeelkast 1-rij 12 modules', category: 'kast', description: 'Opbouw verdeler 1 rij, 12 TE', modules: 12, price: 28.50 },
  { id: 'kast-2r-24', articleNumber: 'BC-O-2/24-TW-ECO', name: 'Verdeelkast 2-rij 24 modules', category: 'kast', description: 'Opbouw verdeler 2 rijen, 24 TE', modules: 24, price: 42.00 },
  { id: 'kast-3r-36', articleNumber: 'BC-O-3/36-TW-ECO', name: 'Verdeelkast 3-rij 36 modules', category: 'kast', description: 'Opbouw verdeler 3 rijen, 36 TE', modules: 36, price: 56.00 },
  { id: 'kast-4r-48', articleNumber: 'BC-O-4/48-TW-ECO', name: 'Verdeelkast 4-rij 48 modules', category: 'kast', description: 'Opbouw verdeler 4 rijen, 48 TE', modules: 48, price: 72.00 },

  // Hoofdschakelaars
  { id: 'hs-3p-25', articleNumber: 'IS-25/3', name: 'Hoofdschakelaar 3P 25A', category: 'hoofdschakelaar', description: '3-polige hoofdschakelaar 25A', amperage: 25, poles: 3, modules: 3, price: 18.50 },
  { id: 'hs-3p-40', articleNumber: 'IS-40/3', name: 'Hoofdschakelaar 3P 40A', category: 'hoofdschakelaar', description: '3-polige hoofdschakelaar 40A', amperage: 40, poles: 3, modules: 3, price: 22.00 },
  { id: 'hs-3p-63', articleNumber: 'IS-63/3', name: 'Hoofdschakelaar 3P 63A', category: 'hoofdschakelaar', description: '3-polige hoofdschakelaar 63A', amperage: 63, poles: 3, modules: 3, price: 28.00 },

  // Aardlekschakelaars (RCD)
  { id: 'rcd-2p-40-30', articleNumber: 'PF6-40/2/003', name: 'Aardlekschakelaar 2P 40A 30mA', category: 'aardlekschakelaar', description: '2-polig, type A, 30mA', amperage: 40, poles: 2, sensitivity: 30, modules: 2, price: 42.00 },
  { id: 'rcd-2p-63-30', articleNumber: 'PF6-63/2/003', name: 'Aardlekschakelaar 2P 63A 30mA', category: 'aardlekschakelaar', description: '2-polig, type A, 30mA', amperage: 63, poles: 2, sensitivity: 30, modules: 2, price: 48.00 },
  { id: 'rcd-4p-40-30', articleNumber: 'PF6-40/4/003', name: 'Aardlekschakelaar 4P 40A 30mA', category: 'aardlekschakelaar', description: '4-polig, type A, 30mA', amperage: 40, poles: 4, sensitivity: 30, modules: 4, price: 68.00 },
  { id: 'rcd-4p-63-30', articleNumber: 'PF6-63/4/003', name: 'Aardlekschakelaar 4P 63A 30mA', category: 'aardlekschakelaar', description: '4-polig, type A, 30mA', amperage: 63, poles: 4, sensitivity: 30, modules: 4, price: 78.00 },
  { id: 'rcd-4p-40-300', articleNumber: 'PF6-40/4/03', name: 'Aardlekschakelaar 4P 40A 300mA', category: 'aardlekschakelaar', description: '4-polig, type A, 300mA (voeding)', amperage: 40, poles: 4, sensitivity: 300, modules: 4, price: 62.00 },

  // Aardlekautomaten (RCBO)
  { id: 'rcbo-1pn-b16-30', articleNumber: 'PFL6-16/1N/B/003', name: 'Aardlekautomaat 1P+N B16A 30mA', category: 'aardlekautomaat', description: '1P+N, kar. B, 16A, 30mA type A', amperage: 16, poles: 2, characteristic: 'B', sensitivity: 30, modules: 2, price: 52.00 },
  { id: 'rcbo-1pn-b20-30', articleNumber: 'PFL6-20/1N/B/003', name: 'Aardlekautomaat 1P+N B20A 30mA', category: 'aardlekautomaat', description: '1P+N, kar. B, 20A, 30mA type A', amperage: 20, poles: 2, characteristic: 'B', sensitivity: 30, modules: 2, price: 54.00 },
  { id: 'rcbo-1pn-c16-30', articleNumber: 'PFL6-16/1N/C/003', name: 'Aardlekautomaat 1P+N C16A 30mA', category: 'aardlekautomaat', description: '1P+N, kar. C, 16A, 30mA type A', amperage: 16, poles: 2, characteristic: 'C', sensitivity: 30, modules: 2, price: 56.00 },
  { id: 'rcbo-1pn-c20-30', articleNumber: 'PFL6-20/1N/C/003', name: 'Aardlekautomaat 1P+N C20A 30mA', category: 'aardlekautomaat', description: '1P+N, kar. C, 20A, 30mA type A', amperage: 20, poles: 2, characteristic: 'C', sensitivity: 30, modules: 2, price: 58.00 },

  // Installatieautomaten
  { id: 'mcb-1p-b10', articleNumber: 'PL6-B10/1', name: 'Installatieautomaat 1P B10A', category: 'installatieautomaat', description: '1-polig, karakteristiek B, 10A', amperage: 10, poles: 1, characteristic: 'B', modules: 1, price: 6.50 },
  { id: 'mcb-1p-b16', articleNumber: 'PL6-B16/1', name: 'Installatieautomaat 1P B16A', category: 'installatieautomaat', description: '1-polig, karakteristiek B, 16A', amperage: 16, poles: 1, characteristic: 'B', modules: 1, price: 6.50 },
  { id: 'mcb-1p-b20', articleNumber: 'PL6-B20/1', name: 'Installatieautomaat 1P B20A', category: 'installatieautomaat', description: '1-polig, karakteristiek B, 20A', amperage: 20, poles: 1, characteristic: 'B', modules: 1, price: 7.00 },
  { id: 'mcb-1p-c16', articleNumber: 'PL6-C16/1', name: 'Installatieautomaat 1P C16A', category: 'installatieautomaat', description: '1-polig, karakteristiek C, 16A', amperage: 16, poles: 1, characteristic: 'C', modules: 1, price: 7.00 },
  { id: 'mcb-1p-c20', articleNumber: 'PL6-C20/1', name: 'Installatieautomaat 1P C20A', category: 'installatieautomaat', description: '1-polig, karakteristiek C, 20A', amperage: 20, poles: 1, characteristic: 'C', modules: 1, price: 7.50 },
  { id: 'mcb-3p-b16', articleNumber: 'PL6-B16/3', name: 'Installatieautomaat 3P B16A', category: 'installatieautomaat', description: '3-polig, karakteristiek B, 16A', amperage: 16, poles: 3, characteristic: 'B', modules: 3, price: 19.50 },
  { id: 'mcb-3p-c16', articleNumber: 'PL6-C16/3', name: 'Installatieautomaat 3P C16A', category: 'installatieautomaat', description: '3-polig, karakteristiek C, 16A', amperage: 16, poles: 3, characteristic: 'C', modules: 3, price: 21.00 },
  { id: 'mcb-3p-c20', articleNumber: 'PL6-C20/3', name: 'Installatieautomaat 3P C20A', category: 'installatieautomaat', description: '3-polig, karakteristiek C, 20A', amperage: 20, poles: 3, characteristic: 'C', modules: 3, price: 22.50 },

  // Overspanningsbeveiliging
  { id: 'spd-t2-3pn', articleNumber: 'SPC-S-20/280/3+1', name: 'Overspanningsbeveiliging T2 3P+N', category: 'overspanningsbeveiliging', description: 'Type 2, 3P+N, 20kA', poles: 4, modules: 4, price: 125.00 },

  // Kammen
  { id: 'kam-1p-12', articleNumber: 'Z-GV-16/1P-12TE', name: 'Kamrail 1P 12 modules', category: 'kam', description: 'Aansluitkam 1-polig, 12 TE', modules: 0, price: 8.50 },
  { id: 'kam-3p-12', articleNumber: 'Z-GV-16/3P-12TE', name: 'Kamrail 3P 12 modules', category: 'kam', description: 'Aansluitkam 3-polig, 12 TE', modules: 0, price: 14.00 },
];

export const COMPONENT_CATEGORIES: { value: ComponentCategory; label: string }[] = [
  { value: 'kast', label: 'Kast' },
  { value: 'hoofdschakelaar', label: 'Hoofdschakelaar' },
  { value: 'aardlekschakelaar', label: 'Aardlekschakelaar' },
  { value: 'aardlekautomaat', label: 'Aardlekautomaat' },
  { value: 'installatieautomaat', label: 'Installatieautomaat' },
  { value: 'overspanningsbeveiliging', label: 'Overspanningsbeveiliging' },
  { value: 'kam', label: 'Kamrail' },
];

// Common group labels for residential installations
export const COMMON_GROUP_LABELS = [
  'Verlichting woonkamer', 'Verlichting keuken', 'Verlichting slaapkamer', 'Verlichting badkamer',
  'Verlichting hal/overloop', 'Verlichting buiten', 'Verlichting zolder',
  'WCD woonkamer', 'WCD keuken', 'WCD slaapkamer', 'WCD badkamer', 'WCD garage',
  'Wasmachine', 'Droger', 'Vaatwasser', 'Oven', 'Kookplaat', 'Boiler',
  'CV-ketel', 'Warmtepomp', 'Airco', 'Laadpaal', 'Zonnepanelen',
  'Mechanische ventilatie', 'Alarm', 'Buitenunit', 'Server/ICT',
];

export const generateConfigId = () => `gk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const generateRowId = () => `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const generateComponentId = () => `comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
