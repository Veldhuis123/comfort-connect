-- =============================================
-- Prijsbeheer Extensie voor Airco Calculator
-- MySQL Compatible Version
-- =============================================

-- Voeg prijsvelden toe aan products tabel
-- Run deze statements individueel als een kolom al bestaat

-- Check en voeg kolommen toe via stored procedure
DELIMITER //

DROP PROCEDURE IF EXISTS add_pricing_columns//

CREATE PROCEDURE add_pricing_columns()
BEGIN
    -- purchase_price
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'purchase_price') THEN
        ALTER TABLE products ADD COLUMN purchase_price DECIMAL(10,2) NULL COMMENT 'Inkoopprijs excl. BTW';
    END IF;
    
    -- margin_percent
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'margin_percent') THEN
        ALTER TABLE products ADD COLUMN margin_percent DECIMAL(5,2) DEFAULT 30.00 COMMENT 'Marge percentage';
    END IF;
    
    -- expected_hours
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'expected_hours') THEN
        ALTER TABLE products ADD COLUMN expected_hours DECIMAL(4,2) DEFAULT 4.00 COMMENT 'Verwachte installatie-uren';
    END IF;
    
    -- model_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'model_number') THEN
        ALTER TABLE products ADD COLUMN model_number VARCHAR(100) NULL COMMENT 'Fabrikant modelnummer';
    END IF;
    
    -- outdoor_model
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'outdoor_model') THEN
        ALTER TABLE products ADD COLUMN outdoor_model VARCHAR(100) NULL COMMENT 'Buitenunit modelnummer';
    END IF;
    
    -- energy_label
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'energy_label') THEN
        ALTER TABLE products ADD COLUMN energy_label VARCHAR(10) NULL COMMENT 'Energie label';
    END IF;
    
    -- cooling_capacity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'cooling_capacity') THEN
        ALTER TABLE products ADD COLUMN cooling_capacity DECIMAL(5,2) NULL COMMENT 'Koelvermogen in kW';
    END IF;
    
    -- heating_capacity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'heating_capacity') THEN
        ALTER TABLE products ADD COLUMN heating_capacity DECIMAL(5,2) NULL COMMENT 'Verwarmingsvermogen in kW';
    END IF;
    
    -- seer
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'seer') THEN
        ALTER TABLE products ADD COLUMN seer DECIMAL(4,1) NULL COMMENT 'SEER waarde';
    END IF;
    
    -- scop
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'scop') THEN
        ALTER TABLE products ADD COLUMN scop DECIMAL(4,1) NULL COMMENT 'SCOP waarde';
    END IF;
    
    -- refrigerant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'refrigerant') THEN
        ALTER TABLE products ADD COLUMN refrigerant VARCHAR(20) NULL COMMENT 'Koudemiddel';
    END IF;
    
    -- noise_indoor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'noise_indoor') THEN
        ALTER TABLE products ADD COLUMN noise_indoor INT NULL COMMENT 'Geluidsniveau binnen (dB)';
    END IF;
    
    -- noise_outdoor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'noise_outdoor') THEN
        ALTER TABLE products ADD COLUMN noise_outdoor INT NULL COMMENT 'Geluidsniveau buiten (dB)';
    END IF;
END//

DELIMITER ;

-- Voer de procedure uit
CALL add_pricing_columns();

-- Verwijder de procedure na gebruik
DROP PROCEDURE IF EXISTS add_pricing_columns;

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
