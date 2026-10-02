<?php
require __DIR__ . '/../vendor/autoload.php';
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4',
        $_ENV['DB_HOST'], $_ENV['DB_NAME']),
    $_ENV['DB_USER'],
    $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "Seeding demo family...\n";

$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
foreach ([
    'points_transactions', 'reward_redemptions', 'rewards',
    'chore_completions', 'chore_assignments', 'chores',
    'household_members', 'households', 'notifications', 'users'
] as $t) {
    $pdo->exec("TRUNCATE TABLE {$t}");
}
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

$hash = password_hash('password123', PASSWORD_DEFAULT);

$insertUser = $pdo->prepare(
    "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)"
);
$insertUser->execute(['alex@maple.test', $hash, 'Alex Parent']);
$alexId = $pdo->lastInsertId();
$insertUser->execute(['jamie@maple.test', $hash, 'Jamie']);
$jamieId = $pdo->lastInsertId();
$insertUser->execute(['riley@maple.test', $hash, 'Riley']);
$rileyId = $pdo->lastInsertId();

$inviteCode = strtoupper(bin2hex(random_bytes(4)));
$stmt = $pdo->prepare(
    "INSERT INTO households (name, invite_code, created_by) VALUES (?, ?, ?)"
);
$stmt->execute(['The Demo Family', $inviteCode, $alexId]);
$householdId = $pdo->lastInsertId();

$insertMember = $pdo->prepare(
    "INSERT INTO household_members (household_id, user_id, role_in_household)
     VALUES (?, ?, ?)"
);
$insertMember->execute([$householdId, $alexId, 'parent']);
$insertMember->execute([$householdId, $jamieId, 'child']);
$insertMember->execute([$householdId, $rileyId, 'child']);

$chores = [
    ['Wash dishes', 'All dishes and sink clean', 10, 'Kitchen', 'none'],
    ['Take out trash', 'Bins to curb by 8am', 15, 'Kitchen', 'none'],
    ['Vacuum living room', 'Including under couch', 20, 'Living Room', 'none'],
    ['Feed the dog', 'Morning and evening', 5, 'Pets', 'none'],
    ['Fold laundry', 'Put away in your room', 15, 'Laundry', 'none'],
];
$insertChore = $pdo->prepare(
    "INSERT INTO chores
     (household_id, title, description, points, category, recurrence, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)"
);
$choreIds = [];
foreach ($chores as $c) {
    $insertChore->execute([$householdId, ...$c, $alexId]);
    $choreIds[] = $pdo->lastInsertId();
}

$insertAssignment = $pdo->prepare(
    "INSERT INTO chore_assignments
     (chore_id, assigned_to, assigned_by, due_date, status)
     VALUES (?, ?, ?, ?, 'pending')"
);
$insertAssignment->execute([$choreIds[0], $jamieId, $alexId, date('Y-m-d')]);
$insertAssignment->execute([$choreIds[1], $rileyId, $alexId, date('Y-m-d')]);
$insertAssignment->execute([$choreIds[2], $jamieId, $alexId, date('Y-m-d', strtotime('+2 days'))]);
$insertAssignment->execute([$choreIds[3], $rileyId, $alexId, date('Y-m-d')]);

$rewards = [
    ['30 min extra screen time', 50],
    ['Pick the movie', 75],
    ['Skip one chore', 100],
    ['Choose dinner menu', 150],
    ['Small toy / treat', 500],
];
$insertReward = $pdo->prepare(
    "INSERT INTO rewards (household_id, title, cost_points, created_by)
     VALUES (?, ?, ?, ?)"
);
foreach ($rewards as [$title, $cost]) {
    $insertReward->execute([$householdId, $title, $cost, $alexId]);
}

$insertTx = $pdo->prepare(
    "INSERT INTO points_transactions
     (user_id, household_id, delta, reason, reference_type, note)
     VALUES (?, ?, ?, ?, ?, ?)"
);
$insertTx->execute([$jamieId, $householdId, 45, 'bonus', 'manual', 'Opening balance']);
$insertTx->execute([$rileyId, $householdId, 20, 'bonus', 'manual', 'Opening balance']);

echo "\nSeeded successfully.\n";
echo "Household: The Demo Family\n";
echo "Invite code: {$inviteCode}\n";
echo "  alex@maple.test  / password123  (parent)\n";
echo "  jamie@maple.test / password123  (child, 45 pts)\n";
echo "  riley@maple.test / password123  (child, 20 pts)\n";
