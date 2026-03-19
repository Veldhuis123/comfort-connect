-- =============================================
-- Unified Installations Schema Extension
-- Adds 'elektra' support to existing installations table
-- =============================================

-- Add 'elektra' to installation_type ENUM (if not already present)
ALTER TABLE installations 
  MODIFY COLUMN installation_type ENUM('airco', 'warmtepomp', 'koeling', 'ventilatie', 'elektra', 'overig') NOT NULL DEFAULT 'airco';

-- Add columns for type-specific data
ALTER TABLE installations
  ADD COLUMN groepenverklaring_data JSON NULL COMMENT 'Groepenkast config for elektra installations',
  ADD COLUMN commissioning_data JSON NULL COMMENT 'Inbedrijfstellingsrapport for airco/warmtepomp',
  ADD COLUMN keuring_datum DATE NULL COMMENT 'Last inspection date for elektra',
  ADD COLUMN keurmeester VARCHAR(100) NULL COMMENT 'Inspector name';

-- =============================================
-- Add acceptance token to local_quotes for digital acceptance
-- =============================================

ALTER TABLE local_quotes
  ADD COLUMN acceptance_token VARCHAR(64) NULL UNIQUE COMMENT 'Unique token for public acceptance URL',
  ADD COLUMN accepted_ip VARCHAR(45) NULL COMMENT 'IP address of acceptor',
  ADD COLUMN accepted_user_agent TEXT NULL COMMENT 'User agent of acceptor';

CREATE INDEX idx_acceptance_token ON local_quotes(acceptance_token);

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
    
    FOREIGN KEY (installation_id) REFERENCES installations(id) ON DELETE CASCADE,
    INDEX idx_installation (installation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;