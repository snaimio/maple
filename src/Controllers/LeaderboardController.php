<?php
namespace Maple\Controllers;

use Maple\Core\Database;
use Maple\Core\Response;
use Maple\Core\Auth;

class LeaderboardController
{
    public function show(array $params): void
    {
        $userId      = Auth::requireLogin();
        $householdId = (int) $params['id'];

        $pdo = Database::conn();
        $stmt = $pdo->prepare(
            "SELECT id FROM household_members WHERE household_id = ? AND user_id = ?"
        );
        $stmt->execute([$householdId, $userId]);
        if (!$stmt->fetch()) {
            Response::error('You are not a member of this household', 403);
        }

        $stmt = $pdo->prepare(
            "SELECT
                u.id AS user_id,
                u.display_name,
                u.avatar_url,
                COALESCE(bal.total, 0)    AS points_balance,
                COALESCE(weekly.delta, 0) AS weekly_points
             FROM household_members hm
             JOIN users u ON u.id = hm.user_id
             LEFT JOIN (
                 SELECT user_id, SUM(delta) AS total
                 FROM points_transactions
                 WHERE household_id = ?
                 GROUP BY user_id
             ) bal ON bal.user_id = hm.user_id
             LEFT JOIN (
                 SELECT user_id, SUM(delta) AS delta
                 FROM points_transactions
                 WHERE household_id = ?
                   AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                   AND delta > 0
                 GROUP BY user_id
             ) weekly ON weekly.user_id = hm.user_id
             WHERE hm.household_id = ?
               AND hm.role_in_household = 'child'
             ORDER BY points_balance DESC, u.display_name ASC"
        );
        $stmt->execute([$householdId, $householdId, $householdId]);

        $leaderboard = [];
        foreach ($stmt->fetchAll() as $i => $row) {
            $rank = $i + 1;
            $leaderboard[] = [
                'rank'           => $rank,
                'user_id'        => (int) $row['user_id'],
                'display_name'   => $row['display_name'],
                'avatar_url'     => $row['avatar_url'],
                'points_balance' => (int) $row['points_balance'],
                'weekly_points'  => (int) $row['weekly_points'],
                'medal'          => match ($rank) {
                    1 => '🥇',
                    2 => '🥈',
                    3 => '🥉',
                    default => null,
                },
            ];
        }

        Response::json(['leaderboard' => $leaderboard]);
    }
}
