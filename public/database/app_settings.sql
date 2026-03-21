CREATE TABLE app_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO app_settings (setting_key, setting_value) VALUES (
  'calculator_settings',
  '{"airco":{"enabled":true,"name":"Airco"},"pv":{"enabled":true,"name":"Zonnepanelen"},"battery":{"enabled":true,"name":"Thuisaccu"},"unifi":{"enabled":true,"name":"UniFi Netwerk"},"charging":{"enabled":true,"name":"Laadpalen"},"schema":{"enabled":true,"name":"Installatie"}}'
);
