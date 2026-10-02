-- Join table: user <-> household, WITH role per household.
-- No points_balance column. Balance is computed from points_transactions.
CREATE TABLE household_members (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    household_id        INT UNSIGNED NOT NULL,
    user_id             INT UNSIGNED NOT NULL,
    role_in_household   ENUM('parent', 'child', 'admin')
                        NOT NULL DEFAULT 'child',
    joined_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_members_household
        FOREIGN KEY (household_id) REFERENCES households(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_members_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uniq_user_per_household (household_id, user_id),
    INDEX idx_members_user (user_id),
    INDEX idx_members_household (household_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
