<?php
function start_auth_session(): void { if (session_status() !== PHP_SESSION_ACTIVE) session_start(); }
function require_auth(): void { start_auth_session(); if (empty($_SESSION['user_id'])) { header('Location: login.php'); exit; } }
function current_user(): ?array { start_auth_session(); return $_SESSION['user'] ?? null; }
function require_admin(): void { require_auth(); if ((current_user()['role'] ?? 'user') !== 'admin') { http_response_code(403); exit('Administrator access required.'); } }
function csrf_token(): string { start_auth_session(); return $_SESSION['csrf'] ??= bin2hex(random_bytes(32)); }
function verify_csrf(?string $token): void { if (!hash_equals(csrf_token(), $token ?? '')) { http_response_code(419); exit('Invalid request token.'); } }
