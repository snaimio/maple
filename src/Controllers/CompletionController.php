<?php
namespace Maple\Controllers;

use Maple\Core\Database;
use Maple\Core\Request;
use Maple\Core\Response;
use Maple\Core\Auth;
use Maple\Services\PointsService;

class CompletionController
{
    public function submit(array $params): void
    {
        $userId       = Auth::requireLogin();
        $assignmentId = (int) $params['id'];

        $assignment = $this->findAssignmentOrFail($assignmentId);

        if ((int) $assignment['assigned_to'] !== $userId) {
            Response::error('You can only complete your own assignments', 403);
        }
        if (!in_array($assignment['status'], ['pending', 'in_progress', 'rejected'], true)) {
            Response::error('This assignment cannot be submitted in its current state', 422);
        }

        $note = trim((string) Request::input('note', ''));
        $pdo  = Database::conn();

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                "INSERT INTO chore_completions (assignment_id, submitted_by, note, status)
                 VALUES (?, ?, ?, 'pending')"
            );
            $stmt->execute([$assignmentId, $userId, $note !== '' ? $note : null]);
            $completionId = (int) $pdo->lastInsertId();

            $pdo->prepare("UPDATE chore_assignments SET status = 'submitted' WHERE id = ?")
                ->execute([$assignmentId]);

            $pdo->commit();
        } catch (\PDOException $e) {
            $pdo->rollBack();
            error_log("Completion submit failed: " . $e->getMessage());
            Response::error('Failed to submit completion', 500);
        }

        Response::json([
            'completion' => [
                'id'            => $completionId,
                'assignment_id' => $assignmentId,
                'status'        => 'pending',
                'note'          => $note !== '' ? $note : null,
            ],
        ], 201);
    }

    public function approve(array $params): void
    {
        $userId       = Auth::requireLogin();
        $completionId = (int) $params['id'];

        $completion = $this->findCompletionOrFail($completionId);
        $assignment = $this->findAssignmentOrFail((int) $completion['assignment_id']);
        $this->assertParent((int) $assignment['household_id'], $userId);

        $pdo = Database::conn();

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                "UPDATE chore_completions
                 SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
                 WHERE id = ? AND status = 'pending'"
            );
            $stmt->execute([$userId, $completionId]);

            if ($stmt->rowCount() !== 1) {
                $pdo->rollBack();
                Response::error('This completion was already reviewed', 409);
            }

            $pdo->prepare("UPDATE chore_assignments SET status = 'approved' WHERE id = ?")
                ->execute([$completion['assignment_id']]);

            PointsService::award(
                (int) $assignment['assigned_to'],
                (int) $assignment['household_id'],
                (int) $assignment['chore_points'],
                'chore_reward',
                'chore_completion',
                $completionId,
                "Completed: {$assignment['chore_title']}"
            );

            $pdo->commit();
        } catch (\PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("Completion approve failed: " . $e->getMessage());
            Response::error('Failed to approve completion', 500);
        }

        Response::json([
            'completion'     => ['id' => $completionId, 'status' => 'approved'],
            'points_awarded' => (int) $assignment['chore_points'],
        ]);
    }

    public function reject(array $params): void
    {
        $userId       = Auth::requireLogin();
        $completionId = (int) $params['id'];

        $completion = $this->findCompletionOrFail($completionId);
        $assignment = $this->findAssignmentOrFail((int) $completion['assignment_id']);
        $this->assertParent((int) $assignment['household_id'], $userId);

        $rejectionNote = trim((string) Request::input('rejection_note', ''));
        $pdo = Database::conn();

        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                "UPDATE chore_completions
                 SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(),
                     rejection_note = ?
                 WHERE id = ? AND status = 'pending'"
            );
            $stmt->execute([
                $userId,
                $rejectionNote !== '' ? $rejectionNote : null,
                $completionId,
            ]);

            if ($stmt->rowCount() !== 1) {
                $pdo->rollBack();
                Response::error('This completion was already reviewed', 409);
            }

            $pdo->prepare("UPDATE chore_assignments SET status = 'rejected' WHERE id = ?")
                ->execute([$completion['assignment_id']]);

            $pdo->commit();
        } catch (\PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log("Completion reject failed: " . $e->getMessage());
            Response::error('Failed to reject completion', 500);
        }

        Response::json(['completion' => ['id' => $completionId, 'status' => 'rejected']]);
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
            Response::error('Only parents can review completions', 403);
        }
    }

    private function findCompletionOrFail(int $completionId): array
    {
        $stmt = Database::conn()->prepare(
            "SELECT id, assignment_id, status FROM chore_completions WHERE id = ?"
        );
        $stmt->execute([$completionId]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('Completion not found', 404);
        }
        return $row;
    }

    /** household_id comes from chores (c), NOT chore_assignments. */
    private function findAssignmentOrFail(int $assignmentId): array
    {
        $stmt = Database::conn()->prepare(
            "SELECT
                a.id, a.chore_id, a.assigned_to, a.status,
                c.household_id,
                c.title  AS chore_title,
                c.points AS chore_points
             FROM chore_assignments a
             JOIN chores c ON c.id = a.chore_id
             WHERE a.id = ?"
        );
        $stmt->execute([$assignmentId]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('Assignment not found', 404);
        }
        return $row;
    }
}
