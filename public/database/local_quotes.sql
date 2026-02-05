-- =============================================
-- Lokale Offertes (voor later overnemen in e-Boekhouden)
-- =============================================

CREATE TABLE IF NOT EXISTS local_quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Klantgegevens (relatie uit e-Boekhouden of handmatig)
    relation_id INT NULL, -- e-Boekhouden relatie ID (optioneel)
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NULL,
    customer_phone VARCHAR(50) NULL,
    customer_address TEXT NULL,
    
    -- Offerte details
    quote_number VARCHAR(50) NULL, -- Optioneel eigen nummer
    quote_date DATE NOT NULL DEFAULT (CURDATE()),
    expiration_date DATE NULL,
    
    -- Totalen
    subtotal_excl DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_incl DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Status
    status ENUM('concept', 'verzonden', 'geaccepteerd', 'afgewezen', 'verlopen', 'overgenomen') DEFAULT 'concept',
    
    -- Notities
    customer_note TEXT NULL, -- Notitie voor klant
    internal_note TEXT NULL, -- Interne notitie
    
    -- Link naar oorspronkelijke offerte-aanvraag
    quote_request_id INT NULL,
    
    -- Tracking
    sent_at TIMESTAMP NULL,
    accepted_at TIMESTAMP NULL,
    eboekhouden_synced_at TIMESTAMP NULL, -- Wanneer handmatig overgenomen
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_quote_date (quote_date),
    INDEX idx_quote_request (quote_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Offerteregels
-- =============================================

CREATE TABLE IF NOT EXISTS local_quote_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    
    -- Regel details
    description VARCHAR(500) NOT NULL,
    product_code VARCHAR(50) NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'stuk', -- stuk, meter, uur, etc.
    price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_code VARCHAR(20) DEFAULT 'HOOG_VERK_21', -- BTW code
    vat_percentage DECIMAL(5,2) DEFAULT 21.00,
    
    -- Berekende velden
    line_total_excl DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
    line_vat DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price_per_unit * vat_percentage / 100) STORED,
    line_total_incl DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price_per_unit * (1 + vat_percentage / 100)) STORED,
    
    -- Sortering
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quote_id) REFERENCES local_quotes(id) ON DELETE CASCADE,
    INDEX idx_quote (quote_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
