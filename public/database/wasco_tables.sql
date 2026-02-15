-- =============================================
-- Wasco Price Scraping Tables
-- =============================================

-- Mapping between local products and Wasco article numbers
CREATE TABLE IF NOT EXISTS wasco_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL UNIQUE,
  wasco_article_number VARCHAR(50) NOT NULL,
  last_synced_at DATETIME DEFAULT NULL,
  last_bruto_price DECIMAL(10,2) DEFAULT NULL,
  last_netto_price DECIMAL(10,2) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_wasco_article (wasco_article_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Price history log
CREATE TABLE IF NOT EXISTS wasco_price_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  wasco_article_number VARCHAR(50) NOT NULL,
  bruto_price DECIMAL(10,2) DEFAULT NULL,
  netto_price DECIMAL(10,2) DEFAULT NULL,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_date (product_id, scraped_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
