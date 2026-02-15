-- =============================================
-- Wasco Price Scraping Tables
-- =============================================

-- Drop bestaande tabellen eerst (in juiste volgorde)
DROP TABLE IF EXISTS wasco_price_log;
DROP TABLE IF EXISTS wasco_mappings;


CREATE TABLE IF NOT EXISTS wasco_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(100) NOT NULL UNIQUE,
  wasco_article_number VARCHAR(50) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Kortingspercentage op brutoprijs voor berekening netto/inkoopprijs',
  last_synced_at DATETIME DEFAULT NULL,
  last_bruto_price DECIMAL(10,2) DEFAULT NULL,
  last_netto_price DECIMAL(10,2) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wasco_article (wasco_article_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Voeg discount_percent kolom toe als de tabel al bestaat
-- ALTER TABLE wasco_mappings ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Kortingspercentage op brutoprijs' AFTER wasco_article_number;

-- Price history log
CREATE TABLE IF NOT EXISTS wasco_price_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(100) NOT NULL,
  wasco_article_number VARCHAR(50) NOT NULL,
  bruto_price DECIMAL(10,2) DEFAULT NULL,
  netto_price DECIMAL(10,2) DEFAULT NULL,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product_date (product_id, scraped_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
