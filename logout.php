<?php
require_once 'auth.php'; start_auth_session(); $_SESSION=[]; session_destroy(); header('Location: login.php'); exit;
