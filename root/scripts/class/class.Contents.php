<?php

class Contents extends Base
{
        public function __construct($context, bool $skipValidation = false)
        {
                parent::__construct($context, $skipValidation);
        }
	
	protected function validationCommon()
	{
		$this->requireParams(['type']);
	}

	protected function validationContentUpload()
	{
		if (isset($this->files['file']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationContentList()
	{
		// no-op
	}

        protected function validationContentDelete()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentVisibilityUpdate()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (array_key_exists('isVisible', $this->params) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentClipUpdate()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (array_key_exists('clipTimes', $this->params) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentProxy()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentImageGet()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentVideoGet()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentUsageList()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentAudioGet()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentFileGet()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentFileCheck()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentYouTubeMetadata()
        {
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        public function procContentUpload()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $ownerUserCode = $loginUserCode;
                if (($this->isSupervisor() || $this->isOperator()) && array_key_exists('ownerUserCode', $this->params)) {
                        $candidateOwnerUserCode = isset($this->params['ownerUserCode']) ? trim((string) $this->params['ownerUserCode']) : '';
                        if ($candidateOwnerUserCode !== '') {
                                $candidateOwnerInfo = $this->getUserInfo($candidateOwnerUserCode);
                                if ($candidateOwnerInfo === null) {
                                        $this->status = parent::RESULT_ERROR;
                                        $this->errorReason = 'invalid_owner';
                                        return;
                                }
                                $ownerUserCode = $candidateOwnerUserCode;
                        }
                }

                $ownerUserInfo = $this->getUserInfo($ownerUserCode);
                if ($ownerUserInfo === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_owner';
                        return;
                }

                $fileEntry = $this->files['file'];
                if (!isset($fileEntry['tmp_name']) || is_uploaded_file($fileEntry['tmp_name']) === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'upload';
                        $this->response = array('message' => 'ファイルのアップロードに失敗しました。');
                        return;
                }

                $contentType = $this->resolveContentType($fileEntry);
                $originalName = Util::sanitizeOriginalFileName(isset($fileEntry['name']) ? $fileEntry['name'] : '');
                $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
                $safeExtension = preg_replace('/[^a-z0-9]/', '', $extension);

                $duration = null;
                $bitrate = null;
                $width = null;
                $height = null;

                if ($contentType === 'video') {
                        $bitrate = $this->probeVideoBitrate($fileEntry['tmp_name']);
                        $duration = $this->probeVideoDuration($fileEntry['tmp_name']);
                        $metadata = $this->probeVideoStreamMetadata($fileEntry['tmp_name']);
                        if (is_array($metadata)) {
                                if (isset($metadata['width']) && (int) $metadata['width'] > 0) {
                                        $width = (int) $metadata['width'];
                                }
                                if (isset($metadata['height']) && (int) $metadata['height'] > 0) {
                                        $height = (int) $metadata['height'];
                                }
                        }
                } elseif ($contentType === 'image') {
                        $imageInfo = @getimagesize($fileEntry['tmp_name']);
                        if (is_array($imageInfo)) {
                                if (isset($imageInfo[0]) && (int) $imageInfo[0] > 0) {
                                        $width = (int) $imageInfo[0];
                                }
                                if (isset($imageInfo[1]) && (int) $imageInfo[1] > 0) {
                                        $height = (int) $imageInfo[1];
                                }
                        }
                }

                try {
                        $contentCode = $this->generateUniqid();
                        $fileName = $contentCode . ($safeExtension !== '' ? ('.' . $safeExtension) : '');
                        $relativePath = $contentCode . '/' . $fileName;
                        $relativeThumbnailPath = null;

                        $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
                        $mimeType = isset($fileEntry['type']) && $fileEntry['type'] !== '' ? $fileEntry['type'] : 'application/octet-stream';
                        $fileSize = isset($fileEntry['size']) ? (int)$fileEntry['size'] : null;

                        $stmt = $this->getPDOContents()->prepare('INSERT INTO userContents (contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, isVisible, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                        $stmt->execute(array($contentCode, $ownerUserCode, $contentType, $originalName, $relativePath, $mimeType, $fileSize, $duration, $bitrate, $width, $height, 1, $now, $now));

                        $baseDir = $this->dataBasePath . '/userdata/' . $ownerUserInfo["id"] . '/' . $contentCode;
                        if (is_dir($baseDir) == false && mkdir($baseDir, 0775, true) == false && is_dir($baseDir) == false) {
                                throw new RuntimeException('upload');
                        }

                        $destinationPath = $baseDir . '/' . $fileName;
                        if (move_uploaded_file($fileEntry['tmp_name'], $destinationPath) == false) {
                                throw new RuntimeException('upload');
                        }

                        if ($contentType === 'video' || $contentType === 'image') {
                                $thumbnailPath = $destinationPath . '_thumbnail';
                                $created = $this->createContentThumbnail($contentType, $destinationPath, $thumbnailPath);
                                if ($created) {
                                        $relativeThumbnailPath = $relativePath . '_thumbnail';
                                }
                        }

                        $this->response = array(
                                'contentCode' => $contentCode,
                                'contentType' => $contentType,
                                'fileName' => $originalName,
                                'filePath' => $relativePath,
                                'thumbnailPath' => $relativeThumbnailPath,
                                'mimeType' => $mimeType,
                                'fileSize' => $fileSize,
                                'duration' => $duration,
                                'bitrate' => $bitrate,
                                'width' => $width,
                                'height' => $height,
                                'createdAt' => $now,
                                'updatedAt' => $now,
                        );
                } catch (RuntimeException $exception) {
                        $reason = $exception->getMessage();
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = $reason === 'notfound' ? 'notfound' : 'upload';
                        $this->response = array('message' => 'コンテンツを保存できませんでした。');
                        return;
                }
        }

	public function procContentList()
	{
		$loginUserCode = $this->getLoginUserCode();
		if ($loginUserCode === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'login_required';
			return;
		}

		$targetUserCode = isset($this->params['userCode']) ? trim((string)$this->params['userCode']) : '';
		if ($targetUserCode === '' || (!$this->isSupervisor() && !$this->isOperator())) {
			$targetUserCode = $loginUserCode;
		}

		$pdo = $this->getPDOContents();
		$stmt = $pdo->prepare('SELECT * FROM userContents WHERE userCode = ? ORDER BY updatedAt DESC');

		if ($stmt === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'database_error';
			$this->response = array('message' => 'コンテンツ一覧の取得に失敗しました。');
			return;
		}

		if ($stmt->execute(array($targetUserCode)) === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'database_error';
			$this->response = array('message' => 'コンテンツ一覧の取得に失敗しました。');
			return;
		}

                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if (is_array($rows) && count($rows) > 0) {
                        $userInfo = $this->getUserInfo($targetUserCode);
                        $userId = is_array($userInfo) && array_key_exists('id', $userInfo) ? (int) $userInfo['id'] : null;
                        $userBaseDir = $userId !== null ? ($this->dataBasePath . '/userdata/' . $userId) : null;

                        foreach ($rows as &$row) {
                                if ($userId !== null && !array_key_exists('userId', $row)) {
                                        $row['userId'] = $userId;
                                }

                                $contentType = isset($row['contentType']) ? strtolower((string) $row['contentType']) : '';
                                if ($contentType !== 'image' || $userBaseDir === null) {
                                        continue;
                                }

                                $relativePath = isset($row['filePath']) ? trim((string) $row['filePath']) : '';
                                if ($relativePath === '') {
                                        continue;
                                }

                                $thumbnailRelativePath = $relativePath . '_thumbnail';
                                $thumbnailAbsolutePath = $userBaseDir . '/' . ltrim($thumbnailRelativePath, '/');
                                if (is_file($thumbnailAbsolutePath)) {
                                        $row['thumbnailPath'] = $thumbnailRelativePath;
                                }
                        }
                        unset($row);

                        $videoContentIds = array();
                        $videoContentCodes = array();
                        foreach ($rows as $row) {
                                $contentType = isset($row['contentType']) ? strtolower((string) $row['contentType']) : '';
                                if ($contentType === 'video' && isset($row['id'])) {
                                        $videoContentIds[] = (int) $row['id'];
                                        if (isset($row['contentCode'])) {
                                                $videoContentCodes[] = (string) $row['contentCode'];
                                        }
                                }
                        }

                        $proxyMap = array();
                        if (count($videoContentIds) > 0) {
                                $placeholders = implode(',', array_fill(0, count($videoContentIds), '?'));
                                $proxyStmt = $pdo->prepare('SELECT * FROM userContentsProxy WHERE userContentsId IN (' . $placeholders . ')');
                                if ($proxyStmt === false || $proxyStmt->execute($videoContentIds) === false) {
					$this->status = parent::RESULT_ERROR;
					$this->errorReason = 'database_error';
					$this->response = array('message' => 'コンテンツ一覧の取得に失敗しました。');
					return;
				}
				$proxyRows = $proxyStmt->fetchAll(PDO::FETCH_ASSOC);

				if (is_array($proxyRows)) {
					foreach ($proxyRows as $proxyRow) {
						if (!isset($proxyRow['userContentsId'])) {
							continue;
						}
						$contentId = (int) $proxyRow['userContentsId'];
						if (!isset($proxyMap[$contentId])) {
							$proxyMap[$contentId] = array();
						}
                                                $proxyMap[$contentId][] = $proxyRow;
                                        }
                                }
                        }

                        $activeProxyJobs = $this->getActiveProxyJobsByContentCode($videoContentCodes);

                        $queueIds = array();
                        foreach ($proxyMap as $contentId => $proxies) {
                                foreach ($proxies as $proxyRow) {
                                        if (isset($proxyRow['queueId']) && (int) $proxyRow['queueId'] > 0) {
                                                $queueIds[(int) $proxyRow['queueId']] = true;
                                        }
                                }
                        }

                        foreach ($activeProxyJobs as $jobList) {
                                foreach ($jobList as $jobInfo) {
                                        if (isset($jobInfo['id']) && (int) $jobInfo['id'] > 0) {
                                                $queueIds[(int) $jobInfo['id']] = true;
                                        }
                                }
                        }

                        $queueStatusMap = $this->getQueueStatusMap(array_keys($queueIds));

                        foreach ($rows as &$row) {
                                $contentId = isset($row['id']) ? (int) $row['id'] : null;
                                $contentCode = isset($row['contentCode']) ? (string) $row['contentCode'] : '';
                                $proxyList = array();
                                if ($contentId !== null && isset($proxyMap[$contentId])) {
                                        foreach ($proxyMap[$contentId] as $proxyRow) {
                                                $queueId = isset($proxyRow['queueId']) ? (int) $proxyRow['queueId'] : null;
                                                $queueStatus = $queueId !== null && isset($queueStatusMap[$queueId]) ? $queueStatusMap[$queueId] : 'success';

                                                $proxyRow['queueStatus'] = $queueStatus;
                                                $proxyRow['status'] = $queueStatus;
                                                $proxyRow['encoding'] = in_array($queueStatus, array('queued', 'running'), true);

                                                $proxyList[] = $proxyRow;
                                        }
                                }
                                if ($contentCode !== '' && isset($activeProxyJobs[$contentCode])) {
                                        foreach ($activeProxyJobs[$contentCode] as $jobInfo) {
                                                $queueId = isset($jobInfo['id']) ? (int) $jobInfo['id'] : null;
                                                $queueStatus = isset($jobInfo['status']) ? $jobInfo['status'] : 'queued';
                                                if ($queueId !== null && isset($queueStatusMap[$queueId])) {
                                                        $queueStatus = $queueStatusMap[$queueId];
                                                }

                                                $proxyList[] = array(
                                                        'queueId' => $queueId,
                                                        'status' => $queueStatus,
                                                        'queueStatus' => $queueStatus,
                                                        'encoding' => in_array($queueStatus, array('queued', 'running'), true),
                                                );
                                        }
                                }
                                $row['proxyList'] = $proxyList;
                                $row['lowRateExists'] = count($proxyList) > 0;
                        }
                        unset($row);
                }

                $this->response = array('items' => $rows !== false ? $rows : array());
        }

        public function procContentUsageList()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $contentCode = isset($this->params['contentCode']) ? trim((string)$this->params['contentCode']) : '';
                if ($contentCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        $this->response = array('message' => 'コンテンツを指定してください。');
                        return;
                }

                $ownerUserCode = $this->resolveContentOwnerUserCode($contentCode);
                if ($ownerUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        $this->response = array('message' => '指定されたコンテンツが見つかりません。');
                        return;
                }

                if ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator()) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'forbidden';
                        $this->response = array('message' => 'コンテンツの使用箇所を確認する権限がありません。');
                        return;
                }

                $pdoTarget = $this->getPDOTarget();
                $usageMap = array();

                if ($this->appendGuidanceUsage($pdoTarget, $contentCode, $usageMap) === false) {
                        return;
                }
                if ($this->appendReferenceUsage($pdoTarget, $contentCode, $usageMap) === false) {
                        return;
                }
                if ($this->appendSubmissionUsage($pdoTarget, $contentCode, $usageMap) === false) {
                        return;
                }
                if ($this->appendReviewUsage($pdoTarget, $contentCode, $usageMap) === false) {
                        return;
                }

                $this->response = array('items' => array_values($usageMap));
        }

        private function normalizeVisibilityFlag($value)
        {
                if ($value === null) {
                        return null;
                }

                if ($value === true || $value === 1) {
                        return true;
                }
                if ($value === false || $value === 0) {
                        return false;
                }

                if (is_string($value)) {
                        $normalized = strtolower(trim($value));
                        if ($normalized === '') {
                                return null;
                        }
                        if (in_array($normalized, array('1', 'true', 'yes', 'on'), true)) {
                                return true;
                        }
                        if (in_array($normalized, array('0', 'false', 'no', 'off'), true)) {
                                return false;
                        }
                }

                if (is_numeric($value)) {
                        return ((int) $value) !== 0;
                }

                return null;
        }

        protected function resolveContentOwnerUserCode($contentCode)
        {
                $pdo = $this->getPDOContents();
                $stmt = $pdo->prepare('SELECT userCode FROM userContents WHERE contentCode = ? LIMIT 1');
                if ($stmt === false) {
                        return null;
                }
                if ($stmt->execute(array($contentCode)) === false) {
                        return null;
                }
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row === false) {
                        return null;
                }
                return isset($row['userCode']) ? trim((string)$row['userCode']) : '';
        }

        protected function appendUsageEntry(array &$usageMap, $targetCode, $targetTitle, $usageType)
        {
                $code = trim((string)$targetCode);
                $type = trim((string)$usageType);
                if ($code === '' || $type === '') {
                        return;
                }
                $key = $type . '|' . $code;
                if (array_key_exists($key, $usageMap)) {
                        return;
                }
                $title = trim((string)$targetTitle);
                $usageMap[$key] = array(
                        'targetCode' => $code,
                        'targetName' => $title !== '' ? $title : $code,
                        'usageType' => $type,
                );
        }

        protected function appendGuidanceUsage(PDO $pdo, $contentCode, array &$usageMap)
        {
                $stmt = $pdo->prepare(
                        'SELECT DISTINCT t.targetCode, t.title '
                        . 'FROM targetGuidanceContents g '
                        . 'JOIN targets t ON g.targetCode = t.targetCode '
                        . 'WHERE g.contentCode = ? '
                        . 'AND (g.isDeleted IS NULL OR g.isDeleted = 0) '
                        . 'AND (t.isDeleted IS NULL OR t.isDeleted = 0)'
                );
                if ($stmt === false || $stmt->execute(array($contentCode)) === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database_error';
                        $this->response = array('message' => 'コンテンツの使用箇所を取得できませんでした。');
                        return false;
                }
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($rows as $row) {
                        $this->appendUsageEntry(
                                $usageMap,
                                isset($row['targetCode']) ? $row['targetCode'] : '',
                                isset($row['title']) ? $row['title'] : '',
                                'guidance'
                        );
                }
                return true;
        }

        protected function appendReferenceUsage(PDO $pdo, $contentCode, array &$usageMap)
        {
                $stmt = $pdo->prepare(
                        'SELECT DISTINCT rm.targetCode, t.title '
                        . 'FROM targetReferenceMaterialContents rc '
                        . 'JOIN targetReferenceMaterials rm ON rc.materialCode = rm.materialCode '
                        . 'JOIN targets t ON rm.targetCode = t.targetCode '
                        . 'WHERE rc.contentCode = ? '
                        . 'AND (rm.isDeleted IS NULL OR rm.isDeleted = 0) '
                        . 'AND (t.isDeleted IS NULL OR t.isDeleted = 0)'
                );
                if ($stmt === false || $stmt->execute(array($contentCode)) === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database_error';
                        $this->response = array('message' => 'コンテンツの使用箇所を取得できませんでした。');
                        return false;
                }
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($rows as $row) {
                        $this->appendUsageEntry(
                                $usageMap,
                                isset($row['targetCode']) ? $row['targetCode'] : '',
                                isset($row['title']) ? $row['title'] : '',
                                'reference'
                        );
                }
                return true;
        }

        protected function appendSubmissionUsage(PDO $pdo, $contentCode, array &$usageMap)
        {
                $stmt = $pdo->prepare(
                        'SELECT DISTINCT ts.targetCode, t.title '
                        . 'FROM submissionContents sc '
                        . 'JOIN submissions s ON sc.submissionCode = s.submissionCode AND (s.isDeleted IS NULL OR s.isDeleted = 0) '
                        . 'JOIN targetSubmissions ts ON sc.submissionCode = ts.submissionCode '
                        . 'JOIN targets t ON ts.targetCode = t.targetCode '
                        . 'WHERE sc.contentCode = ? '
                        . 'AND (t.isDeleted IS NULL OR t.isDeleted = 0)'
                );
                if ($stmt === false || $stmt->execute(array($contentCode)) === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database_error';
                        $this->response = array('message' => 'コンテンツの使用箇所を取得できませんでした。');
                        return false;
                }
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($rows as $row) {
                        $this->appendUsageEntry(
                                $usageMap,
                                isset($row['targetCode']) ? $row['targetCode'] : '',
                                isset($row['title']) ? $row['title'] : '',
                                'submission'
                        );
                }
                return true;
        }

        protected function appendReviewUsage(PDO $pdo, $contentCode, array &$usageMap)
        {
                $primaryStmt = $pdo->prepare(
                        'SELECT DISTINCT tr.targetCode, t.title '
                        . 'FROM targetReviews tr '
                        . 'JOIN targets t ON tr.targetCode = t.targetCode '
                        . 'WHERE tr.contentsCode = ? '
                        . 'AND (t.isDeleted IS NULL OR t.isDeleted = 0)'
                );
                if ($primaryStmt === false || $primaryStmt->execute(array($contentCode)) === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database_error';
                        $this->response = array('message' => 'コンテンツの使用箇所を取得できませんでした。');
                        return false;
                }
                $primaryRows = $primaryStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($primaryRows as $row) {
                        $this->appendUsageEntry(
                                $usageMap,
                                isset($row['targetCode']) ? $row['targetCode'] : '',
                                isset($row['title']) ? $row['title'] : '',
                                'review'
                        );
                }

                $commentStmt = $pdo->prepare(
                        'SELECT DISTINCT tr.targetCode, t.title '
                        . 'FROM reviewVideoComments rvc '
                        . 'JOIN reviews r ON r.reviewCode = rvc.reviewCode AND (r.isDeleted IS NULL OR r.isDeleted = 0) '
                        . 'JOIN targetReviews tr ON tr.reviewCode = r.reviewCode '
                        . 'JOIN targets t ON tr.targetCode = t.targetCode '
                        . 'WHERE rvc.contentCode = ? '
                        . 'AND (t.isDeleted IS NULL OR t.isDeleted = 0)'
                );
                if ($commentStmt === false || $commentStmt->execute(array($contentCode)) === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database_error';
                        $this->response = array('message' => 'コンテンツの使用箇所を取得できませんでした。');
                        return false;
                }
                $commentRows = $commentStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($commentRows as $row) {
                        $this->appendUsageEntry(
                                $usageMap,
                                isset($row['targetCode']) ? $row['targetCode'] : '',
                                isset($row['title']) ? $row['title'] : '',
                                'review'
                        );
                }
                return true;
        }

        protected function getActiveProxyJobsByContentCode(array $contentCodes)
        {
                $normalizedCodes = array();
                foreach ($contentCodes as $code) {
                        $codeString = trim((string) $code);
                        if ($codeString !== '') {
                                $normalizedCodes[$codeString] = true;
                        }
                }

                if (count($normalizedCodes) === 0) {
                        return array();
                }

                try {
                        $pdo = $this->getPDOQueue();
                } catch (Exception $exception) {
                        return array();
                }

                try {
                        $stmt = $pdo->prepare("SELECT id, status, context FROM job_queue WHERE job_type = 'video_transcode' AND status IN ('queued','running')");
                        $stmt->execute();
                        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                } catch (Exception $exception) {
                        return array();
                }

                $active = array();
                foreach ($rows as $row) {
                        $context = array();
                        if (isset($row['context']) && is_string($row['context']) && $row['context'] !== '') {
                                $decoded = json_decode($row['context'], true);
                                if (is_array($decoded)) {
                                        $context = $decoded;
                                }
                        }

                        $contentCode = isset($context['contentCode']) ? trim((string) $context['contentCode']) : '';
                        if ($contentCode === '' || !array_key_exists($contentCode, $normalizedCodes)) {
                                continue;
                        }

                        if (!isset($active[$contentCode])) {
                                $active[$contentCode] = array();
                        }

                        $active[$contentCode][] = array(
                                'id' => isset($row['id']) ? (int) $row['id'] : null,
                                'status' => isset($row['status']) ? strtolower((string) $row['status']) : 'queued',
                        );
                }

                return $active;
        }

        protected function getQueueStatusMap(array $queueIds)
        {
                $normalizedIds = array();
                foreach ($queueIds as $queueId) {
                        $id = (int) $queueId;
                        if ($id > 0) {
                                $normalizedIds[$id] = true;
                        }
                }

                if (count($normalizedIds) === 0) {
                        return array();
                }

                try {
                        $pdo = $this->getPDOQueue();
                } catch (Exception $exception) {
                        return array();
                }

                $placeholders = implode(',', array_fill(0, count($normalizedIds), '?'));
                $stmt = $pdo->prepare('SELECT id, status FROM job_queue WHERE id IN (' . $placeholders . ')');
                if ($stmt === false || $stmt->execute(array_keys($normalizedIds)) === false) {
                        return array();
                }

                $statusMap = array();
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($rows as $row) {
                        if (!isset($row['id'])) {
                                continue;
                        }
                        $id = (int) $row['id'];
                        if ($id <= 0) {
                                continue;
                        }
                        $status = isset($row['status']) ? strtolower((string) $row['status']) : '';
                        if ($status === '') {
                                continue;
                        }
                        $statusMap[$id] = $status;
                }

                return $statusMap;
        }

        public function procContentDelete()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
			$this->errorReason = 'login_required';
			return;
		}

		$contentCode = trim((string)$this->params['contentCode']);
		$stmt = $this->getPDOContents()->prepare('SELECT contentCode, userCode, filePath FROM userContents WHERE contentCode = ? LIMIT 1');
		$stmt->execute(array($contentCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$ownerUserCode = isset($row['userCode']) ? trim((string)$row['userCode']) : '';
		if ($ownerUserCode === '' || ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator())) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

		$pdo = $this->getPDOContents();
		$pdo->beginTransaction();
		try {
			$deleteClip = $pdo->prepare('DELETE FROM userContentClipBookmarks WHERE contentCode = ?');
			$deleteClip->execute(array($contentCode));

			$deleteContent = $pdo->prepare('DELETE FROM userContents WHERE contentCode = ?');
			$deleteContent->execute(array($contentCode));
			$pdo->commit();
		} catch (Exception $exception) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'database_error';
			$this->response = array('message' => 'コンテンツを削除できませんでした。');
			return;
		}

                $this->response = array('contentCode' => $contentCode);
        }

        public function procContentVisibilityUpdate()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $contentCode = isset($this->params['contentCode']) ? trim((string)$this->params['contentCode']) : '';
                $visibilityFlag = $this->normalizeVisibilityFlag($this->params['isVisible']);

                if ($contentCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_content';
                        return;
                }
                if ($visibilityFlag === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_visibility';
                        $this->response = array('message' => '表示状態の指定が不正です。');
                        return;
                }

                $stmt = $this->getPDOContents()->prepare('SELECT contentCode, userCode FROM userContents WHERE contentCode = ? LIMIT 1');
                $stmt->execute(array($contentCode));
                $row = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($row === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $ownerUserCode = isset($row['userCode']) ? trim((string)$row['userCode']) : '';
                if ($ownerUserCode === '' || ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator())) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'forbidden';
                        return;
                }

                $pdo = $this->getPDOContents();
                try {
                        $stmtUpdate = $pdo->prepare('UPDATE userContents SET isVisible = ?, updatedAt = ? WHERE contentCode = ?');
                        $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
                        $stmtUpdate->execute(array($visibilityFlag ? 1 : 0, $now, $contentCode));

                        $this->response = array(
                                'contentCode' => $contentCode,
                                'isVisible' => $visibilityFlag ? 1 : 0,
                                'updatedAt' => $now,
                        );
                } catch (Exception $exception) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database_error';
                        $this->response = array('message' => '表示状態を更新できませんでした。');
                        return;
                }
        }

        public function procContentClipUpdate()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null || $loginUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
			$this->errorReason = 'login_required';
			return;
		}

		$contentCode = isset($this->params['contentCode']) ? trim((string) $this->params['contentCode']) : '';
		if ($contentCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid_content';
			return;
		}

		$stmt = $this->getPDOContents()->prepare('SELECT contentCode, userCode FROM userContents WHERE contentCode = ? LIMIT 1');
		$stmt->execute(array($contentCode));
		$contentRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($contentRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$ownerUserCode = isset($contentRow['userCode']) ? trim((string) $contentRow['userCode']) : '';
		if ($ownerUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid_owner';
			return;
		}

		if ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator()) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

		$clipTimes = $this->normalizeClipTimeList($this->params['clipTimes']);
		$clipPayload = array_map(static function ($value) {
				return round((float) $value, 3);
			}, $clipTimes);

		$clipJson = json_encode($clipPayload);
		if ($clipJson === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid_clip_times';
			$this->response = array('message' => 'クリップ情報を保存できませんでした。');
			return;
		}

		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		try {
			$stmt = $this->getPDOContents()->prepare(
													 'INSERT INTO userContentClipBookmarks (contentCode, userCode, clipTimes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?) '
													 . 'ON CONFLICT(contentCode, userCode) DO UPDATE SET clipTimes = excluded.clipTimes, updatedAt = excluded.updatedAt'
													 );
			$stmt->execute(array($contentCode, $loginUserCode, $clipJson, $timestamp, $timestamp));
		} catch (Exception $exception) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'database_error';
			$this->response = array('message' => 'クリップ情報の保存に失敗しました。', 'details' => $exception->getMessage());
			return;
		}

		$this->response = array(
								'contentCode' => $contentCode,
								'clipTimes' => $clipPayload,
								'clipCount' => count($clipPayload),
								'updatedAt' => $timestamp
								);
	}

	public function procContentProxy()
	{
		$loginUserCode = $this->getLoginUserCode();
		if ($loginUserCode === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'login_required';
			return;
		}

		$contentCode = isset($this->params['contentCode']) ? trim((string) $this->params['contentCode']) : '';
		if ($contentCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid_content';
			return;
		}

		$stmt = $this->getPDOContents()->prepare('SELECT contentCode, userCode, contentType, filePath, fileName, mimeType, fileSize FROM userContents WHERE contentCode = ? LIMIT 1');
		$stmt->execute(array($contentCode));
		$contentRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($contentRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$ownerUserCode = isset($contentRow['userCode']) ? trim((string) $contentRow['userCode']) : '';
		if ($ownerUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid_owner';
			return;
		}

		if ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator()) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

		$userInfo = $this->getUserInfo($ownerUserCode);
		if (!is_array($userInfo) || !array_key_exists('id', $userInfo)) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'user_notfound';
			return;
		}
		$relativePath = isset($contentRow['filePath']) ? trim((string) $contentRow['filePath']) : '';
		if ($relativePath === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'file_notfound';
			return;
		}

		$baseDir = $this->dataBasePath . '/userdata/' . $userInfo["id"];
		$sourcePath = $baseDir . '/' . ltrim($relativePath, '/');
		if (is_file($sourcePath) == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'file_notfound';
			return;
		}

		$mimeType = isset($contentRow['mimeType']) ? $contentRow['mimeType'] : '';
		$extension = strtolower((string) pathinfo($sourcePath, PATHINFO_EXTENSION));
		$contentType = isset($contentRow['contentType']) ? (string) $contentRow['contentType'] : '';
		$isVideo = strtolower($contentType) === 'video' || Util::isVideoFile((string) $mimeType, $extension);
		if ($isVideo === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'unsupported_type';
			$this->response = array('message' => '動画ファイルのみ低レート動画を作成できます。');
			return;
		}

		$context = array(
						 'contentCode' => $contentCode,
						 'requestedBy' => $loginUserCode,
						 'fileName' => isset($contentRow['fileName']) ? $contentRow['fileName'] : null,
						 'fileSize' => isset($contentRow['fileSize']) ? (int) $contentRow['fileSize'] : null,
						 );

		$result = $this->scheduleLowRateVideoTranscode($sourcePath, $context);

                $this->response = array(
                                                                'status' => isset($result['status']) ? $result['status'] : 'unknown',
                                                                'queueId' => isset($result['queueId']) ? $result['queueId'] : null,
                                                                'message' => isset($result['message']) ? $result['message'] : null,
                                                                );

                if (isset($result['status']) && $result['status'] === 'error') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'queue_error';
                }
        }

        public function procContentImageGet()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $contentCode = isset($this->params['contentCode']) ? trim((string) $this->params['contentCode']) : '';
                if ($contentCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_content';
                        return;
                }

                $stmt = $this->getPDOContents()->prepare('SELECT contentCode, userCode, contentType, filePath, fileName, mimeType FROM userContents WHERE contentCode = ? LIMIT 1');
                $stmt->execute(array($contentCode));
                $contentRow = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($contentRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $ownerUserCode = isset($contentRow['userCode']) ? trim((string) $contentRow['userCode']) : '';
                if ($ownerUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_owner';
                        return;
                }

                if ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator()) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'forbidden';
                        return;
                }

                $contentType = isset($contentRow['contentType']) ? strtolower((string) $contentRow['contentType']) : '';

                $variant = isset($this->params['variant']) ? strtolower((string) $this->params['variant']) : '';
                $isThumbnailVariant = $variant === 'thumbnail';

                $isImageContent = $contentType === 'image';
                $isVideoThumbnailRequest = $contentType === 'video' && $isThumbnailVariant;

                if ($isImageContent === false && $isVideoThumbnailRequest === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'unsupported_type';
                        $this->response = array('message' => '画像ファイルのみ取得できます。');
                        return;
                }

                $userInfo = $this->getUserInfo($ownerUserCode);
                if (!is_array($userInfo) || !array_key_exists('id', $userInfo)) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'user_notfound';
                        return;
                }

                $relativePath = isset($contentRow['filePath']) ? trim((string) $contentRow['filePath']) : '';
                if ($relativePath === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_notfound';
                        return;
                }

                $baseDir = $this->dataBasePath . '/userdata/' . $userInfo['id'];
                $targetPath = $relativePath;
                if ($isThumbnailVariant) {
                        $targetPath = $relativePath . '_thumbnail';
                }

                $sourcePath = $baseDir . '/' . ltrim($targetPath, '/');
                if (is_file($sourcePath) == false) {
                        $sourcePath = $baseDir . '/' . ltrim($relativePath, '/');
                        if (is_file($sourcePath) == false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'file_notfound';
                                return;
                        }
                }

                $this->noOutput = true;
                $mimeType = isset($contentRow['mimeType']) ? (string) $contentRow['mimeType'] : null;
                if ($isVideoThumbnailRequest) {
                        $mimeType = null;
                }
                $this->streamImageFile($sourcePath, $mimeType);
        }

        public function procContentAudioGet()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $contentCode = isset($this->params['contentCode']) ? trim((string) $this->params['contentCode']) : '';
                if ($contentCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_content';
                        return;
                }

                $stmt = $this->getPDOContents()->prepare('SELECT contentCode, userCode, contentType, filePath, fileName, mimeType FROM userContents WHERE contentCode = ? LIMIT 1');
                $stmt->execute(array($contentCode));
                $contentRow = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($contentRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $ownerUserCode = isset($contentRow['userCode']) ? trim((string) $contentRow['userCode']) : '';
                if ($ownerUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_owner';
                        return;
                }

                if ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator()) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'forbidden';
                        return;
                }

                $contentType = isset($contentRow['contentType']) ? strtolower((string) $contentRow['contentType']) : '';
                if ($contentType !== 'audio') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'unsupported_type';
                        $this->response = array('message' => '音声ファイルのみ取得できます。');
                        return;
                }

                $userInfo = $this->getUserInfo($ownerUserCode);
                if (!is_array($userInfo) || !array_key_exists('id', $userInfo)) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'user_notfound';
                        return;
                }

                $relativePath = isset($contentRow['filePath']) ? trim((string) $contentRow['filePath']) : '';
                if ($relativePath === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_notfound';
                        return;
                }

                $baseDir = $this->dataBasePath . '/userdata/' . $userInfo['id'];
                $sourcePath = $baseDir . '/' . ltrim($relativePath, '/');
                if (is_file($sourcePath) == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_notfound';
                        return;
                }

                $this->noOutput = true;
                $mimeType = isset($contentRow['mimeType']) ? (string) $contentRow['mimeType'] : null;
                streamVideoFile($sourcePath, $mimeType !== '' ? $mimeType : null);
        }

        public function procContentFileGet()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $contentCode = isset($this->params['contentCode']) ? trim((string) $this->params['contentCode']) : '';
                if ($contentCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_content';
                        return;
                }

                $stmt = $this->getPDOContents()->prepare('SELECT contentCode, userCode, contentType, filePath, fileName, mimeType FROM userContents WHERE contentCode = ? LIMIT 1');
                $stmt->execute(array($contentCode));
                $contentRow = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($contentRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $ownerUserCode = isset($contentRow['userCode']) ? trim((string) $contentRow['userCode']) : '';
                if ($ownerUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_owner';
                        return;
                }

                if ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator()) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'forbidden';
                        return;
                }

                $contentType = isset($contentRow['contentType']) ? strtolower((string) $contentRow['contentType']) : '';
                if ($contentType === 'video' || $contentType === 'audio') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'unsupported_type';
                        $this->response = array('message' => 'ファイルのみ取得できます。');
                        return;
                }

                $userInfo = $this->getUserInfo($ownerUserCode);
                if (!is_array($userInfo) || !array_key_exists('id', $userInfo)) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'user_notfound';
                        return;
                }

                $relativePath = isset($contentRow['filePath']) ? trim((string) $contentRow['filePath']) : '';
                if ($relativePath === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_notfound';
                        return;
                }

                $baseDir = $this->dataBasePath . '/userdata/' . $userInfo['id'];
                $sourcePath = $baseDir . '/' . ltrim($relativePath, '/');
                if (is_file($sourcePath) == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_notfound';
                        return;
                }

                $this->noOutput = true;
                $mimeType = isset($contentRow['mimeType']) ? (string) $contentRow['mimeType'] : null;
                $this->streamInlineFile($sourcePath, $mimeType !== '' ? $mimeType : null);
        }

        public function procContentFileCheck()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $contentCode = isset($this->params['contentCode']) ? trim((string) $this->params['contentCode']) : '';
                if ($contentCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_content';
                        return;
                }

                $stmt = $this->getPDOContents()->prepare('SELECT contentCode, userCode, contentType, filePath, fileName, mimeType FROM userContents WHERE contentCode = ? LIMIT 1');
                $stmt->execute(array($contentCode));
                $contentRow = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($contentRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $ownerUserCode = isset($contentRow['userCode']) ? trim((string) $contentRow['userCode']) : '';
                if ($ownerUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_owner';
                        return;
                }

                if ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator()) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'forbidden';
                        return;
                }

                $contentType = isset($contentRow['contentType']) ? strtolower((string) $contentRow['contentType']) : '';
                if ($contentType === 'video' || $contentType === 'audio') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'unsupported_type';
                        $this->response = array('message' => 'ファイルのみ確認できます。');
                        return;
                }

                $userInfo = $this->getUserInfo($ownerUserCode);
                if (!is_array($userInfo) || !array_key_exists('id', $userInfo)) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'user_notfound';
                        return;
                }

                $relativePath = isset($contentRow['filePath']) ? trim((string) $contentRow['filePath']) : '';
                if ($relativePath === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_notfound';
                        return;
                }

                $baseDir = $this->dataBasePath . '/userdata/' . $userInfo['id'];
                $sourcePath = $baseDir . '/' . ltrim($relativePath, '/');
                if (is_file($sourcePath) == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_notfound';
                        return;
                }

                $this->status = parent::RESULT_SUCCESS;
                $this->response = array(
                        'available' => true,
                        'contentCode' => $contentCode,
                        'fileName' => isset($contentRow['fileName']) ? (string) $contentRow['fileName'] : '',
                        'mimeType' => isset($contentRow['mimeType']) ? (string) $contentRow['mimeType'] : ''
                );
        }

        public function procContentVideoGet()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
			$this->errorReason = 'login_required';
			return;
		}

		$contentCode = isset($this->params['contentCode']) ? trim((string) $this->params['contentCode']) : '';
		if ($contentCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid_content';
			return;
		}

                $stmt = $this->getPDOContents()->prepare('SELECT id, contentCode, userCode, contentType, filePath, fileName, mimeType, bitrate FROM userContents WHERE contentCode = ? LIMIT 1');
                $stmt->execute(array($contentCode));
                $contentRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($contentRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$ownerUserCode = isset($contentRow['userCode']) ? trim((string) $contentRow['userCode']) : '';
		if ($ownerUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid_owner';
			return;
		}

		if ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator()) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

		$contentType = isset($contentRow['contentType']) ? strtolower((string) $contentRow['contentType']) : '';
		if ($contentType !== 'video') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'unsupported_type';
			$this->response = array('message' => '動画ファイルのみ取得できます。');
			return;
		}

		$userInfo = $this->getUserInfo($ownerUserCode);
		if (!is_array($userInfo) || !array_key_exists('id', $userInfo)) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'user_notfound';
			return;
		}

                $relativePath = isset($contentRow['filePath']) ? trim((string) $contentRow['filePath']) : '';
                if ($relativePath === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_notfound';
                        return;
                }

                $baseDir = $this->dataBasePath . '/userdata/' . $userInfo['id'];

                $variants = array(
                        array(
                                'filePath' => $relativePath,
                                'bitrate' => isset($contentRow['bitrate']) ? (int) $contentRow['bitrate'] : null
                        )
                );
                $contentId = isset($contentRow['id']) ? (int) $contentRow['id'] : null;
                if ($contentId !== null) {
                        $proxyStmt = $this->getPDOContents()->prepare('SELECT filePath, bitrate FROM userContentsProxy WHERE userContentsId = ?');
                        if ($proxyStmt && $proxyStmt->execute(array($contentId)) !== false) {
                                $proxyRows = $proxyStmt->fetchAll(PDO::FETCH_ASSOC);
                                if (is_array($proxyRows)) {
                                        foreach ($proxyRows as $proxyRow) {
                                                if (!isset($proxyRow['filePath'])) {
                                                        continue;
                                                }
                                                $variants[] = array(
                                                        'filePath' => (string) $proxyRow['filePath'],
                                                        'bitrate' => isset($proxyRow['bitrate']) ? (int) $proxyRow['bitrate'] : null
                                                );
                                        }
                                }
                        }
                }

                $requestedQuality = isset($this->params['quality']) ? trim((string) $this->params['quality']) : '';
                $selectedPath = $this->resolveVideoVariantPath($variants, $requestedQuality, $relativePath);
                $sourcePath = $baseDir . '/' . ltrim($selectedPath, '/');
                if (is_file($sourcePath) == false) {
                        $sourcePath = $baseDir . '/' . ltrim($relativePath, '/');
                        if (is_file($sourcePath) == false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'file_notfound';
                                return;
                        }
                }

                $this->noOutput = true;
                $mimeType = isset($contentRow['mimeType']) ? (string) $contentRow['mimeType'] : null;
                streamVideoFile($sourcePath, $mimeType !== '' ? $mimeType : null);
        }

        protected function streamInlineFile(string $filePath, ?string $forcedMime = null): void
        {
                $this->streamImageFile($filePath, $forcedMime);
        }

        protected function streamImageFile(string $filePath, ?string $forcedMime = null): void
        {
                if (!is_file($filePath) || !is_readable($filePath)) {
                        http_response_code(404);
                        exit;
                }

                @session_write_close();
                @ini_set('zlib.output_compression', 'Off');
                @set_time_limit(0);
                while (ob_get_level() > 0) {
                        @ob_end_clean();
                }

                $mime = $forcedMime;
                if ($mime === null || $mime === '') {
                        $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : false;
                        $mime = $finfo ? finfo_file($finfo, $filePath) : null;
                        if ($finfo) {
                                finfo_close($finfo);
                        }
                        if ($mime === false || $mime === null || $mime === '') {
                                $mime = 'application/octet-stream';
                        }
                }

                $size = filesize($filePath);
                $lastModified = gmdate('D, d M Y H:i:s', filemtime($filePath)) . ' GMT';
                $etag = '"' . md5($filePath . '|' . $size . '|' . $lastModified) . '"';

                header('Content-Type: ' . $mime);
                header('Content-Length: ' . $size);
                header('Cache-Control: public, max-age=31536000, immutable');
                header('Last-Modified: ' . $lastModified);
                header('ETag: ' . $etag);
                header('Content-Disposition: inline; filename="' . basename($filePath) . '"');

                if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim((string) $_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
                        http_response_code(304);
                        exit;
                }

                if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && trim((string) $_SERVER['HTTP_IF_MODIFIED_SINCE']) === $lastModified) {
                        http_response_code(304);
                        exit;
                }

                $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
                if (strcasecmp($method, 'HEAD') === 0) {
                        exit;
                }

                $handle = fopen($filePath, 'rb');
                if ($handle === false) {
                        http_response_code(500);
                        exit;
                }

                $chunkSize = 1024 * 1024;
                while (!feof($handle)) {
                        $buffer = fread($handle, $chunkSize);
                        if ($buffer === false) {
                                break;
                        }
                        echo $buffer;
                        @ob_flush();
                        flush();
                        if (connection_aborted()) {
                                break;
                        }
                }

                fclose($handle);
                exit;
        }

        protected function resolveVideoVariantPath(array $variants, string $requestedQuality, string $defaultPath)
        {
                if (count($variants) === 0) {
                        return $defaultPath;
                }

                $selected = $variants[0];
                $normalizedQuality = trim($requestedQuality);

                if ($normalizedQuality !== '') {
                        if ($normalizedQuality === 'low') {
                                $lowest = $selected;
                                foreach ($variants as $variant) {
                                        if (!isset($variant['bitrate'])) {
                                                continue;
                                        }
                                        if (!isset($lowest['bitrate']) || (int) $variant['bitrate'] < (int) $lowest['bitrate']) {
                                                $lowest = $variant;
                                        }
                                }
                                $selected = $lowest;
                        } else {
                                $target = ctype_digit($normalizedQuality) ? (int) $normalizedQuality : null;
                                if ($target !== null) {
                                        foreach ($variants as $variant) {
                                                if (isset($variant['bitrate']) && (int) $variant['bitrate'] === $target) {
                                                        $selected = $variant;
                                                        break;
                                                }
                                        }
                                }
                        }
                }

                if (!isset($selected['filePath'])) {
                        return $defaultPath;
                }

                $path = trim((string) $selected['filePath']);
                if ($path === '') {
                        return $defaultPath;
                }

                return $path;
        }

        public function procContentYouTubeMetadata()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $contentCode = isset($this->params['contentCode']) ? trim((string) $this->params['contentCode']) : '';
                if ($contentCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_content';
                        return;
                }

                $stmt = $this->getPDOContents()->prepare('SELECT contentCode, userCode, filePath, fileName, updatedAt FROM userContents WHERE contentCode = ? LIMIT 1');
                $stmt->execute(array($contentCode));
                $contentRow = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($contentRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $ownerUserCode = isset($contentRow['userCode']) ? trim((string) $contentRow['userCode']) : '';
                if ($ownerUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_owner';
                        return;
                }

                if ($ownerUserCode !== $loginUserCode && !$this->isSupervisor() && !$this->isOperator()) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'forbidden';
                        return;
                }

                $fileName = isset($contentRow['fileName']) ? (string) $contentRow['fileName'] : '';
                $lowerName = strtolower($fileName);
                $isYouTubeMeta = (strpos($lowerName, 'content-youtube-') === 0) && (substr($lowerName, -5) === '.json');
                if ($isYouTubeMeta === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'unsupported_type';
                        $this->response = array('message' => 'YouTubeメタデータのみ取得できます。');
                        return;
                }

                $userInfo = $this->getUserInfo($ownerUserCode);
                if (!is_array($userInfo) || !array_key_exists('id', $userInfo)) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'user_notfound';
                        return;
                }

                $relativePath = isset($contentRow['filePath']) ? trim((string) $contentRow['filePath']) : '';
                if ($relativePath === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_notfound';
                        return;
                }

                $baseDir = $this->dataBasePath . '/userdata/' . $userInfo['id'];
                $sourcePath = $baseDir . '/' . ltrim($relativePath, '/');
                if (is_file($sourcePath) == false || is_readable($sourcePath) == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_notfound';
                        return;
                }

                $json = @file_get_contents($sourcePath);
                if ($json === false || $json === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'file_read_error';
                        $this->response = array('message' => 'メタデータを取得できませんでした。');
                        return;
                }

                $metadata = json_decode($json, true);
                if (!is_array($metadata)) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_metadata';
                        $this->response = array('message' => 'メタデータの形式が不正です。');
                        return;
                }

                $this->response = array(
                        'contentCode' => $contentCode,
                        'fileName' => $fileName,
                        'metadata' => $metadata,
                        'updatedAt' => isset($contentRow['updatedAt']) ? $contentRow['updatedAt'] : null,
                );
        }



        private function resolveContentType(array $fileEntry)
        {
                $mime = isset($fileEntry['type']) ? strtolower((string) $fileEntry['type']) : '';
                $name = isset($fileEntry['name']) ? (string) $fileEntry['name'] : '';
                $extension = strtolower((string) pathinfo($name, PATHINFO_EXTENSION));

                if (Util::isVideoFile($mime, $extension)) {
                        return 'video';
                }

                if (strpos($mime, 'image/') === 0) {
                        return 'image';
                }

                if (strpos($mime, 'audio/') === 0) {
                        return 'audio';
                }

                return 'file';
        }

        private function createContentThumbnail($contentType, $sourcePath, $targetPath)
        {
                if ($contentType === 'video') {
                        return $this->createVideoThumbnail($sourcePath, $targetPath);
                }

                if ($contentType === 'image') {
                        return $this->createImageThumbnail($sourcePath, $targetPath);
                }

                return false;
        }

        private function createVideoThumbnail($sourcePath, $targetPath)
        {
                $ffmpeg = $this->findExecutable('ffmpeg');
                if ($ffmpeg === null) {
                        self::writeLog('createVideoThumbnail: ffmpeg not found', 'thumbnail');
                        return false;
                }

                $command = sprintf(
                        '%s -y -i %s -vframes 1 -vf "thumbnail,scale=min(320\\,iw):-2" -f image2 -vcodec mjpeg %s',
                        escapeshellcmd($ffmpeg),
                        escapeshellarg($sourcePath),
                        escapeshellarg($targetPath)
                );

                self::writeLog('createVideoThumbnail command=' . $command, 'thumbnail');

                $output = array();
                $exitCode = null;
                exec($command, $output, $exitCode);

                if ($exitCode === 0 && is_file($targetPath) && filesize($targetPath) > 0) {
                        return true;
                }

                self::writeLog(
                                        'createVideoThumbnail failed: exitCode=' . (is_numeric($exitCode) ? $exitCode : 'unknown')
                                        . ' command=' . $command
                                        . ' output=' . implode(' | ', $output),
                                        'thumbnail'
                                        );

                return false;
        }

        private function createImageThumbnail($sourcePath, $targetPath)
        {
                $convert = $this->findExecutable('convert');
                if ($convert === null) {
                        self::writeLog('createImageThumbnail: convert not found', 'thumbnail');
                        return false;
                }

                $maxDimension = 320;
                $geometry = $maxDimension . 'x' . $maxDimension . '>';

                $command = sprintf(
                                        "%s -auto-orient -strip -thumbnail %s %s %s",
                                        escapeshellcmd($convert),
                                        escapeshellarg($geometry),
                                        escapeshellarg($sourcePath),
                                        escapeshellarg($targetPath)
                                        );

                self::writeLog('createImageThumbnail command=' . $command, 'thumbnail');

                $output = array();
                $exitCode = null;
                exec($command, $output, $exitCode);

                if ($exitCode === 0 && is_file($targetPath) && filesize($targetPath) > 0) {
                        return true;
                }

                self::writeLog(
                                        'createImageThumbnail failed: exitCode=' . (is_numeric($exitCode) ? $exitCode : 'unknown')
                                        . ' command=' . $command
                                        . ' output=' . implode(' | ', $output),
                                        'thumbnail'
                                        );

                return false;
        }


private function normalizeClipTimeList($times, $maxDuration = null)
{
if (!is_array($times)) {
return array();
		}

		$normalized = array();
		foreach ($times as $value) {
			if (is_numeric($value)) {
				$float = (float) $value;
				if ($float >= 0 && ($maxDuration === null || $float <= $maxDuration)) {
					$normalized[] = $float;
				}
			}
		}

		sort($normalized, SORT_NUMERIC);
		return array_values(array_unique($normalized, SORT_REGULAR));
	}

	protected function scheduleLowRateVideoTranscode($sourcePath, array $context = array(), $targetBitrate = null, array $options = array())
	{
		if ($targetBitrate === null || $targetBitrate <= 0) {
			$targetBitrate = parent::DEFAULT_LOW_RATE_VIDEO_BITRATE;
		}

		if ($targetBitrate <= 0) {
			return array('status' => 'invalid');
		}

		if (!is_file($sourcePath)) {
			return array('status' => 'not_found');
		}

		$originalBitrate = $this->probeVideoBitrate($sourcePath);
		if ($originalBitrate !== null && $originalBitrate <= 0) {
			$originalBitrate = null;
		}

		$targetPath = $this->buildLowRateVideoPath($sourcePath, $targetBitrate);

		if (isset($context['targetBitrate']) == false) {
			$context['targetBitrate'] = $targetBitrate;
		}

		$result = $this->ensureLowRateVideoJob(
											   $sourcePath,
											   $targetPath,
											   $targetBitrate,
											   $originalBitrate,
											   $context,
											   $options
											   );

                if (is_array($result) && (!isset($result['message']) || $result['message'] === '')) {
                        if (isset($result['status']) && $result['status'] === 'throttled') {
                                $result['message'] = '低レート動画の変換要求が制限されています。時間を置いて再度お試しください。';
                        }
                }

                return $result;
        }

    protected function dispatchProxyJobAsync()
    {
        if (function_exists('fastcgi_finish_request')) {
            @fastcgi_finish_request();
        }
        ignore_user_abort(true);
        $this->makeProxy();
    }

    public function makeProxy($jobId = null)
    {
        $this->writeLog('makeProxy invoked with jobId=' . (is_scalar($jobId) ? $jobId : 'null'), 'queue');
        try {
            $pdo = $this->getPDOQueue();
        } catch (Exception $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'database_unavailable';
            $this->response = array(
                                                                        'message' => 'キューデータベースに接続できませんでした。',
                                                                        'details' => $exception->getMessage(),
                                                                        );
            $this->writeLog('makeProxy failed to obtain queue PDO: ' . $exception->getMessage(), 'queue');
            return;
        }

        $resolvedJobId = null;
        if (is_int($jobId) || ctype_digit((string) $jobId)) {
            $jobIdInt = (int) $jobId;
            if ($jobIdInt > 0) {
                $resolvedJobId = $jobIdInt;
            }
        }

        $this->writeLog('makeProxy resolved jobId=' . ($resolvedJobId === null ? 'auto' : $resolvedJobId), 'queue');

        $record = $this->fetchLowRateJobRecord($pdo, $resolvedJobId);
        if ($record === null) {
            $this->writeLog('makeProxy could not obtain a job record', 'queue');
            return;
        }

        $this->writeLog('makeProxy fetched job record id=' . (isset($record['id']) ? $record['id'] : 'unknown') . ' status=' . (isset($record['status']) ? $record['status'] : '') . ' started_at=' . (isset($record['started_at']) ? $record['started_at'] : '') . ' finished_at=' . (isset($record['finished_at']) ? $record['finished_at'] : ''), 'queue');

        $maxConcurrent = (int) self::MAX_CONCURRENT_LOW_RATE_TRANSCODES;
        if ($maxConcurrent > 0) {
            $this->writeLog(
                'makeProxy starting concurrency check for jobId=' . (isset($record['id']) ? $record['id'] : 'unknown')
                . ' recordStatus=' . (isset($record['status']) ? $record['status'] : '')
                . ' max=' . $maxConcurrent,
                'queue'
            );

            $runningStmt = $pdo->query("SELECT COUNT(1) FROM job_queue WHERE job_type = 'video_transcode' AND status = 'running'");
            if ($runningStmt === false) {
                $this->writeLog('makeProxy concurrency query failed; defaulting running count to 0', 'queue');
                $runningCount = 0;
            } else {
                $rawRunningCount = $runningStmt->fetchColumn();
                if ($rawRunningCount === false) {
                    $this->writeLog('makeProxy concurrency fetchColumn returned false; treating as 0', 'queue');
                    $runningCount = 0;
                } else {
                    $runningCount = (int) $rawRunningCount;
                    $this->writeLog(
                        'makeProxy concurrency query result: running=' . $runningCount . ', max=' . $maxConcurrent,
                        'queue'
                    );
                }
            }

            if ($resolvedJobId !== null && isset($record['id']) && (int) $record['id'] === $resolvedJobId) {
                $runningCount = max(0, $runningCount - 1);

                $this->writeLog(
                    'makeProxy concurrency adjusted to exclude current job: running=' . $runningCount . ' (jobId=' . $resolvedJobId . ')',
                    'queue'
                );
            }

            if ($runningCount >= $maxConcurrent) {
                $this->status = self::RESULT_SUCCESS;
                $this->response = array('message' => '同時実行数上限に達しています。');
                $this->writeLog('makeProxy aborting due to concurrency limit. running=' . $runningCount . ', max=' . $maxConcurrent, 'queue');
                return;
            }

            $this->writeLog('makeProxy concurrency check passed. running=' . $runningCount . ', max=' . $maxConcurrent, 'queue');
        }

        $this->writeLog('makeProxy processing job id=' . (isset($record['id']) ? $record['id'] : 'unknown') . ' (source=' . (isset($record['source_path']) ? $record['source_path'] : '') . ', target=' . (isset($record['target_path']) ? $record['target_path'] : '') . ')', 'queue');

        $this->processLowRateJobRecord($pdo, $record);
    }

    private function fetchLowRateJobRecord(PDO $pdo, $jobId)
    {
        try {
            if ($jobId === null) {
                $stmt = $pdo->prepare("SELECT * FROM job_queue WHERE job_type = 'video_transcode' AND status = 'queued' ORDER BY id ASC LIMIT 1");
                $stmt->execute();
            } else {
                $stmt = $pdo->prepare("SELECT * FROM job_queue WHERE job_type = 'video_transcode' AND id = :id LIMIT 1");
                $stmt->bindValue(':id', $jobId, PDO::PARAM_INT);
                $stmt->execute();
            }

            $record = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $exception) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'query_failed';
            $this->response = array('message' => 'ジョブの取得に失敗しました。', 'details' => $exception->getMessage());
            return null;
        }

        if ($record === false || !is_array($record)) {
            $this->status = self::RESULT_SUCCESS;
            $this->response = array('message' => '待機中のジョブはありません。');
            $this->writeLog('fetchLowRateJobRecord found no queued job for type=video_transcode', 'queue');
            if ($jobId !== null) {
                $this->status = self::RESULT_ERROR;
                $this->errorReason = 'job_not_found';
                $this->response = array('message' => '指定されたジョブが見つかりません。', 'jobId' => $jobId);
                $this->writeLog('fetchLowRateJobRecord could not find specified job id=' . $jobId, 'queue');
            }

            return null;
        }

        return $record;
    }

    private function processLowRateJobRecord(PDO $pdo, array $record)
    {
        $jobId = isset($record['id']) ? (int) $record['id'] : 0;
        $sourcePath = isset($record['source_path']) ? (string) $record['source_path'] : '';
        $targetPath = isset($record['target_path']) ? (string) $record['target_path'] : '';
        $targetBitrate = isset($record['target_bitrate']) ? (int) $record['target_bitrate'] : parent::DEFAULT_LOW_RATE_VIDEO_BITRATE;

        $this->writeLog('processLowRateJobRecord begin for job #' . $jobId, 'queue');
		
        if ($jobId <= 0) {
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'job_not_found';
            $this->response = array('message' => 'ジョブIDが無効です。');
            $this->writeLog('processLowRateJobRecord invalid job id detected jobId=' . $jobId, 'queue');
            return;
        }

        if ($sourcePath === '' || !is_file($sourcePath)) {
            $this->markQueueJobError($jobId, 'source file not found');
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'file_not_found';
            $this->response = array('message' => '入力ファイルが見つかりません。', 'jobId' => $jobId);
            $this->writeLog('processLowRateJobRecord source missing for job #' . $jobId . ' path=' . $sourcePath, 'queue');
            return;
        }

        $this->writeLog('processLowRateJobRecord source validated for job #' . $jobId . ' path=' . $sourcePath, 'queue');

        if ($targetPath === '') {
            $this->markQueueJobError($jobId, 'target path empty');
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'invalid_target';
            $this->response = array('message' => '出力先が指定されていません。', 'jobId' => $jobId);
            $this->writeLog('processLowRateJobRecord target path empty for job #' . $jobId, 'queue');
            return;
        }

        $this->writeLog('processLowRateJobRecord target path validated for job #' . $jobId . ' path=' . $targetPath, 'queue');

        $targetDir = dirname($targetPath);
		if (!is_dir($targetDir) && !@mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
			$this->markQueueJobError($jobId, 'failed to create target directory');
			$this->status = self::RESULT_ERROR;
			$this->errorReason = 'target_dir_unavailable';
			$this->response = array('message' => '出力先ディレクトリを作成できませんでした。', 'jobId' => $jobId);
			$this->writeLog('processLowRateJobRecord failed to create directory for job #' . $jobId . ' dir=' . $targetDir, 'queue');
			return;
		}
	
        $this->writeLog('processLowRateJobRecord target directory ready for job #' . $jobId . ' dir=' . $targetDir, 'queue');

        try {
            $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
			$update = $pdo->prepare(
                                                                        'UPDATE job_queue SET status = :status, started_at = :started_at, finished_at = NULL, error_message = NULL WHERE id = :id'
                                                                        );
            $update->execute(array(
                                                                   ':status' => 'running',
                                                                   ':started_at' => $now,
                                                                   ':id' => $jobId,
                                                                   ));
            $this->writeLog('processLowRateJobRecord marked job #' . $jobId . ' as running in queue DB', 'queue');
        } catch (PDOException $exception) {
			try {
				$this->markQueueJobError(
										 $jobId,
										 'failed to mark running: ' . $exception->getMessage()
										 );
			} catch (Throwable $t) {
				$this->writeLog('markQueueJobError failed in processLowRateJobRecord catch: ' . $t->getMessage(), 'queue');
			}
			
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'update_failed';
            $this->response = array('message' => 'ジョブの状態更新に失敗しました。', 'details' => $exception->getMessage(), 'jobId' => $jobId);
            $this->writeLog('processLowRateJobRecord failed to mark running for job #' . $jobId . ': ' . $exception->getMessage(), 'queue');
            return;
        }

        $bitrate = $targetBitrate > 0 ? $targetBitrate : parent::DEFAULT_LOW_RATE_VIDEO_BITRATE;
        $ffmpeg = $this->findExecutable('ffmpeg');
        if ($ffmpeg === null) {
            $this->markQueueJobError($jobId, 'ffmpeg not available');
            $this->status = self::RESULT_ERROR;
            $this->errorReason = 'missing_dependency';
            $this->response = array('message' => 'ffmpeg を利用できません。', 'jobId' => $jobId);
            $this->writeLog('processLowRateJobRecord ffmpeg not available for job #' . $jobId, 'queue');
            return;
        }

        $this->writeLog('processLowRateJobRecord resolved ffmpeg for job #' . $jobId . ' path=' . $ffmpeg, 'queue');

        $command = sprintf(
                                                   '%s -y -i %s -map 0:v? -map 0:a? -sn -c:v libx264 -b:v %d -maxrate %d -bufsize %d -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:a aac -b:a 128k -movflags faststart -pix_fmt yuv420p %s > /dev/null 2>&1',
                                                   escapeshellcmd($ffmpeg),
                                                   escapeshellarg($sourcePath),
                                                   $bitrate,
                                                   $bitrate,
                                                   $bitrate * 2,
                                                   escapeshellarg($targetPath)
                                                   );

        $this->writeLog('Starting low-rate transcode job #' . $jobId . ': ' . $command, 'queue');
        $output = array();
        $status = 0;
        @exec($command, $output, $status);

        $this->writeLog('ffmpeg completed for job #' . $jobId . ' status=' . $status, 'queue');

        $success = $status === 0 && is_file($targetPath);
        try {
            $finish = $pdo->prepare(
                                                                        'UPDATE job_queue SET status = :status, finished_at = :finished_at, error_message = :error WHERE id = :id'
                                                                        );
            $finish->execute(array(
                                                                   ':status' => $success ? 'success' : 'error',
                                                                   ':finished_at' => (new DateTimeImmutable('now'))->format('Y-m-d H:i:s'),
                                                                   ':error' => $success ? null : 'ffmpeg failed',
                                                                   ':id' => $jobId,
                                                                   ));
        } catch (PDOException $exception) {
            $this->writeLog('Failed to finalize low-rate job #' . $jobId . ': ' . $exception->getMessage(), 'queue');
        }

        $this->status = $success ? self::RESULT_SUCCESS : self::RESULT_ERROR;
        if ($success) {
            $this->response = array('message' => '低レート動画の作成が完了しました。', 'jobId' => $jobId, 'targetPath' => $targetPath);
            try {
                $proxyInfo = $this->registerUserContentsProxy($record, $targetPath, $bitrate);
                if (is_array($proxyInfo) && isset($proxyInfo['filePath'])) {
                    $this->response['proxyFilePath'] = $proxyInfo['filePath'];
                }
            } catch (Exception $exception) {
                $this->writeLog('Failed to register proxy for job #' . $jobId . ': ' . $exception->getMessage(), 'queue');
            }
        } else {
            $this->errorReason = 'transcode_failed';
            $this->response = array('message' => '低レート動画の作成に失敗しました。', 'jobId' => $jobId);
        }
    }

    private function registerUserContentsProxy(array $jobRecord, $targetPath, $targetBitrate)
    {
        if (!is_file($targetPath)) {
            return null;
        }

        $context = array();
        if (isset($jobRecord['context']) && is_string($jobRecord['context']) && $jobRecord['context'] !== '') {
            $decoded = json_decode($jobRecord['context'], true);
            if (is_array($decoded)) {
                $context = $decoded;
            }
        }

        $contentCode = isset($context['contentCode']) ? (string) $context['contentCode'] : '';
        if ($contentCode === '') {
            return null;
        }

        $pdo = $this->getPDOContents();
        $contentStmt = $pdo->prepare('SELECT id, userCode FROM userContents WHERE contentCode = ? LIMIT 1');
        $contentStmt->execute(array($contentCode));
        $contentRow = $contentStmt->fetch(PDO::FETCH_ASSOC);

        if ($contentRow === false || !isset($contentRow['id'])) {
            return null;
        }

        $userCode = isset($contentRow['userCode']) ? (string) $contentRow['userCode'] : '';
        $relativePath = basename($targetPath);
        if ($userCode !== '') {
            $userInfo = $this->getUserInfo($userCode);
            if (is_array($userInfo) && isset($userInfo['id'])) {
                $baseDir = $this->dataBasePath . '/userdata/' . $userInfo['id'];
                if (strpos($targetPath, $baseDir . '/') === 0) {
                    $relativePath = ltrim(substr($targetPath, strlen($baseDir)), '/');
                }
            }
        }

        $fileSize = null;
        $size = @filesize($targetPath);
        if ($size !== false) {
            $fileSize = (int) $size;
        }

        $bitrate = $this->probeVideoBitrate($targetPath);
        if ($bitrate === null && $targetBitrate !== null) {
            $bitrate = (int) $targetBitrate;
        }

        $duration = $this->probeVideoDuration($targetPath);
        $metadata = $this->probeVideoStreamMetadata($targetPath);
        $width = is_array($metadata) && isset($metadata['width']) ? (int) $metadata['width'] : null;
        $height = is_array($metadata) && isset($metadata['height']) ? (int) $metadata['height'] : null;

        $queueId = isset($jobRecord['id']) ? (int) $jobRecord['id'] : null;

        $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
        $insert = $pdo->prepare(
                                                                'INSERT INTO userContentsProxy (filePath, fileSize, queueId, userContentsId, bitrate, width, height, duration, createdAt, updatedAt) '
                                                                . 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                                                                );
        $insert->execute(array(
                                                           $relativePath,
                                                           $fileSize,
                                                           $queueId,
                                                           (int) $contentRow['id'],
                                                           $bitrate,
                                                           $width,
                                                           $height,
                                                           $duration,
                                                           $now,
                                                           $now,
                                                           ));

        return array(
                                         'filePath' => $relativePath,
                                         'fileSize' => $fileSize,
                                         'queueId' => $queueId,
                                         );
    }
}

?>
