-- =============================================
-- Tabel: projects (Portfolio / Gemaakte Projecten)
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    category ENUM('airco', 'warmtepomp', 'elektra', 'zonnepanelen', 'overig') DEFAULT 'airco',
    location VARCHAR(100) NULL,
    completion_date DATE NULL,
    photos JSON DEFAULT ('[]'),
    is_visible BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_projects_visible ON projects(is_visible);
CREATE INDEX idx_projects_sort ON projects(sort_order);
