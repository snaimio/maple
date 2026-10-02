<?php
/**
 * Migration runner.  Usage: php migrations/run.php
 *
 * Do NOT wrap migrations in a transaction. MySQL/MariaDB implicitly commits
 * DDL, and PHP 8 throws "There is no active transaction" on commit().
 */
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $_ENV['DB_HOST'],
    $_ENV['DB_PORT'] ?? '3306',
    $_ENV['DB_NAME']
);

try {
    $pdo = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_PASS'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    fwrite(STDERR, "DB connection failed: {$e->getMessage()}\n");
    exit(1);
}

$pdo->exec("
    CREATE TABLE IF NOT EXISTS _migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$files = glob(__DIR__ . '/[0-9][0-9][0-9]_*.sql');
sort($files);

$applied = $pdo->query("SELECT filename FROM _migrations")
               ->fetchAll(PDO::FETCH_COLUMN);
$applied = array_flip($applied);

foreach ($files as $file) {
    $name = basename($file);
    if (isset($applied[$name])) {
        echo "Skipping {$name} (already applied)\n";
        continue;
    }

    echo "Applying {$name}...\n";
    try {
        $pdo->exec(file_get_contents($file));
        $stmt = $pdo->prepare("INSERT INTO _migrations (filename) VALUES (?)");
        $stmt->execute([$name]);
        echo "  Done\n";
    } catch (PDOException $e) {
        fwrite(STDERR, "  Failed: {$e->getMessage()}\n");
        exit(1);
    }
}

echo "\nAll migrations applied.\n";
