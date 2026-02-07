-- =============================================
-- Haier Airco Producten Invoegen
-- Serene, Pearl Premium, Revive Plus
-- =============================================

-- Haier Serene (2025 AI Model - Premium)
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, is_active, sort_order) VALUES
('haier-serene-25', 'Serene 2.5kW', 'Haier', 'airco', 0, 'AI-gestuurde airco met UVC Plus en 56°C Steri-Clean', 
 '{"cooling_capacity": 2.6, "heating_capacity": 3.0, "seer": 8.80, "scop": 4.60, "energy_label_cooling": "A+++", "energy_label_heating": "A++", "refrigerant": "R32", "noise_indoor": 19, "noise_outdoor": 49, "model_indoor": "AS25SBBHRA-MW", "model_outdoor": "1U25DEBFRA-S", "pipe_liquid": "1/4\\"", "pipe_gas": "3/8\\""}',
 '["AI Eco Sensor", "UVC Plus", "56°C Steri-Clean", "WiFi hOn", "Coanda Plus", "Self Clean", "I Feel", "Silent Mode 19dB"]',
 1, 1),
('haier-serene-35', 'Serene 3.5kW', 'Haier', 'airco', 0, 'AI-gestuurde airco met UVC Plus en 56°C Steri-Clean',
 '{"cooling_capacity": 3.5, "heating_capacity": 3.7, "seer": 8.51, "scop": 4.60, "energy_label_cooling": "A+++", "energy_label_heating": "A++", "refrigerant": "R32", "noise_indoor": 20, "noise_outdoor": 51, "model_indoor": "AS35SBBHRA-MW", "model_outdoor": "1U35DEBFRA-S", "pipe_liquid": "1/4\\"", "pipe_gas": "3/8\\""}',
 '["AI Eco Sensor", "UVC Plus", "56°C Steri-Clean", "WiFi hOn", "Coanda Plus", "Self Clean", "I Feel", "Silent Mode 20dB"]',
 1, 2),
('haier-serene-50', 'Serene 5.0kW', 'Haier', 'airco', 0, 'AI-gestuurde airco met UVC Plus en 56°C Steri-Clean',
 '{"cooling_capacity": 5.3, "heating_capacity": 5.9, "seer": 8.51, "scop": 4.60, "energy_label_cooling": "A+++", "energy_label_heating": "A++", "refrigerant": "R32", "noise_indoor": 31, "noise_outdoor": 55, "model_indoor": "AS50SDBHRA-MW", "model_outdoor": "1U50KEBFRA-S", "pipe_liquid": "1/4\\"", "pipe_gas": "1/2\\""}',
 '["AI Eco Sensor", "UVC Plus", "56°C Steri-Clean", "WiFi hOn", "Coanda Plus", "Self Clean", "I Feel"]',
 1, 3),
('haier-serene-71', 'Serene 7.1kW', 'Haier', 'airco', 0, 'AI-gestuurde airco met UVC Plus en 56°C Steri-Clean',
 '{"cooling_capacity": 7.1, "heating_capacity": 7.4, "seer": 8.50, "scop": 4.60, "energy_label_cooling": "A+++", "energy_label_heating": "A++", "refrigerant": "R32", "noise_indoor": 27, "noise_outdoor": 57, "model_indoor": "AS71SEPHRA-MW", "model_outdoor": "1U71WEPFRA-S", "pipe_liquid": "1/4\\"", "pipe_gas": "5/8\\""}',
 '["AI Eco Sensor", "UVC Plus", "56°C Steri-Clean", "WiFi hOn", "Coanda Plus", "Self Clean", "I Feel"]',
 1, 4)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name), description = VALUES(description), specs = VALUES(specs), features = VALUES(features);

-- Haier Pearl Premium (A+++ Line)
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, is_active, sort_order) VALUES
('haier-pearl-premium-25', 'Pearl Premium 2.5kW', 'Haier', 'airco', 0, 'Premium A+++ airco met UVC PRO en elegant design',
 '{"cooling_capacity": 2.7, "heating_capacity": 3.1, "seer": 8.50, "scop": 4.60, "energy_label_cooling": "A+++", "energy_label_heating": "A+++", "refrigerant": "R32", "noise_indoor": 18, "noise_outdoor": 49, "model_indoor": "AS25PBPHRA-PRE", "model_outdoor": "1U25YEPFRA-PRE", "pipe_liquid": "1/4\\"", "pipe_gas": "3/8\\""}',
 '["UVC PRO", "I Feel", "3-Level Eco", "WiFi hOn", "Quick WiFi Pair", "Premium Design", "Silent Mode 18dB"]',
 1, 5),
('haier-pearl-premium-35', 'Pearl Premium 3.5kW', 'Haier', 'airco', 0, 'Premium A+++ airco met UVC PRO en elegant design',
 '{"cooling_capacity": 3.6, "heating_capacity": 3.9, "seer": 8.50, "scop": 4.60, "energy_label_cooling": "A+++", "energy_label_heating": "A++", "refrigerant": "R32", "noise_indoor": 18, "noise_outdoor": 51, "model_indoor": "AS35PBPHRA-PRE", "model_outdoor": "1U35MEPFRA-PRE", "pipe_liquid": "1/4\\"", "pipe_gas": "3/8\\""}',
 '["UVC PRO", "I Feel", "3-Level Eco", "WiFi hOn", "Quick WiFi Pair", "Premium Design", "Silent Mode 18dB"]',
 1, 6),
('haier-pearl-premium-50', 'Pearl Premium 5.0kW', 'Haier', 'airco', 0, 'Premium A++ airco met UVC PRO en elegant design',
 '{"cooling_capacity": 5.3, "heating_capacity": 5.8, "seer": 8.50, "scop": 4.60, "energy_label_cooling": "A++", "energy_label_heating": "A++", "refrigerant": "R32", "noise_indoor": 31, "noise_outdoor": 54, "model_indoor": "AS50PDPHRA-PRE", "model_outdoor": "1U50KEPFRA-PRE", "pipe_liquid": "1/4\\"", "pipe_gas": "1/2\\""}',
 '["UVC PRO", "I Feel", "3-Level Eco", "WiFi hOn", "Quick WiFi Pair", "Premium Design"]',
 1, 7),
('haier-pearl-premium-71', 'Pearl Premium 7.1kW', 'Haier', 'airco', 0, 'Premium A+++ airco met UVC PRO en elegant design',
 '{"cooling_capacity": 7.1, "heating_capacity": 7.4, "seer": 8.50, "scop": 4.60, "energy_label_cooling": "A+++", "energy_label_heating": "A++", "refrigerant": "R32", "noise_indoor": 27, "noise_outdoor": 57, "model_indoor": "AS71PEPHRA-PRE", "model_outdoor": "1U71WEPFRA-PRE", "pipe_liquid": "1/4\\"", "pipe_gas": "5/8\\""}',
 '["UVC PRO", "I Feel", "3-Level Eco", "WiFi hOn", "Quick WiFi Pair", "Premium Design"]',
 1, 8)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name), description = VALUES(description), specs = VALUES(specs), features = VALUES(features);

-- Haier Revive Plus (Budget-Friendly A++)
INSERT INTO products (id, name, brand, category, base_price, description, specs, features, is_active, sort_order) VALUES
('haier-revive-plus-25', 'Revive Plus 2.5kW', 'Haier', 'airco', 0, 'Betrouwbare A++ airco met Easy-Clip installatie',
 '{"cooling_capacity": 2.7, "heating_capacity": 2.9, "seer": 6.50, "scop": 4.00, "energy_label_cooling": "A++", "energy_label_heating": "A+", "refrigerant": "R32", "noise_indoor": 18, "noise_outdoor": 49, "model_indoor": "AS25RBAHRA-3", "model_outdoor": "1U25YESFRA-3", "pipe_liquid": "1/4\\"", "pipe_gas": "3/8\\""}',
 '["56°C Steri-Clean", "3-Level Eco", "WiFi hOn", "Easy-Clip Install", "Coanda Plus", "LED Display", "Silent Mode 18dB"]',
 1, 9),
('haier-revive-plus-35', 'Revive Plus 3.5kW', 'Haier', 'airco', 0, 'Betrouwbare A++ airco met Easy-Clip installatie',
 '{"cooling_capacity": 3.2, "heating_capacity": 3.9, "seer": 6.10, "scop": 4.00, "energy_label_cooling": "A++", "energy_label_heating": "A+", "refrigerant": "R32", "noise_indoor": 18, "noise_outdoor": 51, "model_indoor": "AS35RBAHRA-4", "model_outdoor": "1U35YESFRA-4", "pipe_liquid": "1/4\\"", "pipe_gas": "3/8\\""}',
 '["56°C Steri-Clean", "3-Level Eco", "WiFi hOn", "Easy-Clip Install", "Coanda Plus", "LED Display", "Silent Mode 18dB"]',
 1, 10),
('haier-revive-plus-50', 'Revive Plus 5.0kW', 'Haier', 'airco', 0, 'Betrouwbare A++ airco met Easy-Clip installatie',
 '{"cooling_capacity": 4.8, "heating_capacity": 4.8, "seer": 6.30, "scop": 4.00, "energy_label_cooling": "A++", "energy_label_heating": "A+", "refrigerant": "R32", "noise_indoor": 28, "noise_outdoor": 54, "model_indoor": "AS50RCBHRA-4", "model_outdoor": "1U50MERFRA-4", "pipe_liquid": "1/4\\"", "pipe_gas": "1/2\\""}',
 '["56°C Steri-Clean", "3-Level Eco", "WiFi hOn", "Easy-Clip Install", "Coanda Plus", "LED Display"]',
 1, 11),
('haier-revive-plus-68', 'Revive Plus 6.8kW', 'Haier', 'airco', 0, 'Betrouwbare A++ airco met Easy-Clip installatie',
 '{"cooling_capacity": 6.2, "heating_capacity": 6.3, "seer": 6.70, "scop": 4.00, "energy_label_cooling": "A++", "energy_label_heating": "A+", "refrigerant": "R32", "noise_indoor": 29, "noise_outdoor": 57, "model_indoor": "AS68RDAHRA-4", "model_outdoor": "1U68MRAFRA-4", "pipe_liquid": "1/4\\"", "pipe_gas": "1/2\\""}',
 '["56°C Steri-Clean", "3-Level Eco", "WiFi hOn", "Easy-Clip Install", "Coanda Plus", "LED Display"]',
 1, 12)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name), description = VALUES(description), specs = VALUES(specs), features = VALUES(features);

-- Update pricing fields (vul zelf de inkoopprijzen in via Admin → Producten of Admin → Prijsbeheer)
-- UPDATE products SET purchase_price = XXX, margin_percent = 30, expected_hours = 4 WHERE id LIKE 'haier-%';
