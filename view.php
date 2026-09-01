<?php
require_once 'db.php';

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$id) {
    header('Location: index.php');
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM records WHERE id = ?");
$stmt->execute([$id]);
$record = $stmt->fetch();

if (!$record) {
    header('Location: index.php');
    exit;
}

function e($value) {
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($record['title']) ?> - RTL Web</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="app">
    <header class="topbar">
        <div class="brand">
            <div class="brand-mark">S</div>
            <div>
                <h1>RTL Web</h1>
                <p>View record details.</p>
            </div>
        </div>
        <div style="display: flex; gap: 8px;">
            <a href="index.php" class="button button-secondary">← Back</a>
            <a href="edit.php?id=<?= e($record['id']) ?>" class="button button-primary">Edit Record</a>
        </div>
    </header>

    <main class="form-page">
        <section class="form-header">
            <span class="eyebrow">Record #<?= e($record['id']) ?></span>
            <h2><?= e($record['title']) ?></h2>
            <p style="margin-top: 8px; color: var(--text-muted); font-size: 14px;">
                Created <?= date('M j, Y', strtotime($record['created_at'])) ?>
                <?php if (!empty($record['updated_at'])): ?>
                    <span style="opacity: 0.7;">· Updated <?= date('M j, Y', strtotime($record['updated_at'])) ?></span>
                <?php endif; ?>
            </p>
        </section>

        <div class="form-card" style="margin-top: 24px; display: flex; flex-direction: column; gap: 24px;">
            <?php if (!empty($record['description'])): ?>
            <div class="view-section">
                <h3 style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Description</h3>
                <div style="font-size: 15px; line-height: 1.5; color: var(--text);">
                    <?= e($record['description']) ?>
                </div>
            </div>
            <?php endif; ?>

            <?php if (!empty($record['content'])): ?>
            <div class="view-section">
                <h3 style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Content</h3>
                <div style="font-size: 15px; line-height: 1.6; color: var(--text); white-space: pre-wrap; background: var(--bg-body); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
<?= e($record['content']) ?>
                </div>
            </div>
            <?php endif; ?>

            <div class="view-section">
                <h3 style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Attachment</h3>
                <?php if (!empty($record['file_name'])): ?>
                <a href="<?= e($record['file_path']) ?>" target="_blank" class="file-link" style="display: inline-flex; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: #fff; text-decoration: none; color: var(--text); align-items: center; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <span class="file-icon">↗</span>
                    <span style="font-weight: 500; font-size: 14px;"><?= e($record['file_name']) ?></span>
                </a>
                <div style="margin-top: 12px;">
                    <a href="<?= e($record['file_path']) ?>" target="_blank" class="button button-secondary" style="font-size: 13px; padding: 6px 12px;">Open File</a>
                </div>
                <?php else: ?>
                 <span class="muted" style="font-size: 14px; display: block; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-body);">No attached file.</span>
                <?php endif; ?>
            </div>
        </div>
    </main>
    <footer>
        <p>RTL Web &copy; <?= date('Y') ?></p>
    </footer>
</div>
</body>
</html>
