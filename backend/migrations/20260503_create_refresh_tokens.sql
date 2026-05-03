-- Refresh token rotation met theft-detection (token-family pattern)
-- Bij elk gebruik wordt het oude token gerevokeerd en vervangen door een nieuw.
-- Hergebruik van een gerevokeerd token => hele familie wordt gerevokeerd.

CREATE TABLE refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  family_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL DEFAULT NULL,
  replaced_by_id BIGINT UNSIGNED NULL DEFAULT NULL,
  user_agent VARCHAR(255) NULL DEFAULT NULL,
  ip VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_token_hash (token_hash),
  KEY idx_user (user_id),
  KEY idx_family (family_id),
  KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
