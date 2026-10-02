<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/../logs/error.log');
error_reporting(E_ALL);

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'domain'   => '',
    'secure'   => false,
    'httponly' => true,
    'samesite' => 'Lax',
]);

$allowedOrigin = ($_ENV['APP_ENV'] ?? 'local') === 'local'
    ? 'http://localhost:4200'
    : 'https://your-production-domain.com';

header("Access-Control-Allow-Origin: {$allowedOrigin}");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

use Maple\Core\Router;
use Maple\Core\Response;
use Maple\Controllers\AuthController;
use Maple\Controllers\HouseholdController;
use Maple\Controllers\ChoreController;
use Maple\Controllers\AssignmentController;
use Maple\Controllers\CompletionController;
use Maple\Controllers\RewardController;
use Maple\Controllers\RedemptionController;
use Maple\Controllers\LeaderboardController;
use Maple\Controllers\AnalyticsController;

$router = new Router();

$router->get('/api/v1/ping', function () {
    Response::json(['pong' => true, 'time' => date('c')]);
});

// Auth
$router->post('/api/v1/auth/register', [AuthController::class, 'register']);
$router->post('/api/v1/auth/login',    [AuthController::class, 'login']);
$router->post('/api/v1/auth/logout',   [AuthController::class, 'logout']);
$router->get ('/api/v1/auth/me',       [AuthController::class, 'me']);

// Households
$router->post('/api/v1/households',              [HouseholdController::class, 'create']);
$router->post('/api/v1/households/join',         [HouseholdController::class, 'join']);
$router->get ('/api/v1/households/{id}/members', [HouseholdController::class, 'members']);

// Chores
$router->get   ('/api/v1/households/{id}/chores', [ChoreController::class, 'index']);
$router->post  ('/api/v1/households/{id}/chores', [ChoreController::class, 'store']);
$router->put   ('/api/v1/chores/{id}',            [ChoreController::class, 'update']);
$router->delete('/api/v1/chores/{id}',            [ChoreController::class, 'destroy']);

// Assignments
$router->post('/api/v1/chores/{id}/assign', [AssignmentController::class, 'assign']);
$router->get ('/api/v1/assignments',        [AssignmentController::class, 'index']);

// Completions
$router->post('/api/v1/assignments/{id}/complete', [CompletionController::class, 'submit']);
$router->put ('/api/v1/completions/{id}/approve',  [CompletionController::class, 'approve']);
$router->put ('/api/v1/completions/{id}/reject',   [CompletionController::class, 'reject']);

// Rewards
$router->get   ('/api/v1/households/{id}/rewards', [RewardController::class, 'index']);
$router->post  ('/api/v1/households/{id}/rewards', [RewardController::class, 'store']);
$router->put   ('/api/v1/rewards/{id}',            [RewardController::class, 'update']);
$router->delete('/api/v1/rewards/{id}',            [RewardController::class, 'destroy']);

// Redemptions
$router->post('/api/v1/rewards/{id}/redeem',      [RedemptionController::class, 'redeem']);
$router->put ('/api/v1/redemptions/{id}/approve', [RedemptionController::class, 'approve']);
$router->put ('/api/v1/redemptions/{id}/reject',  [RedemptionController::class, 'reject']);

// Leaderboard & Analytics
$router->get('/api/v1/households/{id}/leaderboard',       [LeaderboardController::class, 'show']);
$router->get('/api/v1/households/{id}/analytics/weekly',  [AnalyticsController::class, 'weekly']);
$router->get('/api/v1/households/{id}/analytics/chores',  [AnalyticsController::class, 'chores']);
$router->get('/api/v1/households/{id}/analytics/members', [AnalyticsController::class, 'members']);

$router->dispatch();
