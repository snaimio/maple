-- A COMPLETION is a child's submission for one assignment.
CREATE TABLE chore_completions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assignment_id   INT UNSIGNED NOT NULL,
    submitted_by    INT UNSIGNED NOT NULL,
    evidence_url    VARCHAR(500) NULL,
    note            TEXT NULL,
    status          ENUM('pending', 'approved', 'rejected')
                    NOT NULL DEFAULT 'pending',
    reviewed_by     INT UNSIGNED NULL,
    rejection_note  TEXT NULL,
    submitted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at     TIMESTAMP NULL,
    CONSTRAINT fk_completions_assignment
        FOREIGN KEY (assignment_id) REFERENCES chore_assignments(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_completions_submitted_by
        FOREIGN KEY (submitted_by) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_completions_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_completions_assignment (assignment_id),
    INDEX idx_completions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
