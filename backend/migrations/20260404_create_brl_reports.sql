CREATE TABLE IF NOT EXISTS brl_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_uuid CHAR(36) NOT NULL UNIQUE,
    created_by_user_id INT NULL,
    updated_by_user_id INT NULL,
    customer_name VARCHAR(255) NULL,
    workbon_number VARCHAR(100) NULL,
    status ENUM('concept', 'bezig', 'voltooid', 'verzonden') NOT NULL DEFAULT 'concept',
    current_step TINYINT UNSIGNED NOT NULL DEFAULT 0,
    report_data JSON NOT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_brl_reports_updated_at (updated_at),
    INDEX idx_brl_reports_deleted_at (deleted_at),
    INDEX idx_brl_reports_status (status),
    CONSTRAINT fk_brl_reports_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES admin_users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_brl_reports_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES admin_users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;