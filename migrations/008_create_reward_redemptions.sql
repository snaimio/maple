CREATE TABLE reward_redemptions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reward_id       INT UNSIGNED NOT NULL,
    redeemed_by     INT UNSIGNED NOT NULL,
    points_spent    INT UNSIGNED NOT NULL,
    status          ENUM('pending', 'approved', 'rejected', 'fulfilled')
                    NOT NULL DEFAULT 'pending',
    reviewed_by     INT UNSIGNED NULL,
    rejection_note  TEXT NULL,
    requested_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP NULL,
    CONSTRAINT fk_redemptions_reward
        FOREIGN KEY (reward_id) REFERENCES rewards(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_redemptions_redeemed_by
        FOREIGN KEY (redeemed_by) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_redemptions_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_redemptions_reward (reward_id),
    INDEX idx_redemptions_status (status),
    INDEX idx_redemptions_user (redeemed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
