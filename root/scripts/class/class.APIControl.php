<?php

// define('APICONTROL_DEBUG', true);

class APIControl extends Base
{
    private $dbPath;
    private $domainCacheDir;
    /** @var bool デバッグログ出力の有効/無効（constructorで決定） */
    private $debugEnabled = false;

    public function __construct($context = null)
    {
        parent::__construct($context);

        // --- デバッグ有効化フラグを決定（優先順位: GET/POST > SESSION > ENV > CONST） ---
        $this->debugEnabled = $this->resolveDebugEnabled();

        $csvFilePath = "class/class.APIControl.csv";

        // リクエストされたドメイン名を取得
        if (isset($_SERVER['HTTP_HOST'])) {
            $domain = $_SERVER['HTTP_HOST'];
        } elseif (isset($_SERVER['SERVER_NAME'])) {
            $domain = $_SERVER['SERVER_NAME'];
        } else {
            $domain = 'default';
        }

        // ドメイン名を安全なディレクトリ名に変換
        $safeDomain = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $domain);

        // /dev/shm 内のドメイン専用キャッシュディレクトリ
        $this->domainCacheDir = '/dev/shm/' . $safeDomain;

        // /dev/shm に SQLite データベースのパスを設定
        $this->dbPath = $this->domainCacheDir . '/apicontrol.db';

        // DBの初期化・更新チェック
        if (file_exists($this->dbPath)) {
            $csvMTime = @filemtime($csvFilePath);
            $dbMTime  = @filemtime($this->dbPath);

            if ($csvMTime === false || $dbMTime === false || $csvMTime > $dbMTime) {
                @unlink($this->dbPath);
                $this->debugLog('DB recreated due to CSV newer or mtime check failed', [
                    'csvPath' => $csvFilePath,
                    'dbPath'  => $this->dbPath,
                    'csvMTime'=> $csvMTime,
                    'dbMTime' => $dbMTime,
                ]);
                $this->initializeDatabase($csvFilePath);
            } else {
                $this->debugLog('DB reuse (no rebuild needed)', [
                    'dbPath'  => $this->dbPath,
                    'csvPath' => $csvFilePath,
                ]);
            }
        } else {
            $this->debugLog('DB not found, creating new one', [
                'dbPath'  => $this->dbPath,
                'csvPath' => $csvFilePath,
            ]);
            $this->initializeDatabase($csvFilePath);
        }
    }

    /**
     * デバッグ有効化判定
     * 優先順位: GET/POST(apicontrol_debug) > SESSION(APICONTROL_DEBUG) > ENV(APICONTROL_DEBUG) > CONST(APICONTROL_DEBUG)
     */
    private function resolveDebugEnabled(): bool
    {
        // GET/POST
        if (isset($_GET['apicontrol_debug'])) {
            $v = $_GET['apicontrol_debug'];
            return $this->toBool($v);
        }
        if (isset($_POST['apicontrol_debug'])) {
            $v = $_POST['apicontrol_debug'];
            return $this->toBool($v);
        }
        // SESSION
        if (isset($_SESSION['APICONTROL_DEBUG'])) {
            return $this->toBool($_SESSION['APICONTROL_DEBUG']);
        }
        // ENV
        $env = getenv('APICONTROL_DEBUG');
        if ($env !== false) {
            return $this->toBool($env);
        }
        // CONST
        if (defined('APICONTROL_DEBUG')) {
            return $this->toBool(constant('APICONTROL_DEBUG'));
        }
        return false;
    }

    /** 任意値をboolean解釈するヘルパ */
    private function toBool($v): bool
    {
        if (is_bool($v)) return $v;
        if (is_int($v))  return $v !== 0;
        if (is_string($v)) {
            $filter = filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($filter !== null) return $filter;
            // Fallback: 文字列が "0" 以外なら true とするPHPのboolキャストは誤解を招くため避ける
            return strtolower(trim($v)) === '1';
        }
        return !empty($v);
    }

    /** デバッグログ出力（Base::writeLog() を利用） */
    private function debugLog(string $message, array $context = []): void
    {
        if (!$this->debugEnabled) {
            return;
        }
        $line = '[APIControl] ' . $message;

        if (!empty($context)) {
            try {
                $line .= ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            } catch (\Throwable $e) {
                $line .= ' [context_json_error=' . $e->getMessage() . ']';
            }
        }

        try {
            if (method_exists($this, 'writeLog')) {
                $this->writeLog($line);
            } else {
                error_log($line);
            }
        } catch (\Throwable $e) {
            // ログ出力自体の失敗は error_log にフォールバック
            error_log('[APIControl] writeLog failed: ' . $e->getMessage() . ' | ' . $line);
        }
    }

    private function initializeDatabase(string $csvFilePath): void
    {
        if (!file_exists($this->domainCacheDir)) {
            if (!mkdir($this->domainCacheDir, 0777, true) && !is_dir($this->domainCacheDir)) {
                throw new Exception("Failed to create cache directory: {$this->domainCacheDir}");
            }
        }

        $pdo = new PDO("sqlite:" . $this->dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $pdo->exec("
            CREATE TABLE permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_name TEXT NOT NULL,
                method_type TEXT NOT NULL,
                require_login BOOLEAN NOT NULL,
                require_supervisor BOOLEAN NOT NULL,
                require_operator BOOLEAN NOT NULL,
                url_condition TEXT
            );
        ");

        $this->loadDataFromCsv($pdo, $csvFilePath);
        $this->debugLog('DB initialized from CSV', [
            'dbPath'  => $this->dbPath,
            'csvPath' => $csvFilePath,
        ]);
    }

    private function loadDataFromCsv(PDO $pdo, string $csvFilePath): void
    {
        if (!file_exists($csvFilePath)) {
            throw new Exception("CSV file not found: $csvFilePath");
        }

        $handle = fopen($csvFilePath, 'r');
        if ($handle === false) {
            throw new Exception("Unable to open CSV file: $csvFilePath");
        }

        $header = fgetcsv($handle, 0, ",", "\"", "\\");
        if ($header === false) {
            throw new Exception("CSV file is empty or invalid: $csvFilePath");
        }

        $headerMap = array_flip($header);
        $missingHeaders = (
            !isset($headerMap['class_name']) ||
            !isset($headerMap['method_type']) ||
            !isset($headerMap['require_login']) ||
            !isset($headerMap['require_supervisor']) ||
            !isset($headerMap['require_operator']) ||
            !isset($headerMap['url_condition'])
        );

        if ($missingHeaders) {
            throw new Exception("CSV file does not contain required headers.");
        }

        $stmt = $pdo->prepare("
            INSERT INTO permissions (class_name, method_type, require_login, require_supervisor, require_operator, url_condition) 
            VALUES (:class_name, :method_type, :require_login, :require_supervisor, :require_operator, :url_condition)
        ");

        while (($data = fgetcsv($handle, 0, ",", "\"", "\\")) !== false) {
            $stmt->execute([
                ':class_name'          => $data[$headerMap['class_name']],
                ':method_type'         => $data[$headerMap['method_type']],
                ':require_login'       => filter_var($data[$headerMap['require_login']], FILTER_VALIDATE_BOOLEAN),
                ':require_supervisor'  => filter_var($data[$headerMap['require_supervisor']], FILTER_VALIDATE_BOOLEAN),
                ':require_operator'    => filter_var($data[$headerMap['require_operator']], FILTER_VALIDATE_BOOLEAN),
                ':url_condition'       => $data[$headerMap['url_condition']] ?? null,
            ]);
        }

        fclose($handle);
    }

    public function canAccess(string $className, string $methodType): bool
    {
        /**
         * 【既存仕様】グループコードが存在する場合は
         *  'isSupervisor' . $_SESSION['groupCode'] と
         *  'isOperator' . $_SESSION['groupCode']
         *  のセッション値も考慮して権限を判断
         */

        // グループコードを取得（存在しない場合は null）
        $groupCode = $_SESSION['groupCode'] ?? null;

        // isSupervisor, isOperator をまとめて管理
        $isSupervisor = false;
        $isOperator   = false;

        // グループコードがある場合は "isSupervisor_{groupCode}" なども確認
        if ($groupCode) {
            $isSupervisor = !empty($_SESSION['isSupervisor']) || !empty($_SESSION['isSupervisor_' . $groupCode]);
            $isOperator   = !empty($_SESSION['isOperator'])   || !empty($_SESSION['isOperator_'  . $groupCode]);
        } else {
            // グループコードが無い場合は従来どおり
            $isSupervisor = !empty($_SESSION['isSupervisor']);
            $isOperator   = !empty($_SESSION['isOperator']);
        }

        // Supervisor 権限が true の場合はすべて許可（bypass）
        if ($isSupervisor) {
            $this->debugLog('Access granted (supervisor bypass)', [
                'class'       => $className,
                'method'      => $methodType,
                'groupCode'   => $groupCode,
                'isSupervisor'=> $isSupervisor,
                'isOperator'  => $isOperator,
            ]);
            return true;
        }

        try {
            $pdo = new PDO("sqlite:" . $this->dbPath);
            $stmt = $pdo->prepare("
                SELECT require_login, require_supervisor, require_operator, url_condition
                FROM permissions
                WHERE class_name = :class_name AND method_type = :method_type
            ");
            $stmt->execute([
                ':class_name' => $className,
                ':method_type'=> $methodType,
            ]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->debugLog('Access denied (NO_DEFINITION)', [
                    'class'  => $className,
                    'method' => $methodType,
                ]);
                return false; // 定義がなければデフォルトで deny
            }

            // 値を厳密にbooleanへ
            $require_login      = (bool)$result['require_login'];
            $require_supervisor = (bool)$result['require_supervisor'];
            $require_operator   = (bool)$result['require_operator'];
            $url_condition      = $result['url_condition'] ?? '';

            // ログイン必須の場合にチェック
            if ($require_login && empty($_SESSION['userId']) && empty($_SESSION['groupCode'])) {
                $this->debugLog('Access denied (LOGIN_REQUIRED)', [
                    'class'              => $className,
                    'method'             => $methodType,
                    'require_login'      => $require_login,
                    'session_userId'     => $_SESSION['userId'] ?? null,
                    'session_groupCode'  => $_SESSION['groupCode'] ?? null,
                ]);
                return false; // ログイン必須だが、ログイン情報が存在しない
            }

            // Supervisor必須 → SupervisorかOperatorでないとNG（従来仕様）
            if ($require_supervisor && !$isSupervisor && !$isOperator) {
                $this->debugLog('Access denied (SUPERVISOR_REQUIRED)', [
                    'class'              => $className,
                    'method'             => $methodType,
                    'require_supervisor' => $require_supervisor,
                    'isSupervisor'       => $isSupervisor,
                    'isOperator'         => $isOperator,
                ]);
                return false;
            }

            // Operator必須 → isOperator が false ならNG
            if ($require_operator && !$isOperator) {
                $this->debugLog('Access denied (OPERATOR_REQUIRED)', [
                    'class'            => $className,
                    'method'           => $methodType,
                    'require_operator' => $require_operator,
                    'isOperator'       => $isOperator,
                ]);
                return false;
            }

            // URL参照元が条件付き
            $canonicalReferrer = null;
            if (!empty($url_condition)) {
                $rawReferrer = $_SERVER['HTTP_REFERER'] ?? null;
                if ($rawReferrer === null || $rawReferrer === '') {
                    $this->debugLog('Access denied (URL_CONDITION_MISSING_REFERRER)', [
                        'class'         => $className,
                        'method'        => $methodType,
                        'url_condition' => $url_condition,
                    ]);
                    return false;
                }

                try {
                    $normalizedReferrer = Util::normalizeOptionalUrl($rawReferrer, 2048);
                } catch (UrlNormalizationException $e) {
                    $this->debugLog('Access denied (URL_CONDITION_NORMALIZATION_FAILED)', [
                        'class'         => $className,
                        'method'        => $methodType,
                        'url_condition' => $url_condition,
                        'referrer_raw'  => $rawReferrer,
                        'error'         => $e->getMessage(),
                    ]);
                    return false;
                } catch (\Throwable $e) {
                    $this->debugLog('Access denied (URL_CONDITION_NORMALIZATION_ERROR)', [
                        'class'         => $className,
                        'method'        => $methodType,
                        'url_condition' => $url_condition,
                        'referrer_raw'  => $rawReferrer,
                        'error'         => $e->getMessage(),
                    ]);
                    return false;
                }

                if ($normalizedReferrer === null) {
                    $this->debugLog('Access denied (URL_CONDITION_EMPTY_AFTER_NORMALIZATION)', [
                        'class'         => $className,
                        'method'        => $methodType,
                        'url_condition' => $url_condition,
                        'referrer_raw'  => $rawReferrer,
                    ]);
                    return false;
                }

                $referrerParts = parse_url($normalizedReferrer);
                if ($referrerParts === false) {
                    $this->debugLog('Access denied (URL_CONDITION_PARSE_FAILED)', [
                        'class'                 => $className,
                        'method'                => $methodType,
                        'url_condition'         => $url_condition,
                        'referrer_normalized'   => $normalizedReferrer,
                    ]);
                    return false;
                }

                $host = $referrerParts['host'] ?? '';
                if ($host !== '' && isset($referrerParts['port'])) {
                    $host .= ':' . $referrerParts['port'];
                }

                $path = $referrerParts['path'] ?? '';
                $canonicalReferrer = '';

                if ($host !== '') {
                    $canonicalReferrer .= $host;
                }

                if ($path !== '') {
                    $canonicalReferrer .= $path;
                }

                if ($canonicalReferrer === '') {
                    $this->debugLog('Access denied (URL_CONDITION_CANONICAL_EMPTY)', [
                        'class'                 => $className,
                        'method'                => $methodType,
                        'url_condition'         => $url_condition,
                        'referrer_normalized'   => $normalizedReferrer,
                    ]);
                    return false;
                }

                if (strpos($canonicalReferrer, $url_condition) === false) {
                    $this->debugLog('Access denied (URL_CONDITION)', [
                        'class'                 => $className,
                        'method'                => $methodType,
                        'url_condition'         => $url_condition,
                        'referrer_raw'          => $rawReferrer,
                        'referrer_normalized'   => $normalizedReferrer,
                        'referrer_canonical'    => $canonicalReferrer,
                    ]);
                    return false; // 指定されたURLが条件を満たしていない
                }
            }

            // ここまで到達＝許可
            $this->debugLog('Access granted', [
                'class'              => $className,
                'method'             => $methodType,
                'require_login'      => $require_login,
                'require_supervisor' => $require_supervisor,
                'require_operator'   => $require_operator,
                'url_condition'      => $url_condition,
                'referrer_canonical' => $canonicalReferrer,
                'groupCode'          => $groupCode,
                'isSupervisor'       => $isSupervisor,
                'isOperator'         => $isOperator,
            ]);
            return true;

        } catch (PDOException $e) {
            $this->debugLog('Access denied (DB_ERROR)', [
                'class'   => $className,
                'method'  => $methodType,
                'message' => $e->getMessage(),
            ]);
            error_log("Database error: " . $e->getMessage());
            return false;
        }
    }
}

?>
