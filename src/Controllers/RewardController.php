<?php
namespace Maple\Controllers;

use Maple\Core\Database;
use Maple\Core\Request;
use Maple\Core\Response;
use Maple\Core\Auth;

class RewardController
{
    public function index(array $params): void
    {
        $userId      = Auth::requireLogin();
        $householdId = (int) $params['id'];

        $this->assertMember($householdId, $userId);

        $includeInactive = Request::query('include_inactive') === '1';

        $sql = "SELECT r.*, u.display_name AS created_by_name
                FROM rewards r
                JOIN users u ON u.id = r.created_by
                WHERE r.household_id = ?";
        if (!$includeInactive) {
            $sql .= " AND r.is_active = 1";
        }
        $sql .= " ORDER BY r.cost_points ASC";

        $stmt = Database::conn()->prepare($sql);
        $stmt->execute([$householdId]);

        Response::json([
            'rewards' => array_map(fn($r) => $this->formatReward($r), $stmt->fetchAll()),
        ]);
    }

    public function store(array $params): void
    {
        $userId      = Auth::requireLogin();
        $householdId = (int) $params['id'];

        $this->assertParent($householdId, $userId);

        $title       = trim((string) Request::input('title', ''));
        $description = trim((string) Request::input('description', ''));
        $costPoints  = (int) Request::input('cost_points', 0);

        if ($title === '') {
            Response::error('Title is required', 422, ['field' => 'title']);
        }
        if ($costPoints < 1) {
            Response::error('Cost must be at least 1 point', 422, ['field' => 'cost_points']);
        }

        $pdo = Database::conn();
        $stmt = $pdo->prepare(
            "INSERT INTO rewards
             (household_id, title, description, cost_points, created_by, is_active)
             VALUES (?, ?, ?, ?, ?, 1)"
        );
        $stmt->execute([
            $householdId,
            $title,
            $description !== '' ? $description : null,
            $costPoints,
            $userId,
        ]);

        $this->respondWithReward((int) $pdo->lastInsertId(), 201);
    }

    public function update(array $params): void
    {
        $userId   = Auth::requireLogin();
        $rewardId = (int) $params['id'];

        $reward = $this->findRewardOrFail($rewardId);
        $this->assertParent((int) $reward['household_id'], $userId);

        $fields = [];
        $values = [];

        if (Request::input('title') !== null) {
            $title = trim((string) Request::input('title'));
            if ($title === '') {
                Response::error('Title cannot be empty', 422, ['field' => 'title']);
            }
            $fields[] = 'title = ?';
            $values[] = $title;
        }
        if (Request::input('description') !== null) {
            $fields[] = 'description = ?';
            $values[] = trim((string) Request::input('description')) ?: null;
        }
        if (Request::input('cost_points') !== null) {
            $cost = (int) Request::input('cost_points');
            if ($cost < 1) {
                Response::error('Cost must be at least 1 point', 422, ['field' => 'cost_points']);
            }
            $fields[] = 'cost_points = ?';
            $values[] = $cost;
        }
        if (Request::input('is_active') !== null) {
            $fields[] = 'is_active = ?';
            $values[] = (int) (bool) Request::input('is_active');
        }

        if (empty($fields)) {
            Response::error('No updatable fields provided', 422);
        }

        $values[] = $rewardId;
        $sql = "UPDATE rewards SET " . implode(', ', $fields) . " WHERE id = ?";
        Database::conn()->prepare($sql)->execute($values);

        $this->respondWithReward($rewardId);
    }

    public function destroy(array $params): void
    {
        $userId   = Auth::requireLogin();
        $rewardId = (int) $params['id'];

        $reward = $this->findRewardOrFail($rewardId);
        $this->assertParent((int) $reward['household_id'], $userId);

        Database::conn()
            ->prepare("UPDATE rewards SET is_active = 0 WHERE id = ?")
            ->execute([$rewardId]);

        Response::json(['deleted' => true, 'reward_id' => $rewardId]);
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

    private function assertParent(int $householdId, int $userId): void
    {
        $stmt = Database::conn()->prepare(
            "SELECT role_in_household FROM household_members
             WHERE household_id = ? AND user_id = ?"
        );
        $stmt->execute([$householdId, $userId]);
        $member = $stmt->fetch();
        if (!$member) {
            Response::error('You are not a member of this household', 403);
        }
        if (!in_array($member['role_in_household'], ['parent', 'admin'], true)) {
            Response::error('Only parents can manage rewards', 403);
        }
    }

    private function findRewardOrFail(int $rewardId): array
    {
        $stmt = Database::conn()->prepare("SELECT * FROM rewards WHERE id = ?");
        $stmt->execute([$rewardId]);
        $reward = $stmt->fetch();
        if (!$reward) {
            Response::error('Reward not found', 404);
        }
        return $reward;
    }

    private function respondWithReward(int $rewardId, int $status = 200): void
    {
        $stmt = Database::conn()->prepare(
            "SELECT r.*, u.display_name AS created_by_name
             FROM rewards r
             JOIN users u ON u.id = r.created_by
             WHERE r.id = ?"
        );
        $stmt->execute([$rewardId]);
        Response::json(['reward' => $this->formatReward($stmt->fetch())], $status);
    }

    private function formatReward(array $r): array
    {
        return [
            'id'              => (int) $r['id'],
            'household_id'    => (int) $r['household_id'],
            'title'           => $r['title'],
            'description'     => $r['description'],
            'cost_points'     => (int) $r['cost_points'],
            'is_active'       => (bool) $r['is_active'],
            'created_by'      => (int) $r['created_by'],
            'created_by_name' => $r['created_by_name'] ?? null,
            'created_at'      => $r['created_at'],
            'updated_at'      => $r['updated_at'],
        ];
    }
}
