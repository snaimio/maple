-- Table migrated now so the schema is future-proof.
-- Notification IMPLEMENTATION does NOT ship in Module 1.
CREATE TABLE notifications (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    household_id    INT UNSIGNED NOT NULL,
    type            ENUM('chore_assigned', 'completion_submitted',
                         'completion_approved', 'completion_rejected',
                         'reward_requested', 'reward_approved',
                         'reward_rejected', 'points_awarded')
                    NOT NULL,
    message         VARCHAR(500) NOT NULL,
    link_url        VARCHAR(500) NULL,
    is_read         TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_household
        FOREIGN KEY (household_id) REFERENCES households(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_notifications_user (user_id, is_read),
    INDEX idx_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
