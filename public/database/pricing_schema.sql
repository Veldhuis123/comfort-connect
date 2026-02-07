-- =============================================
-- Prijsbeheer Extensie voor Airco Calculator
-- =============================================

-- Voeg prijsvelden toe aan products tabel
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2) NULL COMMENT 'Inkoopprijs excl. BTW';
ALTER TABLE products ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5,2) DEFAULT 30.00 COMMENT 'Marge percentage';
ALTER TABLE products ADD COLUMN IF NOT EXISTS expected_hours DECIMAL(4,2) DEFAULT 4.00 COMMENT 'Verwachte installatie-uren';
ALTER TABLE products ADD COLUMN IF NOT EXISTS model_number VARCHAR(100) NULL COMMENT 'Fabrikant modelnummer (bijv. AS25PBPHRA-PRE)';
ALTER TABLE products ADD COLUMN IF NOT EXISTS outdoor_model VARCHAR(100) NULL COMMENT 'Buitenunit modelnummer';
ALTER TABLE products ADD COLUMN IF NOT EXISTS energy_label VARCHAR(10) NULL COMMENT 'Energie label (A+++, A++, etc.)';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cooling_capacity DECIMAL(5,2) NULL COMMENT 'Koelvermogen in kW';
ALTER TABLE products ADD COLUMN IF NOT EXISTS heating_capacity DECIMAL(5,2) NULL COMMENT 'Verwarmingsvermogen in kW';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seer DECIMAL(4,1) NULL COMMENT 'SEER waarde';
ALTER TABLE products ADD COLUMN IF NOT EXISTS scop DECIMAL(4,1) NULL COMMENT 'SCOP waarde';
ALTER TABLE products ADD COLUMN IF NOT EXISTS refrigerant VARCHAR(20) NULL COMMENT 'Koudemiddel (R32, R290, etc.)';
ALTER TABLE products ADD COLUMN IF NOT EXISTS noise_indoor INT NULL COMMENT 'Geluidsniveau binnen (dB)';
ALTER TABLE products ADD COLUMN IF NOT EXISTS noise_outdoor INT NULL COMMENT 'Geluidsniveau buiten (dB)';

-- =============================================
-- Installatie-instellingen per categorie
-- =============================================

CREATE TABLE IF NOT EXISTS installation_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL COMMENT 'Product categorie (airco, battery, etc.)',
    setting_key VARCHAR(50) NOT NULL COMMENT 'Instelling sleutel',
    setting_value DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Waarde',
    unit VARCHAR(20) NULL COMMENT 'Eenheid (uur, meter, stuk)',
    description VARCHAR(255) NULL COMMENT 'Beschrijving',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_category_key (category, setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Standaard airco installatie-instellingen
INSERT INTO installation_settings (category, setting_key, setting_value, unit, description) VALUES
-- Arbeid
('airco', 'hourly_rate', 55.00, 'uur', 'Uurtarief installateur excl. BTW'),
('airco', 'travel_cost', 35.00, 'rit', 'Voorrijkosten per rit'),
('airco', 'min_hours', 4.00, 'uur', 'Minimum uren per installatie'),

-- Materialen
('airco', 'pipe_per_meter', 35.00, 'meter', 'Koelleidingset per meter (incl. isolatie)'),
('airco', 'pipe_included_meters', 3.00, 'meter', 'Standaard inbegrepen meters leiding'),
('airco', 'cable_duct_per_meter', 12.50, 'meter', 'Kabelgoot per meter'),
('airco', 'mounting_bracket', 45.00, 'stuk', 'Montagebeugel buitenunit'),
('airco', 'wall_bracket', 25.00, 'stuk', 'Wandbeugel binnenunit'),
('airco', 'condensate_pump', 95.00, 'stuk', 'Condenspomp (optioneel)'),

-- Elektra
('airco', 'electrical_group', 185.00, 'stuk', 'Nieuwe groep meterkast'),
('airco', 'fuse_upgrade', 75.00, 'stuk', 'Zekering upgrade'),

-- Klein materiaal
('airco', 'small_materials', 45.00, 'set', 'Klein materiaal (tie-wraps, kit, etc.)'),
('airco', 'vacuum_nitrogen', 35.00, 'set', 'Vacuüm & stikstof'),

-- BTW
('airco', 'vat_rate', 21.00, 'procent', 'BTW percentage')

ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- =============================================
-- Prijzen per productgrootte (capaciteit-afhankelijk)
-- =============================================

CREATE TABLE IF NOT EXISTS capacity_pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    min_capacity DECIMAL(5,2) NOT NULL COMMENT 'Minimum capaciteit (kW)',
    max_capacity DECIMAL(5,2) NOT NULL COMMENT 'Maximum capaciteit (kW)',
    extra_hours DECIMAL(4,2) DEFAULT 0 COMMENT 'Extra uren voor deze capaciteit',
    extra_materials DECIMAL(10,2) DEFAULT 0 COMMENT 'Extra materiaalkosten',
    notes VARCHAR(255) NULL,
    UNIQUE KEY uk_category_capacity (category, min_capacity, max_capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Capaciteit-afhankelijke prijzen
INSERT INTO capacity_pricing (category, min_capacity, max_capacity, extra_hours, extra_materials, notes) VALUES
('airco', 0.00, 3.00, 0.00, 0.00, 'Kleine units tot 3kW'),
('airco', 3.01, 5.00, 0.50, 25.00, 'Medium units 3-5kW'),
('airco', 5.01, 7.50, 1.00, 50.00, 'Grote units 5-7.5kW'),
('airco', 7.51, 10.00, 1.50, 75.00, 'XL units 7.5-10kW'),
('airco', 10.01, 20.00, 2.50, 125.00, 'XXL units 10kW+')
ON DUPLICATE KEY UPDATE extra_hours = VALUES(extra_hours), extra_materials = VALUES(extra_materials);
