<?php

require_once __DIR__ . '/JWTAuthBootstrap.php';
require_once JWT_AUTH_LIBRARY_PATH;

class JWTAuthService
{
    private static $debugPayloadCache = false;
    private static ?string $siteId = null;

    private static function ensureLibraryLoaded(): void
    {
        if (!class_exists('JWTAuth')) {
            require_once JWT_AUTH_LIBRARY_PATH;
        }
    }

    /**
     * @param array{issuer?:string,data_base_path?:string} $options
     */
    public static function configureSite(string $siteId, array $options = []): void
    {
        self::ensureLibraryLoaded();

        $siteId = trim($siteId);
        if ($siteId === '') {
            return;
        }

        $dataBasePath = self::getDefaultDataBasePath();
        if (isset($options['data_base_path'])) {
            $candidate = trim((string) $options['data_base_path']);
            if ($candidate !== '') {
                $dataBasePath = $candidate;
            }
        }

        $issuer = null;
        if (isset($options['issuer'])) {
            $issuerCandidate = trim((string) $options['issuer']);
            if ($issuerCandidate !== '') {
                $issuer = $issuerCandidate;
            }
        }
        if ($issuer === null) {
            $issuer = $siteId;
        }

        self::$siteId = $siteId;
        self::$debugPayloadCache = false;

        $siteDataPath = self::resolveDataBasePath($dataBasePath, $siteId);

        JWTAuth::configureSite($siteId, [
            'data_base_path' => $siteDataPath,
            'issuer'         => $issuer,
        ]);
    }

    private static function resolveDataBasePath(string $dataBasePath, string $siteId): string
    {
        $normalizedBase = rtrim(str_replace('\\', '/', $dataBasePath), '/');
        if ($normalizedBase === '') {
            $normalizedBase = self::getDefaultDatasBasePath();
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

        $legacyDir = $siteRoot;
        $newStructureDir = $siteRoot;
        if (!preg_match('~/data(?:/|$)~', $siteRoot)) {
            $newStructureDir = $siteRoot . '/data';
        }
        $newStructureJwtDir = rtrim($newStructureDir, '/') . '/jwt';
        $legacyJwtDir = $legacyDir . '/jwt';

        if (!self::pathLikelyExists($newStructureJwtDir)) {
            $message = sprintf(
                'JWT key directory missing at %s (legacy location %s is no longer supported). '
                . 'Provision the /data/jwt structure before configuring JWTAuthService.',
                $newStructureJwtDir,
                $legacyJwtDir
            );
            throw new RuntimeException($message);
        }

        return rtrim($newStructureDir, '/');
    }

    private static function pathLikelyExists(string $path): bool
    {
        return @is_dir($path) || @is_file($path);
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

        $basePath = CLASS_DIR . '/class.Base.php';
        if (!is_file($basePath)) {
            throw new RuntimeException('Unable to locate Base class at ' . $basePath);
        }

        require_once $basePath;
    }

    public static function configureSiteFromServer(array $server): void
    {
        self::configureSite(self::detectSiteIdFromServer($server));
    }

    private static function ensureSiteConfigured(): void
    {
        if (self::$siteId !== null) {
            return;
        }

        $envSiteId = getenv('TORAPP_SITE_ID');
        if (is_string($envSiteId)) {
            $envSiteId = trim($envSiteId);
            if ($envSiteId !== '') {
                self::configureSite($envSiteId);
                return;
            }
        }

        self::configureSiteFromServer($_SERVER ?? []);
        if (self::$siteId !== null) {
            return;
        }

        throw new RuntimeException('JWTAuthService siteId is not configured.');
    }

    private static function detectSiteIdFromServer(array $server): string
    {
        if (!array_key_exists('DOCUMENT_ROOT', $server)) {
            throw new RuntimeException('DOCUMENT_ROOT is required to detect the JWT site identifier.');
        }

        $documentRoot = trim((string) $server['DOCUMENT_ROOT']);
        if ($documentRoot === '') {
            throw new RuntimeException('DOCUMENT_ROOT is empty; unable to detect the JWT site identifier.');
        }

        $normalizedRoot = rtrim(str_replace('\\', '/', $documentRoot), '/');
        if ($normalizedRoot === '') {
            throw new RuntimeException('DOCUMENT_ROOT resolves to an empty path; unable to detect the JWT site identifier.');
        }

        $rootSegment = basename($normalizedRoot);
        if ($rootSegment !== 'root') {
            throw new RuntimeException(sprintf('DOCUMENT_ROOT must terminate with /root, got "%s".', $documentRoot));
        }

        $sitePath = dirname($normalizedRoot);
        if ($sitePath === '' || $sitePath === '/' || $sitePath === '.') {
            throw new RuntimeException(sprintf('Unable to resolve site directory from DOCUMENT_ROOT "%s".', $documentRoot));
        }

        $siteId = basename($sitePath);
        if ($siteId === '' || $siteId === '.' || $siteId === '..') {
            throw new RuntimeException(sprintf('Resolved site identifier "%s" from DOCUMENT_ROOT "%s" is invalid.', $siteId, $documentRoot));
        }

        return $siteId;
    }

    public static function issue(array $claims, ?int $ttl = null): string
    {
        self::ensureLibraryLoaded();
        self::ensureSiteConfigured();

        return JWTAuth::issue($claims, $ttl);
    }

    public static function verify(string $jwt)
    {
        self::ensureLibraryLoaded();
        self::ensureSiteConfigured();

        return JWTAuth::verify($jwt);
    }

    public static function fromHttpRequest(): ?array
    {
        self::ensureLibraryLoaded();
        self::ensureSiteConfigured();

        return JWTAuth::fromHttpRequest();
    }

    public static function requireFromHttpRequest(): array
    {
        self::ensureLibraryLoaded();
        self::ensureSiteConfigured();

        return JWTAuth::requireFromHttpRequest();
    }

    public static function evaluateRequestToken(): array
    {
        self::ensureLibraryLoaded();
        self::ensureSiteConfigured();

        return JWTAuth::evaluateRequestToken();
    }

    public static function getDebugAuthPayload(): ?array
    {
        self::ensureLibraryLoaded();
        self::ensureSiteConfigured();

        if (self::$debugPayloadCache !== false) {
            return self::$debugPayloadCache;
        }

        if (isset($_SERVER['__auth_jwt_payload']) && is_array($_SERVER['__auth_jwt_payload'])) {
            self::$debugPayloadCache = $_SERVER['__auth_jwt_payload'];
            return self::$debugPayloadCache;
        }

        $payload = self::fromHttpRequest();
        if (is_array($payload)) {
            self::$debugPayloadCache = $payload;
        } else {
            self::$debugPayloadCache = null;
        }

        return self::$debugPayloadCache;
    }

    public static function maskTokenPreview($token): string
    {
        $token = (string) $token;
        $length = strlen($token);
        if ($length === 0) {
            return '';
        }
        if ($length <= 10) {
            return substr($token, 0, max(1, $length - 3)) . '...';
        }

        return substr($token, 0, 6) . '...' . substr($token, -6);
    }

    /**
     * @param Base|object $controller
     */
    public static function getAuthDebugSnapshot($controller, array $server, array $params, array $session, $groupCodeNormalized = null): array
    {
        $snapshot = [];

        $snapshot['trace_id'] = $server['__trace_id'] ?? null;
        $snapshot['origin'] = $server['HTTP_ORIGIN'] ?? null;
        $snapshot['request_method'] = $server['REQUEST_METHOD'] ?? null;
        $snapshot['api_type'] = $params['type'] ?? null;
        $snapshot['group_raw'] = $params['groupCode'] ?? null;

        if ($groupCodeNormalized === null && isset($params['groupCode'])) {
            $groupCodeNormalized = Base::normalizeGroupCode($params['groupCode']);
        }
        if ($groupCodeNormalized !== null) {
            $snapshot['group_normalized'] = $groupCodeNormalized;
        }

        $snapshot['requires_login_flag'] = $server['__auth_requires_login'] ?? null;
        if (isset($server['__auth_jwt_source'])) {
            $snapshot['jwt_source'] = $server['__auth_jwt_source'];
        }
        if (isset($server['__auth_jwt_reason']) && $server['__auth_jwt_reason'] !== null) {
            $snapshot['jwt_reason_if_invalid'] = $server['__auth_jwt_reason'];
        }
        if (isset($server['__auth_jwt_token_length'])) {
            $snapshot['jwt_token_length'] = $server['__auth_jwt_token_length'];
        }
        if (isset($server['__auth_jwt_token_preview']) && $server['__auth_jwt_token_preview'] !== null) {
            $snapshot['jwt_token_preview'] = $server['__auth_jwt_token_preview'];
        }
        if (isset($server['__auth_now_iso'])) {
            $snapshot['now_iso'] = $server['__auth_now_iso'];
        }
        if (isset($server['__auth_now'])) {
            $snapshot['now_epoch'] = $server['__auth_now'];
        }

        $header = isset($server['HTTP_AUTHORIZATION']) ? trim((string) $server['HTTP_AUTHORIZATION']) : '';
        if ($header !== '') {
            $snapshot['auth_header_present'] = true;
            $firstSpace = strpos($header, ' ');
            if ($firstSpace !== false) {
                $snapshot['auth_scheme'] = substr($header, 0, $firstSpace);
            } else {
                $snapshot['auth_scheme'] = $header;
            }
            if (stripos($header, 'Bearer ') === 0) {
                $token = trim(substr($header, 7));
                if ($token !== '') {
                    $snapshot['bearer_length'] = strlen($token);
                    $snapshot['bearer_preview'] = self::maskTokenPreview($token);
                }
            }
        } else {
            $snapshot['auth_header_present'] = false;
        }

        $payload = self::getDebugAuthPayload();
        if (is_array($payload)) {
            $snapshot['jwt_valid'] = true;
            if (isset($payload['userId'])) {
                $snapshot['jwt_claims_userId'] = $payload['userId'];
            }
            if (isset($payload['groupCode'])) {
                $snapshot['jwt_claims_groupCode'] = $payload['groupCode'];
            }
            if (isset($payload['isSupervisor'])) {
                $snapshot['jwt_claims_isSupervisor'] = $payload['isSupervisor'] ? true : false;
            }
            if (isset($payload['isOperator'])) {
                $snapshot['jwt_claims_isOperator'] = $payload['isOperator'] ? true : false;
            }
            if (isset($payload['exp'])) {
                $snapshot['jwt_claims_exp'] = (int) $payload['exp'];
                $snapshot['jwt_claims_exp_iso'] = gmdate('c', (int) $payload['exp']);
            }
            if (isset($payload['jti'])) {
                $snapshot['jwt_claims_jti'] = $payload['jti'];
            }
        } elseif (!empty($snapshot['auth_header_present'])) {
            $snapshot['jwt_valid'] = false;
        }

        $sessionStatus = session_status();
        if ($sessionStatus === PHP_SESSION_DISABLED) {
            $snapshot['session_status'] = 'disabled';
        } elseif ($sessionStatus === PHP_SESSION_NONE) {
            $snapshot['session_status'] = 'none';
        } else {
            $snapshot['session_status'] = 'active';
        }
        $snapshot['session_name'] = session_name();
        $snapshot['session_id'] = session_id();

        if (isset($server['__auth_session_initial_has_user_key'])) {
            $snapshot['session_initial_has_user_key'] = $server['__auth_session_initial_has_user_key'];
        }

        if (isset($server['__auth_session_initial_keys']) && is_array($server['__auth_session_initial_keys'])) {
            $snapshot['session_initial_keys'] = $server['__auth_session_initial_keys'];
        }

        if (is_array($session)) {
            $sessionKeys = array_keys($session);
            if (!empty($sessionKeys)) {
                $snapshot['session_keys'] = $sessionKeys;
            }
            if ($groupCodeNormalized !== null) {
                $sessionKey = 'userId_' . $groupCodeNormalized;
                $hasUserKey = isset($session[$sessionKey]);
                $snapshot['session_has_user_key'] = $hasUserKey ? true : false;
                if ($hasUserKey) {
                    $snapshot['session_user_id'] = $session[$sessionKey];
                }
            }
        }

        if (isset($snapshot['jwt_claims_exp'], $snapshot['now_epoch'])) {
            $snapshot['jwt_exp_seconds_remaining'] = (int) $snapshot['jwt_claims_exp'] - (int) $snapshot['now_epoch'];
        }

        if (isset($server['__cookie_names']) && is_array($server['__cookie_names']) && count($server['__cookie_names']) > 0) {
            $snapshot['cookie_names'] = array_values(array_unique($server['__cookie_names']));
        } elseif (!empty($_COOKIE)) {
            $snapshot['cookie_names'] = array_keys($_COOKIE);
        }

        return $snapshot;
    }

    /**
     * @param Base|object $controller
     */
    public static function logAuthDebug($controller, array $server, array $params, array $session, string $event, array $context = [], $groupCodeNormalized = null): void
    {
        $record = self::getAuthDebugSnapshot($controller, $server, $params, $session, $groupCodeNormalized);
        $record['event'] = $event;
        $record['class'] = get_class($controller);

        foreach ($context as $key => $value) {
            $record[$key] = $value;
        }

        foreach ($record as $key => $value) {
            if ($value === null) {
                unset($record[$key]);
            } elseif (is_array($value) && count($value) === 0) {
                unset($record[$key]);
            }
        }

        $json = json_encode($record, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            $json = json_encode(['event' => $event, 'error' => 'failed to encode auth debug log'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        $message = '[AuthDebug] ' . $json;
        $controller->writeLog($message, 'auth');
        error_log($message);
    }
}
