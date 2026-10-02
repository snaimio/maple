<?php
namespace Maple\Controllers;

use Maple\Core\Database;
use Maple\Core\Response;
use Maple\Core\Auth;

class AnalyticsController
{
    public function weekly(array $params): void
    {
        $userId      = Auth::requireLogin();
        $householdId = (int) $params['id'];
        $this->assertMember($householdId, $userId);

        $stmt = Database::conn()->prepare(
            "SELECT
                DATE(cc.reviewed_at) AS day,
                COUNT(*) AS completions,
                COALESCE(SUM(c.points), 0) AS points_awarded
             FROM chore_completions cc
             JOIN chore_assignments ca ON ca.id = cc.assignment_id
             JOIN chores c ON c.id = ca.chore_id
             WHERE c.household_id = ?
               AND cc.status = 'approved'
               AND cc.reviewed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             GROUP BY DATE(cc.reviewed_at)
             ORDER BY day ASC"
        );
        $stmt->execute([$householdId]);

        Response::json(['weekly' => $stmt->fetchAll()]);
    }

    public function chores(array $params): void
    {
        $userId      = Auth::requireLogin();
        $householdId = (int) $params['id'];
        $this->assertMember($householdId, $userId);

        $stmt = Database::conn()->prepare(
            "SELECT
                c.id AS chore_id,
                c.title,
                COUNT(cc.id) AS completion_count,
                COALESCE(SUM(CASE WHEN cc.status = 'approved' THEN 1 ELSE 0 END), 0)
                    AS approved_count
             FROM chores c
             LEFT JOIN chore_assignments ca ON ca.chore_id = c.id
             LEFT JOIN chore_completions cc ON cc.assignment_id = ca.id
             WHERE c.household_id = ?
             GROUP BY c.id, c.title
             ORDER BY completion_count DESC"
        );
        $stmt->execute([$householdId]);

        Response::json(['chores' => $stmt->fetchAll()]);
    }

    public function members(array $params): void
    {
        $userId      = Auth::requireLogin();
        $householdId = (int) $params['id'];
        $this->assertMember($householdId, $userId);

        $stmt = Database::conn()->prepare(
            "SELECT
                u.id AS user_id,
                u.display_name,
                hm.role_in_household,
                COALESCE(SUM(CASE WHEN cc.status = 'approved' THEN hc.points ELSE 0 END), 0)
                    AS points_earned,
                COUNT(CASE WHEN cc.status = 'approved' THEN 1 END) AS chores_completed
             FROM household_members hm
             JOIN users u ON u.id = hm.user_id
             LEFT JOIN (
                 SELECT ca.id AS assignment_id, ca.assigned_to, c.points
                 FROM chore_assignments ca
                 JOIN chores c ON c.id = ca.chore_id
                 WHERE c.household_id = ?
             ) hc ON hc.assigned_to = u.id
             LEFT JOIN chore_completions cc ON cc.assignment_id = hc.assignment_id
             WHERE hm.household_id = ?
             GROUP BY u.id, u.display_name, hm.role_in_household
             ORDER BY points_earned DESC"
        );
        $stmt->execute([$householdId, $householdId]);

        Response::json(['members' => $stmt->fetchAll()]);
    }

    private function assertMember(int $householdId, int $userId): void
    {
        $stmt = Database::conn()->prepare(
            "SELECT id FROM household_members WHERE household_id = ? AND user_id = ?"
        );
        $stmt->execute([$householdId, $userId]);
        if (!$stmt->fetch()) {
            Response::error('You are not a member of this household', 403);
        }
    }
}
