-- =============================================
-- Unified Installations Schema Extension
-- Adds 'elektra' support to existing installations table
-- =============================================

-- Add 'elektra' to installation_type ENUM (if not already present)
ALTER TABLE installations 
  MODIFY COLUMN installation_type ENUM('airco', 'warmtepomp', 'koeling', 'ventilatie', 'elektra', 'overig') NOT NULL DEFAULT 'airco';

-- Add columns for type-specific data
ALTER TABLE rv_installations
  ADD COLUMN IF NOT EXISTS groepenverklaring_data JSON NULL COMMENT 'Groepenkast config for elektra installations',
  ADD COLUMN IF NOT EXISTS commissioning_data JSON NULL COMMENT 'Inbedrijfstellingsrapport for airco/warmtepomp',
  ADD COLUMN IF NOT EXISTS keuring_datum DATE NULL COMMENT 'Last inspection date for elektra',
  ADD COLUMN IF NOT EXISTS keurmeester VARCHAR(100) NULL COMMENT 'Inspector name';

-- =============================================
-- Add acceptance token to local_quotes for digital acceptance
-- =============================================

ALTER TABLE local_quotes
  ADD COLUMN IF NOT EXISTS acceptance_token VARCHAR(64) NULL UNIQUE COMMENT 'Unique token for public acceptance URL',
  ADD COLUMN IF NOT EXISTS accepted_ip VARCHAR(45) NULL COMMENT 'IP address of acceptor',
  ADD COLUMN IF NOT EXISTS accepted_user_agent TEXT NULL COMMENT 'User agent of acceptor';

CREATE INDEX IF NOT EXISTS idx_acceptance_token ON local_quotes(acceptance_token);

-- =============================================
-- Installation documents table
-- =============================================

CREATE TABLE IF NOT EXISTS installation_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    installation_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type ENUM('groepenverklaring', 'inbedrijfstelling', 'keuring', 'foto', 'certificaat', 'overig') NOT NULL DEFAULT 'overig',
    file_path VARCHAR(500) NULL,
    file_data JSON NULL COMMENT 'Inline document data (for groepenverklaring etc.)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (installation_id) REFERENCES rv_installations(id) ON DELETE CASCADE,
    INDEX idx_installation (installation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;