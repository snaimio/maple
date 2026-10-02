<?php
namespace Maple\Controllers;

use Maple\Core\Database;
use Maple\Core\Request;
use Maple\Core\Response;
use Maple\Core\Auth;
use Maple\Services\PointsService;

class RedemptionController
{
    public function redeem(array $params): void
    {
        $userId   = Auth::requireLogin();
        $rewardId = (int) $params['id'];

        $pdo = Database::conn();

        $stmt = $pdo->prepare("SELECT * FROM rewards WHERE id = ? AND is_active = 1");
        $stmt->execute([$rewardId]);
        $reward = $stmt->fetch();
        if (!$reward) {
            Response::error('Reward not found or inactive', 404);
        }

        $stmt = $pdo->prepare(
            "SELECT id, role_in_household FROM household_members
             WHERE household_id = ? AND user_id = ?"
        );
        $stmt->execute([$reward['household_id'], $userId]);
        $member = $stmt->fetch();
        if (!$member) {
            Response::error('You are not a member of this household', 403);
        }
        if ($member['role_in_household'] !== 'child') {
            Response::error('Only children can redeem rewards', 403);
        }

        $balance = PointsService::balance($userId, (int) $reward['household_id']);
        if ($balance < (int) $reward['cost_points']) {
            Response::error('Insufficient points', 422, [
                'field'   => 'points',
                'balance' => $balance,
                'cost'    => (int) $reward['cost_points'],
            ]);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO reward_redemptions (reward_id, redeemed_by, points_spent, status)
             VALUES (?, ?, ?, 'pending')"
        );
        $stmt->execute([$rewardId, $userId, (int) $reward['cost_points']]);
        $redemptionId = (int) $pdo->lastInsertId();

        Response::json([
            'redemption' => [
                'id'           => $redemptionId,
                'reward_id'    => $rewardId,
                'reward_title' => $reward['title'],
                'points_spent' => (int) $reward['cost_points'],
                'status'       => 'pending',
            ],
        ], 201);
    }

    public function approve(array $params): void
    {
        $userId       = Auth::requireLogin();
        $redemptionId = (int) $params['id'];

        $pdo = Database::conn();
        $redemption = $this->findRedemptionOrFail($redemptionId);
        $this->assertParent((int) $redemption['household_id'], $userId);

        // Re-check balance at approval time.
        $currentBalance = PointsService::balance(
            (int) $redemption['redeemed_by'],
            (int) $redemption['household_id']
        );
        if ($currentBalance < (int) $redemption['points_spent']) {
            Response::error('Insufficient points at approval time', 422, [
                'field'   => 'points',
                'balance' => $currentBalance,
                'cost'    => (int) $redemption['points_spent'],
            ]);
        }

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                "UPDATE reward_redemptions
                 SET status = 'approved', reviewed_by = ?, resolved_at = NOW()
                 WHERE id = ? AND status = 'pending'"
            );
            $stmt->execute([$userId, $redemptionId]);

            if ($stmt->rowCount() !== 1) {
                $pdo->rollBack();
                Response::error('This redemption was already reviewed', 409);
            }

            PointsService::award(
                (int) $redemption['redeemed_by'],
                (int) $redemption['household_id'],
                -(int) $redemption['points_spent'],
                'reward_redemption',
                'reward_redemption',
                $redemptionId,
                'Redeemed reward'
            );

            $pdo->commit();
        } catch (\PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("Redemption approve failed: " . $e->getMessage());
            Response::error('Failed to approve redemption', 500);
        }

        Response::json([
            'redemption'      => ['id' => $redemptionId, 'status' => 'approved'],
            'points_deducted' => (int) $redemption['points_spent'],
        ]);
    }

    public function reject(array $params): void
    {
        $userId       = Auth::requireLogin();
        $redemptionId = (int) $params['id'];

        $redemption = $this->findRedemptionOrFail($redemptionId);
        $this->assertParent((int) $redemption['household_id'], $userId);

        $rejectionNote = trim((string) Request::input('rejection_note', ''));

        $stmt = Database::conn()->prepare(
            "UPDATE reward_redemptions
             SET status = 'rejected', reviewed_by = ?, resolved_at = NOW(),
                 rejection_note = ?
             WHERE id = ? AND status = 'pending'"
        );
        $stmt->execute([
            $userId,
            $rejectionNote !== '' ? $rejectionNote : null,
            $redemptionId,
        ]);

        if ($stmt->rowCount() !== 1) {
            Response::error('This redemption was already reviewed', 409);
        }

        Response::json(['redemption' => ['id' => $redemptionId, 'status' => 'rejected']]);
    }

    private function findRedemptionOrFail(int $redemptionId): array
    {
        $stmt = Database::conn()->prepare(
            "SELECT rr.*, r.household_id
             FROM reward_redemptions rr
             JOIN rewards r ON r.id = rr.reward_id
             WHERE rr.id = ?"
        );
        $stmt->execute([$redemptionId]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('Redemption not found', 404);
        }
        return $row;
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
            Response::error('Only parents can review redemptions', 403);
        }
    }
}
