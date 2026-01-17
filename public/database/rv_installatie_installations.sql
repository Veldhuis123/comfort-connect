-- =============================================
-- R. Veldhuis Installatie - Installatiebeheer & F-Gas Schema
-- BRL 200/100 conform, F-gas EU 517/2014 compliant
-- =============================================

-- =============================================
-- Tabel: customers (Klanten)
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NULL,
    contact_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    address_street VARCHAR(255) NOT NULL,
    address_number VARCHAR(20) NOT NULL,
    address_postal VARCHAR(10) NOT NULL,
    address_city VARCHAR(100) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: technicians (Monteurs met F-gas certificering)
-- =============================================
CREATE TABLE IF NOT EXISTS technicians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(20) NULL,
    -- F-gas certificering
    fgas_certificate_number VARCHAR(50) NULL,
    fgas_certificate_expires DATE NULL,
    -- BRL certificering
    brl_certificate_number VARCHAR(50) NULL,
    brl_certificate_expires DATE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: installations (Installaties)
-- =============================================
CREATE TABLE IF NOT EXISTS installations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    qr_code VARCHAR(36) UNIQUE NOT NULL, -- UUID voor QR code
    customer_id INT NOT NULL,
    
    -- Installatiegegevens
    name VARCHAR(100) NOT NULL,
    location_description TEXT NULL, -- Bijv. "Woonkamer links"
    installation_type ENUM('airco', 'warmtepomp', 'koeling', 'ventilatie', 'overig') NOT NULL,
    
    -- Apparaatgegevens
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NULL,
    
    -- Koudemiddel (F-gas)
    refrigerant_type VARCHAR(20) NOT NULL, -- R32, R410A, R290, etc.
    refrigerant_gwp INT NOT NULL, -- Global Warming Potential
    refrigerant_charge_kg DECIMAL(6,3) NOT NULL, -- kg
    co2_equivalent DECIMAL(10,2) GENERATED ALWAYS AS (refrigerant_charge_kg * refrigerant_gwp / 1000) STORED, -- ton CO2-eq
    
    -- Data & Status
    installation_date DATE NOT NULL,
    warranty_expires DATE NULL,
    next_maintenance_date DATE NULL,
    next_leak_check_date DATE NULL, -- Verplicht bij >=5 ton CO2-eq
    status ENUM('actief', 'onderhoud_nodig', 'storing', 'buiten_gebruik', 'verwijderd') DEFAULT 'actief',
    
    -- Technicus
    installed_by_technician_id INT NULL,
    
    -- Foto's en documenten (JSON array)
    photos JSON DEFAULT '[]',
    documents JSON DEFAULT '[]',
    
    -- Notities
    notes TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (installed_by_technician_id) REFERENCES technicians(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: fgas_logs (F-gas registratie logboek)
-- EU 517/2014 compliant
-- =============================================
CREATE TABLE IF NOT EXISTS fgas_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    installation_id INT NOT NULL,
    technician_id INT NOT NULL,
    
    -- Type activiteit
    activity_type ENUM(
        'installatie',          -- Eerste vulling
        'bijvullen',            -- Bijvullen
        'terugwinnen',          -- Terugwinnen
        'lekcontrole',          -- Periodieke lekcontrole
        'reparatie',            -- Reparatie
        'onderhoud',            -- Regulier onderhoud
        'verwijdering'          -- Volledige verwijdering
    ) NOT NULL,
    
    -- Koudemiddel gegevens
    refrigerant_type VARCHAR(20) NOT NULL,
    refrigerant_gwp INT NOT NULL,
    quantity_kg DECIMAL(6,3) NULL, -- Hoeveelheid toegevoegd (+) of teruggewonnen (-)
    is_addition BOOLEAN DEFAULT TRUE, -- TRUE = toegevoegd, FALSE = teruggewonnen
    
    -- Na actie: nieuwe totale vulling
    new_total_charge_kg DECIMAL(6,3) NULL,
    
    -- Lekcontrole specifiek
    leak_detected BOOLEAN NULL,
    leak_location TEXT NULL,
    leak_repaired BOOLEAN NULL,
    
    -- CO2 equivalent berekening
    co2_equivalent DECIMAL(10,2) GENERATED ALWAYS AS (COALESCE(quantity_kg, 0) * refrigerant_gwp / 1000) STORED,
    
    -- Resultaat & opmerkingen
    result ENUM('goed', 'aandacht', 'kritiek') DEFAULT 'goed',
    notes TEXT NULL,
    
    -- Datum
    performed_at DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: maintenance_records (Onderhoudshistorie)
-- =============================================
CREATE TABLE IF NOT EXISTS maintenance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    installation_id INT NOT NULL,
    technician_id INT NOT NULL,
    
    maintenance_type ENUM('periodiek', 'storing', 'garantie', 'keuring') NOT NULL,
    description TEXT NOT NULL,
    parts_replaced JSON DEFAULT '[]', -- Array van vervangen onderdelen
    
    -- Kosten
    labor_hours DECIMAL(4,2) NULL,
    parts_cost DECIMAL(10,2) NULL,
    total_cost DECIMAL(10,2) NULL,
    
    -- Status
    status ENUM('gepland', 'uitgevoerd', 'geannuleerd') DEFAULT 'uitgevoerd',
    
    performed_at DATE NOT NULL,
    next_maintenance_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: fault_reports (Storingen via QR scan)
-- =============================================
CREATE TABLE IF NOT EXISTS fault_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    installation_id INT NOT NULL,
    
    -- Melder
    reporter_name VARCHAR(100) NOT NULL,
    reporter_phone VARCHAR(20) NULL,
    reporter_email VARCHAR(255) NULL,
    
    -- Storing details
    fault_type ENUM('niet_koelen', 'niet_verwarmen', 'geluid', 'lekkage', 'geur', 'foutcode', 'overig') NOT NULL,
    error_code VARCHAR(50) NULL,
    description TEXT NOT NULL,
    urgency ENUM('laag', 'normaal', 'hoog', 'spoed') DEFAULT 'normaal',
    
    -- Status
    status ENUM('nieuw', 'in_behandeling', 'gepland', 'opgelost', 'gesloten') DEFAULT 'nieuw',
    assigned_technician_id INT NULL,
    resolution_notes TEXT NULL,
    resolved_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_technician_id) REFERENCES technicians(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Indexen
-- =============================================
CREATE INDEX idx_installations_customer ON installations(customer_id);
CREATE INDEX idx_installations_qr ON installations(qr_code);
CREATE INDEX idx_installations_status ON installations(status);
CREATE INDEX idx_installations_next_maintenance ON installations(next_maintenance_date);
CREATE INDEX idx_installations_next_leak_check ON installations(next_leak_check_date);
CREATE INDEX idx_fgas_logs_installation ON fgas_logs(installation_id);
CREATE INDEX idx_fgas_logs_performed ON fgas_logs(performed_at);
CREATE INDEX idx_maintenance_installation ON maintenance_records(installation_id);
CREATE INDEX idx_fault_reports_installation ON fault_reports(installation_id);
CREATE INDEX idx_fault_reports_status ON fault_reports(status);

-- =============================================
-- Voorbeeld monteur invoegen
-- =============================================
INSERT INTO technicians (name, email, fgas_certificate_number, fgas_certificate_expires, is_active) VALUES
('R. Veldhuis', 'info@rv-installatie.nl', 'NL-FGAS-12345', '2027-12-31', TRUE);

-- =============================================
-- NOTITIES:
-- 
-- 1. F-gas lekcontrole verplicht bij >=5 ton CO2-eq
--    - 1x per 12 maanden (5-50 ton)
--    - 1x per 6 maanden (50-500 ton)
--    - 1x per 3 maanden (>500 ton)
--
-- 2. GWP waarden koudemiddelen:
--    - R32: 675
--    - R410A: 2088
--    - R290: 3
--    - R134a: 1430
--    - R404A: 3922
--
-- 3. QR code wordt gegenereerd als UUID v4
--
-- 4. Documenten/foto's worden opgeslagen als JSON arrays
--    met file paths naar uploads folder
-- =============================================
