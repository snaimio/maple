<?php
namespace Maple\Controllers;

use Maple\Core\Database;
use Maple\Core\Request;
use Maple\Core\Response;
use Maple\Core\Auth;

class ChoreController
{
    public function index(array $params): void
    {
        $userId      = Auth::requireLogin();
        $householdId = (int) $params['id'];

        $this->assertMember($householdId, $userId);

        $includeInactive = Request::query('include_inactive') === '1';

        $sql = "SELECT
                    c.id, c.household_id, c.title, c.description,
                    c.points, c.category, c.recurrence, c.recurrence_days,
                    c.is_active, c.created_by,
                    u.display_name AS created_by_name,
                    c.created_at, c.updated_at
                FROM chores c
                JOIN users u ON u.id = c.created_by
                WHERE c.household_id = ?";

        if (!$includeInactive) {
            $sql .= " AND c.is_active = 1";
        }
        $sql .= " ORDER BY c.created_at DESC";

        $stmt = Database::conn()->prepare($sql);
        $stmt->execute([$householdId]);
        $rows = $stmt->fetchAll();

        Response::json(['chores' => array_map(fn($r) => $this->formatChore($r), $rows)]);
    }

    public function store(array $params): void
    {
        $userId      = Auth::requireLogin();
        $householdId = (int) $params['id'];

        $this->assertParent($householdId, $userId);

        $title       = trim((string) Request::input('title', ''));
        $description = trim((string) Request::input('description', ''));
        $points      = (int) Request::input('points', 10);
        $category    = trim((string) Request::input('category', ''));
        $recurrence  = (string) Request::input('recurrence', 'none');

        if ($title === '') {
            Response::error('Title is required', 422, ['field' => 'title']);
        }
        if ($points < 1 || $points > 1000) {
            Response::error('Points must be between 1 and 1000', 422, ['field' => 'points']);
        }
        if (!in_array($recurrence, ['none', 'daily', 'weekly', 'custom'], true)) {
            Response::error('Invalid recurrence value', 422, ['field' => 'recurrence']);
        }
        if ($recurrence !== 'none') {
            Response::error(
                'Recurring chores are not yet supported in Module 1',
                422,
                ['field' => 'recurrence']
            );
        }

        $pdo = Database::conn();
        $stmt = $pdo->prepare(
            "INSERT INTO chores
             (household_id, title, description, points, category,
              recurrence, created_by, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
        );
        $stmt->execute([
            $householdId,
            $title,
            $description !== '' ? $description : null,
            $points,
            $category !== '' ? $category : null,
            $recurrence,
            $userId,
        ]);

        $this->respondWithChore((int) $pdo->lastInsertId(), 201);
    }

    public function update(array $params): void
    {
        $userId  = Auth::requireLogin();
        $choreId = (int) $params['id'];

        $chore = $this->findChoreOrFail($choreId);
        $this->assertParent((int) $chore['household_id'], $userId);

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
        if (Request::input('points') !== null) {
            $points = (int) Request::input('points');
            if ($points < 1 || $points > 1000) {
                Response::error('Points must be between 1 and 1000', 422, ['field' => 'points']);
            }
            $fields[] = 'points = ?';
            $values[] = $points;
        }
        if (Request::input('category') !== null) {
            $fields[] = 'category = ?';
            $values[] = trim((string) Request::input('category')) ?: null;
        }
        if (Request::input('is_active') !== null) {
            $fields[] = 'is_active = ?';
            $values[] = (int) (bool) Request::input('is_active');
        }

        if (empty($fields)) {
            Response::error('No updatable fields provided', 422);
        }

        $values[] = $choreId;
        $sql = "UPDATE chores SET " . implode(', ', $fields) . " WHERE id = ?";
        Database::conn()->prepare($sql)->execute($values);

        $this->respondWithChore($choreId);
    }

    /** Soft delete: sets is_active = 0 so history is preserved. */
    public function destroy(array $params): void
    {
        $userId  = Auth::requireLogin();
        $choreId = (int) $params['id'];

        $chore = $this->findChoreOrFail($choreId);
        $this->assertParent((int) $chore['household_id'], $userId);

        Database::conn()
            ->prepare("UPDATE chores SET is_active = 0 WHERE id = ?")
            ->execute([$choreId]);

        Response::json(['deleted' => true, 'chore_id' => $choreId]);
    }

    private function assertMember(int $householdId, int $userId): void
    {
        $stmt = Database::conn()->prepare(
            "SELECT role_in_household FROM household_members
             WHERE household_id = ? AND user_id = ?"
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
            Response::error('Only parents can manage chores', 403);
        }
    }

    private function findChoreOrFail(int $choreId): array
    {
        $stmt = Database::conn()->prepare(
            "SELECT id, household_id, title, description, points,
                    category, recurrence, recurrence_days, is_active,
                    created_by, created_at, updated_at
             FROM chores WHERE id = ?"
        );
        $stmt->execute([$choreId]);
        $chore = $stmt->fetch();
        if (!$chore) {
            Response::error('Chore not found', 404);
        }
        return $chore;
    }

    private function respondWithChore(int $choreId, int $status = 200): void
    {
        $stmt = Database::conn()->prepare(
            "SELECT c.*, u.display_name AS created_by_name
             FROM chores c
             JOIN users u ON u.id = c.created_by
             WHERE c.id = ?"
        );
        $stmt->execute([$choreId]);
        Response::json(['chore' => $this->formatChore($stmt->fetch())], $status);
    }

    private function formatChore(array $r): array
    {
        return [
            'id'              => (int) $r['id'],
            'household_id'    => (int) $r['household_id'],
            'title'           => $r['title'],
            'description'     => $r['description'],
            'points'          => (int) $r['points'],
            'category'        => $r['category'],
            'recurrence'      => $r['recurrence'],
            'recurrence_days' => $r['recurrence_days'],
            'is_active'       => (bool) $r['is_active'],
            'created_by'      => (int) $r['created_by'],
            'created_by_name' => $r['created_by_name'] ?? null,
            'created_at'      => $r['created_at'],
            'updated_at'      => $r['updated_at'],
        ];
    }
}
