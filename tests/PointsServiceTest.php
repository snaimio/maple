<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use Maple\Services\PointsService;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$userId      = 2;   // Jamie (from the seeder)
$householdId = 1;

$before = PointsService::balance($userId, $householdId);
echo "Balance before: {$before}\n";

PointsService::award(
    $userId,
    $householdId,
    20,
    'manual_adjustment',
    'manual',
    null,
    'Test award'
);

$after = PointsService::balance($userId, $householdId);
echo "Balance after:  {$after}\n";

if ($after === $before + 20) {
    echo "\nPASS: balance increased by 20 (from {$before} to {$after})\n";
    exit(0);
}

echo "\nFAIL: expected " . ($before + 20) . ", got {$after}\n";
exit(1);
