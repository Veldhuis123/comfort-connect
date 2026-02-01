-- Equipment table voor BRL 100 verplicht gereedschap
CREATE TABLE IF NOT EXISTS equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_type ENUM('manometer', 'vacuum_pump', 'leak_detector', 'refrigerant_scale', 'recovery_unit', 'thermometer', 'other') NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    calibration_date DATE NULL,
    calibration_valid_until DATE NULL,
    notes TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_equipment_type (equipment_type),
    INDEX idx_is_active (is_active)
);

-- Voorbeelddata (optioneel)
INSERT INTO equipment (equipment_type, name, brand, serial_number, calibration_date, calibration_valid_until) VALUES
('manometer', 'Testo 550s', 'Testo', 'T550-001234', '2025-06-15', '2026-06-15'),
('vacuum_pump', 'Value VE-225', 'Value', 'VE225-5678', '2025-03-20', '2026-03-20'),
('leak_detector', 'Inficon Sentrac', 'Inficon', 'INF-9012', '2025-08-10', '2026-08-10'),
('refrigerant_scale', 'CPS CC220', 'CPS', 'CPS-3456', '2025-05-01', '2026-05-01'),
('recovery_unit', 'Appion G5', 'Appion', 'APP-G5-7890', NULL, NULL);
