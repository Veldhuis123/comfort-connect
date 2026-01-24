-- =============================================
-- R. Veldhuis Installatie - MySQL Database Schema
-- Versie: 1.0
-- =============================================

-- Database aanmaken (optioneel - pas naam aan indien gewenst)
-- CREATE DATABASE IF NOT EXISTS rv_installatie CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE rv_installatie;

-- =============================================
-- Tabel: admin_users (Beheerders)
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'moderator') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: reviews (Klantbeoordelingen)
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    service VARCHAR(100) NOT NULL,
    review_date VARCHAR(50) NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: quote_requests (Offerteaanvragen)
-- =============================================
CREATE TABLE IF NOT EXISTS quote_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Klantgegevens
    customer_name VARCHAR(100) NULL,
    customer_email VARCHAR(255) NULL,
    customer_phone VARCHAR(20) NULL,
    
    -- Ruimte informatie (JSON voor meerdere ruimtes)
    rooms JSON NOT NULL,
    total_size DECIMAL(10,2) NOT NULL,
    total_capacity DECIMAL(5,2) NOT NULL,
    
    -- Geselecteerde airco
    selected_airco_id VARCHAR(50) NULL,
    selected_airco_name VARCHAR(100) NULL,
    selected_airco_brand VARCHAR(50) NULL,
    estimated_price DECIMAL(10,2) NULL,
    
    -- Extra details
    pipe_color VARCHAR(20) DEFAULT 'wit',
    pipe_length DECIMAL(5,2) NULL,
    additional_notes TEXT NULL,
    
    -- Status
    status ENUM('nieuw', 'in_behandeling', 'offerte_verstuurd', 'akkoord', 'afgewezen', 'voltooid') DEFAULT 'nieuw',
    admin_notes TEXT NULL,
    
    -- Tijdstempels
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: quote_photos (Foto's bij offerteaanvragen)
-- =============================================
CREATE TABLE IF NOT EXISTS quote_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_request_id INT NOT NULL,
    category ENUM('meterkast', 'isolatie', 'leiding', 'kleur') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NULL,
    mime_type VARCHAR(100) NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: contact_messages (Contactformulier berichten)
-- =============================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    subject VARCHAR(200) NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    replied_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: airco_units (Airco producten - beheerbaar)
-- =============================================
CREATE TABLE IF NOT EXISTS airco_units (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    capacity VARCHAR(20) NOT NULL,
    min_m2 INT NOT NULL,
    max_m2 INT NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500) NULL,
    features JSON NOT NULL,
    energy_label VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Tabel: products (Alle producten - universeel)
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    category ENUM('airco', 'unifi_router', 'unifi_switch', 'unifi_accesspoint', 'unifi_camera', 'battery', 'charger', 'solar') NOT NULL,
    
    -- Prijzen
    base_price DECIMAL(10,2) NOT NULL,
    
    -- Afbeelding
    image_url VARCHAR(500) NULL,
    
    -- Specificaties (JSON voor flexibiliteit per categorie)
    specs JSON NOT NULL DEFAULT '{}',
    
    -- Features (array van strings)
    features JSON NOT NULL DEFAULT '[]',
    
    -- Beschrijving
    description TEXT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    
    -- Tijdstempels
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Standaard airco producten invoegen
-- =============================================
INSERT INTO airco_units (id, name, brand, capacity, min_m2, max_m2, base_price, features, energy_label, sort_order) VALUES
('daikin-perfera', 'Perfera', 'Daikin', '2.5 kW', 15, 30, 1499.00, '["Stille werking (19 dB)", "Wifi bediening", "Koelen & verwarmen", "Flash Streamer"]', 'A+++', 1),
('daikin-stylish', 'Stylish', 'Daikin', '3.5 kW', 25, 45, 1899.00, '["Design model", "Coanda-effect", "Smart Home ready", "Luchtzuivering"]', 'A+++', 2),
('haier-tundra', 'Tundra Plus', 'Haier', '2.6 kW', 15, 35, 1199.00, '["Self Clean", "Wifi bediening", "Koelen & verwarmen", "Turbo mode"]', 'A++', 3),
('haier-flexis', 'Flexis Plus', 'Haier', '5.0 kW', 40, 70, 2299.00, '["Premium design", "Smart AI", "UV-C sterilisatie", "Luchtzuivering"]', 'A+++', 4);

-- =============================================
-- Standaard producten invoegen (nieuwe tabel)
-- =============================================

-- Airco's
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, sort_order) VALUES
('daikin-perfera', 'Perfera', 'Daikin', 'airco', 1499.00, 'Stille en efficiënte split-unit airco',
 '{"capacity": "2.5 kW", "min_m2": 15, "max_m2": 30, "energy_label": "A+++"}',
 '["Stille werking (19 dB)", "Wifi bediening", "Koelen & verwarmen", "Flash Streamer"]', 1),
('daikin-stylish', 'Stylish', 'Daikin', 'airco', 1899.00, 'Design airco met premium functies',
 '{"capacity": "3.5 kW", "min_m2": 25, "max_m2": 45, "energy_label": "A+++"}',
 '["Design model", "Coanda-effect", "Smart Home ready", "Luchtzuivering"]', 2),
('haier-tundra', 'Tundra Plus', 'Haier', 'airco', 1199.00, 'Voordelige airco met slimme functies',
 '{"capacity": "2.6 kW", "min_m2": 15, "max_m2": 35, "energy_label": "A++"}',
 '["Self Clean", "Wifi bediening", "Koelen & verwarmen", "Turbo mode"]', 3),
('haier-flexis', 'Flexis Plus', 'Haier', 'airco', 2299.00, 'Premium airco voor grote ruimtes',
 '{"capacity": "5.0 kW", "min_m2": 40, "max_m2": 70, "energy_label": "A+++"}',
 '["Premium design", "Smart AI", "UV-C sterilisatie", "Luchtzuivering"]', 4);

-- UniFi Routers
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, sort_order) VALUES
('udm-se', 'Dream Machine SE', 'UniFi', 'unifi_router', 499.00, 'All-in-one router met PoE+ switch en NVR', 
 '{"ports": "8x PoE+", "wan": "2.5GbE", "nvr": true}', 
 '["8-poorts PoE+ switch", "Ingebouwde NVR", "2.5GbE WAN", "IDS/IPS beveiliging"]', 1),
('ucg-ultra', 'Cloud Gateway Ultra', 'UniFi', 'unifi_router', 129.00, 'Compacte gateway voor kleinere netwerken',
 '{"ports": "1x 2.5GbE", "throughput": "1 Gbps"}',
 '["2.5GbE poort", "Tot 1 Gbps routering", "UniFi OS", "Compact formaat"]', 2);

-- UniFi Switches
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, sort_order) VALUES
('usw-lite-8-poe', 'USW Lite 8 PoE', 'UniFi', 'unifi_switch', 119.00, '8-poorts switch met 4x PoE',
 '{"ports": 8, "poe_ports": 4, "poe_budget": "52W"}',
 '["4 PoE poorten (52W)", "Gigabit", "Compact design", "Stille werking"]', 1),
('usw-pro-24-poe', 'USW Pro 24 PoE', 'UniFi', 'unifi_switch', 499.00, '24-poorts managed switch met PoE+',
 '{"ports": 24, "poe_ports": 16, "poe_budget": "400W", "layer": 3}',
 '["16 PoE+ poorten", "400W budget", "Layer 3", "SFP+ uplinks"]', 2);

-- UniFi Access Points
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, sort_order) VALUES
('u6-lite', 'U6 Lite', 'UniFi', 'unifi_accesspoint', 99.00, 'WiFi 6 access point voor basis gebruik',
 '{"wifi": "WiFi 6", "speed": "AX1500", "devices": 300}',
 '["WiFi 6 (AX1500)", "PoE powered", "Tot 300+ apparaten", "Dual-band"]', 1),
('u6-pro', 'U6 Pro', 'UniFi', 'unifi_accesspoint', 159.00, 'High-performance WiFi 6 access point',
 '{"wifi": "WiFi 6", "speed": "AX5400", "mu_mimo": true}',
 '["WiFi 6 (AX5400)", "PoE+ powered", "MU-MIMO", "Band steering"]', 2),
('u7-pro', 'U7 Pro', 'UniFi', 'unifi_accesspoint', 189.00, 'WiFi 7 access point voor maximale snelheid',
 '{"wifi": "WiFi 7", "speed": "BE11000", "bands": 3}',
 '["WiFi 7 (BE11000)", "6 GHz band", "MLO technologie", "Tri-band"]', 3);

-- UniFi Camera's
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, sort_order) VALUES
('g4-bullet', 'G4 Bullet', 'UniFi', 'unifi_camera', 199.00, '4MP bullet camera voor buiten',
 '{"resolution": "4MP", "ip_rating": "IP67", "night_vision": "25m"}',
 '["4MP resolutie", "Weerbestendig (IP67)", "Nachtzicht 25m", "Smart detectie"]', 1),
('g4-dome', 'G4 Dome', 'UniFi', 'unifi_camera', 199.00, '4MP dome camera voor binnen/buiten',
 '{"resolution": "4MP", "vandal_proof": true}',
 '["4MP resolutie", "Vandaalbestendig", "IR nachtzicht", "PoE powered"]', 2),
('g5-pro', 'G5 Pro', 'UniFi', 'unifi_camera', 449.00, '4K Pro camera met AI functies',
 '{"resolution": "4K", "ai": true, "zoom": "3x optisch"}',
 '["4K resolutie", "AI detectie", "Optische zoom 3x", "Premium kwaliteit"]', 3),
('g4-doorbell-pro', 'G4 Doorbell Pro', 'UniFi', 'unifi_camera', 299.00, 'Smart video deurbel met pakketdetectie',
 '{"resolution": "5MP", "package_detection": true, "fingerprint": true}',
 '["5MP camera", "Pakketdetectie", "Two-way audio", "Fingerprint reader"]', 4);

-- Thuisaccu's
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, sort_order) VALUES
('huawei-5', 'LUNA 2000 5kWh', 'Huawei', 'battery', 3500.00, 'Modulaire thuisaccu 5 kWh',
 '{"capacity": 5, "warranty": "10 jaar", "cycles": 6000}',
 '["Modulair uitbreidbaar", "Noodstroom mogelijk", "Smart monitoring"]', 1),
('huawei-10', 'LUNA 2000 10kWh', 'Huawei', 'battery', 6500.00, 'Modulaire thuisaccu 10 kWh',
 '{"capacity": 10, "warranty": "10 jaar", "cycles": 6000}',
 '["Modulair uitbreidbaar", "Noodstroom mogelijk", "Smart monitoring"]', 2),
('huawei-15', 'LUNA 2000 15kWh', 'Huawei', 'battery', 9500.00, 'Modulaire thuisaccu 15 kWh',
 '{"capacity": 15, "warranty": "10 jaar", "cycles": 6000}',
 '["Modulair uitbreidbaar", "Noodstroom mogelijk", "Smart monitoring"]', 3),
('byd-10', 'Battery-Box Premium 10.2', 'BYD', 'battery', 7200.00, 'LFP thuisaccu 10.2 kWh',
 '{"capacity": 10.2, "warranty": "10 jaar", "cycles": 8000}',
 '["LFP batterij", "Zeer veilig", "Lange levensduur"]', 4),
('byd-12', 'Battery-Box Premium 12.8', 'BYD', 'battery', 8900.00, 'LFP thuisaccu 12.8 kWh',
 '{"capacity": 12.8, "warranty": "10 jaar", "cycles": 8000}',
 '["LFP batterij", "Zeer veilig", "Lange levensduur"]', 5),
('pylontech-7', 'Force H2 7.1', 'Pylontech', 'battery', 4800.00, 'High voltage thuisaccu 7.1 kWh',
 '{"capacity": 7.1, "warranty": "10 jaar", "cycles": 6000}',
 '["High voltage", "Modulair", "Compacte installatie"]', 6);

-- Laadpalen
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, sort_order) VALUES
('alfen-eve-single', 'Eve Single Pro-line 11kW', 'Alfen', 'charger', 1299.00, '11 kW laadpaal met MID-certificering',
 '{"power": 11, "type": "home", "mid_certified": true}',
 '["11 kW laden", "MID-gecertificeerd", "RFID", "App bediening"]', 1),
('alfen-eve-single-22', 'Eve Single Pro-line 22kW', 'Alfen', 'charger', 1599.00, '22 kW laadpaal met MID-certificering',
 '{"power": 22, "type": "home", "mid_certified": true}',
 '["22 kW laden", "MID-gecertificeerd", "RFID", "App bediening"]', 2),
('easee-home', 'Home', 'Easee', 'charger', 899.00, 'Compacte 22 kW thuislader',
 '{"power": 22, "type": "home", "connectivity": "WiFi/4G"}',
 '["Compact design", "WiFi/4G", "Smart laden", "Load balancing"]', 3),
('easee-charge', 'Charge', 'Easee', 'charger', 999.00, 'Zakelijke 22 kW lader',
 '{"power": 22, "type": "business", "billing": true}',
 '["Zakelijk gebruik", "WiFi/4G", "Smart laden", "Facturatie mogelijk"]', 4),
('webasto-unite', 'Unite', 'Webasto', 'charger', 1199.00, '22 kW laadpaal met OCPP',
 '{"power": 22, "type": "business", "ocpp": true}',
 '["22 kW laden", "OCPP", "RFID", "Kabel management"]', 5),
('wallbox-pulsar-plus', 'Pulsar Plus', 'Wallbox', 'charger', 799.00, 'Compacte 22 kW lader',
 '{"power": 22, "type": "home", "power_sharing": true}',
 '["Compact", "App bediening", "Power sharing", "Eco-Smart"]', 6),
('charge-amps-halo', 'Halo', 'Charge Amps', 'charger', 1599.00, 'Premium design laadpaal',
 '{"power": 22, "type": "home", "integrated_cable": true}',
 '["Premium design", "Geïntegreerde kabel", "RFID", "4G connectiviteit"]', 7);

-- Zonnepanelen
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, sort_order) VALUES
('longi-400', 'Hi-MO 5', 'LONGi', 'solar', 180.00, 'Hoogrendement mono-kristallijn paneel',
 '{"watt_peak": 400, "efficiency": "20.9%", "warranty": "25 jaar"}',
 '["400Wp vermogen", "20.9% rendement", "25 jaar productgarantie", "Mono-kristallijn"]', 1),
('jinko-410', 'Tiger Neo', 'Jinko Solar', 'solar', 195.00, 'N-type technologie voor maximale opbrengst',
 '{"watt_peak": 410, "efficiency": "21.3%", "warranty": "25 jaar"}',
 '["410Wp vermogen", "21.3% rendement", "N-type technologie", "Lage degradatie"]', 2),
('canadian-420', 'HiKu6', 'Canadian Solar', 'solar', 210.00, 'Premium paneel met toprendement',
 '{"watt_peak": 420, "efficiency": "21.5%", "warranty": "25 jaar"}',
 '["420Wp vermogen", "21.5% rendement", "Premium kwaliteit", "Uitstekende garantie"]', 3),
('trina-430', 'Vertex S+', 'Trina Solar', 'solar', 225.00, 'Nieuwste generatie hoogrendement paneel',
 '{"watt_peak": 430, "efficiency": "21.8%", "warranty": "25 jaar"}',
 '["430Wp vermogen", "21.8% rendement", "Vertex technologie", "Topkwaliteit"]', 4);

-- =============================================
-- Voorbeeld admin gebruiker
-- BELANGRIJK: Wijzig dit wachtwoord direct na installatie!
-- Standaard wachtwoord: Admin@123! (voldoet aan sterke wachtwoord eisen)
-- Hash gegenereerd met bcryptjs cost factor 12
-- =============================================
INSERT INTO admin_users (email, password_hash, name, role, is_active) VALUES
('admin@rv-installatie.nl', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.NGY1VYxEWIkLzW', 'Admin', 'admin', TRUE);

-- =============================================
-- Indexen voor betere performance
-- =============================================
CREATE INDEX idx_reviews_visible ON reviews(is_visible);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_created ON quote_requests(created_at);
CREATE INDEX idx_contact_messages_read ON contact_messages(is_read);
CREATE INDEX idx_airco_units_active ON airco_units(is_active);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);

-- =============================================
-- BEVEILIGINGSNOTITIES:
-- 
-- 1. WIJZIG het admin wachtwoord direct na installatie!
--    Standaard: Admin@123! (hash hieronder is voor dit wachtwoord)
--
-- 2. Configureer een sterk JWT_SECRET in .env (minimaal 32 tekens)
--    Voorbeeld: openssl rand -base64 32
--
-- 3. Zet HTTPS in productie (SSL/TLS)
--
-- 4. Voor foto uploads: configureer UPLOAD_DIR in .env
--
-- 5. JSON kolommen vereisen MySQL 5.7+ of MariaDB 10.2+
--
-- 4. Pas de database naam aan bovenaan indien gewenst
--
-- 5. De 'products' tabel is universeel voor alle categorieën
--    'airco_units' tabel blijft behouden voor legacy support
-- =============================================
