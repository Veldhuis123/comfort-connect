-- =============================================
-- Globale Marge Instelling
-- Run dit in phpMyAdmin
-- =============================================

-- Voeg globale marge toe aan installation_settings
INSERT INTO installation_settings (category, setting_key, setting_value, unit, description) VALUES
('global', 'margin_percent', 30.00, 'procent', 'Globale marge percentage op alle producten'),
('global', 'base_installation_small', 350.00, 'stuk', 'Basis installatiekosten voor ruimtes ≤40m² excl. BTW'),
('global', 'base_installation_large', 450.00, 'stuk', 'Basis installatiekosten voor ruimtes >40m² excl. BTW'),
('global', 'multisplit_per_room', 200.00, 'stuk', 'Extra kosten per ruimte bij multi-split excl. BTW'),
('global', 'extra_unit_discount', 0.80, 'factor', 'Kortingsfactor voor extra losse units (0.80 = 20% korting)')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
