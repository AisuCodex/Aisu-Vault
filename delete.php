<?php

require_once 'auth.php'; require_admin(); require_once 'db.php';

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$id) {
    header('Location: index.php');
    exit;
}

$stmt = $pdo->prepare("SELECT file_path FROM records WHERE id = ?");
$stmt->execute([$id]);
$record = $stmt->fetch();

if ($record) {
    if (!empty($record['file_path'])) {
        $fullPath = __DIR__ . '/' . $record['file_path'];
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
    }

    $deleteStmt = $pdo->prepare("DELETE FROM records WHERE id = ?");
    $deleteStmt->execute([$id]);

    header('Location: index.php?success=' . urlencode('Record deleted successfully.'));
    exit;
}

header('Location: index.php');
exit;