-- Refrigerant Cylinders table voor BRL 100 koudemiddel voorraad
CREATE TABLE IF NOT EXISTS refrigerant_cylinders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    refrigerant_type VARCHAR(20) NOT NULL,
    refrigerant_gwp INT NOT NULL,
    cylinder_size_kg DECIMAL(10,3) NOT NULL COMMENT 'Nominale inhoud cilinder',
    current_weight_kg DECIMAL(10,3) NOT NULL COMMENT 'Huidige gewicht incl cilinder',
    tare_weight_kg DECIMAL(10,3) NOT NULL COMMENT 'Leeggewicht cilinder',
    batch_number VARCHAR(100) NULL,
    supplier VARCHAR(255) NULL,
    purchase_date DATE NULL,
    expiry_date DATE NULL,
    location VARCHAR(255) NULL COMMENT 'Opslaglocatie',
    status ENUM('vol', 'in_gebruik', 'bijna_leeg', 'leeg', 'retour') DEFAULT 'vol',
    notes TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_refrigerant_type (refrigerant_type),
    INDEX idx_status (status),
    INDEX idx_is_active (is_active)
);

-- Voorbeelddata (optioneel)
INSERT INTO refrigerant_cylinders (refrigerant_type, refrigerant_gwp, cylinder_size_kg, current_weight_kg, tare_weight_kg, batch_number, supplier, status) VALUES
('R32', 675, 9.0, 18.5, 10.2, 'BATCH-2025-001', 'Koelgas Nederland', 'vol'),
('R410A', 2088, 11.3, 20.1, 11.5, 'BATCH-2025-002', 'Coolgas BV', 'in_gebruik'),
('R32', 675, 9.0, 12.8, 10.2, NULL, 'Koelgas Nederland', 'bijna_leeg');
