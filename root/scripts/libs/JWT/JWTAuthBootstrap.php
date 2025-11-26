<?php

if (!defined('APP_ROOT')) {
    $appRoot = dirname(__DIR__, 3);
    define('APP_ROOT', $appRoot);
} else {
    $appRoot = APP_ROOT;
}

if (!defined('CLASS_DIR')) {
    define('CLASS_DIR', $appRoot . '/scripts/class');
}

$autoloadPath = $appRoot . '/vendor/autoload.php';
if (is_file($autoloadPath)) {
    require_once $autoloadPath;
}

$jwtLibEnv = getenv('JWT_LIB_PATH');
$jwtCandidates = array_values(array_filter([
    $jwtLibEnv !== false ? trim((string) $jwtLibEnv) : null,
    __DIR__ . '/JWTAuth.php',
    dirname(__DIR__) . '/JWT/JWTAuth.php',
    $appRoot . '/class/JWT/JWTAuth.php',
], static function ($candidate) {
    return is_string($candidate) && $candidate !== '';
}));

$jwtAuthLibraryPath = null;
foreach ($jwtCandidates as $candidate) {
    if (is_file($candidate)) {
        $jwtAuthLibraryPath = $candidate;
        break;
    }
}

if ($jwtAuthLibraryPath === null) {
    throw new RuntimeException('Unable to locate JWT/JWTAuth.php library. Tried: ' . implode(', ', $jwtCandidates));
}

if (!defined('JWT_AUTH_LIBRARY_PATH')) {
    define('JWT_AUTH_LIBRARY_PATH', $jwtAuthLibraryPath);
}

unset($jwtAuthLibraryPath, $jwtCandidates, $jwtLibEnv, $autoloadPath, $appRoot);
