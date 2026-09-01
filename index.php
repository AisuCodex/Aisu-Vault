<?php

require_once 'auth.php';
require_auth();
require_once 'db.php';

$isAdmin = (current_user()['role'] ?? 'user') === 'admin';
$query = trim($_GET['q'] ?? '');
$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = 10;
$where = $query === '' ? '' : ' WHERE title LIKE :query OR description LIKE :query OR file_name LIKE :query';
$params = $query === '' ? [] : [':query' => "%{$query}%"];
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM records{$where}");
$countStmt->execute($params);
$totalRecords = (int)$countStmt->fetchColumn();
$totalPages = max(1, (int)ceil($totalRecords / $perPage));
$page = min($page, $totalPages);
$stmt = $pdo->prepare("SELECT * FROM records{$where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
foreach ($params as $key => $value) { $stmt->bindValue($key, $value, PDO::PARAM_STR); }
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$stmt->bindValue(':offset', ($page - 1) * $perPage, PDO::PARAM_INT);
$stmt->execute();
$records = $stmt->fetchAll();

function e($value)
{
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Aisu Vault</title>

    <link rel="stylesheet" href="style.css">
</head>

<body>

<div class="app">

    <header class="topbar">

        <div class="brand">
            <div class="brand-mark">S</div>

            <div>
                <h1>Aisu Vault</h1>
                <p>Manage your records and files.</p>
            </div>
        </div>

        <a href="create.php" class="button button-primary">
            <span class="button-icon">+</span>
            Add Record
        </a>
        <?php if ($isAdmin): ?>
        <a href="admin.php" class="button button-secondary">Admin Panel</a>
        <?php endif; ?>
        <a href="logout.php" class="button button-secondary">Log out</a>

    </header>


    <main>

        <section class="page-heading">

            <div>
                <span class="eyebrow">Dashboard</span>

                <h2>Your Records</h2>

                <p>
                    View, manage, and organize your uploaded records.
                </p>
            </div>

            <div class="record-count">
                <strong><?= $totalRecords ?></strong>
                <span>Records</span>
            </div>

        </section>

        <form method="get" class="search-form">
            <input type="search" name="q" value="<?= e($query) ?>" placeholder="Search records, descriptions, or files..." aria-label="Search records">
            <button class="button button-primary" type="submit">Search</button>
            <?php if ($query !== ''): ?><a href="index.php" class="button button-secondary">Clear</a><?php endif; ?>
        </form>

        <?php if (isset($_GET['success'])): ?>

            <div class="alert alert-success">
                <?= e($_GET['success']) ?>
            </div>

        <?php endif; ?>


        <?php if (empty($records)): ?>

            <section class="empty-state">

                <div class="empty-icon">
                    +
                </div>

                <h3>No records yet</h3>

                <p>
                    Create your first record to get started.
                </p>

                <a href="create.php" class="button button-primary">
                    Add your first record
                </a>

            </section>

        <?php else: ?>

            <section class="records-card">

                <div class="table-wrapper">

                    <table>

                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Record</th>
                                <th>Description</th>
                                <th>File</th>
                                <th>Date Created</th>
                                <th class="actions-column">Actions</th>
                            </tr>
                        </thead>

                        <tbody>

                        <?php foreach ($records as $record): ?>

                            <tr>

                                <td>
                                    <span class="record-id">
                                        #<?= e($record['id']) ?>
                                    </span>
                                </td>


                                <td>

                                    <div class="record-title" style="display: flex; flex-direction: column; align-items: flex-start;">
                                        <a href="view.php?id=<?= e($record['id']) ?>" style="color: inherit; text-decoration: none;">
                                            <?= e($record['title']) ?>
                                        </a>
                                        <?php if (!empty($record['content'])): ?>
                                            <div style="font-size: 11px; color: var(--text-muted); font-weight: 500; display: inline-flex; align-items: center; border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px; margin-top: 6px; background: #fff;">
                                                <span style="margin-right: 4px;">📝</span> Text Available
                                            </div>
                                        <?php endif; ?>
                                    </div>

                                </td>


                                <td>

                                    <div class="description-cell">
                                        <?= e($record['description']) ?: 'No description' ?>
                                    </div>

                                </td>


                                <td>

                                    <?php if (!empty($record['file_name'])): ?>

                                        <a
                                            href="<?= e($record['file_path']) ?>"
                                            target="_blank"
                                            class="file-link"
                                        >

                                            <span class="file-icon">
                                                ↗
                                            </span>

                                            <span>
                                                <?= e($record['file_name']) ?>
                                            </span>

                                        </a>

                                    <?php else: ?>

                                        <span class="muted">
                                            No file
                                        </span>

                                    <?php endif; ?>

                                </td>


                                <td>

                                    <span class="date-text">
                                        <?= date('M d, Y', strtotime($record['created_at'])) ?>
                                    </span>

                                </td>


                                <td>

                                    <div class="actions">

                                        <a
                                            href="view.php?id=<?= e($record['id']) ?>"
                                            class="icon-button"
                                            title="View record"
                                            aria-label="View record"
                                        >
                                            👁
                                        </a>

                                        <a
                                            href="edit.php?id=<?= e($record['id']) ?>"
                                            class="icon-button"
                                            title="Edit record"
                                            aria-label="Edit record"
                                        >
                                            ✎
                                        </a>


                                        <?php if ($isAdmin): ?>
                                        <button
                                            type="button"
                                            class="icon-button danger delete-button"
                                            title="Delete record"
                                            aria-label="Delete record"
                                            data-id="<?= e($record['id']) ?>"
                                            data-title="<?= e($record['title']) ?>"
                                        >
                                            ×
                                        </button>
                                        <?php endif; ?>

                                    </div>

                                </td>

                            </tr>

                        <?php endforeach; ?>

                        </tbody>

                    </table>

                </div>

            </section>

            <?php if ($totalPages > 1): ?>
                <nav class="pagination" aria-label="Record pages">
                    <?php if ($page > 1): ?><a href="?<?= http_build_query(['q'=>$query,'page'=>$page-1]) ?>" class="button button-secondary">Previous</a><?php endif; ?>
                    <span>Page <?= $page ?> of <?= $totalPages ?></span>
                    <?php if ($page < $totalPages): ?><a href="?<?= http_build_query(['q'=>$query,'page'=>$page+1]) ?>" class="button button-secondary">Next</a><?php endif; ?>
                </nav>
            <?php endif; ?>

        <?php endif; ?>

    </main>


    <footer>
        <p>Aisu Vault &copy; <?= date('Y') ?></p>
    </footer>

</div>


<!-- Delete Modal -->

<div
    class="modal"
    id="deleteModal"
    aria-hidden="true"
    role="dialog"
    aria-modal="true"
    aria-labelledby="deleteModalTitle"
>

    <div class="modal-backdrop"></div>

    <div class="modal-content">

        <div class="modal-icon danger">
            !
        </div>

        <h3 id="deleteModalTitle">
            Delete record?
        </h3>

        <p>
            Are you sure you want to delete
            <strong id="deleteRecordName"></strong>?
            This action cannot be undone.
        </p>

        <div class="modal-actions">

            <button
                type="button"
                class="button button-secondary"
                id="cancelDelete"
            >
                Cancel
            </button>

            <a
                href="#"
                class="button button-danger"
                id="confirmDelete"
            >
                Delete
            </a>

        </div>

    </div>

</div>


<script src="script.js"></script>

</body>
</html>