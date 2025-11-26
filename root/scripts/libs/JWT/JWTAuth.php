<?php
declare(strict_types=1);

final class JWTAuth
{
    private const AUD        = 'rin-aqua';
    private const TTL_SEC    = 86400;
    private const LEEWAY_SEC = 60;

    private static ?string $configuredIssuer  = null;
    private static ?string $configuredSiteId  = null;
    private static ?string $configuredKeyPath = null;
    private static ?string $configuredArchive = null;

    private static ?string $activeSecret = null;
    private static ?string $activeKid    = null;

    /**
     * @param array{issuer?:string,data_base_path?:string} $options
     */
    public static function configureSite(string $siteId, array $options = []): void
    {
        $siteId = trim($siteId);
        if ($siteId === '') {
            throw new InvalidArgumentException('siteId must be a non-empty string');
        }

        $issuer = null;
        if (isset($options['issuer'])) {
            $issuerCandidate = trim((string)$options['issuer']);
            if ($issuerCandidate !== '') {
                $issuer = $issuerCandidate;
            }
        }
        if ($issuer === null) {
            $issuer = $siteId;
        }

        $dataBasePath = self::getDefaultDataBasePath();
        if (isset($options['data_base_path'])) {
            $candidate = trim(str_replace('\\', '/', (string)$options['data_base_path']));
            if ($candidate !== '') {
                $dataBasePath = $candidate;
            }
        }
        $dataBasePath = rtrim($dataBasePath, '/');

        $keyDir = self::determineKeyDirectory($dataBasePath, $siteId);

        self::$configuredIssuer  = $issuer;
        self::$configuredSiteId  = $siteId;
        self::$configuredKeyPath = $keyDir . '/secret.key';
        self::$configuredArchive = $keyDir . '/archive';

        self::$activeSecret = null;
        self::$activeKid    = null;
    }

    private static function determineKeyDirectory(string $dataBasePath, string $siteId): string
    {
        $normalizedBase = rtrim(str_replace('\\', '/', $dataBasePath), '/');
        if ($normalizedBase === '') {
            $normalizedBase = self::getDefaultDataBasePath();
        }

        $siteId = trim($siteId, '/');

        if (strpos($normalizedBase, '{siteId}') !== false) {
            $siteRoot = str_replace('{siteId}', $siteId, $normalizedBase);
        } elseif (preg_match('~/' . preg_quote($siteId, '~') . '(?:/|$)~', $normalizedBase)) {
            $siteRoot = $normalizedBase;
        } else {
            $siteRoot = $normalizedBase . '/' . $siteId;
        }

        $siteRoot = rtrim($siteRoot, '/');

        $legacyKeyDir = $siteRoot . '/jwt';
        $newStructureKeyDir = $siteRoot;
        if (!preg_match('~/data(?:/|$)~', $siteRoot)) {
            $newStructureKeyDir = $siteRoot . '/data';
        }
        $newStructureKeyDir = rtrim($newStructureKeyDir, '/') . '/jwt';

        if (!self::pathLikelyExists($newStructureKeyDir)) {
            $message = sprintf(
                'JWT key directory missing at %s (legacy location %s is no longer supported). '
                . 'Provision the /data/jwt structure before configuring JWTAuth.',
                $newStructureKeyDir,
                $legacyKeyDir
            );
            throw new RuntimeException($message);
        }

        return $newStructureKeyDir;
    }

    private static function getDefaultDataBasePath(): string
    {
        self::ensureBaseLoaded();	
        return Base::getDataBasePath();
    }

    private static function ensureBaseLoaded(): void
    {
        if (class_exists('Base', false)) {
            return;
        }

        $basePath = defined('CLASS_DIR')
            ? CLASS_DIR . '/class.Base.php'
            : dirname(__DIR__) . '/class.Base.php';

        if (!is_file($basePath)) {
            throw new RuntimeException('Unable to locate Base class at ' . $basePath);
        }

        require_once $basePath;
    }

    private static function pathLikelyExists(string $path): bool
    {
        return @is_dir($path) || @is_file($path);
    }

    public static function issue(array $claims, ?int $ttl = null): string
    {
        $ttl = $ttl ?? self::TTL_SEC;
        if ($ttl <= 0) {
            $ttl = self::TTL_SEC;
        }

        $now = time();
        $payload = $claims + [
            'iss' => self::issuer(),
            'aud' => self::AUD,
            'iat' => $now,
            'nbf' => $now - self::LEEWAY_SEC,
            'exp' => $now + $ttl,
            'jti' => bin2hex(random_bytes(16)),
        ];

        $header = [
            'alg' => 'HS256',
            'typ' => 'JWT',
            'kid' => self::activeKid(),
        ];

        $headerJson  = json_encode($header, JSON_UNESCAPED_SLASHES);
        $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if ($headerJson === false || $payloadJson === false) {
            throw new RuntimeException('Failed to encode JWT payload.');
        }

        $hB64 = self::b64e($headerJson);
        $pB64 = self::b64e($payloadJson);
        $sig  = hash_hmac('sha256', $hB64 . '.' . $pB64, self::activeSecret(), true);

        return $hB64 . '.' . $pB64 . '.' . self::b64e($sig);
    }

    public static function verify(string $jwt)
    {
        $result = self::verifyDetailed($jwt);

        return $result['ok'] ? $result['payload'] : false;
    }

    public static function fromHttpRequest(): ?array
    {
        $evaluation = self::evaluateRequestToken();

        return $evaluation['ok'] ? $evaluation['payload'] : null;
    }

    public static function requireFromHttpRequest(): array
    {
        $evaluation = self::evaluateRequestToken();
        if ($evaluation['ok']) {
            return $evaluation['payload'];
        }

        self::respondUnauthorized($evaluation);
    }

    public static function evaluateRequestToken(): array
    {
        if (isset($_SERVER['__auth_jwt_evaluation']) && is_array($_SERVER['__auth_jwt_evaluation'])) {
            return $_SERVER['__auth_jwt_evaluation'];
        }

        $result = [
            'ok'      => false,
            'payload' => null,
            'reason'  => 'no_token',
            'source'  => 'none',
        ];

        $header     = self::authHeader();
        $headerTrim = is_string($header) ? trim($header) : '';
        $hasHeader  = $headerTrim !== '';

        if ($hasHeader) {
            $result['source'] = 'header';
            if (stripos($headerTrim, 'Bearer ') === 0) {
                $candidate = trim(substr($headerTrim, 7));
                if ($candidate !== '') {
                    $result['token'] = $candidate;
                    $result['reason'] = null;
                } else {
                    $result['reason'] = 'empty_bearer_token';
                }
            } else {
                $result['reason'] = 'unsupported_auth_scheme';
            }
        }

        if (empty($result['token'])) {
            $cookieToken = self::extractJwtFromCookies($result);
            if ($cookieToken !== null) {
                $result['token'] = $cookieToken;
                $result['source'] = 'cookie';
                $result['reason'] = null;
            }
        }

        if (empty($result['token'])) {
            $bodyToken = self::extractJwtFromRequestBody();
            if ($bodyToken !== null) {
                $result['token'] = $bodyToken;
                $result['source'] = 'body';
                $result['reason'] = null;
            }
        }

        if (empty($result['token'])) {
            $_SERVER['__auth_jwt_evaluation'] = self::storeEvaluation($result);
            return $_SERVER['__auth_jwt_evaluation'];
        }

        $verification = self::verifyDetailed($result['token']);
        $result['ok']      = $verification['ok'];
        $result['payload'] = $verification['payload'];
        $result['reason']  = $verification['reason'];

        if (isset($verification['token_length'])) {
            $result['token_length'] = $verification['token_length'];
        }
        if (isset($verification['token_preview'])) {
            $result['token_preview'] = $verification['token_preview'];
        }

        $_SERVER['__auth_jwt_evaluation'] = self::storeEvaluation($result);

        return $_SERVER['__auth_jwt_evaluation'];
    }

    private static function respondUnauthorized(array $evaluation): void
    {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');

        $payload = [
            'status' => 'ERROR',
            'error'  => 'unauthorized',
        ];

        if (!empty($evaluation['reason'])) {
            $payload['reason'] = $evaluation['reason'];
        }
        if (!empty($evaluation['source'])) {
            $payload['source'] = $evaluation['source'];
        }

        echo json_encode($payload);
        exit;
    }

    private static function storeEvaluation(array $result): array
    {
        $_SERVER['__auth_jwt_valid']   = $result['ok'];
        $_SERVER['__auth_jwt_payload'] = $result['ok'] ? ($result['payload'] ?? null) : null;
        $_SERVER['__auth_jwt_source']  = $result['source'] ?? 'none';
        $_SERVER['__auth_jwt_reason']  = $result['ok'] ? null : ($result['reason'] ?? null);

        if (isset($result['token']) && is_string($result['token'])) {
            $_SERVER['__auth_jwt_token_preview'] = self::previewToken($result['token']);
            $_SERVER['__auth_jwt_token_length']  = strlen($result['token']);
            unset($result['token']);
        } elseif (isset($result['token_preview'])) {
            $_SERVER['__auth_jwt_token_preview'] = $result['token_preview'];
            $_SERVER['__auth_jwt_token_length']  = $result['token_length'] ?? null;
        } else {
            $_SERVER['__auth_jwt_token_preview'] = null;
            $_SERVER['__auth_jwt_token_length']  = null;
        }

        return $result;
    }

    private static function previewToken(string $token): string
    {
        $length = strlen($token);
        if ($length <= 10) {
            return substr($token, 0, max(1, $length - 3)) . '...';
        }

        return substr($token, 0, 6) . '...' . substr($token, -6);
    }

    private static function verifyDetailed(string $jwt): array
    {
        $result = [
            'ok'            => false,
            'payload'       => null,
            'reason'        => 'invalid',
            'token_length'  => strlen($jwt),
            'token_preview' => self::previewToken($jwt),
        ];

        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            $result['reason'] = 'malformed';
            return $result;
        }
        [$hB64, $pB64, $sB64] = $parts;

        $rawSig    = self::b64d($sB64);
        $headerRaw = self::b64d($hB64);
        $payloadRaw = self::b64d($pB64);
        if ($rawSig === false) {
            $result['reason'] = 'malformed_signature';
            return $result;
        }
        if ($headerRaw === false) {
            $result['reason'] = 'malformed_header';
            return $result;
        }
        if ($payloadRaw === false) {
            $result['reason'] = 'malformed_payload';
            return $result;
        }

        $header = json_decode($headerRaw, true);
        if (!is_array($header)) {
            $result['reason'] = 'malformed_header';
            return $result;
        }

        $expected = hash_hmac('sha256', $hB64 . '.' . $pB64, self::activeSecret(), true);
        if (!hash_equals($expected, $rawSig)) {
            $kid = $header['kid'] ?? null;
            if (!is_string($kid) || !preg_match('/^[0-9a-f]{16}$/i', $kid)) {
                $result['reason'] = 'signature_mismatch';
                return $result;
            }
            $archivePath = self::archiveDir() . '/' . $kid . '.key';
            if (!is_file($archivePath)) {
                $result['reason'] = 'signature_mismatch';
                return $result;
            }
            $archiveSecret = @file_get_contents($archivePath);
            if ($archiveSecret === false || $archiveSecret === '') {
                $result['reason'] = 'signature_mismatch';
                return $result;
            }
            $expected = hash_hmac('sha256', $hB64 . '.' . $pB64, $archiveSecret, true);
            if (!hash_equals($expected, $rawSig)) {
                $result['reason'] = 'signature_mismatch';
                return $result;
            }
        }

        if (($header['alg'] ?? null) !== 'HS256') {
            $result['reason'] = 'unsupported_alg';
            return $result;
        }

        $payload = json_decode($payloadRaw, true);
        if (!is_array($payload)) {
            $result['reason'] = 'malformed_payload';
            return $result;
        }

        foreach (['iat', 'nbf', 'exp'] as $claim) {
            if (!array_key_exists($claim, $payload) || !is_numeric($payload[$claim])) {
                $result['reason'] = 'claims_missing';
                return $result;
            }
        }

        $now    = time();
        $leeway = self::LEEWAY_SEC;

        $iat = (int)$payload['iat'];
        $nbf = (int)$payload['nbf'];
        $exp = (int)$payload['exp'];

        if ($nbf > $now + $leeway) {
            $result['reason'] = 'nbf_in_future';
            return $result;
        }
        if ($iat > $now + $leeway) {
            $result['reason'] = 'iat_in_future';
            return $result;
        }
        if ($exp < $now - $leeway) {
            $result['reason'] = 'expired';
            return $result;
        }
        if ($nbf > $exp + $leeway) {
            $result['reason'] = 'invalid_window';
            return $result;
        }
        if (($payload['iss'] ?? null) !== self::issuer()) {
            $result['reason'] = 'iss_mismatch';
            return $result;
        }
        if (($payload['aud'] ?? null) !== self::AUD) {
            $result['reason'] = 'aud_mismatch';
            return $result;
        }

        $result['ok']      = true;
        $result['payload'] = $payload;
        $result['reason']  = null;

        return $result;
    }

    private static function extractJwtFromCookies(array $currentResult): ?string
    {
        $candidates = [
            'auth-token',
            'Authorization',
            'authorization',
            'auth_token',
            'authToken',
            'jwt',
            'JWT',
            'token',
            'access_token',
        ];

        foreach ($candidates as $cookieName) {
            if (!isset($_COOKIE[$cookieName])) {
                continue;
            }
            $value = trim((string)$_COOKIE[$cookieName]);
            if ($value === '' || !self::looksLikeJwt($value)) {
                continue;
            }

            return $value;
        }

        foreach ($_COOKIE as $cookieValue) {
            $value = trim((string)$cookieValue);
            if ($value === '' || !self::looksLikeJwt($value)) {
                continue;
            }

            return $value;
        }

        if (!empty($currentResult['source']) && $currentResult['source'] === 'cookie') {
            return null;
        }

        if (!empty($_SERVER['HTTP_COOKIE']) && is_string($_SERVER['HTTP_COOKIE'])) {
            foreach (explode(';', $_SERVER['HTTP_COOKIE']) as $pair) {
                $value = trim(strstr($pair, '=') !== false ? substr($pair, strpos($pair, '=') + 1) : '');
                if ($value === '' || !self::looksLikeJwt($value)) {
                    continue;
                }

                return $value;
            }
        }

        return null;
    }

    private static function extractJwtFromRequestBody(): ?string
    {
        $fields = [
            'jwt',
            'token',
            'authToken',
            'authorization',
        ];

        foreach ($fields as $field) {
            if (!isset($_REQUEST[$field])) {
                continue;
            }
            $value = trim((string)$_REQUEST[$field]);
            if ($value === '' || !self::looksLikeJwt($value)) {
                continue;
            }

            return $value;
        }

        return null;
    }

    private static function looksLikeJwt($value): bool
    {
        if (!is_string($value) || $value === '') {
            return false;
        }

        return preg_match('/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/', $value) === 1;
    }

    private static function activeSecret(): string
    {
        if (self::$activeSecret !== null) {
            return self::$activeSecret;
        }

        $key = @file_get_contents(self::keyPath());
        if ($key === false || $key === '') {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['status' => 'NG', 'error' => 'Server key missing']);
            exit;
        }

        self::$activeSecret = $key;
        self::$activeKid    = substr(hash('sha256', $key, false), 0, 16);

        return self::$activeSecret;
    }

    private static function activeKid(): string
    {
        self::activeSecret();
        return self::$activeKid ?? '';
    }

    private static function issuer(): string
    {
        self::ensureConfigured();

        return self::$configuredIssuer ?? '';
    }

    private static function keyPath(): string
    {
        self::ensureConfigured();

        return self::$configuredKeyPath ?? '';
    }

    private static function archiveDir(): string
    {
        self::ensureConfigured();

        return self::$configuredArchive ?? '';
    }

    private static function ensureConfigured(): void
    {
        if (self::$configuredKeyPath !== null && self::$configuredIssuer !== null) {
            return;
        }

        throw new RuntimeException('JWTAuth has not been configured with a siteId.');
    }

    private static function authHeader(): ?string
    {
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return $_SERVER['HTTP_AUTHORIZATION'];
        }

        if (function_exists('apache_request_headers')) {
            foreach (apache_request_headers() as $name => $value) {
                if (strcasecmp($name, 'Authorization') === 0) {
                    return $value;
                }
            }
        }

        return null;
    }

    private static function b64e(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function b64d(string $value)
    {
        $mod = strlen($value) % 4;
        if ($mod !== 0) {
            $value .= str_repeat('=', 4 - $mod);
        }

        return base64_decode(strtr($value, '-_', '+/'), true);
    }
}
