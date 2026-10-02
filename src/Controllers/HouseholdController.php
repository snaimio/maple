<?php
namespace Maple\Controllers;

use Maple\Core\Database;
use Maple\Core\Request;
use Maple\Core\Response;
use Maple\Core\Auth;

class HouseholdController
{
    public function create(): void
    {
        $userId = Auth::requireLogin();
        $name   = trim((string) Request::input('name', ''));

        if ($name === '') {
            Response::error('Household name is required', 422, ['field' => 'name']);
        }

        $pdo = Database::conn();
        $inviteCode = $this->generateUniqueInviteCode($pdo);

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                "INSERT INTO households (name, invite_code, created_by) VALUES (?, ?, ?)"
            );
            $stmt->execute([$name, $inviteCode, $userId]);
            $householdId = (int) $pdo->lastInsertId();

            $stmt = $pdo->prepare(
                "INSERT INTO household_members (household_id, user_id, role_in_household)
                 VALUES (?, ?, 'parent')"
            );
            $stmt->execute([$householdId, $userId]);

            $pdo->commit();
        } catch (\PDOException $e) {
            $pdo->rollBack();
            error_log("Household create failed: " . $e->getMessage());
            Response::error('Failed to create household', 500);
        }

        Response::json([
            'household' => [
                'id'          => $householdId,
                'name'        => $name,
                'invite_code' => $inviteCode,
                'role'        => 'parent',
            ],
        ], 201);
    }

    public function join(): void
    {
        $userId     = Auth::requireLogin();
        $inviteCode = strtoupper(trim((string) Request::input('invite_code', '')));

        if ($inviteCode === '') {
            Response::error('Invite code is required', 422, ['field' => 'invite_code']);
        }

        $pdo = Database::conn();
        $stmt = $pdo->prepare("SELECT id, name FROM households WHERE invite_code = ?");
        $stmt->execute([$inviteCode]);
        $household = $stmt->fetch();

        if (!$household) {
            Response::error('Invalid invite code', 404, ['field' => 'invite_code']);
        }

        $stmt = $pdo->prepare(
            "SELECT id FROM household_members WHERE household_id = ? AND user_id = ?"
        );
        $stmt->execute([$household['id'], $userId]);
        if ($stmt->fetch()) {
            Response::error('You are already a member of this household', 409);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO household_members (household_id, user_id, role_in_household)
             VALUES (?, ?, 'child')"
        );
        $stmt->execute([$household['id'], $userId]);

        Response::json([
            'household' => [
                'id'   => (int) $household['id'],
                'name' => $household['name'],
                'role' => 'child',
            ],
        ], 201);
    }

    public function members(array $params): void
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
                hm.id, hm.user_id, hm.role_in_household, hm.joined_at,
                u.display_name, u.email, u.avatar_url,
                COALESCE(pt.total, 0) AS points_balance
             FROM household_members hm
             JOIN users u ON u.id = hm.user_id
             LEFT JOIN (
                 SELECT user_id, SUM(delta) AS total
                 FROM points_transactions
                 WHERE household_id = ?
                 GROUP BY user_id
             ) pt ON pt.user_id = hm.user_id
             WHERE hm.household_id = ?
             ORDER BY
                 FIELD(hm.role_in_household, 'parent', 'admin', 'child'),
                 u.display_name ASC"
        );
        $stmt->execute([$householdId, $householdId]);
        $rows = $stmt->fetchAll();

        $members = array_map(fn($r) => [
            'id'                => (int) $r['id'],
            'user_id'           => (int) $r['user_id'],
            'display_name'      => $r['display_name'],
            'email'             => $r['email'],
            'avatar_url'        => $r['avatar_url'],
            'role_in_household' => $r['role_in_household'],
            'points_balance'    => (int) $r['points_balance'],
            'joined_at'         => $r['joined_at'],
        ], $rows);

        Response::json(['members' => $members]);
    }

    private function generateUniqueInviteCode(\PDO $pdo): string
    {
        for ($i = 0; $i < 10; $i++) {
            $code = strtoupper(bin2hex(random_bytes(4)));
            $stmt = $pdo->prepare("SELECT id FROM households WHERE invite_code = ?");
            $stmt->execute([$code]);
            if (!$stmt->fetch()) {
                return $code;
            }
        }
        throw new \RuntimeException('Could not generate unique invite code');
    }
}
