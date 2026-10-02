-- Chore TEMPLATE. A chore can generate many assignments.
CREATE TABLE chores (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    household_id    INT UNSIGNED NOT NULL,
    title           VARCHAR(150) NOT NULL,
    description     TEXT NULL,
    points          INT UNSIGNED NOT NULL DEFAULT 10,
    category        VARCHAR(50) NULL,
    recurrence      ENUM('none', 'daily', 'weekly', 'custom')
                    NOT NULL DEFAULT 'none',
    recurrence_days VARCHAR(20) NULL,
    created_by      INT UNSIGNED NOT NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_chores_household
        FOREIGN KEY (household_id) REFERENCES households(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_chores_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_chores_household (household_id),
    INDEX idx_chores_active (household_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
