<?php
namespace Maple\Controllers;

use Maple\Core\Database;
use Maple\Core\Request;
use Maple\Core\Response;
use Maple\Core\Auth;

class AssignmentController
{
    public function assign(array $params): void
    {
        $userId  = Auth::requireLogin();
        $choreId = (int) $params['id'];

        $chore = $this->findChoreOrFail($choreId);
        $this->assertParent((int) $chore['household_id'], $userId);

        $userIds = Request::input('user_ids', []);
        $dueDate = (string) Request::input('due_date', '');

        if (!is_array($userIds) || empty($userIds)) {
            Response::error('user_ids must be a non-empty array', 422, ['field' => 'user_ids']);
        }
        if (!$this->isValidDate($dueDate)) {
            Response::error('due_date must be YYYY-MM-DD', 422, ['field' => 'due_date']);
        }

        $pdo = Database::conn();

        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $stmt = $pdo->prepare(
            "SELECT user_id, role_in_household
             FROM household_members
             WHERE household_id = ? AND user_id IN ($placeholders)"
        );
        $stmt->execute(array_merge([$chore['household_id']], $userIds));

        $memberMap = [];
        foreach ($stmt->fetchAll() as $m) {
            $memberMap[(int) $m['user_id']] = $m['role_in_household'];
        }

        foreach ($userIds as $uid) {
            $uid = (int) $uid;
            if (!isset($memberMap[$uid])) {
                Response::error("User {$uid} is not a member of this household", 422, ['field' => 'user_ids']);
            }
            if ($memberMap[$uid] !== 'child') {
                Response::error("User {$uid} is not a child in this household", 422, ['field' => 'user_ids']);
            }
        }

        $createdIds = [];
        try {
            $pdo->beginTransaction();
            $insert = $pdo->prepare(
                "INSERT INTO chore_assignments
                 (chore_id, assigned_to, assigned_by, due_date, status)
                 VALUES (?, ?, ?, ?, 'pending')"
            );
            foreach ($userIds as $uid) {
                $insert->execute([$choreId, (int) $uid, $userId, $dueDate]);
                $createdIds[] = (int) $pdo->lastInsertId();
            }
            $pdo->commit();
        } catch (\PDOException $e) {
            $pdo->rollBack();
            error_log("Assign failed: " . $e->getMessage());
            Response::error('Failed to create assignments', 500);
        }

        Response::json([
            'assignment_ids' => $createdIds,
            'count'          => count($createdIds),
        ], 201);
    }

    public function index(): void
    {
        $userId = Auth::requireLogin();

        $filterUserId = Request::query('user_id');
        $filterStatus = Request::query('status');

        $sql = "SELECT
                    a.id, a.chore_id, a.assigned_to, a.assigned_by,
                    a.due_date, a.status, a.created_at, a.updated_at,
                    c.title AS chore_title,
                    c.points AS chore_points,
                    c.household_id,
                    assignee.display_name AS assigned_to_name,
                    assigner.display_name AS assigned_by_name
                FROM chore_assignments a
                JOIN chores c ON c.id = a.chore_id
                JOIN users assignee ON assignee.id = a.assigned_to
                JOIN users assigner ON assigner.id = a.assigned_by
                WHERE c.household_id IN (
                    SELECT household_id FROM household_members WHERE user_id = ?
                )";

        $params = [$userId];

        if ($filterUserId !== null) {
            $sql .= " AND a.assigned_to = ?";
            $params[] = (int) $filterUserId;
        }
        if ($filterStatus !== null) {
            $sql .= " AND a.status = ?";
            $params[] = $filterStatus;
        }

        $sql .= " ORDER BY a.due_date ASC, a.created_at DESC";

        $stmt = Database::conn()->prepare($sql);
        $stmt->execute($params);

        $assignments = array_map(fn($r) => [
            'id'               => (int) $r['id'],
            'chore_id'         => (int) $r['chore_id'],
            'chore_title'      => $r['chore_title'],
            'chore_points'     => (int) $r['chore_points'],
            'household_id'     => (int) $r['household_id'],
            'assigned_to'      => (int) $r['assigned_to'],
            'assigned_to_name' => $r['assigned_to_name'],
            'assigned_by'      => (int) $r['assigned_by'],
            'assigned_by_name' => $r['assigned_by_name'],
            'due_date'         => $r['due_date'],
            'status'           => $r['status'],
            'created_at'       => $r['created_at'],
            'updated_at'       => $r['updated_at'],
        ], $stmt->fetchAll());

        Response::json(['assignments' => $assignments]);
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
            Response::error('Only parents can assign chores', 403);
        }
    }

    private function findChoreOrFail(int $choreId): array
    {
        $stmt = Database::conn()->prepare(
            "SELECT id, household_id, is_active FROM chores WHERE id = ?"
        );
        $stmt->execute([$choreId]);
        $chore = $stmt->fetch();
        if (!$chore) {
            Response::error('Chore not found', 404);
        }
        if (!$chore['is_active']) {
            Response::error('Cannot assign an inactive chore', 422);
        }
        return $chore;
    }

    private function isValidDate(string $date): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) return false;
        [$y, $m, $d] = explode('-', $date);
        return checkdate((int) $m, (int) $d, (int) $y);
    }
}
