<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

use Base32\Base32;

class Base
{
	public $output;
	public $response;
	public $status;
	public $header;
	public $userMessage;
	public $errorReason;
	protected $debugMode;

	protected $context;
	protected $server;
	protected $session;
	protected $params;
	public $files;
	protected $sessionResponse;

	protected $contentsBasePath;
	protected $dataBasePath;

	protected $authPayload;

	protected $pdoQueue;
	protected $pdoTarget;
	protected $pdoContents;

	protected $loginUserId = null;
	protected $loginUserIdResolved = false;
	protected $loginUserCode = null;
	protected $loginUserCodeResolved = false;
        protected $userCache = array();

	protected $token;
	public $siteId;
	protected $type;
	protected $typeValidated;

	protected const AUTH_COOKIE_NAME = 'auth-token';
	protected const AUTH_COOKIE_ALIASES = ['auth-token', 'auth_token'];
	protected const AUTH_TOKEN_TTL = 86400;
	protected const LARGE_UPLOAD_REQUEST_TYPES = [
												  'Core',
												  'TargetManagement',
												  'Contents',
												  'DataService',
												  ];
	protected const LARGE_UPLOAD_SETTINGS = [
											 'upload_max_filesize' => '4096M',
											 'post_max_size'       => '4096M',
											 'memory_limit'        => '1024M',
											 'max_input_time'      => 7200,
											 'max_execution_time'  => 7200,
											 ];
	
        private $documentRoot;
        private $requestURI;
        private $siteTitle;
        private $targetAlias;
	
	CONST RESULT_SUCCESS = 0;
	CONST RESULT_ERROR = 1;
	CONST RESULT_EXCEPTION = 2;

	CONST HASH_ALGORITHM = 'sha256';
	CONST API_TOKEN = '1234ABCDabcd';
	CONST BASE_PATH = '/var/www/htmlv';
	const DEFAULT_LOW_RATE_VIDEO_BITRATE = 2000000; // 2 Mbps
	/**
	 * Maximum queued/running low-rate transcodes allowed concurrently.
	 * Tune this to balance throughput and resource usage for ffmpeg jobs.
	 */
	const MAX_CONCURRENT_LOW_RATE_TRANSCODES = 3;
	const LOW_RATE_TRANSCODE_FORCE_COOLDOWN_SECONDS = 60;
	const USER_LIST_DEFAULT_PER_PAGE = 50;
	const USER_LIST_MAX_PER_PAGE = 100;
	
	public function __construct($context, bool $skipValidation = false)
	{
		date_default_timezone_set('Asia/Tokyo');

		if (isset($context['errorReporting'])) {
			error_reporting($context['errorReporting']);
		}
		
		$this->context = $context;
		
		$this->status = self::RESULT_SUCCESS;
		$this->errorReason = null;
		$this->userMessage = null;
		$this->response = null;
		$this->output = null;
		$this->header = array();
		
		$this->debugMode = $context['debugMode'];
		$this->session = &$context['session']; // 参照渡し
		$this->params = $context['params'];
		$this->files = $context['files'];
		$this->sessionResponse = null;
		
		$this->documentRoot = $_SERVER['DOCUMENT_ROOT'];
		$this->requestURI = $_SERVER['REQUEST_URI'];
                $this->siteTitle = null;
                $this->siteId = self::getSiteId();
                $this->contentsBasePath = self::getContentsBasePath();
                $this->dataBasePath = self::getDataBasePath();

                self::requireFromShm('libs/JWT/*.php', __DIR__ . '/..');
                self::requireFromShm('libs/PHPMailer/*.php', __DIR__ . '/..');

                if (class_exists('JWTAuthService')) {
                        $jwtSiteId = trim((string) $this->siteId);
                        if ($jwtSiteId !== '') {
                                JWTAuthService::configureSite($jwtSiteId, [
                                                                                                                   'data_base_path' => $this->dataBasePath,
														   ]);
			} else {
				JWTAuthService::configureSiteFromServer($_SERVER);
			}
		}

		$this->initializeAuthContextFromRequest();

		// XSS対策
		$this->token = $this->getSafeParam('token');

		$this->type = null;
		$this->typeValidated = false;

		$this->authPayload = null;

		if ($skipValidation === false) {
			$this->validation();
			if (method_exists($this, 'validationCommon')) {
				$this->validationCommon();
			}

			if ($this->shouldInitializeRequestType()) {
				$this->initializeRequestType();
			}
		}
	}

	protected function dataPath(string $suffix = ''): string
        {
			$base = $this->dataBasePath;
			$suffix = trim($suffix);
			if ($suffix === '') {
				return $base;
			}
			return rtrim($base, '/') . '/' . ltrim($suffix, '/');
        }

	protected function pathLikelyExists(string $path): bool
        {
			return @is_dir($path) || @is_file($path);
        }

	/**
	 * 取得したリクエストパラメータを一元的にエスケープして返す
	 */
	protected function getSafeParam(string $name, string $default = ''): string
        {
			$raw = $this->params[$name] ?? $default;

			if (is_array($raw)) {
				$raw = $default;
			}

			return htmlspecialchars((string) $raw, ENT_QUOTES, 'UTF-8');
        }

        protected function getSiteTitle(): string
        {
                        if ($this->siteTitle === null) {
                                $stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
                                $stmt->execute(array("siteTitle"));
                               $row = $stmt->fetch(PDO::FETCH_ASSOC);
                               if ($row && isset($row['value']) && $row['value'] !== '') {
                                       $this->siteTitle = $row['value'];
				} else {
					$this->siteTitle = 'MARMO HUB';
				}
			}

                        return $this->siteTitle;
        }

        protected function getTargetAlias(): string
        {
                        if ($this->targetAlias === null) {
                                $stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
                                $stmt->execute(array('targetAlias'));
                                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                                $value = $row && isset($row['value']) ? trim((string) $row['value']) : '';
                                $this->targetAlias = $value !== '' ? $value : 'ターゲット';
                        }

                        return $this->targetAlias;
        }

	public static function normalizeGroupCode($value): ?string
	{
		if (is_string($value) === false) {
			$value = (string) $value;
		}

		$normalized = trim($value);

		return $normalized === '' ? null : $normalized;
	}

	public static function validateGroupCode($value): string
	{
		$normalized = self::normalizeGroupCode($value);

		if ($normalized === null) {
			throw new \InvalidArgumentException('groupCode must not be empty');
		}

		if (preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]*$/', $normalized) !== 1) {
			throw new \InvalidArgumentException('groupCode contains invalid characters');
		}

		return $normalized;
	}

	public static function getLargeUploadRequestTypes(): array
	{
		return self::LARGE_UPLOAD_REQUEST_TYPES;
	}

	public static function isLargeUploadRequestType($requestType): bool
	{
		if (!is_string($requestType)) {
			return false;
		}

		$normalized = trim($requestType);
		if ($normalized === '') {
			return false;
		}

		return in_array($normalized, self::LARGE_UPLOAD_REQUEST_TYPES, true);
	}

	public static function getLargeUploadSettings(): array
	{
		return self::LARGE_UPLOAD_SETTINGS;
	}

	//
	// public method
	//
	public function procStart()
	{
		if ($this->type != null && $this->typeValidated == false) {
			$this->validationForType();
		}
		$this->proc();
	}

	public function proc()
	{
		return $this->dispatchToType('proc');
	}

	public static function requireFromShm(string $relativePath, ?string $baseDir = null): void
	{
		if ($relativePath === '') {
			throw new InvalidArgumentException('requireFromShm requires a non-empty relative path.');
		}

		$normalizedRelative = str_replace('\\', '/', $relativePath);
		if (preg_match('#^(?:[a-zA-Z]:)?/#', $normalizedRelative)) {
			throw new InvalidArgumentException('requireFromShm expects the first argument to be a relative path.');
		}

		$baseDir = $baseDir ?? getcwd();
		if (!is_string($baseDir) || $baseDir === '') {
			throw new RuntimeException('Unable to determine base directory for requireFromShm.');
		}

		$baseDirNormalized = str_replace('\\', '/', $baseDir);
		if (!preg_match('#^(?:[a-zA-Z]:)?/#', $baseDirNormalized)) {
			$baseDirNormalized = getcwd() . '/' . ltrim($baseDirNormalized, '/');
		}

		$baseReal = realpath($baseDirNormalized);
		if ($baseReal === false) {
			throw new RuntimeException(sprintf('Base directory does not exist: %s', $baseDirNormalized));
		}

		$normalizedBase = rtrim(str_replace('\\', '/', $baseReal), '/');
		$relativeNormalized = ltrim(preg_replace('#/+#', '/', $normalizedRelative), '/');
		$absoluteOriginalPath = $normalizedBase . '/' . $relativeNormalized;

		if (strpbrk($relativeNormalized, '*?[') !== false) {
			$matches = glob($absoluteOriginalPath, GLOB_NOSORT);
			if ($matches === false || empty($matches)) {
				return;
			}

			sort($matches);
			foreach ($matches as $match) {
				if (!is_file($match)) {
					continue;
				}

				$matchNormalized = str_replace('\\', '/', $match);
				$prefix = $normalizedBase . '/';
				if (strpos($matchNormalized, $prefix) !== 0) {
					throw new RuntimeException('Matched path is outside of the base directory.');
				}

				$matchRelative = substr($matchNormalized, strlen($prefix));
				self::requireFromShm($matchRelative, $normalizedBase);
			}

			return;
		}

		if (!is_file($absoluteOriginalPath)) {
			throw new RuntimeException(sprintf('File not found for requireFromShm: %s', $absoluteOriginalPath));
		}

		$resolvedOriginalPath = realpath($absoluteOriginalPath);
		if ($resolvedOriginalPath === false) {
			throw new RuntimeException(sprintf('Failed to resolve absolute path for requireFromShm: %s', $absoluteOriginalPath));
		}

		$absoluteNormalized = str_replace('\\', '/', $resolvedOriginalPath);
		$prefix = $normalizedBase . '/';
		if ($absoluteNormalized !== $normalizedBase && strpos($absoluteNormalized, $prefix) !== 0) {
			throw new RuntimeException(sprintf('Resolved path escapes base directory: %s', $absoluteNormalized));
		}

		$parts = [];
		foreach (explode('/', $relativeNormalized) as $part) {
			if ($part === '' || $part === '.') {
				continue;
			}
			if ($part === '..') {
				array_pop($parts);
				continue;
			}
			$parts[] = $part;
		}
		if (empty($parts)) {
			$parts[] = basename($absoluteNormalized);
		}
		$sanitizedRelativePath = implode('/', $parts);

		static $loadedPaths = [];
		$loadGuards = [];
		if ($resolvedOriginalPath !== false) {
			$loadGuards[] = $resolvedOriginalPath;
		}
		$loadGuards[] = $absoluteNormalized;
		$loadGuards[] = $sanitizedRelativePath;

		foreach ($loadGuards as $guard) {
			if (!is_string($guard) || $guard === '') {
				continue;
			}
			if (isset($loadedPaths[$guard])) {
				return;
			}
		}

		$domain = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'default';
		$safeDomain = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $domain);
		$domainCacheDir = '/dev/shm/' . $safeDomain;
		$shmFilePath = $domainCacheDir . '/' . $sanitizedRelativePath;
		$shmDir = dirname($shmFilePath);
		if (!is_dir($shmDir) && !mkdir($shmDir, 0777, true) && !is_dir($shmDir)) {
			throw new RuntimeException(sprintf('Failed to create cache directory: %s', $shmDir));
		}

		if (file_exists($shmFilePath)) {
			$originalMTime = @filemtime($absoluteOriginalPath);
			$shmMTime = @filemtime($shmFilePath);

			if ($originalMTime !== false && $shmMTime !== false && $originalMTime > $shmMTime) {
				if (!@unlink($shmFilePath)) {
					throw new RuntimeException(sprintf('Failed to refresh cache file: %s', $shmFilePath));
				}
			}
		}

		if (!file_exists($shmFilePath)) {
			if (!@copy($absoluteOriginalPath, $shmFilePath)) {
				throw new RuntimeException(sprintf('Failed to copy %s to %s', $absoluteOriginalPath, $shmFilePath));
			}
		}

		require_once($shmFilePath);

		$loadGuards[] = str_replace('\\', '/', $shmFilePath);
		foreach ($loadGuards as $guard) {
			if (is_string($guard) && $guard !== '') {
				$loadedPaths[$guard] = true;
			}
		}
	}

	protected function issueJwt(array $claims, ?int $ttl = null): string
        {
			return JWTAuthService::issue($claims, $ttl);
        }

	protected function verifyJwt(string $token)
	{
		return JWTAuthService::verify($token);
	}

	protected function requireJwtFromHttpRequest(): array
        {
			$_SERVER['__auth_requires_login'] = true;
			$payload = JWTAuthService::requireFromHttpRequest();
			$this->authPayload = $payload;

			return $payload;
        }

	protected function requireAuth(): array
        {
			return $this->requireJwtFromHttpRequest();
        }

	protected function getAuthPayload(): ?array
	{
		return $this->authPayload;
	}

	protected function setAuthPayload(array $payload): void
	{
		$this->authPayload = $payload;
	}

	protected function initializeAuthContextFromRequest(): void
	{
		if (isset($this->session['userId']) && (int) $this->session['userId'] > 0) {
			return;
		}

		if (!class_exists('JWTAuthService') || !method_exists('JWTAuthService', 'fromHttpRequest')) {
			return;
		}

		try {
			$payload = JWTAuthService::fromHttpRequest();
		} catch (Throwable $throwable) {
			$payload = null;
		}

		if (!is_array($payload) || empty($payload)) {
			return;
		}

		$this->setAuthPayload($payload);
		$this->syncSessionWithAuthPayload($payload, false);
	}

	protected function syncSessionWithAuthPayload(array $payload, bool $overwriteSession = false): void
	{
		if (!is_array($payload) || empty($payload)) {
			return;
		}

		$normalizedUserId = null;
		if (array_key_exists('userId', $payload) && $payload['userId'] !== null) {
			$normalizedUserId = (int) $payload['userId'];
		}
		if ($normalizedUserId !== null && $normalizedUserId > 0) {
			if ($overwriteSession || empty($this->session['userId'])) {
				$this->session['userId'] = $normalizedUserId;
			}
		}

               $roleClaims = [
                                          'isSupervisor' => 'isSupervisor',
                                          'isOperator'   => 'isOperator',
                                          'useContentsManagement' => 'useContentsManagement',
                                          'useDashboard' => 'useDashboard',
                                          ];
                foreach ($roleClaims as $claim => $sessionKey) {
                        if (!array_key_exists($claim, $payload)) {
                                continue;
			}

			$flag = $payload[$claim] ? true : false;
			if ($flag) {
				$this->session[$sessionKey] = true;
			} elseif ($overwriteSession && isset($this->session[$sessionKey])) {
				unset($this->session[$sessionKey]);
			}
		}
	}

	protected function getLoginUserId()
	{
		if ($this->loginUserIdResolved) {
			return $this->loginUserId;
		}

		$this->loginUserIdResolved = true;
		$this->loginUserId = null;

		if (isset($this->session['userId'])) {
			$candidateId = (int) $this->session['userId'];
			if ($candidateId > 0) {
				$this->loginUserId = $candidateId;
				return $this->loginUserId;
			}
		}

		$payload = $this->getAuthPayload();
		if (is_array($payload)) {
			$candidateId = array_key_exists('userId', $payload) ? (int) $payload['userId'] : null;
			if ($candidateId !== null && $candidateId > 0) {
				$candidateRow = null;
				if ($this->pdoCommon instanceof PDO) {
					$stmt = $this->pdoCommon->prepare('SELECT id, userCode FROM user WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0) LIMIT 1');
					$stmt->execute(array($candidateId));
					$row = $stmt->fetch(PDO::FETCH_ASSOC);
					if ($row && isset($row['id']) && (int) $row['id'] === $candidateId) {
						$candidateRow = $row;
					} elseif (isset($payload['userCode'])) {
						$candidateCode = trim((string) $payload['userCode']);
						if ($candidateCode !== '') {
							$stmt = $this->pdoCommon->prepare('SELECT id, userCode FROM user WHERE userCode = ? COLLATE NOCASE AND (isDeleted IS NULL OR isDeleted = 0) LIMIT 1');
							$stmt->execute(array($candidateCode));
							$row = $stmt->fetch(PDO::FETCH_ASSOC);
							if ($row && isset($row['id']) && (int) $row['id'] > 0) {
								$candidateRow = $row;
								$candidateId = (int) $row['id'];
							}
						}
					}
				}

				if ($candidateId !== null) {
					$this->loginUserId = $candidateId;
					if (!isset($this->session['userId']) || (int) $this->session['userId'] !== $candidateId) {
						$this->session['userId'] = $candidateId;
					}
					if ($candidateRow && isset($candidateRow['userCode'])) {
						$normalizedCode = trim((string) $candidateRow['userCode']);
						if ($normalizedCode !== '') {
							$this->session['userCode'] = $normalizedCode;
						}
					}
				}
			}
		}

		return $this->loginUserId;
	}

	protected function getLoginUserCode()
	{
		if ($this->loginUserCodeResolved) {
			return $this->loginUserCode;
		}

		$this->loginUserCodeResolved = true;
		$this->loginUserCode = null;

		if (isset($this->session['userCode'])) {
			$sessionCode = trim((string) $this->session['userCode']);
			if ($sessionCode !== '') {
				$this->loginUserCode = $sessionCode;
				return $this->loginUserCode;
			}
		}

		$userId = $this->getLoginUserId();
		if ($userId !== null && $userId > 0) {
			$stmt = $this->getPDOCommon()->prepare('SELECT userCode FROM user WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0) LIMIT 1');
			$stmt->execute(array($userId));
			$row = $stmt->fetch(PDO::FETCH_ASSOC);
			if ($row && isset($row['userCode'])) {
				$code = trim($row['userCode']);
				if ($code !== '') {
					$this->loginUserCode = $code;
					$this->session['userCode'] = $code;
					return $this->loginUserCode;
				}
			}
		}

		$payload = $this->getAuthPayload();
		if (is_array($payload) && isset($payload['userCode'])) {
			$candidateCode = trim((string) $payload['userCode']);
			if ($candidateCode !== '') {
				$stmt = $this->getPDOCommon()->prepare('SELECT userCode, id FROM user WHERE userCode = ? COLLATE NOCASE AND (isDeleted IS NULL OR isDeleted = 0) LIMIT 1');
				$stmt->execute(array($candidateCode));
				$row = $stmt->fetch(PDO::FETCH_ASSOC);
				if ($row && isset($row['userCode'])) {
					$resolvedCode = trim((string) $row['userCode']);
					if ($resolvedCode !== '') {
						$this->loginUserCode = $resolvedCode;
						$this->session['userCode'] = $resolvedCode;
						if (isset($row['id']) && (!isset($this->session['userId']) || (int) $this->session['userId'] !== (int) $row['id'])) {
							$this->session['userId'] = (int) $row['id'];
						}
						return $this->loginUserCode;
					}
				}

				$this->loginUserCode = $candidateCode;
				$this->session['userCode'] = $candidateCode;
			}
		}

		return $this->loginUserCode;
	}

	protected function isSupervisor()
	{
		return !empty($this->session['isSupervisor']);
	}

	protected function isOperator()
	{
		if (!empty($this->session['isOperator'])) {
			return true;
		}

		if (!empty($this->session['groupCode'])) {
			$groupCode = $this->session['groupCode'];
			if (!empty($this->session['isOperator_' . $groupCode]) || !empty($this->session['isSupervisor_' . $groupCode])) {
				return true;
			}
		}

		return false;
	}

	protected function getUserInfo($userCode)
	{
		if ($userCode == null || $userCode === '') {
			return null;
		}

		if (array_key_exists($userCode, $this->userCache)) {
			$cached = $this->userCache[$userCode];
			if ($cached === false) {
				return null;
			}
			return $cached;
		}

		$stmt = $this->getPDOCommon()->prepare("SELECT id, userCode, displayName, imageFileName, role FROM user WHERE isDeleted IS NULL AND userCode = ?");
		$stmt->execute(array($userCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row) {
			$this->userCache[$userCode] = $row;
			return $row;
		}

		$this->userCache[$userCode] = false;
		return null;
	}

        protected function isSecureRequest(): bool
        {
			$https = isset($_SERVER['HTTPS']) ? strtolower((string) $_SERVER['HTTPS']) : '';
			if ($https !== '' && $https !== 'off') {
				return true;
			}

			$requestScheme = isset($_SERVER['REQUEST_SCHEME']) ? strtolower((string) $_SERVER['REQUEST_SCHEME']) : '';
			if ($requestScheme === 'https') {
				return true;
			}

			$forwardedProto = isset($_SERVER['HTTP_X_FORWARDED_PROTO'])
				? strtolower((string) $_SERVER['HTTP_X_FORWARDED_PROTO'])
				: '';
			if ($forwardedProto === 'https') {
				return true;
			}

			$forwardedSsl = isset($_SERVER['HTTP_X_FORWARDED_SSL']) ? strtolower((string) $_SERVER['HTTP_X_FORWARDED_SSL']) : '';
			if ($forwardedSsl === 'on') {
				return true;
			}

			return false;
        }

	protected function getAuthCookieOptions(int $ttlSeconds): array
        {
			$expires = time() + $ttlSeconds;

			return [
					'expires'  => $expires,
					'path'     => '/',
					'secure'   => $this->isSecureRequest(),
					'httponly' => true,
					'samesite' => 'Lax',
					];
        }

	protected function setAuthTokenCookie(string $token, int $ttlSeconds = self::AUTH_TOKEN_TTL): void
	{
		if (headers_sent()) {
			return;
		}

		$token = trim($token);
		if ($token === '') {
			return;
		}

		$options = $this->getAuthCookieOptions($ttlSeconds > 0 ? $ttlSeconds : self::AUTH_TOKEN_TTL);
		setcookie(self::AUTH_COOKIE_NAME, $token, $options);
	}

	protected function clearAuthTokenCookie(): void
	{
		if (headers_sent()) {
			return;
		}

		$options = $this->getAuthCookieOptions(-self::AUTH_TOKEN_TTL);
		$options['expires'] = time() - self::AUTH_TOKEN_TTL;
		$options['max_age'] = 0;

		foreach (self::AUTH_COOKIE_ALIASES as $cookieName) {
			setcookie($cookieName, '', $options);
			unset($_COOKIE[$cookieName]);
		}
	}

	protected function setSessionResponse(array $sessionData): void
	{
		if (empty($sessionData)) {
			return;
		}

		if (!is_array($this->sessionResponse)) {
			$this->sessionResponse = array();
		}

		foreach ($sessionData as $key => $value) {
			$this->sessionResponse[$key] = $value;
		}
	}

	protected function injectTokenIntoResponse(string $token): void
	{
		if (!is_string($token) || $token === '') {
			return;
		}

		if ($this->status !== self::RESULT_SUCCESS) {
			return;
		}

		$response = $this->response;

		if (!is_array($response)) {
			$response = array('value' => $response);
		} elseif ($this->isSequentialArray($response)) {
			$response = array('items' => $response);
		}

		$response['token'] = $token;
		$this->response = $response;
	}

	protected function isSequentialArray(array $value): bool
        {
			if (empty($value)) {
				return false;
			}

			return array_keys($value) === range(0, count($value) - 1);
        }

	public function getResultJson()
	{
		if ($this->status == self::RESULT_SUCCESS) {
			$payload = array('status' => 'OK', 'result' => $this->response);
		} else if ($this->status == self::RESULT_ERROR) {
			$payload = array('status' => 'ERROR', 'reason' => $this->errorReason, 'result' => $this->response);
		} else {
			$payload = array('status' => 'ERROR', 'reason' => 'exception', 'result' => $this->response);
		}

		if (is_array($this->sessionResponse) && !empty($this->sessionResponse)) {
			$payload['session'] = $this->sessionResponse;
		}

		return json_encode($payload);
	}

	public static function writeLog ($message, $fileSuffix = "", $basePath = "")
	{
		if ($basePath == "") {
			$basePath = self::getDataBasePath();
		}
		
		$logBasePath = $basePath . '/log';
	
		if (file_exists($logBasePath) == false) {
			mkdir($logBasePath);
			chmod($logBasePath, 0775);
		}
	  
		$fileName = date("Ymd");
		if ($fileSuffix != "") {
			$fileName .= "_" . $fileSuffix;
		}
		$message = date('Y/m/d H:i:s') . ' ' . $message;
		file_put_contents($logBasePath . '/' . $fileName, $message . "\n", FILE_APPEND | LOCK_EX);
		chmod($logBasePath . '/' . $fileName, 0775);	
	}	
	// public method

	//
	// protected method
	//
	public static function getContentsBasePath()
	{
		return self::BASE_PATH . "/" . self::getSiteId() . "/root";
	}

	public static function getDataBasePath()
	{
		return self::BASE_PATH . "/" . self::getSiteId() . "/data";
	}

	
	public static function getSiteId()
	{
		return  basename(dirname($_SERVER['DOCUMENT_ROOT']));
	}
	
	protected function validationForType()
	{
		if ($this->type == null) {
			return;
		}

		$funcName = $this->buildTypeHandlerName('validation', $this->type);
                if (method_exists($this, $funcName) == false) {
                        throw new \Exception(__FILE__ . ":" . __LINE__ . ":" . $funcName);
                }
		$this->$funcName(); // 子クラスに実装されているメソッドを呼び出す
		$this->typeValidated = true;
	}

	protected function shouldInitializeRequestType()
	{
		return true;
	}

	protected function getDefaultRequestType()
	{
		return null;
	}

	protected function initializeRequestType()
	{
		$resolvedType = $this->resolveRequestType();
		$this->type = $resolvedType;

		if ($this->type !== null) {
			$this->runTypeValidationIfExists();
		}
	}

	protected function resolveRequestType()
	{
		$rawType = isset($this->params['type']) ? $this->params['type'] : null;
		if ($rawType === null || $rawType === '') {
			$rawType = $this->getDefaultRequestType();
		}

		return $this->sanitizeRequestType($rawType);
	}

	protected function sanitizeRequestType($type)
	{
		if ($type === null) {
			return null;
		}

		$sanitized = htmlspecialchars((string) $type, ENT_QUOTES, 'UTF-8');
		return $sanitized === '' ? null : $sanitized;
	}

	protected function runTypeValidationIfExists()
	{
		$funcName = $this->buildTypeHandlerName('validation', $this->type);
		if (method_exists($this, $funcName)) {
			$this->$funcName();
			$this->typeValidated = true;
		}
	}

	protected function buildTypeHandlerName($prefix, $type)
	{
		return $prefix . ucfirst($type);
	}

	/**
	 * Ensure required request parameters exist.
	 *
	 * @param array $keys
	 * @throws Exception
	 */
	protected function requireParams(array $keys): void
	{
		foreach ($keys as $key) {
			if (isset($this->params[$key])) {
				continue;
			}

			$trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
			$callerFile = isset($trace[1]['file']) ? $trace[1]['file'] : __FILE__;
			$callerLine = isset($trace[1]['line']) ? $trace[1]['line'] : __LINE__;

			throw new Exception(sprintf("%s:%d - missing param '%s'", $callerFile, $callerLine, $key));
		}
	}

	protected function dispatchToType($prefix)
	{
		if ($this->type === null) {
			throw new Exception(__FILE__ . ":" . __LINE__ . ': request type is not specified');
		}

		$method = $this->buildTypeHandlerName($prefix, $this->type);
		if (method_exists($this, $method) === false) {
			throw new Exception($this->formatUnsupportedTypeMessage($prefix, $this->type));
		}

		return $this->$method();
	}

	protected function formatUnsupportedTypeMessage($prefix, $type)
	{
		return 'Unsupported type: ' . $type;
	}

	private function validation()
	{
		if (isset($this->params['token']) == false) {
			throw new Exception(__FILE__ . ":" . __LINE__);
		}

		if ($this->isAcceptableToken($this->params['token']) == false) {
			throw new Exception(__FILE__ . ":" . __LINE__);
		}
	}

	protected function isAcceptableToken($token)
	{
		if ($token != self::API_TOKEN) {
			return false;
		}
		return true;
	}	
		
	protected function phpMailerSendPostfix($from_email, $to_email, $siteTitle, $subjectMessage, $body, $atacchFile = NULL)
	{
		if (is_array($subjectMessage))  {
			$subject = mb_encode_mimeheader("【" . $subjectMessage["title"] . "】" . $subjectMessage["message"], 'ISO-2022-JP', 'UTF-8');
		} else {
			$subject = mb_encode_mimeheader("【" . $siteTitle . "】" . $subjectMessage, 'ISO-2022-JP', 'UTF-8');
		}

		$stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
		$stmt->execute(array("notifyMail"));
		$notifyMail = $stmt->fetch(PDO::FETCH_ASSOC)["value"];

		$stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
		$stmt->execute(array("bounceMail"));
		$bounceMail = $stmt->fetch(PDO::FETCH_ASSOC)["value"];

		$stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
		$stmt->execute(array("hostname"));
		$hostname = $stmt->fetch(PDO::FETCH_ASSOC)["value"];		

		$mail = new PHPMailer(true);                              // Passing `true` enables exceptions
		try {
		    //Server settings
		    $mail->SMTPDebug = 0;                                 // Enable verbose debug output
		    $mail->isSMTP();                                      // Set mailer to use SMTP
		    $mail->Host = '127.0.0.1';  // Specify main and backup SMTP servers
			$mail->Hostname = $hostname;
			$mail->Helo = $hostname;
		    // $mail->Port = 25;                                    // TCP port to connect to
		    $mail->Port = 587;                                    // TCP port to connect to
		    $mail->SMTPSecure = false;
			$mail->SMTPAutoTLS = false;
            $mail->SMTPAuth = false;					

			$mail->Sender  = $bounceMail;
			$mail->setFrom($notifyMail, '');
			if ($replyTo) {
				$mail->addReplyTo($replyTo);
			}
			$mail->addAddress($to_email);               // Name is optional

			// AddAttachment
			if ($atacchFile) {
				for ($i = 0; $i < count($atacchFile['name']); $i++) {
					$filePath = $atacchFile['tmp_name'][$i];
					$fileName = $atacchFile['name'][$i];
					$mail->AddAttachment($filePath, $fileName);
				}
			}

		    $mail->isHTML(false);
		    $mail->Subject = $subject;
		    $mail->Body    = $body;
		    $mail->CharSet = 'UTF-8';
		    $mail->ContentLanguage='en-US';

		    if ($this->debugMode == true) {
				echo '[DEBUG] mail send.';
		    } else {
				$mail->send();
		    }

		    $this->writeLog("mail was sent to " . $to_email);
                } catch (PHPMailerException $e) {
                        $this->writeLog("send mail to " . $to_email . " failed." . print_r($e, true));
                }
        }

	protected function execCommand ($command)
	{
		// 2020/04/05 output valiable is increasing each call.
		unset($output);

		if ($this->debugMode == true) {
			echo("[DEBUG] " . $command);
		} else {
			exec($command, $output, $returnVal);
		}
		return $output;
	}

	protected function getEasyEncodeStr($num)
	{
		$ary = str_split($num);
		$encStr = '';
		foreach ($ary as $a) {
			$asc = ord($a);
			$str = chr((int)$asc + 33);
			$encStr .= $str;
		}
	  
		return $encStr;
	}
	
	protected function getEasyDecodeNum($encStr)
	{
		$ary = str_split($encStr);
		$decNum = '';
		foreach ($ary as $a) {
			$asc = ord($a);
			$str = chr((int)$asc - 33);
			$decNum .= $str;
		}
	  
		return $decNum;
	}
	
	protected function base64UrlEncode($input)
	{
		return rtrim(strtr(base64_encode($input), '+/', '-_'), '='); // = を取り除きURL安全な文字に置き換え
	}
	
	protected function base64UrlDecode($input)
	{
		$replaced = strtr($input, '-_', '+/');
		return base64_decode($replaced . str_repeat('=', 3 - (3 + strlen($input)) % 4)); // 必要に応じて = を追加
	}

	protected function sanitizePath($path, $baseDir)
	{
		if (!is_string($path) || $path === '') {
			return false;
		}

		$baseReal = realpath($baseDir);
		if ($baseReal === false) {
			return false;
		}

		$baseNormalized = rtrim(str_replace('\\', '/', $baseReal), '/') . '/';

		$realPath = realpath($path);
		if ($realPath !== false) {
			$normalized = str_replace('\\', '/', $realPath);
			if (is_dir($realPath)) {
				$normalized = rtrim($normalized, '/') . '/';
			}

			return strpos($normalized, $baseNormalized) === 0;
		}

		$parentReal = realpath(dirname($path));
		if ($parentReal === false) {
			return false;
		}

		$basename = basename($path);
		if ($basename === '' || $basename === '.' || $basename === '..') {
			return false;
		}

		$parentNormalized = rtrim(str_replace('\\', '/', $parentReal), '/') . '/';
		$candidate = $parentNormalized . $basename;

		return strpos($candidate, $baseNormalized) === 0;
	}

	protected function parseTargetBitrate($value)
	{
		if ($value === null) {
			return null;
		}

		$normalized = trim((string) $value);
		if ($normalized === '') {
			return null;
		}

		if (preg_match('/^([0-9]+(?:\.[0-9]+)?)([kKmMgG]?[bB]?[pP]?[sS]?)?$/', $normalized, $matches) === 0) {
			return null;
		}

		$number = (float) $matches[1];
		$suffix = isset($matches[2]) ? strtolower($matches[2]) : '';

		if ($number <= 0) {
			return null;
		}

		switch (true) {
		case $suffix === '' || $suffix === 'b' || $suffix === 'bps':
			$multiplier = 1;
			break;
		case $suffix[0] === 'k':
			$multiplier = 1000;
			break;
		case $suffix[0] === 'm':
			$multiplier = 1000 * 1000;
			break;
		case $suffix[0] === 'g':
			$multiplier = 1000 * 1000 * 1000;
			break;
		default:
			$multiplier = 1;
			break;
		}

		$bitrate = (int) round($number * $multiplier);

		return $bitrate > 0 ? $bitrate : null;
	}

	protected function buildLowRateVideoPath($sourcePath, $targetBitrate)
	{
		$info = pathinfo($sourcePath);
		$directory = isset($info['dirname']) ? $info['dirname'] : '.';
		$filename = isset($info['filename']) ? $info['filename'] : basename($sourcePath);
		$extension = isset($info['extension']) && $info['extension'] !== '' ? '.' . $info['extension'] : '';

		$kbps = max(1, (int) round($targetBitrate / 1000));
		$suffix = sprintf('lr_%dkbps', $kbps);

		return $directory . '/' . $filename . '_' . $suffix . $extension;
	}

	protected function findExecutable($name)
	{
		if ($name === '') {
			return null;
		}

		if (strpos($name, DIRECTORY_SEPARATOR) !== false) {
			return is_executable($name) ? $name : null;
		}

		$pathList = array();
		$paths = getenv('PATH');
		if ($paths !== false && $paths !== '') {
			$pathList = array_merge($pathList, explode(PATH_SEPARATOR, $paths));
		}

		if (defined('PHP_BINDIR') && PHP_BINDIR !== '') {
			$pathList[] = PHP_BINDIR;
		}

		if (empty($pathList)) {
			return null;
		}

		$pathList = array_values(array_unique(array_filter($pathList, static function ($dir) {
                        return $dir !== '';
					})));

		$suffixes = array('');
		if (stripos(PHP_OS, 'WIN') === 0) {
			$suffixes = array('.exe', '.bat', '.cmd', '');
		}

		foreach ($pathList as $dir) {
			foreach ($suffixes as $suffix) {
				$candidate = rtrim($dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $name . $suffix;
				if (is_file($candidate) && is_executable($candidate)) {
					return $candidate;
				}
			}
		}

		return null;
	}

	protected function getPhpBinary()
	{
		$candidates = array();

		$phpFromPath = $this->findExecutable('php');
		if ($phpFromPath !== null) {
			$candidates[] = $phpFromPath;
		}

		if (defined('PHP_BINDIR') && PHP_BINDIR !== '') {
			$suffixes = array('');
			if (stripos(PHP_OS, 'WIN') === 0) {
				$suffixes = array('.exe', '.bat', '.cmd', '');
			}

			foreach ($suffixes as $suffix) {
				$candidates[] = rtrim(PHP_BINDIR, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'php' . $suffix;
			}
		}

		if (defined('PHP_BINARY') && PHP_BINARY !== '') {
			$candidates[] = PHP_BINARY;
		}

		$candidates = array_values(array_unique($candidates));

		foreach ($candidates as $candidate) {
			if ($candidate === null || $candidate === '') {
				continue;
			}

			$binaryName = strtolower(basename($candidate));
			if ($binaryName === 'php-fpm' || strpos($binaryName, 'php-fpm') !== false) {
				continue;
			}

			if (strpos($binaryName, 'php-cgi') !== false) {
				continue;
			}

			if (is_file($candidate) && is_executable($candidate)) {
				return $candidate;
			}
		}

		return null;
	}

	protected function probeVideoBitrate($filePath)
	{
		$ffprobe = $this->findExecutable('ffprobe');
		if ($ffprobe === null) {
			return null;
		}

		$commands = array(
						  sprintf(
								  "%s -v error -select_streams v:0 -show_entries stream=bit_rate -of default=nokey=1:noprint_wrappers=1 %s",
								  escapeshellarg($ffprobe),
								  escapeshellarg($filePath)
								  ),
						  sprintf(
								  "%s -v error -show_entries format=bit_rate -of default=nokey=1:noprint_wrappers=1 %s",
								  escapeshellarg($ffprobe),
								  escapeshellarg($filePath)
								  )
						  );

		foreach ($commands as $command) {
			$output = array();
			$exitCode = null;
			exec($command, $output, $exitCode);
			if ($exitCode === 0 && count($output) > 0) {
				$candidate = trim($output[0]);
				if ($candidate !== '' && is_numeric($candidate)) {
					$bitrate = (int) $candidate;
					if ($bitrate > 0) {
						return $bitrate;
					}
				}
			}
		}

		return null;
	}

	protected function probeVideoDuration($filePath)
	{
		$ffprobe = $this->findExecutable('ffprobe');
		if ($ffprobe === null) {
			return null;
		}

		$command = sprintf(
						   "%s -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 %s",
						   escapeshellarg($ffprobe),
						   escapeshellarg($filePath)
						   );

		$output = array();
		$exitCode = null;
		exec($command, $output, $exitCode);
		if ($exitCode === 0 && count($output) > 0) {
			$candidate = trim($output[0]);
			if ($candidate !== '' && is_numeric($candidate)) {
				$duration = (float) $candidate;
				if ($duration > 0) {
					return $duration;
				}
			}
		}

		return null;
	}

	protected function normalizeFrameRateValue($value)
	{
		if ($value === null) {
			return null;
		}

		if (is_numeric($value)) {
			$rate = (float) $value;
			return $rate > 0 ? $rate : null;
		}

		if (is_string($value)) {
			$normalized = trim($value);
			if ($normalized === '') {
				return null;
			}

			if (is_numeric($normalized)) {
				$rate = (float) $normalized;
				return $rate > 0 ? $rate : null;
			}

			if (strpos($normalized, '/') !== false) {
				$parts = explode('/', $normalized, 2);
				if (count($parts) === 2) {
					$numerator = (float) $parts[0];
					$denominator = (float) $parts[1];
					if ($denominator !== 0.0) {
						$rate = $numerator / $denominator;
						return $rate > 0 ? $rate : null;
					}
				}
			}
		}

		return null;
	}

	protected function probeVideoStreamMetadata($filePath)
	{
		$ffprobe = $this->findExecutable('ffprobe');
		if ($ffprobe === null || !is_file($filePath)) {
			return null;
		}

		$command = sprintf(
						   "%s -v error -select_streams v:0 -show_entries stream=codec_name,width,height,avg_frame_rate,r_frame_rate -of json %s",
						   escapeshellarg($ffprobe),
						   escapeshellarg($filePath)
						   );

		$output = array();
		$exitCode = null;
		exec($command, $output, $exitCode);
		if ($exitCode !== 0 || empty($output)) {
			return null;
		}

		$json = json_decode(implode("\n", $output), true);
		if (!is_array($json) || empty($json['streams']) || !is_array($json['streams'][0])) {
			return null;
		}

		$stream = $json['streams'][0];
		$codec = isset($stream['codec_name']) ? trim((string) $stream['codec_name']) : '';
		$width = isset($stream['width']) ? (int) $stream['width'] : 0;
		$height = isset($stream['height']) ? (int) $stream['height'] : 0;
		$frameRateSource = null;
		if (!empty($stream['avg_frame_rate']) && $stream['avg_frame_rate'] !== '0/0') {
			$frameRateSource = $stream['avg_frame_rate'];
		} elseif (!empty($stream['r_frame_rate']) && $stream['r_frame_rate'] !== '0/0') {
			$frameRateSource = $stream['r_frame_rate'];
		}

		$frameRate = $this->normalizeFrameRateValue($frameRateSource);

		return array(
					 'codec' => $codec !== '' ? $codec : null,
					 'width' => $width > 0 ? $width : null,
					 'height' => $height > 0 ? $height : null,
					 'frameRate' => $frameRate,
					 );
	}

	protected function getPDOQueue()
	{
		if (isset($this->pdoQueue)) {
			return $this->pdoQueue;
		}

                $dbPath = $this->dataPath('/db/queue.sqlite');
                $this->pdoQueue = $this->getSQLiteConnection(
                                                                                                         $dbPath,
                                                                                                         [
                                                                                                          'errmode' => PDO::ERRMODE_EXCEPTION,
                                                                                                          'exec' => array(
                                                                                                                          'PRAGMA busy_timeout = 5000',
                                                                                                                          ),
                                                                                                          ]
                                                                                                         );

		return $this->pdoQueue;
	}

	protected function ensureLowRateVideoJob($sourcePath, $targetPath, $targetBitrate, $originalBitrate, array $context = array(), array $options = array())
	{
		try {
			$pdo = $this->getPDOQueue();
		} catch (Exception $exception) {
			return array(
						 'status' => 'queue_unavailable',
						 'message' => $exception->getMessage(),
						 'queueId' => null,
						 );
		}

		$now = new DateTimeImmutable('now');
		$timestamp = $now->format('Y-m-d H:i:s');
		$contextJson = json_encode($context, JSON_UNESCAPED_SLASHES);
		if ($contextJson === false) {
			$contextJson = null;
		}

		$force = !empty($options['force']);

		try {
                        $pdo->beginTransaction();

                        self::writeLog(
                                                'ensureLowRateVideoJob concurrency gate: target_path=' . $targetPath
                                                . ' source_path=' . $sourcePath
                                                . ' bitrate=' . $targetBitrate
                                                . ' force=' . ($force ? '1' : '0'),
                                                'queue'
                                                );

			$select = $pdo->prepare('SELECT id, status, updated_at FROM job_queue WHERE job_type = :job_type AND target_path = :target_path AND target_bitrate = :target_bitrate ORDER BY id DESC LIMIT 1');
			$select->execute(array(
								   ':job_type' => 'video_transcode',
								   ':target_path' => $targetPath,
								   ':target_bitrate' => $targetBitrate
								   ));
			$existing = $select->fetch(PDO::FETCH_ASSOC);

			if ($existing !== false) {
				$existingId = isset($existing['id']) ? (int) $existing['id'] : null;
				$existingStatus = isset($existing['status']) ? strtolower((string) $existing['status']) : '';
				if (in_array($existingStatus, array('queued', 'running'), true)) {
					$pdo->commit();
					return array(
								 'status' => 'already_processing',
								 'queueId' => $existingId,
								 );
				}

				if (!$force && $existingStatus === 'success' && is_file($targetPath)) {
					$pdo->commit();
					return array(
								 'status' => 'already_completed',
								 'queueId' => $existingId,
								 );
				}
			}

			if ($force && self::LOW_RATE_TRANSCODE_FORCE_COOLDOWN_SECONDS > 0) {
				$recentSuccessStmt = $pdo->prepare('SELECT id, updated_at FROM job_queue WHERE job_type = :job_type AND target_path = :target_path AND status = :status ORDER BY updated_at DESC LIMIT 1');
				$recentSuccessStmt->execute(array(
												  ':job_type' => 'video_transcode',
												  ':target_path' => $targetPath,
												  ':status' => 'success',
												  ));
				$recentSuccess = $recentSuccessStmt->fetch(PDO::FETCH_ASSOC);
				if ($recentSuccess !== false && !empty($recentSuccess['updated_at'])) {
					$completedAt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $recentSuccess['updated_at']);
					if ($completedAt instanceof DateTimeImmutable) {
						$elapsed = $now->getTimestamp() - $completedAt->getTimestamp();
						if ($elapsed < self::LOW_RATE_TRANSCODE_FORCE_COOLDOWN_SECONDS) {
							if ($pdo->inTransaction()) {
								$pdo->rollBack();
							}

							$logContext = array(
												'reason' => 'force_cooldown',
												'target_path' => $targetPath,
												'source_path' => $sourcePath,
												'queue_id' => isset($recentSuccess['id']) ? (int) $recentSuccess['id'] : null,
												'elapsed' => $elapsed,
												'cooldown' => self::LOW_RATE_TRANSCODE_FORCE_COOLDOWN_SECONDS,
												);
							$logPayload = json_encode($logContext, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
							if ($logPayload === false) {
								$logPayload = var_export($logContext, true);
							}
							self::writeLog('Low-rate transcode request rejected: force cooldown active ' . $logPayload, 'queue');

							return array(
										 'status' => 'throttled',
										 'message' => '直前に低レート動画の変換が完了したため、再実行までしばらくお待ちください。',
										 'queueId' => null,
										 );
						}
					}
				}
			}

                        $maxConcurrent = (int) self::MAX_CONCURRENT_LOW_RATE_TRANSCODES;
                        if ($maxConcurrent > 0) {
                                $concurrencyStmt = $pdo->prepare('SELECT COUNT(1) AS active_count FROM job_queue WHERE job_type = :job_type AND status IN (\'queued\', \'running\')');
                                $concurrencyStmt->execute(array(
                                                                                                ':job_type' => 'video_transcode',
                                                                                                ));
                                $activeColumn = $concurrencyStmt->fetchColumn();
                                if ($activeColumn === false) {
                                        self::writeLog('ensureLowRateVideoJob concurrency fetchColumn returned false; treating active_count as 0', 'queue');
                                        $activeCount = 0;
                                } else {
                                        $activeCount = (int) $activeColumn;
                                        self::writeLog('ensureLowRateVideoJob concurrency count: active=' . $activeCount . ' limit=' . $maxConcurrent, 'queue');
                                }

				if ($activeCount >= $maxConcurrent) {
					if ($pdo->inTransaction()) {
						$pdo->rollBack();
					}

					$logContext = array(
										'reason' => 'concurrency_limit',
										'target_path' => $targetPath,
										'source_path' => $sourcePath,
										'active' => $activeCount,
										'limit' => $maxConcurrent,
                                        );
					$logPayload = json_encode($logContext, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
					if ($logPayload === false) {
						$logPayload = var_export($logContext, true);
					}
					self::writeLog('Low-rate transcode request rejected: concurrency limit reached ' . $logPayload, 'queue');

					return array(
								 'status' => 'throttled',
								 'message' => '低レート動画の変換要求が混雑しているため、時間を置いて再度お試しください。',
								 'queueId' => null,
								 );
				}
			}

			$insert = $pdo->prepare('INSERT INTO job_queue (job_type, status, source_path, target_path, target_bitrate, original_bitrate, context, created_at, updated_at) VALUES (:job_type, :status, :source_path, :target_path, :target_bitrate, :original_bitrate, :context, :created_at, :updated_at)');
			$insert->execute(array(
								   ':job_type' => 'video_transcode',
								   ':status' => 'queued',
								   ':source_path' => $sourcePath,
								   ':target_path' => $targetPath,
								   ':target_bitrate' => $targetBitrate,
								   ':original_bitrate' => $originalBitrate,
								   ':context' => $contextJson,
								   ':created_at' => $timestamp,
								   ':updated_at' => $timestamp
								   ));

			$queueId = (int) $pdo->lastInsertId();
			$pdo->commit();
			return array(
						 'status' => 'queued',
						 'queueId' => $queueId,
						 );
		} catch (Exception $exception) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			return array(
						 'status' => 'error',
						 'message' => $exception->getMessage(),
						 'queueId' => null,
						 );
		}
	}

	protected function markQueueJobError($queueId, $message)
	{
		if ($queueId <= 0) {
			return;
		}

		try {
			$pdo = $this->getPDOQueue();
		} catch (Exception $exception) {
			$this->writeLog('Failed to obtain queue database connection: ' . $exception->getMessage(), 'queue');
			return;
		}

		try {
			$now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
			$stmt = $pdo->prepare(
								  'UPDATE job_queue
                                 SET status = :status,
                                     updated_at = :updated_at,
                                     finished_at = :finished_at,
                                     error_message = :error
                                 WHERE id = :id'
								  );
			$stmt->execute(array(
								 ':status' => 'error',
								 ':updated_at' => $now,
								 ':finished_at' => $now,
								 ':error' => substr((string) $message, 0, 2000),
								 ':id' => $queueId,
								 ));
		} catch (Exception $exception) {
			$this->writeLog('Failed to update queue status: ' . $exception->getMessage(), 'queue');
		}
	}

	protected function generateUniqid()
	{
		$randomId = substr(bin2hex(random_bytes(16)), 0, 23);

		if (strlen($randomId) !== 23) {
			throw new RuntimeException('Failed to generate ID with required length.');
		}

		return $randomId;
	}

	protected function generateAutoPassword($length = 4)
	{
		$characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		$charactersLength = strlen($characters);
		$randomString = '';

		for ($i = 0; $i < $length; $i++) {
			$index = random_int(0, $charactersLength - 1);
			$randomString .= $characters[$index];
		}

		return $randomString;
	}

	protected function getSecureRandomInt($min, $max)
	{
		if (!is_int($min) || !is_int($max)) {
			throw new InvalidArgumentException('getSecureRandomInt requires integer bounds.');
		}

		if ($min > $max) {
			throw new InvalidArgumentException('getSecureRandomInt requires the minimum to be less than or equal to the maximum.');
		}

		return random_int($min, $max);
	}

	protected function getDomain()
	{
        if (isset($_SERVER['HTTP_HOST'])) {
            $domain = $_SERVER['HTTP_HOST'];
        } elseif (isset($_SERVER['SERVER_NAME'])) {
            $domain = $_SERVER['SERVER_NAME'];
        } else {
            $domain = 'default';
        }

		return $domain;
	}		

	protected function encrypt($str)
	{
		$encrypted = openssl_encrypt($str, 'AES-128-ECB', $this->siteId);
		return bin2hex(openssl_encrypt($str, 'AES-128-ECB', $this->siteId));
	}

	protected function decrypt($str)
	{
		if ($str == "") {
			return $str;
		}

		$safeDomain = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $this->getDomain());		
		$cacheDir = '/dev/shm/' . $safeDomain;
		$cacheFilePath = $cacheDir . "/" . $str;
		if (file_exists($cacheFilePath) == true) {
			return file_get_contents($cacheFilePath);
		}
		$result = openssl_decrypt(hex2bin($str), 'AES-128-ECB', $this->siteId);
		file_put_contents($cacheFilePath, $result);
		
		return $result;	
	}

	protected function decryptWork($str)
	{
		if ($str == "") {
			return $str;
		}

		$safeDomain = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $this->getDomain());		
		$cacheDir = '/dev/shm/' . $safeDomain;
		$cacheFilePath = $cacheDir . "/" . $str;
		if (file_exists($cacheFilePath) == true) {
			return file_get_contents($cacheFilePath);
		}
		$result = openssl_decrypt(hex2bin($str), 'AES-128-ECB', "marmo-mixer");
		file_put_contents($cacheFilePath, $result);
		
		return $result;	
	}

	protected function getHash($str)
	{
	    return hash(self::HASH_ALGORITHM, $str);
	}

	protected function makeJsLocation($message, $path, $baseURL = NULL)
	{
		$jsonFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP;
		$normalizedPath = ltrim((string) $path, '/');
		$targetUrl = $baseURL === NULL
			? 'https://' . $this->getDomain() . '/' . $normalizedPath
			: rtrim($baseURL, '/') . '/' . $normalizedPath;
		$redirectLiteral = json_encode($targetUrl, $jsonFlags);
		if ($redirectLiteral === false) {
			$redirectLiteral = '"' . addslashes($targetUrl) . '"';
		}

		$displayMessage = null;
		if ($message !== NULL) {
			$rawMessage = (string) $message;
			if (trim($rawMessage) !== '') {
				$displayMessage = json_encode($rawMessage, $jsonFlags);
				if ($displayMessage === false) {
					$displayMessage = '"' . addslashes($rawMessage) . '"';
				}
			}
		}

		$scriptLines = [];
		$scriptLines[] = '(function () {';
		$scriptLines[] = '  var redirectUrl = ' . $redirectLiteral . ';';
		$scriptLines[] = '  var navigate = function () {';
		$scriptLines[] = '    try {';
		$scriptLines[] = '      window.location = redirectUrl;';
		$scriptLines[] = '    } catch (error) {';
		$scriptLines[] = '      window.location.href = redirectUrl;';
		$scriptLines[] = '    }';
		$scriptLines[] = '  };';
		$scriptLines[] = '  var doc = typeof document !== "undefined" ? document : null;';
		$scriptLines[] = '  var schedule = typeof setTimeout === "function" ? setTimeout : function (handler) {';
		$scriptLines[] = '    if (typeof handler === "function") {';
		$scriptLines[] = '      handler();';
		$scriptLines[] = '    }';
		$scriptLines[] = '  };';

		if ($displayMessage !== null) {
			$scriptLines[] = '  var message = ' . $displayMessage . ';';
			$scriptLines[] = '  var presentDialog = function () {';
			$scriptLines[] = '    if (!doc || !doc.body) {';
			$scriptLines[] = '      navigate();';
			$scriptLines[] = '      return;';
			$scriptLines[] = '    }';
			$scriptLines[] = '    var body = doc.body;';
			$scriptLines[] = '    var previousOverflow = body.style.overflow;';
			$scriptLines[] = '    body.style.overflow = "hidden";';
			$scriptLines[] = '    var overlay = doc.createElement("div");';
			$scriptLines[] = '    overlay.style.position = "fixed";';
			$scriptLines[] = '    overlay.style.top = "0";';
			$scriptLines[] = '    overlay.style.left = "0";';
			$scriptLines[] = '    overlay.style.right = "0";';
			$scriptLines[] = '    overlay.style.bottom = "0";';
			$scriptLines[] = '    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.45)";';
			$scriptLines[] = '    overlay.style.zIndex = "2147483647";';
			$scriptLines[] = '    overlay.style.display = "flex";';
			$scriptLines[] = '    overlay.style.alignItems = "center";';
			$scriptLines[] = '    overlay.style.justifyContent = "center";';
			$scriptLines[] = '    overlay.style.padding = "24px";';
			$scriptLines[] = '    var dialog = doc.createElement("div");';
			$scriptLines[] = '    dialog.setAttribute("role", "alertdialog");';
			$scriptLines[] = '    dialog.setAttribute("aria-modal", "true");';
			$scriptLines[] = '    dialog.tabIndex = -1;';
			$scriptLines[] = '    dialog.style.backgroundColor = "#fff";';
			$scriptLines[] = '    dialog.style.color = "#111827";';
			$scriptLines[] = '    dialog.style.borderRadius = "16px";';
			$scriptLines[] = '    dialog.style.boxShadow = "0 24px 60px rgba(15, 23, 42, 0.25)";';
			$scriptLines[] = '    dialog.style.maxWidth = "420px";';
			$scriptLines[] = '    dialog.style.width = "100%";';
			$scriptLines[] = '    dialog.style.padding = "32px 28px";';
			$scriptLines[] = '    dialog.style.fontFamily = "-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'Noto Sans JP\',sans-serif";';
			$scriptLines[] = '    dialog.style.lineHeight = "1.6";';
			$scriptLines[] = '    var messageNode = doc.createElement("p");';
			$scriptLines[] = '    messageNode.textContent = message;';
			$scriptLines[] = '    messageNode.style.margin = "0 0 24px 0";';
			$scriptLines[] = '    messageNode.style.fontSize = "16px";';
			$scriptLines[] = '    var button = doc.createElement("button");';
			$scriptLines[] = '    button.type = "button";';
			$scriptLines[] = '    button.textContent = "OK";';
			$scriptLines[] = '    button.style.display = "inline-flex";';
			$scriptLines[] = '    button.style.alignItems = "center";';
			$scriptLines[] = '    button.style.justifyContent = "center";';
			$scriptLines[] = '    button.style.padding = "12px 24px";';
			$scriptLines[] = '    button.style.backgroundColor = "#2563eb";';
			$scriptLines[] = '    button.style.color = "#fff";';
			$scriptLines[] = '    button.style.fontWeight = "600";';
			$scriptLines[] = '    button.style.fontSize = "16px";';
			$scriptLines[] = '    button.style.border = "none";';
			$scriptLines[] = '    button.style.borderRadius = "999px";';
			$scriptLines[] = '    button.style.cursor = "pointer";';
			$scriptLines[] = '    button.style.boxShadow = "0 12px 32px rgba(37, 99, 235, 0.35)";';
			$scriptLines[] = '    button.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";';
			$scriptLines[] = '    button.addEventListener("mouseenter", function () {';
			$scriptLines[] = '      button.style.transform = "translateY(-1px)";';
			$scriptLines[] = '      button.style.boxShadow = "0 14px 34px rgba(37, 99, 235, 0.45)";';
			$scriptLines[] = '    });';
			$scriptLines[] = '    button.addEventListener("mouseleave", function () {';
			$scriptLines[] = '      button.style.transform = "translateY(0)";';
			$scriptLines[] = '      button.style.boxShadow = "0 12px 32px rgba(37, 99, 235, 0.35)";';
			$scriptLines[] = '    });';
			$scriptLines[] = '    var settled = false;';
			$scriptLines[] = '    var cleanup = function () {';
			$scriptLines[] = '      if (settled) {';
			$scriptLines[] = '        return;';
			$scriptLines[] = '      }';
			$scriptLines[] = '      settled = true;';
			$scriptLines[] = '      body.style.overflow = previousOverflow || "";';
			$scriptLines[] = '      if (overlay.parentNode) {';
			$scriptLines[] = '        overlay.parentNode.removeChild(overlay);';
			$scriptLines[] = '      }';
			$scriptLines[] = '      navigate();';
			$scriptLines[] = '    };';
			$scriptLines[] = '    button.addEventListener("click", function (event) {';
			$scriptLines[] = '      event.preventDefault();';
			$scriptLines[] = '      cleanup();';
			$scriptLines[] = '    });';
			$scriptLines[] = '    overlay.addEventListener("click", function (event) {';
			$scriptLines[] = '      if (event.target === overlay) {';
			$scriptLines[] = '        cleanup();';
			$scriptLines[] = '      }';
			$scriptLines[] = '    });';
			$scriptLines[] = '    dialog.addEventListener("keydown", function (event) {';
			$scriptLines[] = '      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {';
			$scriptLines[] = '        event.preventDefault();';
			$scriptLines[] = '        cleanup();';
			$scriptLines[] = '      }';
			$scriptLines[] = '    });';
			$scriptLines[] = '    dialog.appendChild(messageNode);';
			$scriptLines[] = '    dialog.appendChild(button);';
			$scriptLines[] = '    overlay.appendChild(dialog);';
			$scriptLines[] = '    body.appendChild(overlay);';
			$scriptLines[] = '    schedule(function () {';
			$scriptLines[] = '      if (typeof button.focus === "function") {';
			$scriptLines[] = '        button.focus({ preventScroll: true });';
			$scriptLines[] = '      } else if (typeof dialog.focus === "function") {';
			$scriptLines[] = '        dialog.focus({ preventScroll: true });';
			$scriptLines[] = '      }';
			$scriptLines[] = '    });';
			$scriptLines[] = '  };';
			$scriptLines[] = '  if (doc && doc.readyState === "loading") {';
			$scriptLines[] = '    doc.addEventListener("DOMContentLoaded", presentDialog, { once: true });';
			$scriptLines[] = '  } else {';
			$scriptLines[] = '    presentDialog();';
			$scriptLines[] = '  }';
		} else {
			$scriptLines[] = '  navigate();';
		}
		$scriptLines[] = '})();';

		$script = implode("\n", $scriptLines);

		return '<script language="javascript" type="text/javascript">' . $script . '</script>';
	}

	protected function getPDOCommon()
	{
		if (isset($this->pdoCommon) == false) {
			$dbPath = $this->dataPath('/db/common.sqlite');
			$this->pdoCommon = $this->getSQLiteConnection(
														  $dbPath,
														  [
														   'attributes' => [
																			PDO::ATTR_STATEMENT_CLASS => ['LoggedPDOStatement', [$this]],
																			],
														   ]
														  );
		}
		return $this->pdoCommon;
	}

	protected function getPDOTarget()
	{
		if (isset($this->pdoTarget) == false) {
			$dbPath = $this->dataPath('/db/target.sqlite');
			$commonPath = $this->dataPath('/db/common.sqlite');

			$this->pdoTarget = $this->getSQLiteConnection(
														  $dbPath,
														  [
														   'attributes' => [
																			PDO::ATTR_STATEMENT_CLASS => ['LoggedPDOStatement', [$this]],
																			],
														   'init' => function (PDO $pdo) use ($commonPath) {
															   $quoted = str_replace("'", "''", $commonPath);
															   $pdo->exec("ATTACH DATABASE '" . $quoted . "' AS common");
														   },
														   ]
														  );
		}

		return $this->pdoTarget;
	}

	
        
        protected function getPDOContents()
        {
                if (isset($this->pdoContents) == false) {
                        $dbPath = $this->dataPath('/db/contents.sqlite');
                        if (is_file($dbPath) === false) {
                                throw new \RuntimeException('contents.sqlite is missing: ' . $dbPath);
                        }

                        $commonPath = $this->dataPath('/db/common.sqlite');

                        $this->pdoContents = $this->getSQLiteConnection(
                                $dbPath,
                                [
                                        'attributes' => [
                                                PDO::ATTR_STATEMENT_CLASS => ['LoggedPDOStatement', [$this]],
                                        ],
                                        'init' => function (PDO $pdo) use ($commonPath) {
                                                $quoted = str_replace("'", "''", $commonPath);
                                                $pdo->exec("ATTACH DATABASE '" . $quoted . "' AS common");
                                        },
                                ]
                        );
                }

                return $this->pdoContents;
        }
        // protected method

        protected function getSQLiteConnection(string $path, array $options = []): PDO
        {
                        if (!class_exists('LoggedPDOStatement')) {
                                self::requireFromShm('libs/LoggedPDO/class.LoggedPDO.php', __DIR__ . '/..');
                        }

                        $pdo = new PDO(
                                                     'sqlite:' . $path,
                                                     $options['username'] ?? null,
                                                     $options['password'] ?? null,
                                                     $options['attributes'] ?? []
                                                     );

                        $pdo->setAttribute(PDO::ATTR_ERRMODE, $options['errmode'] ?? PDO::ERRMODE_EXCEPTION);

			if (!empty($options['foreign_keys'])) {
				$pdo->exec('PRAGMA foreign_keys = ON;');
			}

			if (!empty($options['exec']) && is_array($options['exec'])) {
				foreach ($options['exec'] as $sql) {
					$pdo->exec($sql);
				}
			}

                        if (isset($options['init']) && is_callable($options['init'])) {
                                $options['init']($pdo);
                        }

                        return $pdo;
        }
        // protected method

        // Target
        protected function fetchTargetGoals($targetCode)
	{
		if ($targetCode === null || $targetCode === '') {
			return array();
		}

		

		$stmt = $this->getPDOTarget()->prepare(
											   'SELECT g.*, '
											   . 'creator.displayName AS createdByDisplayName, '
											   . 'updater.displayName AS updatedByDisplayName, '
											   . 'targetUser.displayName AS targetUserDisplayName '
											   . 'FROM targetGoals g '
											   . 'LEFT JOIN common.user creator ON g.createdByUserCode = creator.userCode '
											   . 'LEFT JOIN common.user updater ON g.updatedByUserCode = updater.userCode '
											   . 'LEFT JOIN common.user targetUser ON g.targetUserCode = targetUser.userCode '
											   . 'WHERE g.targetCode = ? AND (g.isDeleted IS NULL OR g.isDeleted = 0) '
											   . 'ORDER BY g.displayOrder ASC, g.updatedAt DESC, g.createdAt DESC, g.id DESC'
											   );
		$stmt->execute(array($targetCode));
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$goalCodes = array();
		foreach ($rows as $row) {
			if (!isset($row['goalCode'])) {
				continue;
			}
			$code = trim((string)$row['goalCode']);
			if ($code === '') {
				continue;
			}
			$goalCodes[] = $code;
		}

		$assigneesMap = $this->fetchGoalAssigneesForCodes($goalCodes);

		$goals = array();
		foreach ($rows as $row) {
			$goalCode = isset($row['goalCode']) ? trim((string)$row['goalCode']) : '';
			$assignees = ($goalCode !== '' && isset($assigneesMap[$goalCode])) ? $assigneesMap[$goalCode] : array();
			$payload = $this->buildGoalPayload($row, $assignees);
			if ($payload != null) {
				$goals[] = $payload;
			}
		}

		return $goals;
	}

	protected function fetchTargetGoalByCode($goalCode)
	{
		if ($goalCode === null || $goalCode === '') {
			return null;
		}

		

		$stmt = $this->getPDOTarget()->prepare(
											   'SELECT g.*, '
											   . 'creator.displayName AS createdByDisplayName, '
											   . 'updater.displayName AS updatedByDisplayName, '
											   . 'targetUser.displayName AS targetUserDisplayName '
											   . 'FROM targetGoals g '
											   . 'LEFT JOIN common.user creator ON g.createdByUserCode = creator.userCode '
											   . 'LEFT JOIN common.user updater ON g.updatedByUserCode = updater.userCode '
											   . 'LEFT JOIN common.user targetUser ON g.targetUserCode = targetUser.userCode '
											   . 'WHERE g.goalCode = ? AND (g.isDeleted IS NULL OR g.isDeleted = 0) '
											   . 'LIMIT 1'
											   );
		$stmt->execute(array($goalCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row == null) {
			return null;
		}

		$assigneesMap = $this->fetchGoalAssigneesForCodes(array($goalCode));
		$assignees = isset($assigneesMap[$goalCode]) ? $assigneesMap[$goalCode] : array();

		return $this->buildGoalPayload($row, $assignees);
	}

	protected function fetchGoalAssigneesForCodes($goalCodes)
	{
		$map = array();

		if (!is_array($goalCodes) || empty($goalCodes)) {
			return $map;
		}

		$filtered = array();
		foreach ($goalCodes as $code) {
			if ($code === null) {
				continue;
			}
			$trimmed = trim((string)$code);
			if ($trimmed === '') {
				continue;
			}
			$filtered[$trimmed] = true;
		}

		if (empty($filtered)) {
			return $map;
		}

		$goalCodeList = array_keys($filtered);
		$placeholders = implode(',', array_fill(0, count($goalCodeList), '?'));

		$pdo = $this->getPDOTarget();
		$stmt = $pdo->prepare(
							  'SELECT a.goalCode, a.userCode, a.displayOrder, u.displayName '
							  . 'FROM targetGoalAssignees a '
							  . 'LEFT JOIN common.user u ON a.userCode = u.userCode '
							  . 'WHERE a.goalCode IN (' . $placeholders . ') '
							  . 'ORDER BY a.goalCode ASC, a.displayOrder ASC, a.userCode ASC'
							  );
		$stmt->execute($goalCodeList);

		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			if (!isset($row['goalCode'])) {
				continue;
			}
			$goalCode = trim((string)$row['goalCode']);
			if ($goalCode === '') {
				continue;
			}

			$userCode = isset($row['userCode']) ? trim((string)$row['userCode']) : '';
			if ($userCode === '') {
				continue;
			}

			$displayName = isset($row['displayName']) ? trim((string)$row['displayName']) : '';
			if ($displayName === '') {
				$userInfo = $this->getUserInfo($userCode);
				if ($userInfo != null && isset($userInfo['displayName'])) {
					$displayName = $userInfo['displayName'];
				}
			}

			if (!isset($map[$goalCode])) {
				$map[$goalCode] = array();
			}

			$map[$goalCode][] = array(
									  'userCode' => $userCode,
									  'displayName' => $displayName,
									  );
		}

		return $map;
	}

	private function buildGoalPayload($row, $assignees = array())
	{
		if ($row == null) {
			return null;
		}

		if (!isset($row['goalCode']) || trim((string)$row['goalCode']) === '') {
			return null;
		}

		$goalCode = trim((string)$row['goalCode']);
		$targetCode = isset($row['targetCode']) ? $row['targetCode'] : null;
		$title = isset($row['title']) ? $row['title'] : null;
		$targetValue = isset($row['targetValue']) ? $row['targetValue'] : null;
		$evidence = isset($row['evidence']) ? $row['evidence'] : null;
		$memo = isset($row['memo']) ? $row['memo'] : null;
		$createdAt = isset($row['createdAt']) ? $row['createdAt'] : null;
		$updatedAt = isset($row['updatedAt']) ? $row['updatedAt'] : null;

		$targetUserCode = isset($row['targetUserCode']) ? trim((string)$row['targetUserCode']) : '';
		$targetUserId = null;
		if (isset($row['targetUserId']) && $row['targetUserId'] !== null && $row['targetUserId'] !== '') {
			$targetUserId = (int)$row['targetUserId'];
			if ($targetUserId <= 0) {
				$targetUserId = null;
			}
		}

		$targetUsers = array();
		if (is_array($assignees)) {
			foreach ($assignees as $assignee) {
				if (!is_array($assignee)) {
					continue;
				}
				$assigneeCode = isset($assignee['userCode']) ? trim((string)$assignee['userCode']) : '';
				if ($assigneeCode === '') {
					continue;
				}
				$assigneeName = isset($assignee['displayName']) ? trim((string)$assignee['displayName']) : '';
				if ($assigneeName === '') {
					$userInfo = $this->getUserInfo($assigneeCode);
					if ($userInfo != null && isset($userInfo['displayName'])) {
						$assigneeName = $userInfo['displayName'];
					}
				}
				$targetUsers[] = array(
									   'userCode' => $assigneeCode,
									   'displayName' => $assigneeName,
									   );
			}
		}

                if (!empty($targetUsers) && isset($targetUsers[0]['userCode'])) {
                        $targetUserCode = $targetUsers[0]['userCode'];
                }

                $targetUserScope = empty($targetUsers) ? 'all' : 'users';

		$createdByUserId = null;
		if (isset($row['createdByUserId']) && $row['createdByUserId'] !== null && $row['createdByUserId'] !== '') {
			$createdByUserId = (int)$row['createdByUserId'];
			if ($createdByUserId <= 0) {
				$createdByUserId = null;
			}
		}

		$updatedByUserId = null;
		if (isset($row['updatedByUserId']) && $row['updatedByUserId'] !== null && $row['updatedByUserId'] !== '') {
			$updatedByUserId = (int)$row['updatedByUserId'];
			if ($updatedByUserId <= 0) {
				$updatedByUserId = null;
			}
		}

		$createdByUserCode = isset($row['createdByUserCode']) ? $row['createdByUserCode'] : null;
		$updatedByUserCode = isset($row['updatedByUserCode']) ? $row['updatedByUserCode'] : null;

		$createdByDisplayName = isset($row['createdByDisplayName']) ? $row['createdByDisplayName'] : null;
		if (($createdByDisplayName === null || $createdByDisplayName === '') && $createdByUserCode !== null && $createdByUserCode !== '') {
			$userInfo = $this->getUserInfo($createdByUserCode);
			if ($userInfo != null && isset($userInfo['displayName'])) {
				$createdByDisplayName = $userInfo['displayName'];
			}
		}

		$updatedByDisplayName = isset($row['updatedByDisplayName']) ? $row['updatedByDisplayName'] : null;
		if (($updatedByDisplayName === null || $updatedByDisplayName === '') && $updatedByUserCode !== null && $updatedByUserCode !== '') {
			$userInfo = $this->getUserInfo($updatedByUserCode);
			if ($userInfo != null && isset($userInfo['displayName'])) {
				$updatedByDisplayName = $userInfo['displayName'];
			}
		}

		$targetUserDisplayName = null;
		if (!empty($targetUsers)) {
			$firstDisplayName = isset($targetUsers[0]['displayName']) ? $targetUsers[0]['displayName'] : null;
			if ($firstDisplayName !== null && $firstDisplayName !== '') {
				$targetUserDisplayName = $firstDisplayName;
			}
		}
		if ($targetUserDisplayName === null || $targetUserDisplayName === '') {
			$targetUserDisplayName = isset($row['targetUserDisplayName']) ? $row['targetUserDisplayName'] : null;
		}
		if (($targetUserDisplayName === null || $targetUserDisplayName === '') && $targetUserCode !== '') {
			$userInfo = $this->getUserInfo($targetUserCode);
			if ($userInfo != null && isset($userInfo['displayName'])) {
				$targetUserDisplayName = $userInfo['displayName'];
			}
		}

		$displayOrder = 0;
		if (isset($row['displayOrder']) && $row['displayOrder'] !== null && $row['displayOrder'] !== '') {
			$displayOrder = (int)$row['displayOrder'];
		}

                return array(
                                         'goalCode' => $goalCode,
                                         'targetCode' => $targetCode,
					 'title' => $title,
                                         'targetValue' => $targetValue,
                                         'evidence' => $evidence,
                                         'memo' => $memo,
                                         'targetUserId' => $targetUserId,
                                         'targetUserCode' => $targetUserCode,
                                         'targetUserDisplayName' => $targetUserDisplayName,
                                         'targetUserScope' => $targetUserScope,
                                         'targetUsers' => $targetUsers,
                                         'createdAt' => $createdAt,
                                         'updatedAt' => $updatedAt,
					 'createdByUserId' => $createdByUserId,
					 'createdByUserCode' => $createdByUserCode,
					 'createdByDisplayName' => $createdByDisplayName,
					 'updatedByUserId' => $updatedByUserId,
					 'updatedByUserCode' => $updatedByUserCode,
                                         'updatedByDisplayName' => $updatedByDisplayName,
                                         'displayOrder' => $displayOrder
                                         );
        }
        // Target

        protected function userCanAccessTarget($targetRow, $targetCode, $userCode)
        {
                Base::requireFromShm('class/class.TargetManagementUtil.php');

                if ($targetRow == null || $userCode === null || $userCode === '') {
                        return false;
                }

                $pdoTarget = $this->getPDOTarget();
                $pdoCommon = $this->getPDOCommon();
                $userInfo = $this->getUserInfo($userCode);

                if (array_key_exists('createdByUserCode', $targetRow) && $targetRow['createdByUserCode'] === $userCode) {
                        return true;
                }

                if (array_key_exists('assignedUserCode', $targetRow) && $targetRow['assignedUserCode'] === $userCode) {
                        return true;
                }

                if (TargetManagementUtil::isTargetAssignedToUser($targetCode, $userCode, $pdoTarget)) {
                        return true;
                }

                if (TargetManagementUtil::isTargetParticipatedByUser($targetCode, $userCode, $pdoTarget)) {
                        return true;
                }

                return false;
        }
}

?>
