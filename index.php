<?php

require_once 'auth.php';
require_auth();
require_once 'db.php';

$stmt = $pdo->query("
    SELECT *
    FROM records
    ORDER BY created_at DESC
");

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
                <strong><?= count($records) ?></strong>
                <span>Records</span>
            </div>

        </section>


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

                                    </div>

                                </td>

                            </tr>

                        <?php endforeach; ?>

                        </tbody>

                    </table>

                </div>

            </section>

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