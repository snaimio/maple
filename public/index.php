<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

// --- Error handling ---
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/../logs/error.log');
error_reporting(E_ALL);

// --- Load environment ---
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// --- Session config (must run before session_start) ---
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'domain'   => '',
    'secure'   => false,
    'httponly' => true,
    'samesite' => 'Lax',
]);

// --- CORS ---
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

// --- Imports ---
use Maple\Core\Router;
use Maple\Core\Response;
use Maple\Controllers\AuthController;

$router = new Router();

// Test route — remove later
$router->get('/api/v1/ping', function () {
    Response::json(['pong' => true, 'time' => date('c')]);
});

// Auth
$router->post('/api/v1/auth/register', [AuthController::class, 'register']);
$router->post('/api/v1/auth/login',    [AuthController::class, 'login']);
$router->post('/api/v1/auth/logout',   [AuthController::class, 'logout']);
$router->get ('/api/v1/auth/me',       [AuthController::class, 'me']);

$router->dispatch();
