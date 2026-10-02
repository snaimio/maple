-- An ASSIGNMENT is one occurrence of a chore, assigned to one child.
CREATE TABLE chore_assignments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chore_id        INT UNSIGNED NOT NULL,
    assigned_to     INT UNSIGNED NOT NULL,
    assigned_by     INT UNSIGNED NOT NULL,
    due_date        DATE NOT NULL,
    status          ENUM('pending', 'in_progress', 'submitted',
                         'approved', 'rejected', 'overdue')
                    NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignments_chore
        FOREIGN KEY (chore_id) REFERENCES chores(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_assignments_assigned_to
        FOREIGN KEY (assigned_to) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_assignments_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_assignments_chore (chore_id),
    INDEX idx_assignments_assigned_to (assigned_to),
    INDEX idx_assignments_status (status),
    INDEX idx_assignments_due (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
