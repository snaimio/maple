<?php
namespace Maple\Controllers;

use Maple\Core\Database;
use Maple\Core\Request;
use Maple\Core\Response;
use Maple\Core\Auth;

class AuthController
{
    public function register(): void
    {
        $email       = trim((string) Request::input('email', ''));
        $password    = (string) Request::input('password', '');
        $displayName = trim((string) Request::input('display_name', ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email address', 422, ['field' => 'email']);
        }
        if (strlen($password) < 8) {
            Response::error('Password must be at least 8 characters', 422, ['field' => 'password']);
        }
        if ($displayName === '') {
            Response::error('Display name is required', 422, ['field' => 'display_name']);
        }

        $pdo = Database::conn();
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            Response::error('Email already registered', 409, ['field' => 'email']);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare(
            "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)"
        );
        $stmt->execute([$email, $hash, $displayName]);
        $userId = (int) $pdo->lastInsertId();

        Auth::login($userId);

        $stmt = $pdo->prepare("SELECT created_at FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $createdUser = $stmt->fetch();

        Response::json([
            'user' => [
                'id'           => $userId,
                'email'        => $email,
                'display_name' => $displayName,
                'avatar_url'   => null,
                'created_at'   => $createdUser ? $createdUser['created_at'] : date('Y-m-d H:i:s'),
            ],
            'household' => null,
        ], 201);
    }

    public function login(): void
    {
        $email    = trim((string) Request::input('email', ''));
        $password = (string) Request::input('password', '');

        if ($email === '' || $password === '') {
            Response::error('Email and password are required', 422);
        }

        $pdo  = Database::conn();
        $stmt = $pdo->prepare(
            "SELECT id, email, password_hash, display_name, avatar_url, created_at FROM users WHERE email = ?"
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::error('Invalid credentials', 401);
        }

        if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
            $update = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $update->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }

        Auth::login((int) $user['id']);

        $hStmt = $pdo->prepare(
            "SELECT h.id, h.name, hm.role_in_household AS role
             FROM households h
             JOIN household_members hm ON hm.household_id = h.id
             WHERE hm.user_id = ?
             ORDER BY h.id ASC
             LIMIT 1"
        );
        $hStmt->execute([(int) $user['id']]);
        $hRow = $hStmt->fetch();

        $household = null;
        if ($hRow) {
            $household = [
                'id'   => (int) $hRow['id'],
                'name' => $hRow['name'],
                'role' => $hRow['role'],
            ];
        }

        Response::json([
            'user' => [
                'id'           => (int) $user['id'],
                'email'        => $user['email'],
                'display_name' => $user['display_name'],
                'avatar_url'   => $user['avatar_url'],
                'created_at'   => $user['created_at'],
            ],
            'household' => $household,
        ]);
    }

    public function logout(): void
    {
        Auth::logout();
        Response::noContent();
    }

    public function me(): void
    {
        $userId = Auth::requireLogin();

        $pdo  = Database::conn();
        $stmt = $pdo->prepare(
            "SELECT id, email, display_name, avatar_url, created_at
             FROM users WHERE id = ?"
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            Auth::logout();
            Response::error('Authentication required', 401);
        }

        $hStmt = $pdo->prepare(
            "SELECT h.id, h.name, hm.role_in_household AS role
             FROM households h
             JOIN household_members hm ON hm.household_id = h.id
             WHERE hm.user_id = ?
             ORDER BY h.id ASC
             LIMIT 1"
        );
        $hStmt->execute([$userId]);
        $hRow = $hStmt->fetch();

        $household = null;
        if ($hRow) {
            $household = [
                'id'   => (int) $hRow['id'],
                'name' => $hRow['name'],
                'role' => $hRow['role'],
            ];
        }

        Response::json([
            'user' => [
                'id'           => (int) $user['id'],
                'email'        => $user['email'],
                'display_name' => $user['display_name'],
                'avatar_url'   => $user['avatar_url'],
                'created_at'   => $user['created_at'],
            ],
            'household' => $household,
        ]);
    }
}
