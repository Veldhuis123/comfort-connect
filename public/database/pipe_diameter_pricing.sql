-- =============================================
-- Leidingdiameter Prijzen per Vermogensklasse
-- =============================================

-- Maak pipe_diameter_pricing tabel
CREATE TABLE IF NOT EXISTS pipe_diameter_pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL DEFAULT 'airco',
    min_capacity DECIMAL(5,2) NOT NULL,
    max_capacity DECIMAL(5,2) NOT NULL,
    liquid_line VARCHAR(20) NOT NULL COMMENT 'Vloeistofleiding diameter (bijv. 1/4 inch)',
    suction_line VARCHAR(20) NOT NULL COMMENT 'Zuigleiding diameter (bijv. 3/8 inch)',
    price_per_meter DECIMAL(10,2) NOT NULL COMMENT 'Prijs per meter excl. BTW',
    notes VARCHAR(255) NULL,
    UNIQUE KEY uk_category_capacity_pipe (category, min_capacity, max_capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Voeg standaard leidingprijzen toe
INSERT INTO pipe_diameter_pricing (category, min_capacity, max_capacity, liquid_line, suction_line, price_per_meter, notes) VALUES
('airco', 0.00, 3.50, '1/4"', '3/8"', 35.00, 'Kleine units tot 3.5kW - 6.35mm x 9.52mm'),
('airco', 3.51, 5.00, '1/4"', '1/2"', 42.00, 'Medium units 3.5-5kW - 6.35mm x 12.7mm'),
('airco', 5.01, 7.00, '3/8"', '5/8"', 55.00, 'Grote units 5-7kW - 9.52mm x 15.88mm'),
('airco', 7.01, 10.00, '3/8"', '3/4"', 68.00, 'XL units 7-10kW - 9.52mm x 19.05mm'),
('airco', 10.01, 20.00, '1/2"', '7/8"', 85.00, 'XXL units >10kW - 12.7mm x 22.2mm')
ON DUPLICATE KEY UPDATE 
    liquid_line = VALUES(liquid_line),
    suction_line = VALUES(suction_line),
    price_per_meter = VALUES(price_per_meter),
    notes = VALUES(notes);

-- Verwijder oude pipe_per_meter instelling (optioneel, wordt nu via diameter tabel bepaald)
-- DELETE FROM installation_settings WHERE category = 'airco' AND setting_key = 'pipe_per_meter';
