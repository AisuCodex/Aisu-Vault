<?php

require_once 'db.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $content = trim($_POST['content'] ?? '');

    if ($title === '') {
        $errors[] = 'Title is required.';
    }

    $hasFile = isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE;

    if ($content === '' && !$hasFile) {
        $errors[] = 'You must provide either text content or upload a file.';
    }

    $fileName = null;
    $filePath = null;

    if ($hasFile) {
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
            INSERT INTO records
            (title, description, content, file_name, file_path)
            VALUES (?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $title,
            $description,
            $content,
            $fileName,
            $filePath
        ]);

        header('Location: index.php?success=' . urlencode('Record created successfully.'));
        exit;
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Record - RTL Web</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="app">
    <header class="topbar">
        <div class="brand">
            <div class="brand-mark">S</div>
            <div>
                <h1>RTL Web</h1>
                <p>Create a new record.</p>
            </div>
        </div>
        <a href="index.php" class="button button-secondary">← Back</a>
    </header>

    <main class="form-page">
        <section class="form-header">
            <span class="eyebrow">New Record</span>
            <h2>Add a Record</h2>
            <p>Add information, text content, and optionally attach a file.</p>
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
                <input type="text" id="title" name="title" placeholder="Enter a title" value="<?= htmlspecialchars($_POST['title'] ?? '') ?>" required>
                <span class="field-hint">Give this record a short descriptive name.</span>
            </div>

            <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description" name="description" rows="3" placeholder="Add a short description..."><?= htmlspecialchars($_POST['description'] ?? '') ?></textarea>
            </div>

            <div class="form-group">
                <label for="content">Text Content</label>
                <textarea id="content" name="content" rows="10" placeholder="Type or paste your main text content here..."><?= htmlspecialchars($_POST['content'] ?? '') ?></textarea>
                <span class="field-hint">You can provide text content instead of, or alongside, an uploaded file.</span>
            </div>

            <div class="form-group">
                <label>Attachment</label>
                <div class="upload-area" id="uploadArea" tabindex="0" role="button" aria-label="Choose a file">
                    <input type="file" name="file" id="fileInput" hidden>
                    <div class="upload-icon">↑</div>
                    <div class="upload-title">Choose a file or drag it here</div>
                    <div class="upload-description">Maximum file size: 25 MB. Executables are blocked.</div>
                    <button type="button" class="upload-button" id="browseButton">Browse files</button>
                    <div class="selected-file" id="selectedFile" hidden></div>
                </div>
            </div>

            <div class="form-actions">
                <a href="index.php" class="button button-secondary">Cancel</a>
                <button type="submit" class="button button-primary">Save Record</button>
            </div>
        </form>
    </main>
    <footer>
        <p>RTL Web &copy; <?= date('Y') ?></p>
    </footer>
</div>
<script src="script.js"></script>
</body>
</html>