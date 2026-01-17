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
-- Standaard airco producten invoegen
-- =============================================
INSERT INTO airco_units (id, name, brand, capacity, min_m2, max_m2, base_price, features, energy_label, sort_order) VALUES
('daikin-perfera', 'Perfera', 'Daikin', '2.5 kW', 15, 30, 1499.00, '["Stille werking (19 dB)", "Wifi bediening", "Koelen & verwarmen", "Flash Streamer"]', 'A+++', 1),
('daikin-stylish', 'Stylish', 'Daikin', '3.5 kW', 25, 45, 1899.00, '["Design model", "Coanda-effect", "Smart Home ready", "Luchtzuivering"]', 'A+++', 2),
('haier-tundra', 'Tundra Plus', 'Haier', '2.6 kW', 15, 35, 1199.00, '["Self Clean", "Wifi bediening", "Koelen & verwarmen", "Turbo mode"]', 'A++', 3),
('haier-flexis', 'Flexis Plus', 'Haier', '5.0 kW', 40, 70, 2299.00, '["Premium design", "Smart AI", "UV-C sterilisatie", "Luchtzuivering"]', 'A+++', 4);

-- =============================================
-- Voorbeeld admin gebruiker (wijzig wachtwoord!)
-- Wachtwoord: admin123 (bcrypt hash)
-- =============================================
INSERT INTO admin_users (email, password_hash, name, role) VALUES
('admin@rv-installatie.nl', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'admin');

-- =============================================
-- Indexen voor betere performance
-- =============================================
CREATE INDEX idx_reviews_visible ON reviews(is_visible);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_created ON quote_requests(created_at);
CREATE INDEX idx_contact_messages_read ON contact_messages(is_read);
CREATE INDEX idx_airco_units_active ON airco_units(is_active);

-- =============================================
-- NOTITIES:
-- 
-- 1. Wijzig het admin wachtwoord na import!
--    Gebruik password_hash() in PHP met PASSWORD_DEFAULT
--
-- 2. Voor foto uploads heb je een PHP backend nodig
--    die bestanden opslaat in een uploads/ map
--
-- 3. JSON kolommen vereisen MySQL 5.7+ of MariaDB 10.2+
--
-- 4. Pas de database naam aan bovenaan indien gewenst
-- =============================================
