<?php

Base::requireFromShm('class/class.Contents.php');

class Queue extends Base
{
    /** @var int */
    private $limit;

    /** @var int|null */
    private $runJobId;

    /** @var int|null */
    private $deleteJobId;

    /** @var int|null */
    private $updateJobId;

    /** @var array|null */
    private $updateJobFields;

    /** @var bool|null */
    private $jobQueueHasProgressColumn;

    private const DEFAULT_LIMIT = 200;
    private const MAX_LIMIT = 500;

    public function __construct($context)
    {
        parent::__construct($context);

        $this->limit = $this->resolveLimit($this->params['limit'] ?? null);
        $this->runJobId = null;
        $this->deleteJobId = null;
        $this->updateJobId = null;
        $this->updateJobFields = null;
        $this->jobQueueHasProgressColumn = null;
    }

    protected function getDefaultRequestType()
    {
        return 'StatusGet';
    }

    protected function formatUnsupportedTypeMessage($prefix, $type)
    {
        if ($prefix === 'proc') {
            return 'Unsupported queue action: ' . $type;
        }

        return parent::formatUnsupportedTypeMessage($prefix, $type);
    }

    protected function validationStatusGet()
    {
        $this->ensureSupervisorAccess();
    }

    protected function validationRunJob()
    {
        $this->ensureSupervisorAccess();
        $this->requireParams(array('jobId'));

        $jobId = filter_var(
							$this->params['jobId'],
							FILTER_VALIDATE_INT,
							array('options' => array('min_range' => 1))
							);

        if ($jobId === false || $jobId === null) {
            throw new Exception('invalid jobId');
        }

        $this->runJobId = (int) $jobId;
    }

    protected function validationDeleteJob()
    {
        $this->ensureSupervisorAccess();
        $this->requireParams(array('jobId'));

        $jobId = filter_var(
							$this->params['jobId'],
							FILTER_VALIDATE_INT,
							array('options' => array('min_range' => 1))
							);

        if ($jobId === false || $jobId === null) {
            throw new Exception('invalid jobId');
        }

        $this->deleteJobId = (int) $jobId;
    }

    protected function validationUpdateJob()
    {
        $this->ensureSupervisorAccess();
        $this->requireParams(array('jobId'));

        $jobId = filter_var(
                                                        $this->params['jobId'],
                                                        FILTER_VALIDATE_INT,
                                                        array('options' => array('min_range' => 1))
                                                        );

        if ($jobId === false || $jobId === null) {
            throw new Exception('invalid jobId');
        }

        $fields = $this->collectUpdateFields($this->params);
        if (empty($fields)) {
            throw new Exception('no update fields');
        }

        $this->updateJobId = (int) $jobId;
        $this->updateJobFields = $fields;
    }

    protected function validationRunNextJob()
    {
        // no-op
    }

    public function procStatusGet()
    {
        $dbPath = $this->dataBasePath . '/db/queue.sqlite';
        $databaseExists = is_file($dbPath);

        try {
            $pdo = $this->getPDOQueue();
        } catch (Exception $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'database_unavailable';
            $this->response = array(
									'message' => 'キューデータベースに接続できませんでした。',
									'details' => $exception->getMessage(),
									'database' => array(
														'path' => $dbPath,
														'exists' => $databaseExists,
														),
									);
            return;
        }

        $generatedAt = (new DateTimeImmutable('now'))->format(DATE_ATOM);

        if ($this->hasJobQueueTable($pdo) === false) {
            $this->response = array(
									'generatedAt' => $generatedAt,
									'jobs' => array(),
									'stats' => $this->buildEmptyStats(),
									'warnings' => array('job_queue table not found in queue.sqlite'),
									'database' => array(
														'path' => $dbPath,
														'exists' => $databaseExists,
														'limit' => $this->limit,
														'limitReached' => false,
														),
									);
            return;
        }

        try {
            $rows = $this->fetchJobRows($pdo, $this->limit);
        } catch (PDOException $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'query_failed';
            $this->response = array(
									'message' => 'キューデータを取得できませんでした。',
									'details' => $exception->getMessage(),
									);
            return;
        }

        $payload = $this->buildJobsPayload($rows);
        $limitReached = count($rows) >= $this->limit;

        if ($limitReached) {
            $payload['warnings'][] = 'result truncated to first ' . $this->limit . ' records';
        }

        $payload['generatedAt'] = $generatedAt;
        $payload['database'] = array(
                                                                         'path' => $dbPath,
                                                                         'exists' => $databaseExists,
                                                                         'limit' => $this->limit,
                                                                         'limitReached' => $limitReached,
                                                                         );

        $this->response = $payload;
    }

    public function procRunNextJob()
    {
        $context = $this->context;
        $context['params'] = array('token' => Base::API_TOKEN);
        $context['files'] = array();

        try {
            $this->writeLog('Dispatching queue worker via RunNextJob', 'queue');
            $worker = new Contents($context, true);
            $worker->makeProxy();
        } catch (Throwable $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'worker_dispatch_failed';
            $this->response = array(
                                                                        'message' => '次のキューの実行に失敗しました。',
                                                                        'details' => $exception->getMessage(),
                                                                        );
            return;
        }

        $this->status = $worker->status;
        $this->errorReason = $worker->errorReason;

        $workerResponse = $worker->response;
        if ($workerResponse === null) {
            $workerResponse = array();
        }

        if (!is_array($workerResponse)) {
            $workerResponse = array('result' => $workerResponse);
        }

        $this->response = array(
                                                                'message' => $worker->status === self::RESULT_ERROR ? 'キューの実行中にエラーが発生しました。' : '次のキューを実行しました。',
                                                                'workerStatus' => $worker->status,
                                                                'workerErrorReason' => $worker->errorReason,
                                                                'workerResponse' => $workerResponse,
                                                                );
    }

    public function procRunJob()
    {
        $jobId = $this->runJobId;
        if ($jobId === null) {
            $jobId = filter_var(
								$this->params['jobId'] ?? null,
								FILTER_VALIDATE_INT,
								array('options' => array('min_range' => 1))
								);
            if ($jobId === false || $jobId === null) {
                $this->status = self::RESULT_ERROR;
                $this->errorReason = 'invalid_job_id';
                $this->response = array('message' => 'ジョブIDが正しくありません。');
                return;
            }
            $jobId = (int) $jobId;
        }

        try {
            $pdo = $this->getPDOQueue();
        } catch (Exception $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'database_unavailable';
            $this->response = array(
									'message' => 'キューデータベースに接続できませんでした。',
									'details' => $exception->getMessage(),
                );
            return;
        }

        $this->writeLog('Manual run requested for job #' . $jobId, 'queue');

        try {
            $stmt = $pdo->prepare('SELECT id, job_type, status FROM job_queue WHERE id = :id LIMIT 1');
            $stmt->bindValue(':id', $jobId, PDO::PARAM_INT);
            $stmt->execute();
            $job = $stmt->fetch(PDO::FETCH_ASSOC);
			$stmt->closeCursor(); // database is locked対策
        } catch (PDOException $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'query_failed';
            $this->response = array(
									'message' => 'ジョブ情報の取得に失敗しました。',
									'details' => $exception->getMessage(),
									);
            return;
        }

        if ($job === false) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'job_not_found';
            $this->response = array(
									'message' => '指定されたジョブが見つかりませんでした。',
									'jobId' => $jobId,
									);
            return;
        }

        $status = $this->normalizeStatus(isset($job['status']) ? $job['status'] : '');
        $previousStatus = $status;
        $needsRestart = in_array($status, array('running', 'error'), true);

        $this->writeLog('Fetched job #' . $jobId . ' with status=' . $status . ', type=' . (isset($job['job_type']) ? $job['job_type'] : ''), 'queue');

        if ($needsRestart) {
            try {
                $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
                $reset = $pdo->prepare(
                                                                    'UPDATE job_queue
                     SET status = :status,
                         updated_at = :updated_at,
                         started_at = NULL,
                         finished_at = NULL,
                         error_message = NULL
                     WHERE id = :id'
                                                                    );
                $reset->execute(array(
                                                               ':status' => 'queued',
                                                               ':updated_at' => $now,
                                                               ':id' => $jobId,
                                                               ));
                $status = 'queued';
                $this->writeLog('Manually reset queue job #' . $jobId . ' from ' . $previousStatus . ' to queued', 'queue');
            } catch (PDOException $exception) {
                $this->status = self::RESULT_ERROR;
                $this->errorReason = 'restart_failed';
                $this->response = array(
                                                                        'message' => 'ジョブの状態を再実行可能にできませんでした。',
                                                                        'details' => $exception->getMessage(),
                                                                        'jobId' => $jobId,
                                                                        'jobStatus' => $previousStatus,
                                                                        );
                return;
            }
        } elseif ($status !== 'queued') {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'invalid_status';
            $this->response = array(
                                                                        'message' => 'ジョブは待機中ではありません。',
                                                                        'jobId' => $jobId,
                                                                        'jobStatus' => $status,
                                                                        );
            return;
        }

        $jobType = isset($job['job_type']) ? (string) $job['job_type'] : '';
        if ($jobType !== 'video_transcode') {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'unsupported_job_type';
            $this->response = array(
									'message' => 'このジョブタイプは手動実行に対応していません。',
									'jobId' => $jobId,
									'jobType' => $jobType,
									);
            return;
        }

        try {
            $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
            $update = $pdo->prepare(
                                                                        'UPDATE job_queue
                 SET status = :status,
                     started_at = :started_at,
                     finished_at = NULL,
                     updated_at = :updated_at,
                     error_message = NULL
                 WHERE id = :id'
                                                                        );
            $update->execute(array(
                                                               ':status' => 'running',
                                                               ':started_at' => $now,
                                                               ':updated_at' => $now,
                                                               ':id' => $jobId,
                                                               ));
            $this->writeLog('Marked job #' . $jobId . ' as running for manual execution', 'queue');
        } catch (PDOException $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'update_failed';
            $this->response = array(
                                                                        'message' => 'ジョブ情報の更新に失敗しました。',
                                                                        'details' => $exception->getMessage(),
                                                                        'jobId' => $jobId,
                                                                        );
            return;
        }

        $this->writeLog('Dispatching manual low-rate worker for job #' . $jobId . ' (type: ' . $jobType . ', previous status: ' . $previousStatus . ')', 'queue');

        $dispatched = $this->dispatchLowRateWorker($jobId);
        if ($this->status === self::RESULT_ERROR) {
            return;
        }

        $this->response = array(
                                                                'jobId' => $jobId,
                                                                'jobType' => $jobType,
                                                                'previousStatus' => $previousStatus,
                                                                'restarted' => $needsRestart,
                                                                'dispatched' => $dispatched,
                                                                'message' => 'ジョブの手動実行を開始しました。',
                                                                );
    }

    private function dispatchLowRateWorker($jobId)
    {
        if ($jobId <= 0) {
            return false;
        }

        try {
            $this->writeLog('Starting low-rate worker dispatch for job #' . $jobId, 'queue');
            if (function_exists('fastcgi_finish_request')) {
                @fastcgi_finish_request();
                $this->writeLog('fastcgi_finish_request executed for job #' . $jobId, 'queue');
            }

            ignore_user_abort(true);
            $this->writeLog('ignore_user_abort enabled for job #' . $jobId, 'queue');

            $context = $this->context;
            // Keep the current request parameters (including token) so the worker can
            // bypass token validation even if skipValidation is not applied.
            $context['params'] = $this->params;
            $context['files'] = array();

            $worker = new Contents($context, true);
            $this->writeLog('Instantiated Contents worker for job #' . $jobId, 'queue');
            $worker->makeProxy($jobId);

            $this->writeLog('Contents::makeProxy finished for job #' . $jobId . ' with status=' . $worker->status, 'queue');

            if ($worker->status === self::RESULT_ERROR) {
                $this->status = $worker->status;
                $this->errorReason = $worker->errorReason;
                $this->response = $worker->response;
                return false;
            }
        } catch (Throwable $exception) {
            $this->markQueueJobError((int) $jobId, 'worker dispatch failed: ' . $exception->getMessage());
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'worker_dispatch_failed';
            $this->response = array(
                                                            'message' => 'ジョブの実行に失敗しました。',
                                                            'details' => $exception->getMessage(),
                                                            'jobId' => (int) $jobId,
                                                            );
            return false;
        }

        return true;
    }
	
    public function procDeleteJob()
    {
        $jobId = $this->deleteJobId;
        if ($jobId === null) {
            $jobId = filter_var(
								$this->params['jobId'] ?? null,
								FILTER_VALIDATE_INT,
								array('options' => array('min_range' => 1))
								);
            if ($jobId === false || $jobId === null) {
                $this->status = self::RESULT_ERROR;
                $this->errorReason = 'invalid_job_id';
                $this->response = array('message' => 'ジョブIDが正しくありません。');
                return;
            }
            $jobId = (int) $jobId;
        }

        try {
            $pdo = $this->getPDOQueue();
        } catch (Exception $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'database_unavailable';
            $this->response = array(
									'message' => 'キューデータベースに接続できませんでした。',
									'details' => $exception->getMessage(),
									);
            return;
        }

        if ($this->hasJobQueueTable($pdo) === false) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'table_missing';
            $this->response = array(
									'message' => 'キューデータベースに job_queue テーブルが存在しません。',
									);
            return;
        }

        try {
            $stmt = $pdo->prepare('SELECT id, status, job_type, target_path FROM job_queue WHERE id = :id LIMIT 1');
            $stmt->bindValue(':id', $jobId, PDO::PARAM_INT);
            $stmt->execute();
            $job = $stmt->fetch(PDO::FETCH_ASSOC);
			$stmt->closeCursor(); // database is locked対策
        } catch (PDOException $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'query_failed';
            $this->response = array(
									'message' => 'ジョブ情報の取得に失敗しました。',
									'details' => $exception->getMessage(),
									);
            return;
        }

        if ($job === false) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'job_not_found';
            $this->response = array(
									'message' => '指定されたジョブが見つかりませんでした。',
									'jobId' => $jobId,
									);
            return;
        }

        $status = $this->normalizeStatus(isset($job['status']) ? $job['status'] : '');
        $jobType = isset($job['job_type']) ? (string) $job['job_type'] : '';
        $targetPath = isset($job['target_path']) ? (string) $job['target_path'] : '';

        $forcedTermination = false;
        $cleanup = array(
						 'terminatedProcesses' => false,
						 'removedTarget' => false,
						 );

        if ($status === 'running') {
            $cleanup = $this->forceTerminateRunningJob($jobId, $jobType, $targetPath);
            $forcedTermination = true;
        }

        try {
            $delete = $pdo->prepare('DELETE FROM job_queue WHERE id = :id');
            $delete->bindValue(':id', $jobId, PDO::PARAM_INT);
            $delete->execute();
        } catch (PDOException $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'delete_failed';
            $this->response = array(
									'message' => 'ジョブの削除に失敗しました。',
									'details' => $exception->getMessage(),
									'jobId' => $jobId,
									);
            return;
        }

        if ($delete->rowCount() === 0) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'delete_noop';
            $this->response = array(
									'message' => 'ジョブの削除が行われませんでした。',
									'jobId' => $jobId,
									);
            return;
        }

        $this->response = array(
								'jobId' => $jobId,
								'jobStatus' => $status,
								'deleted' => true,
								'message' => 'ジョブを削除しました。',
								);

        if ($forcedTermination) {
            $this->response['forceTerminated'] = true;
            $this->response['cleanup'] = array(
											   'processTerminated' => $cleanup['terminatedProcesses'],
											   'targetRemoved' => $cleanup['removedTarget'],
											   );
        }
    }

    public function procUpdateJob()
    {
        $jobId = $this->updateJobId !== null ? $this->updateJobId : null;
        $fields = $this->updateJobFields !== null ? $this->updateJobFields : $this->collectUpdateFields($this->params);

        if ($jobId === null) {
            $jobId = filter_var(
                $this->params['jobId'] ?? null,
                FILTER_VALIDATE_INT,
                array('options' => array('min_range' => 1))
            );

            if ($jobId === false || $jobId === null) {
                $this->status = self::RESULT_ERROR;
                $this->errorReason = 'invalid_job_id';
                $this->response = array('message' => 'ジョブIDが正しくありません。');
                return;
            }

            $jobId = (int) $jobId;
        }

        if (empty($fields)) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'no_update_fields';
            $this->response = array('message' => '更新する項目が指定されていません。');
            return;
        }

        try {
            $pdo = $this->getPDOQueue();
        } catch (Exception $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'database_unavailable';
            $this->response = array(
                                                                        'message' => 'キューデータベースに接続できませんでした。',
                                                                        'details' => $exception->getMessage(),
                                                                        );
            return;
        }

        if ($this->hasJobQueueTable($pdo) === false) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'table_missing';
            $this->response = array(
                                                                        'message' => 'キューデータベースに job_queue テーブルが存在しません。',
                                                                        );
            return;
        }

        try {
            $current = $this->fetchJobById($pdo, $jobId);
        } catch (PDOException $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'query_failed';
            $this->response = array(
                                                                        'message' => 'ジョブ情報の取得に失敗しました。',
                                                                        'details' => $exception->getMessage(),
                                                                        );
            return;
        }

        if ($current === null) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'job_not_found';
            $this->response = array(
                                                                        'message' => '指定されたジョブが見つかりませんでした。',
                                                                        'jobId' => $jobId,
                                                                        );
            return;
        }

        if (!$this->jobQueueHasProgressColumn($pdo)) {
            unset($fields['progress']);
        }

        $columns = $this->mapUpdateColumns($fields);
        if (empty($columns)) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'no_update_columns';
            $this->response = array(
                                                                        'message' => '更新対象の項目がありません。',
                                                                        );
            return;
        }

        $setClauses = array();
        $bindings = array(':id' => $jobId);
        foreach ($columns as $column => $value) {
            $param = ':' . $column;
            $setClauses[] = $column . ' = ' . $param;
            $bindings[$param] = $value;
        }

        try {
            $sql = 'UPDATE job_queue SET ' . implode(', ', $setClauses) . ' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            foreach ($bindings as $param => $value) {
                if ($value === null) {
                    $stmt->bindValue($param, null, PDO::PARAM_NULL);
                } else {
                    $stmt->bindValue($param, $value);
                }
            }
            $stmt->execute();
        } catch (PDOException $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'update_failed';
            $this->response = array(
                                                                        'message' => 'ジョブの更新に失敗しました。',
                                                                        'details' => $exception->getMessage(),
                                                                        'jobId' => $jobId,
                                                                        );
            return;
        }

        $normalizedJob = null;
        try {
            $updatedRow = $this->fetchJobById($pdo, $jobId);
            if ($updatedRow !== null) {
                $normalizedJob = $this->normalizeRow(
                    $updatedRow,
                    $this->normalizeStatus(isset($updatedRow['status']) ? $updatedRow['status'] : ''),
                    $this->normalizeDateTime($updatedRow['created_at'] ?? null),
                    $this->normalizeDateTime($updatedRow['updated_at'] ?? null),
                    $this->normalizeDateTime($updatedRow['started_at'] ?? null),
                    $this->normalizeDateTime($updatedRow['finished_at'] ?? null)
                );
            }
        } catch (PDOException $exception) {
            $normalizedJob = null;
        }

        $this->response = array(
                                                                'jobId' => $jobId,
                                                                'updated' => true,
                                                                'job' => $normalizedJob,
                                                                'message' => 'ジョブを更新しました。',
                                                                );
    }

    private function normalizeStatus($value)
    {
        $status = is_string($value) ? trim($value) : '';
        if ($status === '') {
            return 'unknown';
        }

        $normalized = strtolower($status);
        if (in_array($normalized, array('queued', 'running', 'success', 'error'), true)) {
            return $normalized;
        }

        return $normalized;
    }

    private function normalizeDateTime($value)
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return null;
        }

        try {
            $date = new DateTimeImmutable($trimmed);
            return $date->format(DATE_ATOM);
        } catch (Exception $exception) {
            return $trimmed;
        }
    }

    private function resolveLimit($rawValue)
    {
        $limit = filter_var(
							$rawValue,
							FILTER_VALIDATE_INT,
							array('options' => array('min_range' => 1))
							);

        if ($limit === false || $limit === null) {
            $limit = self::DEFAULT_LIMIT;
        }

        if ($limit > self::MAX_LIMIT) {
            $limit = self::MAX_LIMIT;
        }

        return $limit;
    }

    private function sanitizeStringField($value, $maxLength = 4000, $trim = true)
    {
        if (is_array($value)) {
            $value = json_encode($value);
        } elseif (!is_string($value)) {
            $value = (string) $value;
        }

        if ($trim) {
            $value = trim($value);
        }

        if ($maxLength > 0 && function_exists('mb_strlen') && mb_strlen($value) > $maxLength) {
            $value = mb_substr($value, 0, $maxLength);
        } elseif ($maxLength > 0 && strlen($value) > $maxLength) {
            $value = substr($value, 0, $maxLength);
        }

        return $value;
    }

    private function filterNullableInt($value)
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            $value = trim($value);
        }

        if ($value === '') {
            return null;
        }

        $intVal = filter_var($value, FILTER_VALIDATE_INT);
        if ($intVal === false || $intVal === null) {
            return null;
        }

        return (int) $intVal;
    }

    private function formatDateForStorage($value)
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return null;
        }

        try {
            $date = new DateTimeImmutable($trimmed);
            return $date->format('Y-m-d H:i:s');
        } catch (Exception $exception) {
            return $trimmed;
        }
    }

    private function mapUpdateColumns(array $fields)
    {
        $map = array(
                                    'jobType' => 'job_type',
                                    'status' => 'status',
                                    'sourcePath' => 'source_path',
                                    'targetPath' => 'target_path',
                                    'targetBitrate' => 'target_bitrate',
                                    'originalBitrate' => 'original_bitrate',
                                    'context' => 'context',
                                    'progress' => 'progress',
                                    'createdAt' => 'created_at',
                                    'updatedAt' => 'updated_at',
                                    'startedAt' => 'started_at',
                                    'finishedAt' => 'finished_at',
                                    'errorMessage' => 'error_message',
                                    );

        $out = array();
        foreach ($fields as $key => $value) {
            if (array_key_exists($key, $map)) {
                $out[$map[$key]] = $value;
            }
        }

        return $out;
    }

    private function collectUpdateFields(array $params)
    {
        $fields = array();

        if (array_key_exists('jobType', $params)) {
            $fields['jobType'] = $this->sanitizeStringField($params['jobType'], 255);
        }

        if (array_key_exists('status', $params)) {
            $fields['status'] = $this->sanitizeStringField($this->normalizeStatus($params['status']), 64);
        }

        if (array_key_exists('sourcePath', $params)) {
            $fields['sourcePath'] = $this->sanitizeStringField($params['sourcePath'], 2048);
        }

        if (array_key_exists('targetPath', $params)) {
            $fields['targetPath'] = $this->sanitizeStringField($params['targetPath'], 2048);
        }

        if (array_key_exists('targetBitrate', $params)) {
            $fields['targetBitrate'] = $this->filterNullableInt($params['targetBitrate']);
        }

        if (array_key_exists('originalBitrate', $params)) {
            $fields['originalBitrate'] = $this->filterNullableInt($params['originalBitrate']);
        }

        if (array_key_exists('progress', $params)) {
            $fields['progress'] = $this->normalizeProgressValue($params['progress']);
        }

        if (array_key_exists('createdAt', $params)) {
            $fields['createdAt'] = $this->formatDateForStorage($params['createdAt']);
        }

        if (array_key_exists('updatedAt', $params)) {
            $fields['updatedAt'] = $this->formatDateForStorage($params['updatedAt']);
        }

        if (array_key_exists('startedAt', $params)) {
            $fields['startedAt'] = $this->formatDateForStorage($params['startedAt']);
        }

        if (array_key_exists('finishedAt', $params)) {
            $fields['finishedAt'] = $this->formatDateForStorage($params['finishedAt']);
        }

        if (array_key_exists('errorMessage', $params)) {
            $fields['errorMessage'] = $this->sanitizeStringField($params['errorMessage'], 4000, false);
        }

        if (array_key_exists('context', $params)) {
            $context = $params['context'];
            if ($context === null) {
                $fields['context'] = null;
            } else {
                $fields['context'] = $this->sanitizeStringField($context, 8000, false);
            }
        }

        return $fields;
    }

    private function fetchJobById(PDO $pdo, $jobId)
    {
        $columns = [
                                    'id',
                                    'job_type',
                                    'status',
                                    'source_path',
                                    'target_path',
                                    'target_bitrate',
                                    'original_bitrate',
                                    'context',
                                    'created_at',
                                    'updated_at',
                                    'started_at',
                                    'finished_at',
                                    'error_message',
                                    ];

        if ($this->jobQueueHasProgressColumn($pdo)) {
            $columns[] = 'progress';
        }

        $stmt = $pdo->prepare('SELECT ' . implode(', ', $columns) . ' FROM job_queue WHERE id = :id LIMIT 1');
        $stmt->bindValue(':id', (int) $jobId, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
		$stmt->closeCursor(); // database is locked対策		
        if ($row === false) {
            return null;
        }

        return $row;
    }

    private function hasJobQueueTable(PDO $pdo)
    {
        try {
            $stmt = $pdo->query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'job_queue' LIMIT 1");
            if ($stmt === false) {
                return false;
            }

            return $stmt->fetchColumn() !== false;
        } catch (PDOException $exception) {
            return false;
        }
    }

    private function fetchJobRows(PDO $pdo, $limit)
    {
        $columns = [
					'id',
					'job_type',
					'status',
					'source_path',
					'target_path',
					'target_bitrate',
					'original_bitrate',
					'context',
					'created_at',
					'updated_at',
					'started_at',
					'finished_at',
					'error_message',
					];

        if ($this->jobQueueHasProgressColumn($pdo)) {
            $columns[] = 'progress';
        }

        $stmt = $pdo->prepare(
							  'SELECT ' . implode(', ', $columns)
							  . "\n             FROM job_queue\n             ORDER BY CASE status\n                WHEN 'running' THEN 0\n                WHEN 'queued' THEN 1\n                WHEN 'error' THEN 2\n                WHEN 'success' THEN 3\n                ELSE 4\n             END, id DESC\n             LIMIT :limit"
							  );

        $stmt->bindValue(':limit', (int) $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function buildJobsPayload(array $rows)
    {
        $jobs = array();
        $statusCounts = array(
							  'queued' => 0,
							  'running' => 0,
							  'success' => 0,
							  'error' => 0,
							  'other' => 0,
							  );
        $oldestQueued = null;
        $mostRecentError = null;

        foreach ($rows as $row) {
            $status = $this->normalizeStatus(isset($row['status']) ? $row['status'] : '');
            $createdAt = $this->normalizeDateTime($row['created_at'] ?? null);
            $updatedAt = $this->normalizeDateTime($row['updated_at'] ?? null);
            $startedAt = $this->normalizeDateTime($row['started_at'] ?? null);
            $finishedAt = $this->normalizeDateTime($row['finished_at'] ?? null);

            if (isset($statusCounts[$status])) {
                $statusCounts[$status]++;
            } else {
                $statusCounts['other']++;
            }

            if ($status === 'queued' && $createdAt !== null) {
                $queuedDate = $this->createDateTime($createdAt);
                if ($queuedDate !== null && ($oldestQueued === null || $queuedDate < $oldestQueued)) {
                    $oldestQueued = $queuedDate;
                }
            }

            if ($status === 'error' && $updatedAt !== null) {
                $errorDate = $this->createDateTime($updatedAt);
                if ($errorDate !== null && ($mostRecentError === null || $errorDate > $mostRecentError)) {
                    $mostRecentError = $errorDate;
                }
            }

            $jobs[] = $this->normalizeRow($row, $status, $createdAt, $updatedAt, $startedAt, $finishedAt);
        }

        return array(
					 'jobs' => $jobs,
					 'stats' => array(
									  'total' => count($jobs),
									  'statusCounts' => $statusCounts,
									  'oldestQueuedAt' => $oldestQueued ? $oldestQueued->format(DATE_ATOM) : null,
									  'mostRecentErrorAt' => $mostRecentError ? $mostRecentError->format(DATE_ATOM) : null,
									  ),
					 'warnings' => array(),
					 );
    }

    private function normalizeRow(array $row, $status, $createdAt, $updatedAt, $startedAt, $finishedAt)
    {
        $contextRaw = isset($row['context']) ? $row['context'] : null;
        $contextData = null;
        if (is_string($contextRaw) && trim($contextRaw) !== '') {
            $decoded = json_decode($contextRaw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $contextData = $decoded;
            }
        }

        return array(
					 'id' => isset($row['id']) ? (int) $row['id'] : 0,
					 'jobType' => isset($row['job_type']) ? (string) $row['job_type'] : '',
					 'status' => $status,
					 'sourcePath' => isset($row['source_path']) ? (string) $row['source_path'] : '',
					 'targetPath' => isset($row['target_path']) ? (string) $row['target_path'] : '',
					 'targetBitrate' => isset($row['target_bitrate']) ? (int) $row['target_bitrate'] : null,
					 'originalBitrate' => isset($row['original_bitrate']) ? (int) $row['original_bitrate'] : null,
					 'context' => $contextRaw,
					 'contextData' => $contextData,
					 'progress' => $this->resolveJobProgress($row, $contextData),
					 'createdAt' => $createdAt,
					 'updatedAt' => $updatedAt,
					 'startedAt' => $startedAt,
					 'finishedAt' => $finishedAt,
					 'errorMessage' => isset($row['error_message']) && $row['error_message'] !== '' ? (string) $row['error_message'] : null,
					 );
    }

    private function resolveJobProgress(array $row, ?array $contextData)
    {
        if (array_key_exists('progress', $row)) {
            $normalized = $this->normalizeProgressValue($row['progress']);
            if ($normalized !== null) {
                return $normalized;
            }
        }

        if ($contextData !== null) {
            $flatContext = $this->flattenContext($contextData);

            $numericKeys = array(
								 'progress',
								 'progressPercent',
								 'progress_percent',
								 'progressRate',
								 'progress_rate',
								 'percentComplete',
								 'percent_complete',
								 'completion',
								 'completionPercent',
								 'completion_percent',
								 );

            foreach ($numericKeys as $key) {
                if (array_key_exists($key, $flatContext)) {
                    $normalized = $this->normalizeProgressValue($flatContext[$key]);
                    if ($normalized !== null) {
                        return $normalized;
                    }
                }
            }

            $fileKeys = array(
							  'progressFile',
							  'progress_file',
							  'progressPath',
							  'progress_path',
							  'ffmpegProgressFile',
							  'ffmpeg_progress_file',
							  );

            foreach ($fileKeys as $key) {
                if (array_key_exists($key, $flatContext) && is_string($flatContext[$key])) {
                    $fromFile = $this->readProgressFromFile($flatContext[$key], $flatContext);
                    if ($fromFile !== null) {
                        return $fromFile;
                    }
                }
            }
        }

        return null;
    }

    private function normalizeProgressValue($value)
    {
        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return null;
            }

            if (preg_match('/^(-?\d+(?:\.\d+)?)%$/', $trimmed, $matches)) {
                $value = $matches[1];
            } else {
                $value = $trimmed;
            }
        }

        if (is_int($value) || is_float($value) || (is_string($value) && is_numeric($value))) {
            $numeric = (float) $value;
            if (!is_finite($numeric)) {
                return null;
            }

            if ($numeric < 0) {
                $numeric = 0.0;
            }
            if ($numeric > 100) {
                $numeric = 100.0;
            }

            return round($numeric, 2);
        }

        return null;
    }

    private function readProgressFromFile(string $path, array $context)
    {
        $resolved = $this->resolveProgressFilePath($path);
        if ($resolved === null || !is_file($resolved) || !is_readable($resolved)) {
            return null;
        }

        $contents = @file_get_contents($resolved);
        if ($contents === false || $contents === '') {
            return null;
        }

        if (preg_match('/(^|\s)(-?\d+(?:\.\d+)?)%?(?=\s|$)/m', $contents, $matches)) {
            return $this->normalizeProgressValue($matches[2]);
        }

        if (preg_match('/progress\s*=\s*(end|\d+(?:\.\d+)?)/i', $contents, $matches)) {
            if (strcasecmp($matches[1], 'end') === 0) {
                return 100.0;
            }

            return $this->normalizeProgressValue($matches[1]);
        }

        $outTimeMs = null;
        if (preg_match_all('/out_time_ms\s*=\s*(\d+)/i', $contents, $outMatches) && count($outMatches[1]) > 0) {
            $outTimeMs = (float) end($outMatches[1]);
        } elseif (preg_match_all('/out_time\s*=\s*([0-9:.]+)/i', $contents, $outMatches) && count($outMatches[1]) > 0) {
            $outTimeMs = $this->timeToMilliseconds(end($outMatches[1]));
        }

        if ($outTimeMs !== null && $outTimeMs > 0) {
            $durationMs = $this->extractDurationFromContext($context);

            if ($durationMs !== null && $durationMs > 0) {
                $progress = ($outTimeMs / $durationMs) * 100;
                return $this->normalizeProgressValue($progress);
            }
        }

        return null;
    }

    private function resolveProgressFilePath(string $path)
    {
        $trimmed = trim($path);
        if ($trimmed === '') {
            return null;
        }

        if (strpos($trimmed, '..') !== false) {
            return null;
        }

        if ($trimmed[0] === DIRECTORY_SEPARATOR) {
            return $trimmed;
        }

        $candidates = array(
							$this->dataBasePath . '/' . ltrim($trimmed, '/'),
							);

        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        return $candidates[0];
    }

    private function extractDurationFromContext(array $context)
    {
        $durationKeysMs = array(
								'durationMs',
								'duration_ms',
								'totalDurationMs',
								'total_duration_ms',
								'sourceDurationMs',
								'source_duration_ms',
								'targetDurationMs',
								'target_duration_ms',
								);

        foreach ($durationKeysMs as $key) {
            if (array_key_exists($key, $context)) {
                $value = $context[$key];
                if (is_string($value)) {
                    $value = trim($value);
                }
                if (is_numeric($value)) {
                    $ms = (float) $value;
                    if ($ms > 0) {
                        return $ms;
                    }
                }
            }
        }

        $durationKeysSeconds = array(
									 'duration',
									 'duration_s',
									 'totalDuration',
									 'sourceDuration',
									 'targetDuration',
									 );

        foreach ($durationKeysSeconds as $key) {
            if (array_key_exists($key, $context)) {
                $value = $context[$key];
                if (is_string($value)) {
                    $value = trim($value);
                }

                if (is_numeric($value)) {
                    $seconds = (float) $value;
                    if ($seconds > 0) {
                        return $seconds * 1000.0;
                    }
                } elseif (is_string($value)) {
                    $seconds = $this->timeStringToSeconds($value);
                    if ($seconds !== null && $seconds > 0) {
                        return $seconds * 1000.0;
                    }
                }
            }
        }

        return null;
    }

    private function timeToMilliseconds($value)
    {
        if (is_numeric($value)) {
            return (float) $value;
        }

        if (is_string($value)) {
            $seconds = $this->timeStringToSeconds($value);
            if ($seconds !== null) {
                return $seconds * 1000.0;
            }
        }

        return null;
    }

    private function timeStringToSeconds($value)
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        if (is_numeric($trimmed)) {
            return (float) $trimmed;
        }

        $parts = explode(':', $trimmed);
        $parts = array_map('trim', $parts);
        if (count($parts) === 0) {
            return null;
        }

        $parts = array_map(function ($part) {
				return is_numeric($part) ? (float) $part : null;
			}, $parts);

        if (in_array(null, $parts, true)) {
            return null;
        }

        $seconds = 0.0;
        $multiplier = 1.0;
        while (!empty($parts)) {
            $value = array_pop($parts);
            $seconds += $value * $multiplier;
            $multiplier *= 60.0;
        }

        return $seconds;
    }

    private function flattenContext(array $context)
    {
        $result = array();
        $iterator = new \RecursiveIteratorIterator(new \RecursiveArrayIterator($context));
        foreach ($iterator as $key => $value) {
            if (!is_string($key)) {
                continue;
            }
            if (!array_key_exists($key, $result)) {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    private function jobQueueHasProgressColumn(PDO $pdo)
    {
        if ($this->jobQueueHasProgressColumn !== null) {
            return $this->jobQueueHasProgressColumn;
        }

        try {
            $stmt = $pdo->query("PRAGMA table_info('job_queue')");
            while ($column = $stmt->fetch(PDO::FETCH_ASSOC)) {
                if (isset($column['name']) && $column['name'] === 'progress') {
                    $this->jobQueueHasProgressColumn = true;
                    return true;
                }
            }
        } catch (PDOException $exception) {
            $this->jobQueueHasProgressColumn = false;
            return false;
        }

        $this->jobQueueHasProgressColumn = false;
        return false;
    }

    private function createDateTime($value)
    {
        if ($value === null) {
            return null;
        }

        try {
            return new DateTimeImmutable($value);
        } catch (Exception $exception) {
            return null;
        }
    }

    private function buildEmptyStats()
    {
        return array(
					 'total' => 0,
					 'statusCounts' => array(
											 'queued' => 0,
											 'running' => 0,
											 'success' => 0,
											 'error' => 0,
											 'other' => 0,
											 ),
					 'oldestQueuedAt' => null,
					 'mostRecentErrorAt' => null,
					 );
    }

    private function forceTerminateRunningJob($jobId, $jobType, $targetPath)
    {
        $result = array(
						'terminatedProcesses' => false,
						'removedTarget' => false,
						);

        if ($jobId <= 0) {
            return $result;
        }

        if ($jobType === 'video_transcode') {
            $result['terminatedProcesses'] = $this->terminateLowRateWorkerProcesses($jobId);
        }

        if ($targetPath !== '') {
            usleep(300000);
            $result['removedTarget'] = $this->removeLowRateVideoFile($targetPath);
        }

        return $result;
    }

    private function terminateLowRateWorkerProcesses($jobId)
    {
        $signature = 'process_lowrate_video.php ' . $this->dataBasePath . ' ' . $jobId;
        $processes = $this->findProcessesBySignature($signature);

        if (empty($processes)) {
            return false;
        }

        $terminated = false;
        $termSignal = defined('SIGTERM') ? SIGTERM : 15;
        $killSignal = defined('SIGKILL') ? SIGKILL : 9;

        foreach ($processes as $process) {
            $target = $process['pgid'] > 0 ? -$process['pgid'] : $process['pid'];
            if ($this->sendSignal($target, $termSignal)) {
                $terminated = true;
            }
        }

        usleep(300000);

        foreach ($processes as $process) {
            if ($this->isProcessRunning($process['pid'])) {
                $target = $process['pgid'] > 0 ? -$process['pgid'] : $process['pid'];
                $this->sendSignal($target, $killSignal);
            }
        }

        return $terminated;
    }

    private function findProcessesBySignature($signature)
    {
        $output = array();
        $status = 0;
        @exec('ps -eo pid,pgid,command', $output, $status);

        if ($status !== 0 || empty($output)) {
            return array();
        }

        $matches = array();
        foreach ($output as $line) {
            $line = trim($line);
            if ($line === '' || stripos($line, 'PID') === 0) {
                continue;
            }

            if (!preg_match('/^(\d+)\s+(\d+)\s+(.+)$/', $line, $parts)) {
                continue;
            }

            $command = $parts[3];
            if (strpos($command, $signature) === false) {
                continue;
            }

            $matches[] = array(
							   'pid' => (int) $parts[1],
							   'pgid' => (int) $parts[2],
							   'command' => $command,
							   );
        }

        return $matches;
    }

    private function sendSignal($target, $signal)
    {
        if ($target === 0) {
            return false;
        }

        if (function_exists('posix_kill')) {
            return @posix_kill((int) $target, (int) $signal);
        }

        $command = sprintf('kill -%d -- %d 2>/dev/null', (int) $signal, (int) $target);
        $output = array();
        $status = 0;
        @exec($command, $output, $status);

        return $status === 0;
    }

    private function isProcessRunning($pid)
    {
        if ($pid <= 0) {
            return false;
        }

        if (function_exists('posix_kill')) {
            return @posix_kill((int) $pid, 0);
        }

        $command = sprintf('ps -p %d -o pid=', (int) $pid);
        $output = array();
        $status = 0;
        @exec($command, $output, $status);

        if ($status !== 0) {
            return false;
        }

        return !empty(array_filter($output, function ($line) {
					return trim($line) !== '';
				}));
    }

    private function removeLowRateVideoFile($targetPath)
    {
        $path = trim((string) $targetPath);
        if ($path === '') {
            return false;
        }

        clearstatcache(true, $path);

        if (!is_file($path)) {
            return false;
        }

        $resolved = realpath($path);
        if ($resolved === false) {
            $resolved = $path;
        }

        if (!$this->isPathWithinSiteRoots($resolved)) {
            $this->writeLog('Refused to delete file outside site scope: ' . $resolved, 'queue');
            return false;
        }

        if (!@unlink($resolved)) {
            $this->writeLog('Failed to delete low rate video: ' . $resolved, 'queue');
            return false;
        }

        return true;
    }

    private function isPathWithinSiteRoots($path)
    {
        $normalized = str_replace(array('/', '\\'), DIRECTORY_SEPARATOR, $path);
        $roots = array();

        $dataRoot = $this->dataBasePath;
        if (is_dir($dataRoot) || is_file($dataRoot)) {
            $resolvedData = realpath($dataRoot);
            if ($resolvedData !== false) {
                $roots[] = $resolvedData;
            }
        }

        $contentsRoot = $this->contentsBasePath;
        if (is_dir($contentsRoot) || is_file($contentsRoot)) {
            $resolvedContents = realpath($contentsRoot);
            if ($resolvedContents !== false) {
                $roots[] = $resolvedContents;
            }
        }

        foreach ($roots as $root) {
            $rootPrefix = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
            if (strpos($normalized, $rootPrefix) === 0 || $normalized === rtrim($root, DIRECTORY_SEPARATOR)) {
                return true;
            }
        }

        return false;
    }

    private function ensureSupervisorAccess()
    {
        $isLoggedIn = !empty($this->session['userId']);
        if (!$isLoggedIn) {
            throw new Exception('login required');
        }

        $groupCode = isset($this->session['groupCode']) ? $this->session['groupCode'] : null;
        $isSupervisor = !empty($this->session['isSupervisor']);
        if ($groupCode) {
            $groupKey = 'isSupervisor_' . $groupCode;
            if (!empty($this->session[$groupKey])) {
                $isSupervisor = true;
            }
        }

        if (!$isSupervisor) {
            throw new Exception('permission denied');
        }
    }
}
