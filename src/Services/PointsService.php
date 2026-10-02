<?php
namespace Maple\Services;

use Maple\Core\Database;

class PointsService
{
    /** Append one row to the ledger. Call inside the caller's transaction. */
    public static function award(
        int $userId,
        int $householdId,
        int $delta,
        string $reason,
        string $referenceType,
        ?int $referenceId,
        ?string $note = null
    ): void {
        $stmt = Database::conn()->prepare(
            "INSERT INTO points_transactions
             (user_id, household_id, delta, reason, reference_type, reference_id, note)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $userId, $householdId, $delta,
            $reason, $referenceType, $referenceId, $note,
        ]);
    }

    public static function balance(int $userId, int $householdId): int
    {
        $stmt = Database::conn()->prepare(
            "SELECT COALESCE(SUM(delta), 0) AS balance
             FROM points_transactions
             WHERE user_id = ? AND household_id = ?"
        );
        $stmt->execute([$userId, $householdId]);
        return (int) $stmt->fetch()['balance'];
    }
}
