<?php
/**
 *  DataService ? 汎用データ保存 API（ユーザー所有制御版）
 *
 *  ──────────────────────────────────────────────────────────
 *    ? 保存先      : /dataService/buckets/{bucket}/{key}
 *    ? SQLite (meta): /db/dataService.sqlite
 *    ? PHP          : 7.4.33   /  SQLite 3.37.2
 *
 *  ──────────────────────────────────────────────────────────
 *  サポート API (request.php?requestType=DataService)
 *    type=DataSave     : 保存(UPSERT)          必須: bucket,key,(jsonData|file)
 *    type=DataList     : 一覧取得             必須: bucket
 *    type=DataGetFile  : ファイル取得         必須: bucket,key
 *    type=DataDelete   : 1件削除             必須: bucket,key
 *    type=DataInit     : バケット/全削除      任意: bucket
 *
 *  ※ CSV のアクセス定義例（class.APIControl.csv）
 *      DataService,DataSave,true,,,,false
 *      DataService,DataList,true,,,,false
 *      DataService,DataGetFile,true,,,,false
 *      DataService,DataDelete,true,,,,false
 *      DataService,DataInit,true,true,true,,false
 */

class DataService extends Base
{
    private const DEFAULT_PAGE_SIZE = 50;
    private const MAX_PAGE_SIZE = 50;

    /** @var PDO */
    private PDO $pdo;
	
    /*===================== Ctor =====================*/
    public function __construct($context)
    {
        parent::__construct($context);

		$this->dataServiceBasePath = $this->dataBasePath . '/dataService';
		$this->dataServiceDBFile   = $this->dataBasePath . '/db/dataService.sqlite';
		
        $this->initIfNeeded();                 // 初期化 (ディレクトリ / DB)
    }

    /*=================== validation ===================*/
    protected function validationDataSave(): void
    {
        if (
            empty($this->params['bucket']) ||
            empty($this->params['key'])    ||
            (empty($this->params['jsonData']) && empty($this->files['file']))
			) {
            throw new Exception('invalid parameter(DataSave)');
        }
    }
	
    protected function validationDataList(): void
    {
        if (empty($this->params['bucket'])) {
            throw new Exception('bucket required');
        }
    }
	
    protected function validationDataGetFile(): void
    {
        if (empty($this->params['bucket']) || empty($this->params['key'])) {
            throw new Exception('bucket/key required');
        }
    }
	
    protected function validationDataDelete(): void
    {
		$this->writeLog("testX");		
        if (empty($this->params['bucket']) || empty($this->params['key'])) {
            throw new Exception('bucket/key required');
        }
    }
    /* DataInit は bucket 任意 */
	
    /*#######################################################
     *  ── コア処理 ──
     *#####################################################*/
	
    /**
     *  DataSave ? JSON もしくは multipart/form-data で保存
     *              既存レコードが自分以外所有なら 403
     */
    public function procDataSave(): void
    {
        $this->validationDataSave();

        $bucket = $this->sanitize($this->params['bucket']);
        $key    = $this->sanitize($this->params['key']);
        $userId = $this->currentUserId();

        /*====== 所有者チェック ======*/
        $owner = Util::dataServiceGetOwner($this->pdo, $bucket, $key);
        if ($owner !== null && $owner !== $userId) {
            throw new Exception('forbidden: not owner');
        }

        $bucketDir = $this->ensureBucket($bucket);
        $destinationPath = "{$bucketDir}/{$key}";

        $fileInfo = !empty($this->files['file'])
            ? Util::dataServiceHandleUpload($this->files['file'], $destinationPath)
            : Util::dataServiceHandleJsonSave($destinationPath, $this->params['jsonData'], $key);

        if ($fileInfo['isVideo']) {
            $this->scheduleLowRateVideoTranscode(
                $destinationPath,
                array(
                    'scope' => 'data_service_save',
                    'bucket' => $bucket,
                    'key' => $key,
                    'fileName' => $fileInfo['fileName'],
                    'mimeType' => $fileInfo['mimeType']
                )
            );
        }

        /*====== メタ UPSERT ======*/
        Util::dataServiceUpsertMeta(
            $this->pdo,
            $bucket,
            $key,
            $userId,
            $fileInfo['fileName'],
            $fileInfo['mimeType'],
            $fileInfo['size'],
            $owner
        );

        $this->response = ['result' => 'ok'];
    }

    /**
     *  DataList ? 自分が作成したオブジェクトだけを返却
     */
    public function procDataList(): void
    {
        $this->validationDataList();

        $bucket = $this->sanitize($this->params['bucket']);
        $userId = $this->currentUserId();

        $pagination = $this->resolveDataListPagination();
        $listResult = Util::dataServiceList(
            $this->pdo,
            $bucket,
            $userId,
            $pagination['limit'],
            $pagination['offset']
        );

        $items = $listResult['items'];
        $totalCount = $listResult['totalCount'];
        $pageSize = $pagination['pageSize'];
        $currentPage = $pagination['page'];
        $totalPages = $pageSize > 0 ? (int)ceil($totalCount / $pageSize) : 0;
        $hasNext = ($pagination['offset'] + count($items)) < $totalCount;
        $hasPrevious = $pagination['page'] > 1 && $totalCount > 0;

        $this->response = [
            'items' => $items,
            'pagination' => [
                'page' => $currentPage,
                'pageSize' => $pageSize,
                'limit' => $pagination['limit'],
                'offset' => $pagination['offset'],
                'totalCount' => $totalCount,
                'totalPages' => $totalPages,
                'hasNext' => $hasNext,
                'hasPrevious' => $hasPrevious,
            ],
        ];
    }

    /**
     *  DataGetFile ? 作成者のみ取得可能
     */
    public function procDataGetFile(): void
    {
        $this->validationDataGetFile();

        $bucket = $this->sanitize($this->params['bucket']);
        $key    = $this->sanitize($this->params['key']);
        $userId = $this->currentUserId();

        $meta = Util::dataServiceFetchMeta($this->pdo, $bucket, $key);

        if (!$meta || $meta['userId'] !== $userId) {
            $this->status = parent::RESULT_ERROR;
            $this->errorReason = 'forbidden';
            return;
        }

        $errorReason = null;
        if (!Util::streamFileDownload($this->dataServiceBasePath . "/buckets/{$bucket}", $key, $meta['fileName'], $errorReason)) {
            $this->status = parent::RESULT_ERROR;
            $this->errorReason = $errorReason ?? 'notfound';
            return;
        }

        $this->noOutput = true;
    }

    /**
     *  DataDelete ? 自分が作ったデータのみ削除
     */
    public function procDataDelete(): void
    {
        $this->validationDataDelete();

        $bucket = $this->sanitize($this->params['bucket']);
        $key    = $this->sanitize($this->params['key']);
        $userId = $this->currentUserId();

        $owner = Util::dataServiceGetOwner($this->pdo, $bucket, $key);
        if ($owner !== $userId) {
            throw new Exception('forbidden');
        }
        // メタ削除
        $this->pdo->prepare('DELETE FROM objects WHERE bucket=? AND "key"=?')->execute([$bucket,$key]);

        // 実ファイル削除
        $filePath = $this->dataServiceBasePath . "/buckets/{$bucket}/{$key}";
        Util::deleteFileIfExists($filePath);
        $this->response = ['result' => 'deleted'];
    }

    /**
     *  DataInit ? バケット削除／全削除
     *             Supervisor/Operator 制御は APIControl 側で行う
     */
    public function procDataInit(): void
    {
        // validation 不要（bucket 任意）
        if (!empty($this->params['bucket'])) {
            $bucket = $this->sanitize($this->params['bucket']);
            $this->pdo->prepare('DELETE FROM objects WHERE bucket=?')->execute([$bucket]);
            Util::recursiveRemoveDirectory($this->dataServiceBasePath . "/buckets/{$bucket}");
        } else {
            $this->pdo->exec('DELETE FROM objects');
            Util::recursiveRemoveDirectory($this->dataServiceBasePath . '/buckets');
        }
        $this->response = ['result' => 'initialized'];
    }

    /*#######################################################
     *  ── 内部ユーティリティ ──
     *#####################################################*/

    /** 現在ログインユーザー ID（未ログインなら例外） */
    private function currentUserId(): string
    {
        if (empty($_SESSION['userId'])) {
            throw new Exception('login required');
        }
        return (string)$_SESSION['userId'];
    }

    /**
     *  ディレクトリ & DB 初期化
     */
    private function initIfNeeded(): void
    {
        /* データフォルダ */
        $base = $this->dataServiceBasePath;
        if (!is_dir("{$base}/buckets") &&
            !mkdir("{$base}/buckets", 0775, true) && !is_dir("{$base}/buckets")) {
            throw new Exception('failed to create dataService/buckets directory');
        }

        /* DB フォルダ */
		$dbDir  = dirname($this->dataServiceDBFile);
        if (!is_dir($dbDir) && !mkdir($dbDir, 0775, true) && !is_dir($dbDir)) {
            throw new Exception("failed to create DB directory: {$dbDir}");
        }

        /* SQLite 接続 + テーブル */
        $this->pdo = $this->getSQLiteConnection(
												$this->dataServiceDBFile,
												[
												 'errmode' => PDO::ERRMODE_EXCEPTION,
												 ]
												);
		
        $this->pdo->exec("
    CREATE TABLE IF NOT EXISTS data_meta (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        bucket      TEXT NOT NULL,
        key         TEXT NOT NULL,
        user_id     TEXT NOT NULL,
        mime_type   TEXT,
        size        INTEGER,
        created_at  TEXT DEFAULT (datetime('now')),
        updated_at  TEXT DEFAULT (datetime('now')),
        UNIQUE(bucket, key, user_id)
    );

    CREATE TABLE IF NOT EXISTS data_files (
        id          INTEGER PRIMARY KEY,
        file_path   TEXT NOT NULL,
        FOREIGN KEY(id) REFERENCES data_meta(id) ON DELETE CASCADE
    );

    /* ★ ここを IF NOT EXISTS に変更 ★ */
    CREATE INDEX IF NOT EXISTS idx_meta_user   ON data_meta(user_id);
    CREATE INDEX IF NOT EXISTS idx_meta_bucket ON data_meta(bucket);
        ");
        $this->pdo->exec('CREATE INDEX IF NOT EXISTS idx_objects_bucket_user ON objects(bucket,userId);');
    }

    /** 英数字-_\. のみ許可 (パス走査対策) */
    private function sanitize(string $s): string
    {
        return preg_replace('/[^A-Za-z0-9_\-\.]/', '', $s);
    }

    /** バケットディレクトリの存在保証 */
    private function ensureBucket(string $bucket): string
    {
        $dir = $this->dataServiceBasePath . "/buckets/{$bucket}";
        if (!is_dir($dir) &&
            !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new Exception("failed to create bucket dir: {$dir}");
        }
        return $dir;
    }

    /** buckets 配下限定で再帰削除 */
    private function rrmdir(string $dir): void
    {
        Util::recursiveRemoveDirectory($dir);
    }

    private function resolveDataListPagination(): array
    {
        $page = $this->readOptionalIntParam('page');
        $perPage = $this->readOptionalIntParam('perPage');
        $limit = $this->readOptionalIntParam('limit');
        $offset = $this->readOptionalIntParam('offset');

        if ($page !== null && $page < 1) {
            throw new Exception('page must be >= 1');
        }

        if ($perPage !== null && ($perPage < 1 || $perPage > self::MAX_PAGE_SIZE)) {
            throw new Exception('perPage out of range');
        }

        if ($limit !== null && ($limit < 1 || $limit > self::MAX_PAGE_SIZE)) {
            throw new Exception('limit out of range');
        }

        if ($perPage !== null && $limit !== null && $perPage !== $limit) {
            throw new Exception('conflicting pagination parameters');
        }

        if ($offset !== null) {
            if ($offset < 0) {
                throw new Exception('offset must be >= 0');
            }
            if ($page !== null || $perPage !== null) {
                throw new Exception('offset cannot be combined with page/perPage');
            }
            if ($limit === null) {
                throw new Exception('limit required when offset is specified');
            }

            $pageSize = $limit;
            $page = intdiv($offset, $pageSize) + 1;
        } else {
            $pageSize = $perPage ?? $limit ?? self::DEFAULT_PAGE_SIZE;
            if ($pageSize < 1 || $pageSize > self::MAX_PAGE_SIZE) {
                throw new Exception('pageSize out of range');
            }

            $page = $page ?? 1;
            $offset = ($page - 1) * $pageSize;
        }

        return [
            'page' => $page,
            'pageSize' => $pageSize,
            'limit' => $pageSize,
            'offset' => $offset,
        ];
    }

    private function readOptionalIntParam(string $name): ?int
    {
        if (!array_key_exists($name, $this->params)) {
            return null;
        }

        $value = $this->params[$name];
        if (is_string($value)) {
            $value = trim($value);
        }
        if ($value === null || $value === '') {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_INT) === false) {
            throw new Exception("invalid integer parameter: {$name}");
        }

        return (int)$value;
    }
}
