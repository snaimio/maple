-- The LEDGER. Append-only. Source of truth for all point changes.
CREATE TABLE points_transactions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    household_id    INT UNSIGNED NOT NULL,
    delta           INT NOT NULL,
    reason          ENUM('chore_reward', 'reward_redemption',
                         'manual_adjustment', 'bonus')
                    NOT NULL,
    reference_type  ENUM('chore_completion', 'reward_redemption', 'manual')
                    NOT NULL,
    reference_id    INT UNSIGNED NULL,
    note            VARCHAR(255) NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_transactions_household
        FOREIGN KEY (household_id) REFERENCES households(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_transactions_user (user_id),
    INDEX idx_transactions_household (household_id),
    INDEX idx_transactions_created (created_at),
    INDEX idx_transactions_reference (reference_type, reference_id),
    INDEX idx_transactions_balance (household_id, user_id, delta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
