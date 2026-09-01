<?php

require_once 'auth.php'; require_auth(); require_once 'db.php';

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

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $content = trim($_POST['content'] ?? '');

    if ($title === '') {
        $errors[] = 'Title is required.';
    }

    $fileName = $record['file_name'];
    $filePath = $record['file_path'];

    $hasNewFile = isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE;
    $hasExistingFile = !empty($filePath);

    if ($content === '' && !$hasNewFile && !$hasExistingFile) {
        $errors[] = 'You must provide either text content or upload a file.';
    }

    if ($hasNewFile) {
        if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $errors[] = 'There was a problem uploading the file.';
        } else {
            $originalName = $_FILES['file']['name'];
            $temporaryFile = $_FILES['file']['tmp_name'];
            $fileSize = $_FILES['file']['size'];

            $maxSize = 25 * 1024 * 1024; // 25 MB

            if ($fileSize > $maxSize) {
                $errors[] = 'File size must be less than 25 MB.';
            } else {
                $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

                $blockedExtensions = [
                    'php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'cgi',
                    'exe', 'bat', 'cmd', 'com', 'msi', 'sh'
                ];

                if (in_array($extension, $blockedExtensions, true)) {
                    $errors[] = 'This file type is not allowed for security reasons.';
                } else {
                    $safeFileName = bin2hex(random_bytes(16)) . '.' . $extension;
                    $uploadDirectory = __DIR__ . '/uploads/';

                    if (!is_dir($uploadDirectory)) {
                        mkdir($uploadDirectory, 0755, true);
                    }

                    $destination = $uploadDirectory . $safeFileName;

                    if (move_uploaded_file($temporaryFile, $destination)) {
                        if (!empty($record['file_path']) && file_exists(__DIR__ . '/' . $record['file_path'])) {
                            unlink(__DIR__ . '/' . $record['file_path']);
                        }
                        $fileName = $originalName;
                        $filePath = 'uploads/' . $safeFileName;
                    } else {
                        $errors[] = 'Unable to save the uploaded file.';
                    }
                }
            }
        }
    }

    if (empty($errors)) {
        $stmt = $pdo->prepare("
            UPDATE records
            SET
                title = ?,
                description = ?,
                content = ?,
                file_name = ?,
                file_path = ?
            WHERE id = ?
        ");

        $stmt->execute([
            $title,
            $description,
            $content,
            $fileName,
            $filePath,
            $id
        ]);

        header('Location: index.php?success=' . urlencode('Record updated successfully.'));
        exit;
    }

    $record['title'] = $title;
    $record['description'] = $description;
    $record['content'] = $content;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Record - Aisu Vault</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="app">
    <header class="topbar">
        <div class="brand">
            <div class="brand-mark">S</div>
            <div>
                <h1>Aisu Vault</h1>
                <p>Edit your record.</p>
            </div>
        </div>
        <a href="index.php" class="button button-secondary">← Back</a>
    </header>

    <main class="form-page">
        <section class="form-header">
            <span class="eyebrow">Record #<?= htmlspecialchars($record['id']) ?></span>
            <h2>Edit Record</h2>
            <p>Update the information below.</p>
        </section>

        <?php if (!empty($errors)): ?>
            <div class="alert alert-error">
                <strong>Please fix the following:</strong>
                <ul>
                    <?php foreach ($errors as $error): ?>
                        <li><?= htmlspecialchars($error) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <form method="POST" enctype="multipart/form-data" class="form-card" id="recordForm">
            <div class="form-group">
                <label for="title">Title</label>
                <input type="text" id="title" name="title" value="<?= htmlspecialchars($record['title']) ?>" required>
            </div>

            <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description" name="description" rows="3"><?= htmlspecialchars($record['description'] ?? '') ?></textarea>
            </div>
            
            <div class="form-group">
                <label for="content">Text Content</label>
                <textarea id="content" name="content" rows="10" placeholder="Type or paste your main text content here..."><?= htmlspecialchars($record['content'] ?? '') ?></textarea>
            </div>

            <?php if (!empty($record['file_name'])): ?>
                <div class="current-file">
                    <div class="current-file-icon">↗</div>
                    <div class="current-file-info">
                        <span>Current file</span>
                        <a href="<?= htmlspecialchars($record['file_path']) ?>" target="_blank"><?= htmlspecialchars($record['file_name']) ?></a>
                    </div>
                </div>
            <?php endif; ?>

            <div class="form-group">
                <label>Replace Attachment</label>
                <div class="upload-area" id="uploadArea" tabindex="0" role="button" aria-label="Choose a replacement file">
                    <input type="file" name="file" id="fileInput" hidden>
                    <div class="upload-icon">↑</div>
                    <div class="upload-title">Choose a file or drag it here</div>
                    <div class="upload-description">Leave empty to keep current file (Max: 25MB)</div>
                    <button type="button" class="upload-button" id="browseButton">Browse files</button>
                    <div class="selected-file" id="selectedFile" hidden></div>
                </div>
            </div>

            <div class="form-actions">
                <a href="index.php" class="button button-secondary">Cancel</a>
                <button type="submit" class="button button-primary">Update Record</button>
            </div>
        </form>
    </main>
    <footer>
        <p>Aisu Vault &copy; <?= date('Y') ?></p>
    </footer>
</div>
<script src="script.js"></script>
</body>
</html>