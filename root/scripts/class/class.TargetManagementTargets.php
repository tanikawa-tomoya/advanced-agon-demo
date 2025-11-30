<?php

Base::requireFromShm('class/class.TargetManagementUtil.php');

class TargetManagementTargets extends Base
{
        private $sectionViewKeys = array('references', 'goals', 'chat', 'submissions', 'reviews', 'badges');
        private $displayFlagKeys = array(
                'displayGuidance',
                'displayGoals',
                'displayAgreements',
                'displayAnnouncements',
                'displayReferences',
                'displayResources',
                'displaySchedules',
                'displayProducts',
                'displayChat',
                'displayBbs',
                'displaySubmissions',
                'displayReviews',
                'displayBadges',
                'displaySurvey'
        );

	public function __construct($context)
	{
		parent::__construct($context);
	}

	protected function validationTargetList()
	{
	}
	
        protected function validationTargetAssignedList()
        {
        }

        protected function validationTargetListParticipating()
        {
        }

	protected function validationTargetCreate()
	{
		if (isset($this->params['title']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetUpdate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetDelete()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetDetail()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}
	
	protected function validationTargetActivityList()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetSectionView()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['sectionKey']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}
	
	protected function validationTargetBasicInfoConfirm()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

        protected function validationTargetGuidanceList()
        {
        }

        protected function validationTargetGuidanceCreate()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['title']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationTargetGuidanceUpdate()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['guidanceCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['title']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationTargetGuidanceDelete()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['guidanceCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationContentImageGet()
        {
                $this->requireParams(array('contentCode'));
        }

        protected function validationTargetImageGet()
        {
                $this->requireParams(array('targetCode'));
        }

        protected function validationTargetOverviewUpdate()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }
	
        protected function validationTargetAudienceUpdate()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        public function procContentImageGet()
        {
                Base::requireFromShm('class/class.Contents.php');

                $context = $this->context;
                $context['params'] = $this->params;
                $context['session'] = &$this->session;
                $context['files'] = $this->files;

                $contents = new Contents($context);
                $contents->procContentImageGet();

                $this->status = $contents->status;
                $this->errorReason = $contents->errorReason;
                $this->response = $contents->response;
                $this->output = $contents->output;
                $this->header = $contents->header;
                if (isset($contents->noOutput)) {
                        $this->noOutput = $contents->noOutput;
                }
        }

        public function procTargetImageGet()
        {
                $targetCode = isset($this->params['targetCode']) ? trim((string)$this->params['targetCode']) : '';
                if ($targetCode === '') {
                        http_response_code(400);
                        $this->noOutput = true;
                        return;
                }

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null || !isset($targetRow['imageFile']) || trim((string)$targetRow['imageFile']) === '') {
                        http_response_code(404);
                        $this->noOutput = true;
                        return;
                }

                $relativePath = trim((string)$targetRow['imageFile']);
                $resolved = $this->resolveTargetImagePath($relativePath);
                if ($resolved === null) {
                        http_response_code(404);
                        $this->noOutput = true;
                        return;
                }

                $mime = 'application/octet-stream';
                $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : false;
                if ($finfo) {
                        $detected = finfo_file($finfo, $resolved);
                        if ($detected !== false && is_string($detected) && $detected !== '') {
                                $mime = $detected;
                        }
                        finfo_close($finfo);
                }

                $size = filesize($resolved);

                while (ob_get_level() > 0) {
                        ob_end_clean();
                }

                header('Content-Type: ' . $mime);
                header('Content-Length: ' . $size);
                header('Content-Disposition: inline; filename="' . basename($resolved) . '"');
                header('Cache-Control: public, max-age=31536000, immutable');

                $handle = fopen($resolved, 'rb');
                if ($handle === false) {
                        http_response_code(500);
                        $this->noOutput = true;
                        return;
                }

                $chunkSize = 1048576;
                while (!feof($handle)) {
                        $buffer = fread($handle, $chunkSize);
                        if ($buffer === false) {
                                break;
                        }
                        echo $buffer;
                        flush();
                }

                fclose($handle);
                $this->noOutput = true;
                exit;
        }
	
        public function procTargetList()
        {
                $pdo = $this->getPDOTarget();

                $page = 1;
		$pageSize = 20;
		$maxPageSize = 50;

		if (array_key_exists('page', $this->params)) {
			$pageValue = $this->params['page'];
			if (is_array($pageValue)) {
				throw new Exception(__FILE__ . ':' . __LINE__);
			}
			$page = (int) $pageValue;
		}

		if (array_key_exists('pageSize', $this->params)) {
			$pageSizeValue = $this->params['pageSize'];
			if (is_array($pageSizeValue)) {
				throw new Exception(__FILE__ . ':' . __LINE__);
			}
			$pageSize = (int) $pageSizeValue;
		}

		if ($page < 1) {
			throw new Exception(__FILE__ . ':' . __LINE__);
		}

		if ($pageSize < 1) {
			$pageSize = 1;
		}

		if ($pageSize > $maxPageSize) {
			$pageSize = $maxPageSize;
		}

                $whereParts = array("(isDeleted IS NULL OR isDeleted = 0)");
                $params = array();
                if ($this->isSupervisor() == false) {
                        $loginUserCode = $this->getLoginUserCode();
                        $pdoCommon = $this->getPDOCommon();
                        $userInfo = $this->getUserInfo($loginUserCode);
                        if ($loginUserCode === null) {
                                $this->response = array(
                                                                                'targetList' => array(),
                                                                                'pagination' => array(
                                                                                                                          'page' => $page,
                                                                                                                          'pageSize' => $pageSize,
                                                                                                                          'totalItems' => 0,
                                                                                                                          'totalPages' => 0,
                                                                                                                          ),
                                                                                );
                                return;
                        }

                        $accessConditions = array();

                        $accessConditions[] = 'createdByUserCode = ?';
                        $params[] = $loginUserCode;

                        $accessConditions[] = 'assignedUserCode = ?';
                        $params[] = $loginUserCode;

                        $accessConditions[] = 'EXISTS (SELECT 1 FROM targetAssignedUsers tau WHERE tau.targetCode = targets.targetCode AND tau.userCode = ?)';
                        $params[] = $loginUserCode;

                        $whereParts[] = '(' . implode(' OR ', $accessConditions) . ')';
                }

                $where = 'WHERE ' . implode(' AND ', $whereParts);

		$countSql = "SELECT COUNT(*) FROM targets " . $where;
		$countStmt = $pdo->prepare($countSql);
		for ($i = 0; $i < count($params); $i++) {
			$countStmt->bindValue($i + 1, $params[$i]);
		}
		$countStmt->execute();
		$totalItems = (int) $countStmt->fetchColumn();

		$totalPages = 0;
		if ($pageSize > 0) {
			$totalPages = (int) ceil($totalItems / $pageSize);
		}

		$offset = ($page - 1) * $pageSize;
		if ($offset < 0) {
			$offset = 0;
		}

		$selectSql = "SELECT * FROM targets " . $where . " ORDER BY updatedAt DESC, createdAt DESC, id DESC LIMIT ? OFFSET ?";
		$selectStmt = $pdo->prepare($selectSql);
		$paramIndex = 1;
		for ($i = 0; $i < count($params); $i++) {
			$selectStmt->bindValue($paramIndex, $params[$i]);
			$paramIndex++;
		}
		$selectStmt->bindValue($paramIndex, (int) $pageSize, PDO::PARAM_INT);
		$paramIndex++;
		$selectStmt->bindValue($paramIndex, (int) $offset, PDO::PARAM_INT);
		$selectStmt->execute();
		$rows = $selectStmt->fetchAll(PDO::FETCH_ASSOC);

		$targetCodes = array();
		foreach ($rows as $row) {
			if (isset($row['targetCode'])) {
				$targetCodes[] = $row['targetCode'];
			}
		}
		$assignedUsersMap = $this->fetchAssignedUsersForTargets($targetCodes);

		$targets = array();
		foreach ($rows as $row) {
			$targetCode = isset($row['targetCode']) ? $row['targetCode'] : null;
			$assignedUsers = array_key_exists($targetCode, $assignedUsersMap) ? $assignedUsersMap[$targetCode] : null;
			$payload = $this->buildTargetPayload($row, $assignedUsers);
			if ($payload != null) {
				$targets[] = $payload;
			}
		}

                $this->response = array(
                                                                'targetList' => $targets,
                                                                'pagination' => array(
													  'page' => $page,
													  'pageSize' => $pageSize,
													  'totalItems' => $totalItems,
													  'totalPages' => $totalPages,
                                                                                         ),
                                                                );
        }


        public function procTargetListParticipating()
        {
                return $this->procTargetList();
        }



	public function procTargetAssignedList()
	{
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->response = array(
									'targetList' => array(),
									'pagination' => array(
														  'page' => 1,
														  'pageSize' => 0,
														  'totalItems' => 0,
														  'totalPages' => 0,
														  ),
									);
                        return;
                }

                $pdoCommon = $this->getPDOCommon();
                $userInfo = $this->getUserInfo($loginUserCode);

                $page = 1;
                $pageSize = 20;
                $maxPageSize = 50;

		if (array_key_exists('page', $this->params)) {
			$pageValue = $this->params['page'];
			if (is_array($pageValue)) {
				throw new Exception(__FILE__ . ':' . __LINE__);
			}
			$page = (int) $pageValue;
		}

		if (array_key_exists('pageSize', $this->params)) {
			$pageSizeValue = $this->params['pageSize'];
			if (is_array($pageSizeValue)) {
				throw new Exception(__FILE__ . ':' . __LINE__);
			}
			$pageSize = (int) $pageSizeValue;
		}

		if ($page < 1) {
			throw new Exception(__FILE__ . ':' . __LINE__);
		}

		if ($pageSize < 1) {
			$pageSize = 1;
		}

		if ($pageSize > $maxPageSize) {
			$pageSize = $maxPageSize;
		}

		$pdo = $this->getPDOTarget();

		$conditions = array();
		$params = array();

		$conditions[] = 'targets.assignedUserCode = ?';
		$params[] = $loginUserCode;

		$conditions[] = 'EXISTS (SELECT 1 FROM targetAssignedUsers tau WHERE tau.targetCode = targets.targetCode AND tau.userCode = ?)';
		$params[] = $loginUserCode;

                if (count($conditions) === 0) {
			$this->response = array(
									'targetList' => array(),
									'pagination' => array(
														  'page' => $page,
														  'pageSize' => $pageSize,
														  'totalItems' => 0,
														  'totalPages' => 0,
														  ),
									);
			return;
		}

		$accessWhere = '(' . implode(' OR ', $conditions) . ')';

		$baseWhere = 'WHERE (targets.isDeleted IS NULL OR targets.isDeleted = 0) AND ' . $accessWhere;

		$countSql = 'SELECT COUNT(DISTINCT targets.targetCode) FROM targets ' . $baseWhere;
		$countStmt = $pdo->prepare($countSql);
		for ($i = 0; $i < count($params); $i++) {
			$countStmt->bindValue($i + 1, $params[$i]);
		}
		$countStmt->execute();
		$totalItems = (int) $countStmt->fetchColumn();

		$totalPages = 0;
		if ($pageSize > 0) {
			$totalPages = (int) ceil($totalItems / $pageSize);
		}

		$offset = ($page - 1) * $pageSize;
		if ($offset < 0) {
			$offset = 0;
		}

		$selectSql = 'SELECT targets.* FROM targets ' . $baseWhere . ' ORDER BY targets.dueDate ASC, targets.updatedAt DESC, targets.createdAt DESC, targets.id DESC LIMIT ? OFFSET ?';
		$selectStmt = $pdo->prepare($selectSql);
		$paramIndex = 1;
		for ($i = 0; $i < count($params); $i++) {
			$selectStmt->bindValue($paramIndex, $params[$i]);
			$paramIndex++;
		}
		$selectStmt->bindValue($paramIndex, (int) $pageSize, PDO::PARAM_INT);
		$paramIndex++;
		$selectStmt->bindValue($paramIndex, (int) $offset, PDO::PARAM_INT);
		$selectStmt->execute();
		$rows = $selectStmt->fetchAll(PDO::FETCH_ASSOC);

		$targetCodes = array();
		foreach ($rows as $row) {
			if (isset($row['targetCode'])) {
				$targetCodes[] = $row['targetCode'];
			}
		}

		$assignedUsersMap = $this->fetchAssignedUsersForTargets($targetCodes);

		$targets = array();
		foreach ($rows as $row) {
			$targetCode = isset($row['targetCode']) ? $row['targetCode'] : null;
			$assignedUsers = array_key_exists($targetCode, $assignedUsersMap) ? $assignedUsersMap[$targetCode] : null;
			$payload = $this->buildTargetPayload($row, $assignedUsers);
			if ($payload != null) {
				$targets[] = $payload;
			}
		}

		$this->response = array(
								'targetList' => $targets,
								'pagination' => array(
													  'page' => $page,
													  'pageSize' => $pageSize,
													  'totalItems' => $totalItems,
													  'totalPages' => $totalPages,
													  ),
								);
	}



	public function procTargetDetail()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
		$assignedUsers = array_key_exists($targetCode, $assignedUsersMap) ? $assignedUsersMap[$targetCode] : null;

		$this->response = array('target' => $this->buildTargetPayload($targetRow, $assignedUsers));
	}



	public function procTargetSectionView()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$rawSectionKey = isset($this->params['sectionKey']) ? $this->params['sectionKey'] : '';
		$sectionKey = $this->normalizeSectionKey($rawSectionKey);

		if ($sectionKey === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$viewerUserCode = $this->getLoginUserCode();
		if ($viewerUserCode === null || $viewerUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		if ($this->isSupervisor() == false && $this->isOperator() == false) {
			if ($this->userCanAccessTarget($targetRow, $targetCode, $viewerUserCode) == false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}
		}

		$pdo = $this->getPDOTarget();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

			$insertStmt = $pdo->prepare(
										'INSERT OR IGNORE INTO targetSectionViews (targetCode, userCode, sectionKey, lastViewedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
										);
			$insertStmt->execute(array($targetCode, $viewerUserCode, $sectionKey, $timestamp, $timestamp, $timestamp));

			$updateStmt = $pdo->prepare(
										'UPDATE targetSectionViews SET lastViewedAt = ?, updatedAt = ? WHERE targetCode = ? AND userCode = ? AND sectionKey = ?'
										);
			$updateStmt->execute(array($timestamp, $timestamp, $targetCode, $viewerUserCode, $sectionKey));

			$selectStmt = $pdo->prepare(
										'SELECT lastViewedAt FROM targetSectionViews WHERE targetCode = ? AND userCode = ? AND sectionKey = ? LIMIT 1'
										);
			$selectStmt->execute(array($targetCode, $viewerUserCode, $sectionKey));
			$row = $selectStmt->fetch(PDO::FETCH_ASSOC);

			$pdo->commit();
		} catch (Exception $exception) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'database';
			return;
		}

		$resolvedTimestamp = $timestamp;
		if ($row && isset($row['lastViewedAt'])) {
			$candidate = Util::normalizeTimestampValue($row['lastViewedAt']);
			if ($candidate !== null) {
				$resolvedTimestamp = $candidate;
			}
		}

		$sectionActivity = $this->buildTargetSectionActivityPayload($targetCode, $viewerUserCode);

		$this->response = array(
								'targetCode' => $targetCode,
								'sectionKey' => $sectionKey,
								'lastViewedAt' => $resolvedTimestamp,
								'sectionActivity' => array_key_exists($sectionKey, $sectionActivity) ? $sectionActivity[$sectionKey] : null,
								);
	}



	public function procTargetActivityList()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$activities = $this->buildTargetActivityLog($targetRow);

		$this->response = array(
								'targetCode' => $targetCode,
								'activities' => $activities,
								);
	}



        public function procTargetBasicInfoConfirm()
        {
                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                $confirmationUserCodeParam = isset($this->params['userCode']) ? Util::normalizeOptionalString($this->params['userCode'], 64) : '';
                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                if ($confirmationUserCodeParam === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null || $loginUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
			return;
		}

		if ($this->isSupervisor() == false && $this->isOperator() == false) {
			if ($this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) == false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
                                return;
                        }
                }

                $userOverrideSpecified = is_string($confirmationUserCodeParam) && $confirmationUserCodeParam !== '';
                $useUserOverride = $this->isSupervisor() && $userOverrideSpecified;
                $confirmationUserCode = $useUserOverride ? $confirmationUserCodeParam : $loginUserCode;

                if ($useUserOverride) {
                        $userInfo = $this->getUserInfo($confirmationUserCode);
                        if ($userInfo == null) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }

                        if ($this->userCanAccessTarget($targetRow, $targetCode, $confirmationUserCode) == false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                }

                $confirmed = true;
                if (isset($this->params['confirmed'])) {
                        $confirmed = $this->interpretBoolean($this->params['confirmed'], true);
                }

		$pdo = $this->getPDOTarget();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

                        if ($confirmed) {
                                $insertStmt = $pdo->prepare(
                                                                                        'INSERT OR IGNORE INTO targetBasicInfoConfirmations (targetCode, userCode, confirmedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
                                                                                        );
                                $insertStmt->execute(array($targetCode, $confirmationUserCode, $timestamp, $timestamp, $timestamp));

                                $updateStmt = $pdo->prepare(
                                                                                        'UPDATE targetBasicInfoConfirmations SET confirmedAt = ?, updatedAt = ? WHERE targetCode = ? AND userCode = ?'
                                                                                        );
                                $updateStmt->execute(array($timestamp, $timestamp, $targetCode, $confirmationUserCode));
                        } else {
                                $deleteStmt = $pdo->prepare(
                                                                                        'DELETE FROM targetBasicInfoConfirmations WHERE targetCode = ? AND userCode = ?'
                                                                                        );
                                $deleteStmt->execute(array($targetCode, $confirmationUserCode));
                        }

                        $pdo->commit();
                } catch (Exception $exception) {
                        if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database';
                        return;
                }

                $confirmation = $this->fetchBasicInfoConfirmationPayload($targetCode, $confirmationUserCode);
                if ($confirmed && (!is_array($confirmation) || empty($confirmation['confirmed']))) {
                        $confirmation = array(
                                                                  'confirmed' => true,
                                                                  'confirmedAt' => $timestamp,
                                                                  'userCode' => $confirmationUserCode,
                                                                  );
                }

                $this->response = array(
                                                                'targetCode' => $targetCode,
                                                                'userCode' => $confirmationUserCode,
                                                                'basicInfoConfirmation' => $confirmation,
                                                                );
        }



	public function procTargetOverviewUpdate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$updates = array();
		$values = array();

		if (array_key_exists('description', $this->params)) {
			$descriptionValue = Util::normalizeOptionalString($this->params['description'], 2048);
			if ($descriptionValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			if ($descriptionValue === null) {
				$updates[] = 'description = NULL';
			} else {
				$updates[] = 'description = ?';
				$values[] = $descriptionValue;
			}
		}

		if (array_key_exists('dueDate', $this->params)) {
			$dueDateValue = Util::normalizeDate($this->params['dueDate']);
			if ($dueDateValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			if ($dueDateValue === null) {
				$updates[] = 'dueDate = NULL';
			} else {
				$updates[] = 'dueDate = ?';
				$values[] = $dueDateValue;
			}
		}

		if (count($updates) > 0) {
			$now = new DateTime('now');
			$nowStr = $now->format('Y-m-d H:i:s');
			$updates[] = 'updatedAt = ?';
			$values[] = $nowStr;
			$values[] = $targetRow['id'];

			$sql = 'UPDATE targets SET ' . implode(', ', $updates) . ' WHERE id = ?';
			$stmt = $this->getPDOTarget()->prepare($sql);
			$stmt->execute($values);
		}

		$assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
		$assignedUsers = array_key_exists($targetCode, $assignedUsersMap) ? $assignedUsersMap[$targetCode] : array();
		$updatedRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());

		$this->response = array('target' => $this->buildTargetPayload($updatedRow, $assignedUsers));
	}



	public function procTargetAudienceUpdate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

                $usersProvided = array_key_exists('users', $this->params);

                $userAssignments = array();
                if ($usersProvided) {
                        $userAssignments = $this->normalizeAudienceUsersParam($this->params['users']);
                        if ($userAssignments === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        foreach ($userAssignments as $entry) {
                                $code = is_array($entry) && array_key_exists('userCode', $entry) ? $entry['userCode'] : $entry;
                                $userInfo = $this->getUserInfo($code);
                                if ($userInfo == null) {
                                        $this->status = parent::RESULT_ERROR;
					$this->errorReason = 'usernotfound';
					return;
				}
			}
		}

                if ($usersProvided == false) {
                        $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                        $assignedUsers = array_key_exists($targetCode, $assignedUsersMap) ? $assignedUsersMap[$targetCode] : array();
                        $this->response = array('target' => $this->buildTargetPayload($targetRow, $assignedUsers));
                        return;
                }

		$updates = array();
		$values = array();

                if ($usersProvided) {
                        $activeAssignments = array();
                        foreach ($userAssignments as $candidate) {
                                if (is_array($candidate) && array_key_exists('isActive', $candidate) && ((int)$candidate['isActive']) === 0) {
                                        continue;
                                }
                                $activeAssignments[] = is_array($candidate) && array_key_exists('userCode', $candidate) ? $candidate['userCode'] : $candidate;
                        }
                        if (count($activeAssignments) === 0) {
                                $updates[] = 'assignedUserCode = NULL';
                        } else {
                                $updates[] = 'assignedUserCode = ?';
                                $values[] = $activeAssignments[0];
                        }
                }

                if (count($updates) > 0) {
			$now = new DateTime('now');
			$nowStr = $now->format('Y-m-d H:i:s');
			$updates[] = 'updatedAt = ?';
			$values[] = $nowStr;
			$values[] = $targetRow['id'];

			$sql = 'UPDATE targets SET ' . implode(', ', $updates) . ' WHERE id = ?';
			$stmt = $this->getPDOTarget()->prepare($sql);
			$stmt->execute($values);
		}

                if ($usersProvided) {
                        $this->saveAssignedUsers($targetCode, $userAssignments);
                        $assignedUsersForPayload = $userAssignments;
                } else {
                        $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                        $assignedUsersForPayload = array_key_exists($targetCode, $assignedUsersMap) ? $assignedUsersMap[$targetCode] : array();
		}

		$updatedRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		$this->response = array('target' => $this->buildTargetPayload($updatedRow, $assignedUsersForPayload));
	}

	public function procTargetCreate()
	{
		$title = Util::normalizeRequiredString($this->params['title'], 128);
		if ($title === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$description = null;
		if (isset($this->params['description'])) {
			$description = Util::normalizeOptionalString($this->params['description'], 2048);
			if ($description === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
		}

		$statusSource = array_key_exists('status', $this->params) ? $this->params['status'] : null;
		$status = $this->normalizeStatus($statusSource, 'draft');
		if ($status === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$priority = 'medium';
		if (isset($this->params['priority'])) {
			$priorityCandidate = $this->normalizePriority($this->params['priority'], 'medium');
			if ($priorityCandidate === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$priority = $priorityCandidate;
		}

		$dueDate = null;
		if (isset($this->params['dueDate'])) {
			$dueDateCandidate = Util::normalizeDate($this->params['dueDate']);
			if ($dueDateCandidate === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$dueDate = $dueDateCandidate;
		}

		$startDate = null;
		if (isset($this->params['startDate'])) {
			$startDateCandidate = Util::normalizeDate($this->params['startDate']);
			if ($startDateCandidate === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$startDate = $startDateCandidate;
		}

		$endDate = null;
		if (isset($this->params['endDate'])) {
			$endDateCandidate = Util::normalizeDate($this->params['endDate']);
			if ($endDateCandidate === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$endDate = $endDateCandidate;
		}

                $assignedUsers = $this->resolveAssignedUserCodes();
                if (isset($assignedUsers['error'])) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = $assignedUsers['error'];
                        return;
                }
                $assignedUserCodes = isset($assignedUsers['codes']) && is_array($assignedUsers['codes']) ? $assignedUsers['codes'] : array();
                $assignedUserCode = count($assignedUserCodes) > 0 ? $assignedUserCodes[0] : null;

                $assignedGroupCode = null;

                $displayFlags = $this->normalizeDisplayFlagsFromParams($this->params, 1);

                $now = new DateTime('now');
                $nowStr = $now->format('Y-m-d H:i:s');
		$targetCode = $this->generateUniqid();
		$creatorCode = $this->getLoginUserCode();
		if (array_key_exists('createdByUserCode', $this->params)) {
			$creatorCandidate = Util::normalizeOptionalString($this->params['createdByUserCode'], 32);
			if ($creatorCandidate === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			if ($creatorCandidate !== null && $creatorCandidate !== '') {
				$creatorInfo = $this->getUserInfo($creatorCandidate);
				if ($creatorInfo == null) {
					$this->status = parent::RESULT_ERROR;
					$this->errorReason = 'usernotfound';
					return;
				}
				$creatorCode = $creatorCandidate;
			}
		}
                if ($creatorCode === null || $creatorCode === '') {
                        $creatorCode = $this->getLoginUserCode();
                }

                $stmt = $this->getPDOTarget()->prepare("INSERT INTO targets (targetCode, title, description, status, priority, dueDate, startDate, endDate, assignedUserCode, assignedGroupCode, displayGuidance, displayGoals, displayAgreements, displayAnnouncements, displayReferences, displayResources, displaySchedules, displayProducts, displayChat, displayBbs, displaySubmissions, displayReviews, displayBadges, displaySurvey, createdByUserCode, createdAt, updatedAt, isDeleted) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)");
                $stmt->execute(array(
                        $targetCode,
                        $title,
                        $description,
                        $status,
                        $priority,
                        $dueDate,
                        $startDate,
                        $endDate,
                        $assignedUserCode,
                        $assignedGroupCode,
                        $displayFlags['displayGuidance'],
                        $displayFlags['displayGoals'],
                        $displayFlags['displayAgreements'],
                        $displayFlags['displayAnnouncements'],
                        $displayFlags['displayReferences'],
                        $displayFlags['displayResources'],
                        $displayFlags['displaySchedules'],
                        $displayFlags['displayProducts'],
                        $displayFlags['displayChat'],
                        $displayFlags['displayBbs'],
                        $displayFlags['displaySubmissions'],
                        $displayFlags['displayReviews'],
                        $displayFlags['displayBadges'],
                        $displayFlags['displaySurvey'],
                        $creatorCode,
                        $nowStr,
                        $nowStr
                ));

                $targetId = (int)$this->getPDOTarget()->lastInsertId();
                $imagePath = $this->saveTargetImageFile($targetId);
                if ($imagePath === false) {
                        return;
                }
                if ($imagePath !== null) {
                        $updateStmt = $this->getPDOTarget()->prepare('UPDATE targets SET imageFile = ?, updatedAt = ? WHERE id = ?');
                        $updateStmt->execute(array($imagePath, $nowStr, $targetId));
                }

                $this->saveAssignedUsers($targetCode, $assignedUserCodes);

                if ($this->syncTargetGuidanceItems($targetCode) === false) {
                        return;
		}

		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		$this->response = array('target' => $this->buildTargetPayload($targetRow, $assignedUserCodes));
	}



	public function procTargetUpdate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$updates = array();
		$values = array();
		$assignedUserCodes = array();
		$assignedUsersProvided = false;

		if (array_key_exists('title', $this->params)) {
			$titleValue = Util::normalizeRequiredString($this->params['title'], 128);
			if ($titleValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$updates[] = 'title = ?';
			$values[] = $titleValue;
		}

		if (array_key_exists('description', $this->params)) {
			$descriptionValue = Util::normalizeOptionalString($this->params['description'], 2048);
			if ($descriptionValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			if ($descriptionValue === null) {
				$updates[] = 'description = NULL';
			} else {
				$updates[] = 'description = ?';
				$values[] = $descriptionValue;
			}
		}

		if (array_key_exists('status', $this->params)) {
			$statusValue = $this->normalizeStatus($this->params['status'], 'draft');
			if ($statusValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$updates[] = 'status = ?';
			$values[] = $statusValue;
		}

		if (array_key_exists('priority', $this->params)) {
			$priorityValue = $this->normalizePriority($this->params['priority'], null);
			if ($priorityValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			if ($priorityValue === null) {
				$updates[] = 'priority = NULL';
			} else {
				$updates[] = 'priority = ?';
				$values[] = $priorityValue;
			}
		}

		if (array_key_exists('dueDate', $this->params)) {
			$dueDateValue = Util::normalizeDate($this->params['dueDate']);
			if ($dueDateValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			if ($dueDateValue === null) {
				$updates[] = 'dueDate = NULL';
			} else {
				$updates[] = 'dueDate = ?';
				$values[] = $dueDateValue;
			}
		}

		if (array_key_exists('startDate', $this->params)) {
			$startDateValue = Util::normalizeDate($this->params['startDate']);
			if ($startDateValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			if ($startDateValue === null) {
				$updates[] = 'startDate = NULL';
			} else {
				$updates[] = 'startDate = ?';
				$values[] = $startDateValue;
			}
		}

                if (array_key_exists('endDate', $this->params)) {
                        $endDateValue = Util::normalizeDate($this->params['endDate']);
                        if ($endDateValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
				return;
			}
			if ($endDateValue === null) {
				$updates[] = 'endDate = NULL';
			} else {
                                $updates[] = 'endDate = ?';
                                $values[] = $endDateValue;
                        }
                }

                $displayFlags = $this->normalizeDisplayFlagsForUpdate($this->params, $targetRow);
                foreach ($displayFlags as $key => $flagValue) {
                        $updates[] = $key . ' = ?';
                        $values[] = $flagValue;
                }

                $assignedUsers = $this->resolveAssignedUserCodes();
                if (isset($assignedUsers['error'])) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = $assignedUsers['error'];
                        return;
		}
		if (is_array($assignedUsers) && array_key_exists('provided', $assignedUsers) && $assignedUsers['provided']) {
			$assignedUsersProvided = true;
			$assignedUserCodes = isset($assignedUsers['codes']) && is_array($assignedUsers['codes']) ? $assignedUsers['codes'] : array();
			if (count($assignedUserCodes) === 0) {
				$updates[] = 'assignedUserCode = NULL';
			} else {
				$updates[] = 'assignedUserCode = ?';
				$values[] = $assignedUserCodes[0];
			}
		}

                $currentCreatorCode = isset($targetRow['createdByUserCode']) ? trim((string)$targetRow['createdByUserCode']) : '';
                $currentImagePath = isset($targetRow['imageFile']) ? trim((string)$targetRow['imageFile']) : '';
                $targetId = isset($targetRow['id']) ? (int)$targetRow['id'] : 0;
                $creatorChanged = false;
                $newCreatorInfo = $currentCreatorCode !== '' ? $this->getUserInfo($currentCreatorCode) : null;
                $newCreatorCode = $currentCreatorCode;

                if (array_key_exists('createdByUserCode', $this->params)) {
                        $creatorValue = Util::normalizeOptionalString($this->params['createdByUserCode'], 32);
                        if ($creatorValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        if ($creatorValue === null || $creatorValue === '') {
                                $creatorChanged = $currentCreatorCode !== '';
                                $newCreatorCode = '';
                                $newCreatorInfo = null;
                                $updates[] = 'createdByUserCode = NULL';
                        } else {
                                $creatorInfo = $this->getUserInfo($creatorValue);
                                if ($creatorInfo == null) {
                                        $this->status = parent::RESULT_ERROR;
                                        $this->errorReason = 'usernotfound';
                                        return;
                                }
                                $creatorChanged = $creatorValue !== $currentCreatorCode;
                                $newCreatorCode = $creatorValue;
                                $newCreatorInfo = $creatorInfo;
                                $updates[] = 'createdByUserCode = ?';
                                $values[] = $creatorValue;
                        }
                }

                $imageUpdateValue = null;
                $imageShouldUpdate = false;

                $imagePath = $this->saveTargetImageFile($targetId);
                if ($imagePath === false) {
                        return;
                }
                if ($imagePath !== null) {
                        $imageShouldUpdate = true;
                        $imageUpdateValue = $imagePath;
                }

                if ($creatorChanged && $newCreatorCode !== '' && $targetId > 0) {
                        $sourcePath = $imageUpdateValue !== null ? $imageUpdateValue : $currentImagePath;
                        $relocatedPath = $this->moveTargetImageToCreator($sourcePath, $targetId, $newCreatorInfo);
                        if ($relocatedPath !== null) {
                                $imageShouldUpdate = true;
                                $imageUpdateValue = $relocatedPath;
                        }
                }

                if ($imageShouldUpdate) {
                        $updates[] = 'imageFile = ?';
                        $values[] = $imageUpdateValue;
                }

                $now = new DateTime('now');
                $nowStr = $now->format('Y-m-d H:i:s');
                $updates[] = 'updatedAt = ?';
                $values[] = $nowStr;
                $values[] = $targetRow['id'];

		$sql = 'UPDATE targets SET ' . implode(', ', $updates) . ' WHERE id = ?';
		$stmt = $this->getPDOTarget()->prepare($sql);
		$stmt->execute($values);

                $updatedRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());

		if ($assignedUsersProvided) {
			$this->saveAssignedUsers($targetCode, $assignedUserCodes);
			$assignedUsersForPayload = $assignedUserCodes;
		} else {
			$assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
			$assignedUsersForPayload = array_key_exists($targetCode, $assignedUsersMap) ? $assignedUsersMap[$targetCode] : array();
		}

		$this->response = array('target' => $this->buildTargetPayload($updatedRow, $assignedUsersForPayload));
	}



	public function procTargetDelete()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$now = new DateTime('now');
		$nowStr = $now->format('Y-m-d H:i:s');

		$stmt = $this->getPDOTarget()->prepare('UPDATE targets SET isDeleted = 1, updatedAt = ? WHERE id = ?');
		$stmt->execute(array($nowStr, $targetRow['id']));

		$this->saveAssignedUsers($targetCode, array());

		$this->response = array('targetCode' => $targetCode);
	}



        public function procTargetGuidanceList()
        {
                $userCode = $this->getLoginUserCode();
		if ($userCode === null || $userCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		$page = 1;
		$pageSize = 20;
		$maxPageSize = 100;

		if (array_key_exists('page', $this->params)) {
			$pageValue = $this->params['page'];
			if (is_array($pageValue)) {
				throw new Exception(__FILE__ . ':' . __LINE__);
			}
			$page = (int) $pageValue;
		}

		if (array_key_exists('pageSize', $this->params)) {
			$pageSizeValue = $this->params['pageSize'];
			if (is_array($pageSizeValue)) {
				throw new Exception(__FILE__ . ':' . __LINE__);
			}
			$pageSize = (int) $pageSizeValue;
		}

		if ($page < 1) {
			throw new Exception(__FILE__ . ':' . __LINE__);
		}

		if ($pageSize < 1) {
			$pageSize = 1;
		}

		if ($pageSize > $maxPageSize) {
			$pageSize = $maxPageSize;
		}

                $pdo = $this->getPDOContents();

		$conditions = array('ucp.userCode = ?');
		$countParams = array($userCode);

		$whereClause = '(' . implode(' OR ', $conditions) . ')';

		$countSql =
			'SELECT COUNT(DISTINCT ucp.contentCode) '
			. 'FROM userContents ucp '
			. 'LEFT JOIN common.user u ON ucp.userCode = u.userCode '
			. 'WHERE ' . $whereClause;

		$countStmt = $pdo->prepare($countSql);
		for ($i = 0; $i < count($countParams); $i++) {
			$countStmt->bindValue($i + 1, $countParams[$i]);
		}
		$countStmt->execute();
		$totalItems = (int) $countStmt->fetchColumn();

		$totalPages = 0;
		if ($pageSize > 0) {
			$totalPages = (int) ceil($totalItems / $pageSize);
		}

		$offset = ($page - 1) * $pageSize;
		if ($offset < 0) {
			$offset = 0;
		}

		$subConditions = array('ucp2.userCode = ?');
		$subParams = array($userCode);

		$subWhereClause = '(' . implode(' OR ', $subConditions) . ')';

		$selectSql =
			'SELECT ucp.*, u.displayName AS ownerDisplayName, u.id AS ownerId '
			. 'FROM userContents ucp '
			. 'LEFT JOIN common.user u ON ucp.userCode = u.userCode '
			. 'WHERE ' . $whereClause
			. ' AND ucp.id = ('
			. 'SELECT ucp2.id FROM userContents ucp2 '
			. 'LEFT JOIN common.user u2 ON ucp2.userCode = u2.userCode '
			. 'WHERE ' . $subWhereClause
			. ' AND ucp2.contentCode = ucp.contentCode '
			. 'ORDER BY ucp2.updatedAt DESC, ucp2.id DESC LIMIT 1'
			. ') '
			. 'ORDER BY ucp.updatedAt DESC, ucp.id DESC LIMIT ? OFFSET ?';

		$selectStmt = $pdo->prepare($selectSql);
		$bindIndex = 1;
		for ($i = 0; $i < count($countParams); $i++) {
			$selectStmt->bindValue($bindIndex, $countParams[$i]);
			$bindIndex++;
		}
		for ($i = 0; $i < count($subParams); $i++) {
			$selectStmt->bindValue($bindIndex, $subParams[$i]);
			$bindIndex++;
		}
		$selectStmt->bindValue($bindIndex, (int) $pageSize, PDO::PARAM_INT);
		$bindIndex++;
		$selectStmt->bindValue($bindIndex, (int) $offset, PDO::PARAM_INT);
		$selectStmt->execute();

		$rows = $selectStmt->fetchAll(PDO::FETCH_ASSOC);
		$items = array();
		$seenCodes = array();
		if (is_array($rows)) {
			foreach ($rows as $row) {
				$item = $this->buildGuidanceItem($row);
				if ($item !== null) {
					$codeKey = isset($item['contentCode']) ? trim((string) $item['contentCode']) : '';
					if ($codeKey !== '' && array_key_exists($codeKey, $seenCodes)) {
						continue;
					}
					$items[] = $item;
					if ($codeKey !== '') {
						$seenCodes[$codeKey] = true;
					}
				}
			}
		}

                $this->response = array(
                                                                'items' => $items,
                                                                'pagination' => array(
                                                                                                          'page' => $page,
                                                                                                          'pageSize' => $pageSize,
                                                                                                          'totalItems' => $totalItems,
                                                                                                          'totalPages' => $totalPages,
                                                                                                          ),
                                                                );
        }



        public function procTargetGuidanceCreate()
        {
                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $contentCode = Util::normalizeRequiredString($this->params['contentCode'], 64);
                if ($contentCode === false || $contentCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $title = Util::normalizeRequiredString($this->params['title'], 256);
                if ($title === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $ownerUserCodeParam = null;
                if (array_key_exists('ownerUserCode', $this->params)) {
                        $ownerUserCodeParam = Util::normalizeOptionalString($this->params['ownerUserCode'], 64);
                        if ($ownerUserCodeParam === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                }

                $category = null;
                if (isset($this->params['category'])) {
                        $categoryValue = Util::normalizeOptionalString($this->params['category'], 32);
                        if ($categoryValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $category = $categoryValue;
                }

                $ownerCode = $this->getLoginUserCode();
                if ($ownerCode === null || $ownerCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $contentRow = $this->fetchContentRowByCode($contentCode);
                if ($contentRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                if ($category === null || $category === '') {
                        $category = $this->mapContentTypeToCategory(isset($contentRow['contentType']) ? $contentRow['contentType'] : null);
                }

                $fileName = isset($contentRow['fileName']) ? $contentRow['fileName'] : null;
                $fileSize = isset($contentRow['fileSize']) ? (int)$contentRow['fileSize'] : null;
                $ownerUserCode = isset($contentRow['userCode']) && $contentRow['userCode'] !== '' ? $contentRow['userCode'] : $ownerCode;
                if ($ownerUserCodeParam !== null && $ownerUserCodeParam !== '') {
                        $ownerUserCode = $ownerUserCodeParam;
                }

                $pdo = $this->getPDOTarget();
                $now = new DateTime('now');
                $timestamp = $now->format('Y-m-d H:i:s');
                $displayOrder = $this->resolveNextGuidanceDisplayOrder($targetCode);
                $guidanceCode = $this->generateUniqid();

                try {
                        $stmt = $pdo->prepare('INSERT INTO targetGuidanceContents (guidanceCode, targetCode, contentCode, title, category, fileName, fileSize, ownerUserCode, createdAt, updatedAt, displayOrder, isDeleted) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)');
                        $stmt->execute(array(
                                                        $guidanceCode,
                                                        $targetCode,
                                                        $contentCode,
                                                        $title,
                                                        $category,
                                                        $fileName,
                                                        $fileSize,
                                                        $ownerUserCode,
                                                        $timestamp,
                                                        $timestamp,
                                                        $displayOrder
                                                        ));
                } catch (\Exception $exception) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $guidance = $this->buildGuidancePayloadByCode($targetCode, $guidanceCode);
                if ($guidance == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $this->response = array('guidance' => $guidance);
        }



        public function procTargetGuidanceUpdate()
        {
                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                $guidanceCode = htmlspecialchars($this->params['guidanceCode'], ENT_QUOTES, "UTF-8");

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $guidanceRow = $this->fetchGuidanceRowByCode($targetCode, $guidanceCode);
                if ($guidanceRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $title = Util::normalizeRequiredString($this->params['title'], 256);
                if ($title === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $updates = array('title = ?');
                $values = array($title);

                if (array_key_exists('category', $this->params)) {
                        $categoryValue = Util::normalizeOptionalString($this->params['category'], 32);
                        if ($categoryValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        if ($categoryValue === null || $categoryValue === '') {
                                $updates[] = 'category = NULL';
                        } else {
                                $updates[] = 'category = ?';
                                $values[] = $categoryValue;
                        }
                }

                if (array_key_exists('ownerUserCode', $this->params)) {
                        $ownerUserCodeValue = Util::normalizeOptionalString($this->params['ownerUserCode'], 64);
                        if ($ownerUserCodeValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        if ($ownerUserCodeValue === null || $ownerUserCodeValue === '') {
                                $updates[] = 'ownerUserCode = NULL';
                        } else {
                                $updates[] = 'ownerUserCode = ?';
                                $values[] = $ownerUserCodeValue;
                        }
                }

                $now = new DateTime('now');
                $timestamp = $now->format('Y-m-d H:i:s');
                $updates[] = 'updatedAt = ?';
                $values[] = $timestamp;
                $values[] = $guidanceCode;
                $values[] = $targetCode;

                $sql = 'UPDATE targetGuidanceContents SET ' . implode(', ', $updates) . ' WHERE guidanceCode = ? AND targetCode = ?';
                $stmt = $this->getPDOTarget()->prepare($sql);
                $stmt->execute($values);

                $guidance = $this->buildGuidancePayloadByCode($targetCode, $guidanceCode);
                if ($guidance == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $this->response = array('guidance' => $guidance);
        }



        public function procTargetGuidanceDelete()
        {
                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                $guidanceCode = htmlspecialchars($this->params['guidanceCode'], ENT_QUOTES, "UTF-8");

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $guidanceRow = $this->fetchGuidanceRowByCode($targetCode, $guidanceCode);
                if ($guidanceRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $now = new DateTime('now');
                $timestamp = $now->format('Y-m-d H:i:s');
                $stmt = $this->getPDOTarget()->prepare('UPDATE targetGuidanceContents SET isDeleted = 1, updatedAt = ? WHERE guidanceCode = ? AND targetCode = ?');
                $stmt->execute(array($timestamp, $guidanceCode, $targetCode));

                $this->response = array('guidanceCode' => $guidanceCode);
        }

	private function fetchActiveTargetById($targetId)
	{
		$targetId = (int)$targetId;
		if ($targetId <= 0) {
			return null;
		}

		$stmt = $this->getPDOTarget()->prepare('SELECT * FROM targets WHERE id = ? AND (isDeleted IS NULL OR isDeleted = 0) LIMIT 1');
		$stmt->execute(array($targetId));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row == false) {
			return null;
		}

		if ($this->isSupervisor()) {
			return $row;
		}

		$loginUserCode = $this->getLoginUserCode();
		if ($loginUserCode === null || $loginUserCode === '') {
			return null;
		}

		$targetCode = isset($row['targetCode']) ? $row['targetCode'] : '';
		if ($targetCode === '') {
			return null;
		}

		if ($this->userCanAccessTarget($row, $targetCode, $loginUserCode)) {
			return $row;
		}

		return null;
	}



        private function buildTargetPayload($row, $assignedUserCodes = null)
        {
                if ($row == null) {
                        return null;
                }

                $viewerUserCode = $this->getLoginUserCode();
                $sectionActivity = $this->buildTargetSectionActivityPayload($row['targetCode'], $viewerUserCode);
                $displayFlags = $this->buildDisplayFlagsFromRow($row);

                $assignments = array();
                if (is_array($assignedUserCodes)) {
                        foreach ($assignedUserCodes as $entry) {
                                $code = null;
                                $isActive = true;
                                $endedAt = null;
                                $role = null;
                                if (is_array($entry)) {
                                        if (array_key_exists('userCode', $entry)) {
                                                $code = $entry['userCode'];
                                        } elseif (array_key_exists('code', $entry)) {
                                                $code = $entry['code'];
                                        }
                                        if (array_key_exists('isActive', $entry)) {
                                                $isActive = ((int)$entry['isActive']) !== 0;
                                        }
                                        if (array_key_exists('endedAt', $entry)) {
                                                $endedAt = $entry['endedAt'];
                                        }
                                        if (array_key_exists('role', $entry)) {
                                                $role = $entry['role'];
                                        }
                                } else {
                                        $code = $entry;
                                }

                                if ($code === null || $code === '') {
                                        continue;
                                }

                                if (array_key_exists($code, $assignments) == false) {
                                        $assignments[$code] = array(
                                                'userCode' => $code,
                                                'isActive' => $isActive,
                                                'endedAt' => $endedAt,
                                                'role' => $role
                                        );
                                } elseif ($assignments[$code]['isActive'] === false && $isActive === true) {
                                        $assignments[$code]['isActive'] = true;
                                        $assignments[$code]['endedAt'] = null;
                                        $assignments[$code]['role'] = $role;
                                }
                        }
                }
                if (count($assignments) === 0 && isset($row['assignedUserCode']) && $row['assignedUserCode'] !== null && $row['assignedUserCode'] !== '') {
                        $assignments[$row['assignedUserCode']] = array('userCode' => $row['assignedUserCode'], 'isActive' => true, 'endedAt' => null, 'role' => null);
                }

                $assignedUsersPayload = array();
                $primaryUserCode = null;
                $primaryDisplayName = null;

                foreach ($assignments as $code => $meta) {
                        $userInfo = $this->getUserInfo($code);
                        $displayName = ($userInfo != null && isset($userInfo['displayName'])) ? $userInfo['displayName'] : null;
                        if ($primaryUserCode === null && isset($meta['isActive']) && $meta['isActive']) {
                                $primaryUserCode = $code;
                        }
                        if ($primaryDisplayName === null && $displayName !== null && isset($meta['isActive']) && $meta['isActive']) {
                                $primaryDisplayName = $displayName;
                        }
                        $avatarPayload = $this->buildUserAvatarPayload($userInfo);
                        $assignedUsersPayload[] = array(
                                                                                        'userCode' => $code,
                                                                                        'displayName' => $displayName,
                                                                                        'avatar' => $avatarPayload['payload'],
                                                                                        'avatarUrl' => $avatarPayload['url'],
                                                                                        'avatarAlt' => $avatarPayload['alt'],
                                                                                        'avatarTransform' => $avatarPayload['transform'],
                                                                                        'role' => isset($meta['role']) && $meta['role'] !== null ? strtolower(trim((string) $meta['role'])) : (isset($userInfo['role']) ? strtolower(trim((string) $userInfo['role'])) : null),
                                                                                        'isActive' => isset($meta['isActive']) ? (bool)$meta['isActive'] : true,
                                                                                        'endedAt' => isset($meta['endedAt']) ? $meta['endedAt'] : null,
                                                                                        );
                }

                if ($primaryUserCode === null && count($assignments) > 0) {
                        $primaryUserCode = array_keys($assignments)[0];
                        $userInfo = $this->getUserInfo($primaryUserCode);
                        if ($primaryDisplayName === null && $userInfo != null && isset($userInfo['displayName'])) {
                                $primaryDisplayName = $userInfo['displayName'];
                        }
                }

		if ($primaryDisplayName === null && $primaryUserCode !== null) {
			$userInfo = $this->getUserInfo($primaryUserCode);
			if ($userInfo != null && isset($userInfo['displayName'])) {
				$primaryDisplayName = $userInfo['displayName'];
			}
		}

                $creatorUserCode = array_key_exists('createdByUserCode', $row) ? $row['createdByUserCode'] : null;
                $creatorDisplayName = null;
                $creatorAvatar = array('url' => null, 'alt' => null, 'transform' => null, 'payload' => null);

if ($creatorUserCode !== null && $creatorUserCode !== '') {
$creatorInfo = $this->getUserInfo($creatorUserCode);
if ($creatorInfo != null) {
if (isset($creatorInfo['displayName']) && $creatorInfo['displayName'] !== null && $creatorInfo['displayName'] !== '') {
$creatorDisplayName = $creatorInfo['displayName'];
}
$creatorAvatar = $this->buildUserAvatarPayload($creatorInfo);
}
}

$chatDependencies = $this->buildChatUtilDependencies();
$chatData = TargetManagementUtil::fetchTargetChatData($row['targetCode'], $viewerUserCode, array(), $chatDependencies);
		$chatThreads = isset($chatData['threads']) && is_array($chatData['threads']) ? $chatData['threads'] : array();
		$chatParticipants = isset($chatData['participants']) && is_array($chatData['participants']) ? $chatData['participants'] : array();

                 return array(
                                         'id' => (int)$row['id'],
                                         'targetCode' => $row['targetCode'],
                                         'title' => $row['title'],
                                         'description' => $row['description'],
                                         'imageFile' => isset($row['imageFile']) ? $row['imageFile'] : null,
                                         'imageUrl' => $this->buildTargetImageUrl($row),
                                         'status' => $row['status'],
                                         'priority' => $row['priority'],
                                         'dueDate' => $row['dueDate'],
					 'startDate' => array_key_exists('startDate', $row) ? $row['startDate'] : null,
					 'endDate' => array_key_exists('endDate', $row) ? $row['endDate'] : null,
                                         'assignedUserCode' => $primaryUserCode,
                                         'assignedUserDisplayName' => $primaryDisplayName,
                                         'assignedUsers' => $assignedUsersPayload,
                                         'assignedGroupCode' => $row['assignedGroupCode'],
                                         'assignedGroupDisplayName' => null,
                                         'displayGuidance' => $displayFlags['displayGuidance'],
                                         'displayGoals' => $displayFlags['displayGoals'],
                                         'displayAgreements' => $displayFlags['displayAgreements'],
                                         'displayAnnouncements' => $displayFlags['displayAnnouncements'],
                                         'displayReferences' => $displayFlags['displayReferences'],
                                         'displaySchedules' => $displayFlags['displaySchedules'],										 
                                         'displayChat' => $displayFlags['displayChat'],
                                         'displaySubmissions' => $displayFlags['displaySubmissions'],
                                         'displayReviews' => $displayFlags['displayReviews'],
                                         'displayBadges' => $displayFlags['displayBadges'],
                                         'displaySurvey' => $displayFlags['displaySurvey'],
                                         'displaySettings' => $displayFlags,
                                         'createdByUserCode' => $creatorUserCode,
                                         'createdByUserDisplayName' => $creatorDisplayName,
                                         'createdByDisplayName' => $creatorDisplayName,
                                         'createdByUserAvatarUrl' => $creatorAvatar['url'],
                                         'createdByAvatarUrl' => $creatorAvatar['url'],
										 'createdByUserAvatarAlt' => $creatorAvatar['alt'],
										 'createdByAvatarAlt' => $creatorAvatar['alt'],
										 'createdByUserAvatarTransform' => $creatorAvatar['transform'],
										 'createdByAvatarTransform' => $creatorAvatar['transform'],
										 'createdByUserAvatar' => $creatorAvatar['payload'],
										 'createdByAvatar' => $creatorAvatar['payload'],
										 'createdAt' => $row['createdAt'],
										 'updatedAt' => $row['updatedAt'],
										 'referenceMaterials' => TargetManagementUtil::fetchTargetReferenceMaterials($row['targetCode'], $this->getLoginUserCode(), $this->getPDOTarget(), $this->getPDOContents(), $this->siteId),
										 'scheduleMaterials' => TargetManagementUtil::fetchTargetScheduleMaterials($row['targetCode'], $this->getLoginUserCode(), $this->getPDOTarget(), $this->getPDOContents(), $this->siteId),										 
										 'guidanceContents' => $this->fetchTargetGuidanceContents($row['targetCode']),
										 'agreements' => $this->fetchTargetAgreements($row['targetCode'], $this->getPDOTarget()),
										 'goals' => $this->fetchTargetGoals($row['targetCode']),
										 'basicInfoConfirmation' => $this->fetchBasicInfoConfirmationPayload($row['targetCode'], $viewerUserCode),
										 'sectionActivity' => $sectionActivity,
										 'chatThreads' => $chatThreads,
										 'chatParticipants' => $chatParticipants,
										 'chatMembers' => $chatParticipants,
										 'chatUsers' => $chatParticipants
					 );
	}



	private function buildTargetActivityLog($targetRow)
	{
		if ($targetRow == null || !is_array($targetRow)) {
			return array();
		}

		$activities = array();
		$sequence = 0;

		$append = function ($timestamp, $category, $action, $subject, $description, $actorCode = '', $actorDisplayName = '') use (&$activities, &$sequence) {
			$normalizedTimestamp = Util::normalizeTimestampValue($timestamp);
			if ($normalizedTimestamp === null) {
				return;
			}

			$entry = array(
						   'timestamp' => $normalizedTimestamp,
						   'category' => $category,
						   'categoryLabel' => $this->resolveActivityCategoryLabel($category),
						   'action' => $action,
						   'actionLabel' => $this->resolveActivityActionLabel($action),
						   'subject' => $subject !== null ? (string)$subject : '',
						   'description' => $description !== null ? (string)$description : '',
						   'actorUserCode' => $actorCode !== null ? trim((string)$actorCode) : '',
						   'actorDisplayName' => $actorDisplayName !== null ? trim((string)$actorDisplayName) : '',
						   '__order' => $sequence++,
						   );

			$activities[] = $entry;
		};

		$targetCode = isset($targetRow['targetCode']) ? trim((string)$targetRow['targetCode']) : '';
		$targetTitle = isset($targetRow['title']) ? trim((string)$targetRow['title']) : '';
		$targetSubject = $targetTitle !== '' ? 'ターゲット「' . $targetTitle . '」' : 'ターゲット';

		$createdAt = isset($targetRow['createdAt']) ? $targetRow['createdAt'] : null;
		$createdTimestamp = Util::normalizeTimestampValue($createdAt);
		$creatorSummary = $this->resolveActivityActorSummary(isset($targetRow['createdByUserCode']) ? $targetRow['createdByUserCode'] : null);
		if ($createdTimestamp !== null) {
			$creatorName = $creatorSummary[1];
			$description = $creatorName !== '' ? $creatorName . 'がターゲットを作成しました。' : 'ターゲットが作成されました。';
			$append($createdTimestamp, 'target', 'create', $targetSubject, $description, $creatorSummary[0], $creatorName);
		}

		$updatedAt = isset($targetRow['updatedAt']) ? $targetRow['updatedAt'] : null;
		$updatedTimestamp = Util::normalizeTimestampValue($updatedAt);
		$statusValue = isset($targetRow['status']) ? trim((string)$targetRow['status']) : '';
		if ($updatedTimestamp !== null && ($createdTimestamp === null || strcmp($updatedTimestamp, $createdTimestamp) !== 0)) {
			if (isset($targetRow['isDeleted']) && (int)$targetRow['isDeleted'] === 1) {
				$append($updatedTimestamp, 'target', 'delete', $targetSubject, $targetSubject . 'が削除されました。');
			} else {
				$description = $statusValue !== '' ? 'ステータス: ' . $statusValue : 'ターゲット情報が更新されました。';
				$append($updatedTimestamp, 'target', 'update', $targetSubject, $description);
			}
		}

		$pdo = $this->getPDOTarget();

		$stmt = $pdo->prepare(
							  'SELECT a.*, creator.displayName AS createdByDisplayName, updater.displayName AS updatedByDisplayName '
							  . 'FROM targetAgreements a '
							  . 'LEFT JOIN common.user creator ON a.createdByUserCode = creator.userCode '
							  . 'LEFT JOIN common.user updater ON a.updatedByUserCode = updater.userCode '
							  . 'WHERE a.targetCode = ? '
							  . 'ORDER BY a.createdAt ASC, a.updatedAt ASC, a.id ASC'
							  );
		$stmt->execute(array($targetCode));
		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			$title = isset($row['title']) ? trim((string)$row['title']) : '';
			$subject = $title !== '' ? '規約「' . $title . '」' : '規約';
			$createdTimestamp = Util::normalizeTimestampValue(isset($row['createdAt']) ? $row['createdAt'] : null);
			$creator = $this->resolveActivityActorSummary(
														  isset($row['createdByUserCode']) ? $row['createdByUserCode'] : null,
														  isset($row['createdByDisplayName']) ? $row['createdByDisplayName'] : null
														  );
			if ($createdTimestamp !== null) {
				$creatorName = $creator[1];
				$description = $creatorName !== '' ? $creatorName . 'が' . $subject . 'を登録しました。' : $subject . 'を登録しました。';
				$append($createdTimestamp, 'agreement', 'create', $subject, $description, $creator[0], $creatorName);
			}

			$updatedTimestamp = Util::normalizeTimestampValue(isset($row['updatedAt']) ? $row['updatedAt'] : null);
			$isDeleted = isset($row['isDeleted']) ? (int)$row['isDeleted'] : 0;
			$updater = $this->resolveActivityActorSummary(
														  isset($row['updatedByUserCode']) ? $row['updatedByUserCode'] : null,
														  isset($row['updatedByDisplayName']) ? $row['updatedByDisplayName'] : null
														  );
			if ($updatedTimestamp !== null && ($createdTimestamp === null || strcmp($updatedTimestamp, $createdTimestamp) !== 0)) {
				$updaterName = $updater[1];
				if ($isDeleted === 1) {
					$description = $updaterName !== '' ? $updaterName . 'が' . $subject . 'を削除しました。' : $subject . 'が削除されました。';
					$append($updatedTimestamp, 'agreement', 'delete', $subject, $description, $updater[0], $updaterName);
				} else {
					$description = $updaterName !== '' ? $updaterName . 'が' . $subject . 'を更新しました。' : $subject . 'が更新されました。';
					$append($updatedTimestamp, 'agreement', 'update', $subject, $description, $updater[0], $updaterName);
				}
			}
		}

		$stmt = $pdo->prepare(
							  'SELECT g.*, creator.displayName AS createdByDisplayName, updater.displayName AS updatedByDisplayName, '
							  . 'targetUser.displayName AS targetUserDisplayName '
							  . 'FROM targetGoals g '
							  . 'LEFT JOIN common.user creator ON g.createdByUserCode = creator.userCode '
							  . 'LEFT JOIN common.user updater ON g.updatedByUserCode = updater.userCode '
							  . 'LEFT JOIN common.user targetUser ON g.targetUserCode = targetUser.userCode '
							  . 'WHERE g.targetCode = ? '
							  . 'ORDER BY g.createdAt ASC, g.updatedAt ASC, g.id ASC'
							  );
		$stmt->execute(array($targetCode));
		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			$title = isset($row['title']) ? trim((string)$row['title']) : '';
			$subject = $title !== '' ? '目標「' . $title . '」' : '目標';
			$targetUserDisplayName = isset($row['targetUserDisplayName']) ? trim((string)$row['targetUserDisplayName']) : '';
			if ($targetUserDisplayName === '' && isset($row['targetUserCode']) && $row['targetUserCode'] !== '') {
				$summary = $this->resolveActivityActorSummary($row['targetUserCode']);
				if ($summary[1] !== '') {
					$targetUserDisplayName = $summary[1];
				}
			}
			$targetMeta = $targetUserDisplayName !== '' ? '（対象: ' . $targetUserDisplayName . '）' : '';

			$createdTimestamp = Util::normalizeTimestampValue(isset($row['createdAt']) ? $row['createdAt'] : null);
			$creator = $this->resolveActivityActorSummary(
														  isset($row['createdByUserCode']) ? $row['createdByUserCode'] : null,
														  isset($row['createdByDisplayName']) ? $row['createdByDisplayName'] : null
														  );
			if ($createdTimestamp !== null) {
				$creatorName = $creator[1];
				$description = $creatorName !== '' ? $creatorName . 'が' . $subject . 'を登録しました。' : $subject . 'を登録しました。';
				if ($targetMeta !== '') {
					$description .= $targetMeta;
				}
				$append($createdTimestamp, 'goal', 'create', $subject, $description, $creator[0], $creatorName);
			}

			$updatedTimestamp = Util::normalizeTimestampValue(isset($row['updatedAt']) ? $row['updatedAt'] : null);
			$isDeleted = isset($row['isDeleted']) ? (int)$row['isDeleted'] : 0;
			$updater = $this->resolveActivityActorSummary(
														  isset($row['updatedByUserCode']) ? $row['updatedByUserCode'] : null,
														  isset($row['updatedByDisplayName']) ? $row['updatedByDisplayName'] : null
														  );
			if ($updatedTimestamp !== null && ($createdTimestamp === null || strcmp($updatedTimestamp, $createdTimestamp) !== 0)) {
				$updaterName = $updater[1];
				if ($isDeleted === 1) {
					$description = $updaterName !== '' ? $updaterName . 'が' . $subject . 'を削除しました。' : $subject . 'が削除されました。';
				} else {
					$description = $updaterName !== '' ? $updaterName . 'が' . $subject . 'を更新しました。' : $subject . 'が更新されました。';
				}
				if ($targetMeta !== '') {
					$description .= $targetMeta;
				}
				$append($updatedTimestamp, 'goal', $isDeleted === 1 ? 'delete' : 'update', $subject, $description, $updater[0], $updaterName);
			}
		}

		$stmt = $pdo->prepare(
							  'SELECT g.*, owner.displayName AS ownerDisplayName '
							  . 'FROM targetGuidanceContents g '
							  . 'LEFT JOIN common.user owner ON g.ownerUserCode = owner.userCode '
							  . 'WHERE g.targetCode = ? '
							  . 'ORDER BY g.createdAt ASC, g.updatedAt ASC, g.id ASC'
							  );
		$stmt->execute(array($targetCode));
		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			$title = isset($row['title']) ? trim((string)$row['title']) : '';
			$subject = $title !== '' ? 'ガイダンスコンテンツ「' . $title . '」' : 'ガイダンスコンテンツ';
			$owner = $this->resolveActivityActorSummary(
														isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null,
														isset($row['ownerDisplayName']) ? $row['ownerDisplayName'] : null
														);
			$ownerName = $owner[1];
			$createdTimestamp = Util::normalizeTimestampValue(isset($row['createdAt']) ? $row['createdAt'] : null);
			if ($createdTimestamp !== null) {
				$description = $ownerName !== '' ? $ownerName . 'が' . $subject . 'を登録しました。' : $subject . 'を登録しました。';
				$append($createdTimestamp, 'guidance', 'create', $subject, $description, $owner[0], $ownerName);
			}
			$updatedTimestamp = Util::normalizeTimestampValue(isset($row['updatedAt']) ? $row['updatedAt'] : null);
			$isDeleted = isset($row['isDeleted']) ? (int)$row['isDeleted'] : 0;
			if ($updatedTimestamp !== null && ($createdTimestamp === null || strcmp($updatedTimestamp, $createdTimestamp) !== 0)) {
				if ($isDeleted === 1) {
					$description = $subject . 'が削除されました。';
					if ($ownerName !== '') {
						$description = $ownerName . 'が' . $subject . 'を削除しました。';
					}
					$append($updatedTimestamp, 'guidance', 'delete', $subject, $description, $owner[0], $ownerName);
				} else {
					$description = $ownerName !== '' ? $ownerName . 'が' . $subject . 'を更新しました。' : $subject . 'が更新されました。';
					$append($updatedTimestamp, 'guidance', 'update', $subject, $description, $owner[0], $ownerName);
				}
			}
		}

		//
		// reference
		//
		$stmt = $pdo->prepare(
							  'SELECT m.*, owner.displayName AS ownerDisplayName '
							  . 'FROM targetReferenceMaterials m '
							  . 'LEFT JOIN common.user owner ON m.ownerUserCode = owner.userCode '
							  . 'WHERE m.targetCode = ? '
							  . 'ORDER BY m.createdAt ASC, m.updatedAt ASC, m.id ASC'
							  );
		$stmt->execute(array($targetCode));
		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			$title = isset($row['title']) ? trim((string)$row['title']) : '';
			$subject = $title !== '' ? '参考資料「' . $title . '」' : '参考資料';
			$owner = $this->resolveActivityActorSummary(
														isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null,
														isset($row['ownerDisplayName']) ? $row['ownerDisplayName'] : null
														);
			$ownerName = $owner[1];
			$createdTimestamp = Util::normalizeTimestampValue(isset($row['createdAt']) ? $row['createdAt'] : null);
			if ($createdTimestamp !== null) {
				$description = $ownerName !== '' ? $ownerName . 'が' . $subject . 'を追加しました。' : $subject . 'を追加しました。';
				$append($createdTimestamp, 'reference', 'create', $subject, $description, $owner[0], $ownerName);
			}
			$updatedTimestamp = Util::normalizeTimestampValue(isset($row['updatedAt']) ? $row['updatedAt'] : null);
			$isDeleted = isset($row['isDeleted']) ? (int)$row['isDeleted'] : 0;
			if ($updatedTimestamp !== null && ($createdTimestamp === null || strcmp($updatedTimestamp, $createdTimestamp) !== 0)) {
				if ($isDeleted === 1) {
					$description = $ownerName !== '' ? $ownerName . 'が' . $subject . 'を削除しました。' : $subject . 'が削除されました。';
					$append($updatedTimestamp, 'reference', 'delete', $subject, $description, $owner[0], $ownerName);
				} else {
					$description = $ownerName !== '' ? $ownerName . 'が' . $subject . 'を更新しました。' : $subject . 'が更新されました。';
					$append($updatedTimestamp, 'reference', 'update', $subject, $description, $owner[0], $ownerName);
				}
			}
		}
		// reference

		//
		// schedule
		//
		$stmt = $pdo->prepare(
							  'SELECT m.*, owner.displayName AS ownerDisplayName '
							  . 'FROM targetScheduleMaterials m '
							  . 'LEFT JOIN common.user owner ON m.ownerUserCode = owner.userCode '
							  . 'WHERE m.targetCode = ? '
							  . 'ORDER BY m.createdAt ASC, m.updatedAt ASC, m.id ASC'
							  );
		$stmt->execute(array($targetCode));
		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			$title = isset($row['title']) ? trim((string)$row['title']) : '';
			$subject = $title !== '' ? 'スケジュール「' . $title . '」' : 'スケジュール';
			$owner = $this->resolveActivityActorSummary(
														isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null,
														isset($row['ownerDisplayName']) ? $row['ownerDisplayName'] : null
														);
			$ownerName = $owner[1];
			$createdTimestamp = Util::normalizeTimestampValue(isset($row['createdAt']) ? $row['createdAt'] : null);
			if ($createdTimestamp !== null) {
				$description = $ownerName !== '' ? $ownerName . 'が' . $subject . 'を追加しました。' : $subject . 'を追加しました。';
				$append($createdTimestamp, 'schedule', 'create', $subject, $description, $owner[0], $ownerName);
			}
			$updatedTimestamp = Util::normalizeTimestampValue(isset($row['updatedAt']) ? $row['updatedAt'] : null);
			$isDeleted = isset($row['isDeleted']) ? (int)$row['isDeleted'] : 0;
			if ($updatedTimestamp !== null && ($createdTimestamp === null || strcmp($updatedTimestamp, $createdTimestamp) !== 0)) {
				if ($isDeleted === 1) {
					$description = $ownerName !== '' ? $ownerName . 'が' . $subject . 'を削除しました。' : $subject . 'が削除されました。';
					$append($updatedTimestamp, 'schedule', 'delete', $subject, $description, $owner[0], $ownerName);
				} else {
					$description = $ownerName !== '' ? $ownerName . 'が' . $subject . 'を更新しました。' : $subject . 'が更新されました。';
					$append($updatedTimestamp, 'schedule', 'update', $subject, $description, $owner[0], $ownerName);
				}
			}
		}
		// schedule		

                $stmt = $pdo->prepare(
                                                          'SELECT s.id, s.submissionCode, s.userCode, s.createdAt, s.updatedAt, s.submittedAt, s.isDeleted, '
                                                          . 'COALESCE(s.submittedAt, s.createdAt) AS submissionLinkedAt, submitter.displayName AS submitterDisplayName '
                                                          . 'FROM targetSubmissions ts '
                                                          . 'JOIN submissions s ON ts.submissionCode = s.submissionCode '
                                                          . 'LEFT JOIN common.user submitter ON s.userCode = submitter.userCode '
                                                          . 'WHERE ts.targetCode = ? '
                                                          . 'ORDER BY COALESCE(s.submittedAt, s.createdAt) ASC, s.updatedAt ASC, s.id ASC'
                                                          );
		$stmt->execute(array($targetCode));
		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			$participant = $this->resolveActivityActorSummary(
															  isset($row['userCode']) ? $row['userCode'] : null,
															  isset($row['submitterDisplayName']) ? $row['submitterDisplayName'] : null
															  );
			$participantName = $participant[1] !== '' ? $participant[1] : ($participant[0] !== '' ? $participant[0] : '参加者');
			$subject = '提出（' . $participantName . '）';

			$createdTimestamp = Util::normalizeTimestampValue(isset($row['submittedAt']) ? $row['submittedAt'] : null);
			if ($createdTimestamp === null) {
				$createdTimestamp = Util::normalizeTimestampValue(isset($row['createdAt']) ? $row['createdAt'] : null);
			}
                        if ($createdTimestamp === null) {
                                $createdTimestamp = Util::normalizeTimestampValue(isset($row['submissionLinkedAt']) ? $row['submissionLinkedAt'] : null);
                        }
			if ($createdTimestamp !== null) {
				$description = $participant[1] !== '' ? $participant[1] . 'が提出を登録しました。' : '提出が登録されました。';
				$append($createdTimestamp, 'submission', 'create', $subject, $description, $participant[0], $participant[1]);
			}

			$updatedTimestamp = Util::normalizeTimestampValue(isset($row['updatedAt']) ? $row['updatedAt'] : null);
			$isDeleted = isset($row['isDeleted']) ? (int)$row['isDeleted'] : 0;
			if ($updatedTimestamp !== null && ($createdTimestamp === null || strcmp($updatedTimestamp, $createdTimestamp) !== 0)) {
				if ($isDeleted === 1) {
					$description = $participant[1] !== '' ? $participant[1] . 'の提出が削除されました。' : '提出が削除されました。';
					$append($updatedTimestamp, 'submission', 'delete', $subject, $description, $participant[0], $participant[1]);
				} else {
					$description = $participant[1] !== '' ? $participant[1] . 'の提出が更新されました。' : '提出が更新されました。';
					$append($updatedTimestamp, 'submission', 'update', $subject, $description, $participant[0], $participant[1]);
				}
			}
		}

                        $stmt = $pdo->prepare(
                                                          'SELECT r.id, r.reviewCode, r.reviewerCode, r.createdAt, r.updatedAt, r.reviewedAt, r.isDeleted, '
                                                          . 'reviewer.displayName AS reviewerDisplayName '
                                                          . 'FROM targetReviews tr '
                                                          . 'JOIN reviews r ON tr.reviewCode = r.reviewCode '
                                                          . 'LEFT JOIN common.user reviewer ON r.reviewerCode = reviewer.userCode '
                                                          . 'WHERE tr.targetCode = ? '
                                                          . 'ORDER BY COALESCE(r.reviewedAt, r.createdAt) ASC, r.updatedAt ASC, r.id ASC'
                                                          );
		$stmt->execute(array($targetCode));
		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			$reviewer = $this->resolveActivityActorSummary(
														   isset($row['reviewerCode']) ? $row['reviewerCode'] : null,
														   isset($row['reviewerDisplayName']) ? $row['reviewerDisplayName'] : null
														   );
			$reviewerName = $reviewer[1] !== '' ? $reviewer[1] : ($reviewer[0] !== '' ? $reviewer[0] : 'レビュー担当');
			$subject = 'レビュー（' . $reviewerName . '）';

                        $createdTimestamp = Util::normalizeTimestampValue(isset($row['reviewedAt']) ? $row['reviewedAt'] : null);
                        if ($createdTimestamp === null) {
                                $createdTimestamp = Util::normalizeTimestampValue(isset($row['createdAt']) ? $row['createdAt'] : null);
                        }
                        if ($createdTimestamp !== null) {
                                $description = $reviewer[1] !== '' ? $reviewer[1] . 'がレビューを登録しました。' : 'レビューが登録されました。';
                                $append($createdTimestamp, 'review', 'create', $subject, $description, $reviewer[0], $reviewer[1]);
                        }

			$updatedTimestamp = Util::normalizeTimestampValue(isset($row['updatedAt']) ? $row['updatedAt'] : null);
			$isDeleted = isset($row['isDeleted']) ? (int)$row['isDeleted'] : 0;
			if ($updatedTimestamp !== null && ($createdTimestamp === null || strcmp($updatedTimestamp, $createdTimestamp) !== 0)) {
				if ($isDeleted === 1) {
					$description = $reviewer[1] !== '' ? $reviewer[1] . 'のレビューが削除されました。' : 'レビューが削除されました。';
					$append($updatedTimestamp, 'review', 'delete', $subject, $description, $reviewer[0], $reviewer[1]);
				} else {
					$description = $reviewer[1] !== '' ? $reviewer[1] . 'がレビューを更新しました。' : 'レビューが更新されました。';
					$append($updatedTimestamp, 'review', 'update', $subject, $description, $reviewer[0], $reviewer[1]);
				}
			}
		}

		$targetId = isset($targetRow['id']) ? (int)$targetRow['id'] : 0;
		if ($targetId > 0) {
			
			$stmt = $pdo->prepare(
								  'SELECT ba.id, ba.created_at, ba.updated_at, ba.awarded_at, '
								  . 'b.title AS badgeTitle, aw.userCode AS awardedByCode, aw.displayName AS awardedByDisplayName '
								  . 'FROM badge_awards ba '
								  . 'JOIN badges b ON ba.badge_id = b.id '
								  . 'LEFT JOIN user aw ON ba.awarded_by = aw.id '
								  . 'WHERE ba.target_id = ? '
								  . 'ORDER BY ba.created_at ASC, ba.updated_at ASC, ba.id ASC'
								  );
			$stmt->execute(array($targetId));
			while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
				$badgeTitle = isset($row['badgeTitle']) ? trim((string)$row['badgeTitle']) : '';
				$subject = $badgeTitle !== '' ? 'バッジ「' . $badgeTitle . '」' : 'バッジ';
				$actor = $this->resolveActivityActorSummary(
															isset($row['awardedByCode']) ? $row['awardedByCode'] : null,
															isset($row['awardedByDisplayName']) ? $row['awardedByDisplayName'] : null
															);
				$actorName = $actor[1];
				$createdTimestamp = Util::normalizeTimestampValue(isset($row['awarded_at']) ? $row['awarded_at'] : null);
				if ($createdTimestamp === null) {
					$createdTimestamp = Util::normalizeTimestampValue(isset($row['created_at']) ? $row['created_at'] : null);
				}
				if ($createdTimestamp !== null) {
					$description = $actorName !== '' ? $actorName . 'が' . $subject . 'を授与しました。' : $subject . 'が授与されました。';
					$append($createdTimestamp, 'badge', 'create', $subject, $description, $actor[0], $actorName);
				}

				$updatedTimestamp = Util::normalizeTimestampValue(isset($row['updated_at']) ? $row['updated_at'] : null);
				if ($updatedTimestamp !== null && ($createdTimestamp === null || strcmp($updatedTimestamp, $createdTimestamp) !== 0)) {
					$description = $actorName !== '' ? $actorName . 'が' . $subject . 'の授与内容を更新しました。' : $subject . 'の授与情報が更新されました。';
					$append($updatedTimestamp, 'badge', 'update', $subject, $description, $actor[0], $actorName);
				}
			}
		}

		usort($activities, function ($a, $b) {
				$timeA = isset($a['timestamp']) ? $a['timestamp'] : '';
				$timeB = isset($b['timestamp']) ? $b['timestamp'] : '';
				$cmp = strcmp($timeB, $timeA);
				if ($cmp !== 0) {
					return $cmp;
				}
				$orderA = isset($a['__order']) ? (int)$a['__order'] : 0;
				$orderB = isset($b['__order']) ? (int)$b['__order'] : 0;
				if ($orderA === $orderB) {
					return 0;
				}
				return ($orderA < $orderB) ? 1 : -1;
			});

		foreach ($activities as &$entry) {
			if (isset($entry['__order'])) {
				unset($entry['__order']);
			}
		}

		return array_values($activities);
	}



	private function resolveActivityCategoryLabel($category)
	{
		$map = array(
					 'target' => 'ターゲット',
					 'agreement' => '規約',
					 'guidance' => 'ガイダンスコンテンツ',
					 'reference' => '参考資料',
					 'schedule' => 'スケジュール',
					 'submission' => '提出',
					 'review' => 'レビュー',
					 'badge' => 'バッジ',
					 );

		$key = strtolower(trim((string)$category));
		if (isset($map[$key])) {
			return $map[$key];
		}

		return $key;
	}



	private function resolveActivityActionLabel($action)
	{
		$map = array(
					 'create' => '新規登録',
					 'update' => '更新',
					 'delete' => '削除',
					 );

		$key = strtolower(trim((string)$action));
		if (isset($map[$key])) {
			return $map[$key];
		}

		return $key;
	}



	private function resolveActivityActorSummary($userCode, $displayName = null)
	{
		$resolvedCode = '';
		if ($userCode !== null) {
			$resolvedCode = trim((string)$userCode);
		}

		$resolvedName = '';
		if ($displayName !== null) {
			$resolvedName = trim((string)$displayName);
		}

		if ($resolvedName === '' && $resolvedCode !== '') {
			$userInfo = $this->getUserInfo($resolvedCode);
			if ($userInfo != null && isset($userInfo['displayName'])) {
				$candidate = trim((string)$userInfo['displayName']);
				if ($candidate !== '') {
					$resolvedName = $candidate;
				}
			}
		}

		if ($resolvedName === '' && $resolvedCode !== '') {
			$resolvedName = $resolvedCode;
		}

		return array($resolvedCode, $resolvedName);
	}



	private function fetchBasicInfoConfirmationPayload($targetCode, $userCode)
	{
		$payload = array(
						 'confirmed' => false,
						 'confirmedAt' => null,
						 'userCode' => $userCode,
						 );

		if ($targetCode === null || $targetCode === '' || $userCode === null || $userCode === '') {
			return $payload;
		}

		$stmt = $this->getPDOTarget()->prepare(
											   'SELECT confirmedAt FROM targetBasicInfoConfirmations WHERE targetCode = ? AND userCode = ? LIMIT 1'
											   );
		$stmt->execute(array($targetCode, $userCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($row && isset($row['confirmedAt'])) {
			$timestamp = Util::normalizeTimestampValue($row['confirmedAt']);
			if ($timestamp !== null) {
				$payload['confirmed'] = true;
				$payload['confirmedAt'] = $timestamp;
			}
		}

		return $payload;
	}



	private function buildTargetSectionActivityPayload($targetCode, $viewerUserCode)
	{
		$payload = array();

		if ($targetCode === null || $targetCode === '') {
			foreach ($this->sectionViewKeys as $key) {
				$payload[$key] = array('latestActivityAt' => null, 'lastViewedAt' => null, 'hasNew' => 0);
			}
			return $payload;
		}

		$latestMap = $this->fetchLatestSectionActivityMap($targetCode);
		$viewMap = $this->fetchTargetSectionViewMap($targetCode, $viewerUserCode);

		$normalizedViewerCode = $this->normalizeUserCodeValue($viewerUserCode);

		foreach ($this->sectionViewKeys as $key) {
			$latestEntry = array_key_exists($key, $latestMap) ? $latestMap[$key] : null;
			$lastViewed = array_key_exists($key, $viewMap) ? $viewMap[$key] : null;

			$latestActivityAt = null;
			$latestActorCode = '';

			if (is_array($latestEntry)) {
				$latestActivityAt = isset($latestEntry['latestActivityAt']) ? $latestEntry['latestActivityAt'] : null;
				$latestActorCode = isset($latestEntry['latestActorCode']) ? $latestEntry['latestActorCode'] : '';
			} else {
				$latestActivityAt = $latestEntry;
			}

			$latestActivityAt = Util::normalizeTimestampValue($latestActivityAt);
			$latestActorCode = $this->normalizeActorCodeValue($latestActorCode);

			$hasNew = 0;
			if ($latestActivityAt !== null) {
				if ($lastViewed === null) {
					$hasNew = 1;
				} else {
					if (strcmp($lastViewed, $latestActivityAt) < 0) {
						$hasNew = 1;
					}
				}
			}

			if ($hasNew === 1 && $latestActorCode !== '') {
				$normalizedActor = $this->normalizeUserCodeValue($latestActorCode);
				if ($normalizedActor !== '' && $normalizedActor === $normalizedViewerCode) {
					$hasNew = 0;
				}
			}

			$payload[$key] = array(
								   'latestActivityAt' => $latestActivityAt,
								   'lastViewedAt' => $lastViewed,
								   'hasNew' => $hasNew,
								   'latestActorCode' => $latestActorCode,
								   );
		}

		return $payload;
	}



	private function fetchTargetSectionViewMap($targetCode, $userCode)
	{
		$map = array();

		if ($targetCode === null || $targetCode === '' || $userCode === null || $userCode === '') {
			return $map;
		}

		$stmt = $this->getPDOTarget()->prepare(
											   'SELECT sectionKey, lastViewedAt FROM targetSectionViews WHERE targetCode = ? AND userCode = ?'
											   );
		$stmt->execute(array($targetCode, $userCode));

		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			if (!isset($row['sectionKey'])) {
				continue;
			}
			$key = $this->normalizeSectionKey($row['sectionKey']);
			if ($key === null) {
				continue;
			}
			$timestamp = isset($row['lastViewedAt']) ? Util::normalizeTimestampValue($row['lastViewedAt']) : null;
			if ($timestamp !== null) {
				$map[$key] = $timestamp;
			}
		}

		return $map;
	}



	private function fetchLatestSectionActivityMap($targetCode)
	{
		$map = array();

if ($targetCode === null || $targetCode === '') {
return $map;
}

$chatDependencies = $this->buildChatUtilDependencies();

$pdo = $chatDependencies['pdo'];

		$stmt = $pdo->prepare(
							  'SELECT ownerUserCode AS actorCode, COALESCE(updatedAt, createdAt) AS activityAt '
							  . 'FROM targetReferenceMaterials '
							  . 'WHERE targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0) '
							  . 'ORDER BY activityAt DESC, id DESC '
							  . 'LIMIT 1'
							  );
		$stmt->execute(array($targetCode));
		$map['references'] = $this->buildSectionActivityEntryFromRow($stmt->fetch(PDO::FETCH_ASSOC));

		$stmt = $pdo->prepare(
							  'SELECT ownerUserCode AS actorCode, COALESCE(updatedAt, createdAt) AS activityAt '
							  . 'FROM targetScheduleMaterials '
							  . 'WHERE targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0) '
							  . 'ORDER BY activityAt DESC, id DESC '
							  . 'LIMIT 1'
							  );
		$stmt->execute(array($targetCode));
		$map['schedules'] = $this->buildSectionActivityEntryFromRow($stmt->fetch(PDO::FETCH_ASSOC));		

		$stmt = $pdo->prepare(
							  'SELECT updatedByUserCode AS actorCode, COALESCE(updatedAt, createdAt) AS activityAt '
							  . 'FROM targetGoals '
							  . 'WHERE targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0) '
							  . 'ORDER BY activityAt DESC, id DESC '
							  . 'LIMIT 1'
							  );
		$stmt->execute(array($targetCode));
		$map['goals'] = $this->buildSectionActivityEntryFromRow($stmt->fetch(PDO::FETCH_ASSOC));

		$stmt = $pdo->prepare(
							  'SELECT lastMessageSenderCode AS actorCode, lastMessageAt AS activityAt '
							  . 'FROM targetChatThreads '
							  . 'WHERE targetCode = ? AND (isArchived IS NULL OR isArchived = 0) AND lastMessageAt IS NOT NULL '
							  . 'ORDER BY lastMessageAt DESC, updatedAt DESC, id DESC '
							  . 'LIMIT 1'
							  );
		$stmt->execute(array($targetCode));
		$map['chat'] = $this->buildSectionActivityEntryFromRow($stmt->fetch(PDO::FETCH_ASSOC));

                $stmt = $pdo->prepare(
                                                          'SELECT s.userCode AS actorCode, COALESCE(s.updatedAt, s.createdAt, s.submittedAt) AS activityAt '
                                                          . 'FROM submissions s '
                                                          . 'JOIN targetSubmissions ts ON s.submissionCode = ts.submissionCode '
                                                          . 'WHERE ts.targetCode = ? AND (s.isDeleted IS NULL OR s.isDeleted = 0) '
                                                          . 'ORDER BY activityAt DESC, s.id DESC '
                                                          . 'LIMIT 1'
                                                          );
		$stmt->execute(array($targetCode));
		$map['submissions'] = $this->buildSectionActivityEntryFromRow($stmt->fetch(PDO::FETCH_ASSOC));

                $stmt = $pdo->prepare(
                                                          'SELECT COALESCE(r.reviewerCode, tr.reviewerCode) AS actorCode, COALESCE(r.updatedAt, r.createdAt, r.reviewedAt) AS activityAt '
                                                          . 'FROM reviews r '
                                                          . 'JOIN targetReviews tr ON r.reviewCode = tr.reviewCode '
                                                          . 'WHERE tr.targetCode = ? AND (r.isDeleted IS NULL OR r.isDeleted = 0) '
                                                          . 'ORDER BY activityAt DESC, r.id DESC '
                                                          . 'LIMIT 1'
                                                          );
		$stmt->execute(array($targetCode));
		$map['reviews'] = $this->buildSectionActivityEntryFromRow($stmt->fetch(PDO::FETCH_ASSOC));

		$stmt = $pdo->prepare(
							  'SELECT aw.userCode AS actorCode, ba.awarded_at AS activityAt '
							  . 'FROM badge_awards ba '
							  . 'JOIN targets t ON ba.target_id = t.id '
							  . 'LEFT JOIN user aw ON ba.awarded_by = aw.id '
							  . 'WHERE t.targetCode = ? '
							  . 'ORDER BY ba.awarded_at DESC, ba.id DESC '
							  . 'LIMIT 1'
							  );
		$stmt->execute(array($targetCode));
		$map['badges'] = $this->buildSectionActivityEntryFromRow($stmt->fetch(PDO::FETCH_ASSOC));

		return $map;
	}



	private function interpretBoolean($value, $default = false)
	{
		if (is_bool($value)) {
			return $value;
		}

		if ($value === null) {
			return $default;
		}

		$normalized = strtolower(trim((string)$value));
		if ($normalized === '1' || $normalized === 'true' || $normalized === 'yes' || $normalized === 'on') {
			return true;
		}

		if ($normalized === '0' || $normalized === 'false' || $normalized === 'no' || $normalized === 'off') {
			return false;
		}

		return $default;
	}


	private function buildSectionActivityEntryFromRow($row)
	{
		if ($row === false || !is_array($row)) {
			return array('latestActivityAt' => null, 'latestActorCode' => '');
		}

		$timestamp = isset($row['activityAt']) ? $row['activityAt'] : null;
		$actorCode = isset($row['actorCode']) ? $row['actorCode'] : null;

		return array(
					 'latestActivityAt' => Util::normalizeTimestampValue($timestamp),
					 'latestActorCode' => $this->normalizeActorCodeValue($actorCode),
					 );
	}



	private function normalizeActorCodeValue($value)
	{
		if ($value === null) {
			return '';
		}

		$trimmed = trim((string) $value);
		if ($trimmed === '') {
			return '';
		}

		return $trimmed;
	}



	private function normalizeUserCodeValue($value)
	{
		if ($value === null) {
			return '';
		}

		$trimmed = trim((string) $value);
		if ($trimmed === '') {
			return '';
		}

		return strtolower($trimmed);
	}



	private function normalizeSectionKey($value)
	{
		if ($value === null) {
			return null;
		}

		$trimmed = strtolower(trim((string) $value));
		if ($trimmed === '') {
			return null;
		}

		foreach ($this->sectionViewKeys as $key) {
			if ($trimmed === strtolower($key)) {
				return $key;
			}
		}

		return null;
	}



	private function deriveDisplayInitial($text, $fallback)
	{
		if ($text === null) {
			return $fallback;
		}

		$trimmed = trim((string)$text);
		if ($trimmed === '') {
			return $fallback;
		}

		if (function_exists('mb_substr')) {
			$initial = mb_substr($trimmed, 0, 1, 'UTF-8');
		} else {
			$initial = substr($trimmed, 0, 1);
		}

		if ($initial === false || $initial === '') {
			return $fallback;
		}

		if (function_exists('mb_strtoupper')) {
			return mb_strtoupper($initial, 'UTF-8');
		}

		return strtoupper($initial);
	}



        private function buildUserAvatarPayload($userInfo)
        {
		$result = array(
                        'url' => null,
                        'alt' => null,
                        'transform' => null,
                        'payload' => null,
						);

		if (!is_array($userInfo)) {
			return $result;
		}

		$fileName = isset($userInfo['imageFileName']) ? trim((string) $userInfo['imageFileName']) : '';
		$userId = isset($userInfo['id']) ? trim((string) $userInfo['id']) : '';

		if ($fileName === '' || $userId === '') {
			return $result;
		}

		$safeUserId = preg_replace('/[^A-Za-z0-9_-]/', '', $userId);
		$safeFile = preg_replace('/[^A-Za-z0-9._-]/', '', $fileName);

		if ($safeUserId === '' || $safeFile === '') {
			return $result;
		}

		$baseDir = $this->dataBasePath . '/userdata/' . $safeUserId . '/image';
                $variantCandidates = array(
                                                                   'small' => array($safeFile . '_sm'),
                                                                   'medium' => array($safeFile . '_md'),
                                                                   'original' => array($safeFile),
                                                                   );

		$extensionPosition = strrpos($safeFile, '.');
		if ($extensionPosition !== false) {
			$namePart = substr($safeFile, 0, $extensionPosition);
			$extensionPart = substr($safeFile, $extensionPosition);
			if ($namePart !== '') {
				$variantCandidates['small'][] = $namePart . '_sm' . $extensionPart;
				$variantCandidates['medium'][] = $namePart . '_md' . $extensionPart;
			}
		}

		$found = array();
		foreach ($variantCandidates as $variant => $candidates) {
			foreach ($candidates as $candidate) {
				if (!is_string($candidate) || $candidate === '') {
					continue;
				}
				$fullPath = $baseDir . '/' . $candidate;
                                if (is_file($fullPath)) {
                                        $found[$variant] = array(
                                                                                         'fileName' => $candidate,
                                                                                         'path' => $fullPath,
                                                                                         'variant' => $variant,
                                                                                         );
                                        break;
                                }
                        }
		}

		if (empty($found)) {
			return $result;
		}

		$primary = isset($found['small']) ? $found['small'] : (isset($found['medium']) ? $found['medium'] : (isset($found['original']) ? $found['original'] : null));
		if ($primary === null) {
			return $result;
		}

		$original = isset($found['original']) ? $found['original'] : $primary;

                $version = null;
                $primaryUrl = $this->buildAvatarAccessUrl($safeUserId, $primary['variant'], $version);
                $result['url'] = $primaryUrl;
                $result['urlSmall'] = isset($found['small']) ? $this->buildAvatarAccessUrl($safeUserId, 'small', $version) : $primaryUrl;
                $result['urlMedium'] = isset($found['medium']) ? $this->buildAvatarAccessUrl($safeUserId, 'medium', $version) : $this->buildAvatarAccessUrl($safeUserId, 'original', $version);
                $result['urlOriginal'] = $this->buildAvatarAccessUrl($safeUserId, 'original', $version);
		$result['fileName'] = $safeFile;
		$result['userId'] = $safeUserId;

		$versionSources = array();
                foreach ($found as $info) {
                        if (!isset($info['path'])) {
                                continue;
                        }
                        $mtime = @filemtime($info['path']);
                        if ($mtime) {
				$versionSources[] = (int) $mtime;
			}
		}
                if (!empty($versionSources)) {
                        $version = (string) max($versionSources);
                        $result['updatedAt'] = $version;
                        $result['version'] = $version;
                        $result['avatarVersion'] = $version;
                        $result['imageUpdatedAt'] = $version;
                        $result['url'] = $this->buildAvatarAccessUrl($safeUserId, $primary['variant'], $version);
                        $result['urlSmall'] = isset($found['small']) ? $this->buildAvatarAccessUrl($safeUserId, 'small', $version) : $result['url'];
                        $result['urlMedium'] = isset($found['medium']) ? $this->buildAvatarAccessUrl($safeUserId, 'medium', $version) : $this->buildAvatarAccessUrl($safeUserId, 'original', $version);
                        $result['urlOriginal'] = $this->buildAvatarAccessUrl($safeUserId, 'original', $version);
                }

		$displayName = isset($userInfo['displayName']) ? trim((string) $userInfo['displayName']) : '';
		if ($displayName !== '') {
			$result['alt'] = $displayName . 'のアバター';
		}

                $payload = array(
                                                 'src' => $result['url'],
                                                 'alt' => $result['alt'],
						 'transform' => $result['transform'],
						 'fileName' => $safeFile,
						 'type' => 'uploaded',
						 'userId' => $safeUserId,
						 );

		if (isset($result['updatedAt'])) {
			$payload['updatedAt'] = $result['updatedAt'];
		}
		if (isset($result['version'])) {
			$payload['version'] = $result['version'];
			$payload['avatarVersion'] = $result['version'];
		}
		if (isset($result['imageUpdatedAt'])) {
			$payload['imageUpdatedAt'] = $result['imageUpdatedAt'];
		}
		if ($result['urlSmall'] !== $result['url']) {
			$payload['urlSmall'] = $result['urlSmall'];
		}
		if ($result['urlMedium'] !== $result['url']) {
			$payload['urlMedium'] = $result['urlMedium'];
		}
		if ($result['urlOriginal'] !== $result['url']) {
			$payload['urlOriginal'] = $result['urlOriginal'];
		}

                $result['payload'] = $payload;

                return $result;
        }


        private function buildAvatarAccessUrl($userId, $variant = 'original', $version = null)
        {
                if (!is_string($userId) || $userId === '') {
                        return '';
                }

                $normalizedVariant = strtolower((string) $variant);
                $variantParam = '';
                if ($normalizedVariant !== '' && $normalizedVariant !== 'original') {
                        if (in_array($normalizedVariant, array('small', 'sm'), true)) {
                                $variantParam = 'small';
                        } else if (in_array($normalizedVariant, array('medium', 'md'), true)) {
                                $variantParam = 'medium';
                        }
                }

                $url = '/scripts/request.php?requestType=User&type=UserAvatar&id=' . rawurlencode($userId) . '&token=' . rawurlencode(self::API_TOKEN);
                if ($variantParam !== '') {
                        $url .= '&variant=' . rawurlencode($variantParam);
                }
                if ($version !== null && $version !== '') {
                        $separator = strpos($url, '?') === false ? '?' : '&';
                        $url .= $separator . 'v=' . rawurlencode((string) $version);
                }

                return $url;
        }


        private function saveTargetImageFile($targetId)
        {
                if (!isset($this->files['imageFile']) || !is_array($this->files['imageFile'])) {
                        return null;
                }

                $targetId = (int)$targetId;
                if ($targetId <= 0) {
                        return null;
                }

                $loginUserId = $this->getLoginUserId();
                if ($loginUserId === null || (int)$loginUserId <= 0) {
                        return null;
                }

                $fileEntry = $this->files['imageFile'];
                $originalName = isset($fileEntry['name']) ? trim((string)$fileEntry['name']) : '';
                $tmpPath = isset($fileEntry['tmp_name']) ? $fileEntry['tmp_name'] : null;
                if ($originalName === '' || $tmpPath === null || $tmpPath === '') {
                        return null;
                }

                $mimeType = isset($fileEntry['type']) ? strtolower((string)$fileEntry['type']) : '';
                if ($mimeType !== '' && strpos($mimeType, 'image/') !== 0) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return false;
                }

                $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
                if ($extension === 'jpeg') {
                        $extension = 'jpg';
                }
                $allowedExtensions = array('jpg', 'jpeg', 'png', 'gif', 'webp');
                if (!in_array($extension, $allowedExtensions, true) || $extension === '') {
                        $extension = 'png';
                }

                $baseName = pathinfo($originalName, PATHINFO_FILENAME);
                $safeBaseName = preg_replace('/[^A-Za-z0-9_-]/', '', $baseName);
                if ($safeBaseName === '') {
                        $safeBaseName = 'target-image';
                }
                $fileName = $safeBaseName . '.' . $extension;

                $safeUserId = preg_replace('/[^A-Za-z0-9_-]/', '', (string)$loginUserId);
                $safeTargetId = preg_replace('/[^A-Za-z0-9_-]/', '', (string)$targetId);
                if ($safeUserId === '' || $safeTargetId === '') {
                        return null;
                }

                $targetDir = $this->dataBasePath . '/userdata/' . $safeUserId . '/target/' . $safeTargetId;
                if (!is_dir($targetDir)) {
                        @mkdir($targetDir, 0775, true);
                }
                if (is_dir($targetDir)) {
                        $this->cleanupDirectoryFiles($targetDir);
                }

                $destinationPath = $targetDir . '/' . $fileName;
                if (is_uploaded_file($tmpPath)) {
                        move_uploaded_file($tmpPath, $destinationPath);
                } else {
                        file_put_contents($destinationPath, file_get_contents($tmpPath));
                }

                return '/userdata/' . $safeUserId . '/target/' . $safeTargetId . '/' . $fileName;
        }


        private function moveTargetImageToCreator($relativePath, $targetId, $creatorInfo)
        {
                if ($relativePath === null) {
                        return null;
                }

                $trimmed = trim((string)$relativePath);
                if ($trimmed === '') {
                        return null;
                }

                if (!is_array($creatorInfo) || !isset($creatorInfo['id'])) {
                        return null;
                }

                $safeTargetId = preg_replace('/[^A-Za-z0-9_-]/', '', (string)$targetId);
                $safeUserId = preg_replace('/[^A-Za-z0-9_-]/', '', (string)$creatorInfo['id']);

                if ($safeTargetId === '' || $safeUserId === '') {
                        return null;
                }

                $sourcePath = $this->resolveTargetImagePath($trimmed);
                if ($sourcePath === null) {
                        return null;
                }

                $fileName = basename($sourcePath);
                if ($fileName === '') {
                        return null;
                }

                $destinationDir = $this->dataBasePath . '/userdata/' . $safeUserId . '/target/' . $safeTargetId;
                if (!is_dir($destinationDir)) {
                        @mkdir($destinationDir, 0775, true);
                }
                if (!is_dir($destinationDir)) {
                        return null;
                }

                $normalizedDestinationDir = realpath($destinationDir);
                $normalizedSourceDir = realpath(dirname($sourcePath));
                if ($normalizedDestinationDir !== false && $normalizedSourceDir !== false && $normalizedDestinationDir === $normalizedSourceDir) {
                        return '/userdata/' . $safeUserId . '/target/' . $safeTargetId . '/' . $fileName;
                }

                $this->cleanupDirectoryFiles($destinationDir);
                $destinationPath = $destinationDir . '/' . $fileName;

                if (@rename($sourcePath, $destinationPath) === false) {
                        if (@copy($sourcePath, $destinationPath) === false) {
                                return null;
                        }
                        @unlink($sourcePath);
                }

                return '/userdata/' . $safeUserId . '/target/' . $safeTargetId . '/' . $fileName;
        }


        private function cleanupDirectoryFiles($directory)
        {
                if (!is_dir($directory)) {
                        return;
                }

                $entries = scandir($directory);
                if (!is_array($entries)) {
                        return;
                }

                foreach ($entries as $entry) {
                        if ($entry === '.' || $entry === '..') {
                                continue;
                        }

                        $path = $directory . '/' . $entry;
                        if (is_file($path)) {
                                @unlink($path);
                        }
                }
        }


        private function resolveTargetImagePath($relativePath)
        {
                if ($relativePath === null) {
                        return null;
                }

                $trimmed = ltrim(trim((string)$relativePath), '/');
                if ($trimmed === '') {
                        return null;
                }

                $baseDir = $this->dataBasePath . '/userdata';
                $baseReal = realpath($baseDir);
                $fullPath = $this->dataBasePath . '/' . $trimmed;
                $resolved = realpath($fullPath);

                if ($resolved === false || $baseReal === false) {
                        return null;
                }

                if (strpos($resolved, $baseReal) !== 0) {
                        return null;
                }

                if (!is_file($resolved) || !is_readable($resolved)) {
                        return null;
                }

                return $resolved;
        }


        private function buildTargetImageUrl($row)
        {
                $imageFile = isset($row['imageFile']) ? trim((string) $row['imageFile']) : '';
                $targetCode = isset($row['targetCode']) ? trim((string) $row['targetCode']) : '';

                if ($imageFile === '' || $targetCode === '') {
                        return null;
                }

                $url = '/scripts/request.php?requestType=TargetManagementTargets&type=TargetImageGet&targetCode=' . rawurlencode($targetCode) . '&token=' . rawurlencode(self::API_TOKEN);
                $updatedAt = isset($row['updatedAt']) ? trim((string) $row['updatedAt']) : '';
                if ($updatedAt !== '') {
                        $url .= '&v=' . rawurlencode($updatedAt);
                }

                return $url;
        }



        private function buildChatParticipantPayload($userCode, $role)
        {
                if ($userCode === null || $userCode === '') {
                        return null;
                }

                $userInfo = $this->getUserInfo($userCode);
                $displayName = null;
                if ($userInfo != null && isset($userInfo['displayName']) && $userInfo['displayName'] !== '') {
                        $displayName = $userInfo['displayName'];
                }

                $avatarPayload = $this->buildUserAvatarPayload($userInfo);
                $normalizedRole = $this->normalizeChatRole($role);
                $initial = $this->deriveDisplayInitial($displayName !== null ? $displayName : $userCode, '?');

                return array(
                                         'userCode' => $userCode,
                                         'displayName' => $displayName !== null ? $displayName : $userCode,
                                         'role' => $normalizedRole,
                                         'avatar' => $avatarPayload['payload'],
                                         'avatarUrl' => $avatarPayload['url'],
                                         'avatarInitial' => $initial,
                                         'avatarTransform' => $avatarPayload['transform'],
                                         );
        }



        private function buildChatAttachmentPayload($row)
        {
                if (!is_array($row)) {
                        return null;
                }

                $contentCode = isset($row['contentCode']) ? trim((string)$row['contentCode']) : '';
                if ($contentCode === '') {
                        return null;
                }

                $downloadUrl = isset($row['downloadUrl']) ? $row['downloadUrl'] : null;

                $fileSize = null;
                if (isset($row['fileSize']) && $row['fileSize'] !== null && $row['fileSize'] !== '') {
                        $fileSize = (int)$row['fileSize'];
                }

                return array(
                                         'attachmentCode' => isset($row['attachmentCode']) ? $row['attachmentCode'] : null,
                                         'contentCode' => $contentCode,
                                         'contentType' => isset($row['contentType']) ? $row['contentType'] : null,
                                         'fileName' => isset($row['fileName']) ? $row['fileName'] : null,
                                         'mimeType' => isset($row['mimeType']) ? $row['mimeType'] : null,
                                         'fileSize' => $fileSize,
                                         'downloadUrl' => $downloadUrl,
                                         'url' => $downloadUrl,
                                         'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
                                         'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
                                         );
        }



        private function normalizeChatRole($role)
        {
                if ($role === null) {
                        return 'student';
                }

                $value = strtolower(trim((string)$role));
                if ($value === '') {
                        return 'student';
                }

                $coachRoles = array('coach', 'owner', 'facilitator', 'operator', 'staff', 'manager', 'admin');
                if (in_array($value, $coachRoles, true)) {
                        return 'coach';
                }

                return 'student';
        }



        private function buildChatUtilDependencies()
        {
                $pdo = $this->getPDOTarget();

                return array(
                        'pdo' => $pdo,
                        'buildParticipant' => array($this, 'buildChatParticipantPayload'),
                        'normalizeRole' => array($this, 'normalizeChatRole'),
                        'buildAttachment' => array($this, 'buildChatAttachmentPayload'),
                        );
        }



	private function fetchTargetGuidanceContents($targetCode)
	{
		if ($targetCode === null || $targetCode === '') {
			return array();
		}

		$stmt = $this->getPDOTarget()->prepare(
											   'SELECT g.*, u.displayName AS ownerDisplayName FROM targetGuidanceContents g '
											   . 'LEFT JOIN common.user u ON g.ownerUserCode = u.userCode '
											   . 'WHERE g.targetCode = ? AND (g.isDeleted IS NULL OR g.isDeleted = 0) '
											   . 'ORDER BY g.displayOrder ASC, g.updatedAt DESC, g.id DESC'
											   );
		$stmt->execute(array($targetCode));
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		if (!is_array($rows) || count($rows) === 0) {
			return array();
		}

		$contentMap = $this->fetchGuidanceContentMap($rows);
		$items = array();

		foreach ($rows as $row) {
			$payload = $this->buildGuidanceContentPayload($row, $contentMap);
			if ($payload !== null) {
				$items[] = $payload;
			}
		}

		return $items;
	}



        private function fetchTargetGuidanceRows($targetCode)
        {
                if ($targetCode === null || $targetCode === '') {
                        return array();
                }

		$stmt = $this->getPDOTarget()->prepare(
                                                                                                        'SELECT * FROM targetGuidanceContents WHERE targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0) '
                                                                                                        . 'ORDER BY displayOrder ASC, updatedAt DESC, id DESC'
                                                                                                        );
		$stmt->execute(array($targetCode));

                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                if (!is_array($rows)) {
                        return array();
                }

                return $rows;
        }

        private function fetchGuidanceRowByCode($targetCode, $guidanceCode)
        {
                if ($guidanceCode === null || $guidanceCode === '') {
                        return null;
                }

                $stmt = $this->getPDOTarget()->prepare(
                                                                                                'SELECT g.*, u.displayName AS ownerDisplayName '
                                                                                                . 'FROM targetGuidanceContents g '
                                                                                                . 'LEFT JOIN common.user u ON g.ownerUserCode = u.userCode '
                                                                                                . 'WHERE g.guidanceCode = ? AND g.targetCode = ? '
                                                                                                . 'AND (g.isDeleted IS NULL OR g.isDeleted = 0) LIMIT 1'
                                                                                                );
                $stmt->execute(array($guidanceCode, $targetCode));
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row === false) {
                        return null;
                }
                return $row;
        }

        private function buildGuidancePayloadByCode($targetCode, $guidanceCode)
        {
                $row = $this->fetchGuidanceRowByCode($targetCode, $guidanceCode);
                if ($row == null) {
                        return null;
                }
                $contentMap = $this->fetchGuidanceContentMap(array($row));
                return $this->buildGuidanceContentPayload($row, $contentMap);
        }

        private function resolveNextGuidanceDisplayOrder($targetCode)
        {
                $stmt = $this->getPDOTarget()->prepare('SELECT MAX(displayOrder) FROM targetGuidanceContents WHERE targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0)');
                $stmt->execute(array($targetCode));
                $current = $stmt->fetchColumn();
                if ($current === false || $current === null) {
                        return 0;
                }
                return ((int)$current) + 1;
        }


        private function fetchGuidanceContentMap($rows)
        {
                $map = array();

		if (!is_array($rows) || count($rows) === 0) {
			return $map;
		}

		$codes = array();
		foreach ($rows as $row) {
			if ($row == null || !isset($row['contentCode'])) {
				continue;
			}
			$code = trim($row['contentCode']);
			if ($code === '') {
				continue;
			}
			if (in_array($code, $codes, true) == false) {
				$codes[] = $code;
			}
		}

		if (count($codes) === 0) {
			return $map;
		}

		$placeholders = implode(', ', array_fill(0, count($codes), '?'));
		$stmt = $this->getPDOContents()->prepare(
												 'SELECT ucp.contentCode, ucp.contentType, ucp.fileName, ucp.filePath, ucp.mimeType, '
												 . 'ucp.fileSize, ucp.userCode, u.id AS ownerId '
												 . 'FROM userContents ucp '
												 . 'LEFT JOIN common.user u ON ucp.userCode = u.userCode '
												 . 'WHERE ucp.contentCode IN (' . $placeholders . ')'
												 );
		$stmt->execute($codes);

		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			$contentCode = isset($row['contentCode']) ? trim($row['contentCode']) : '';
			if ($contentCode === '') {
				continue;
			}
			$map[$contentCode] = $row;
		}

		return $map;
	}



	private function fetchContentRowByCode($contentCode)
	{
		if ($contentCode === null) {
			return null;
		}

		$trimmed = trim($contentCode);
		if ($trimmed === '') {
			return null;
		}

		$stmt = $this->getPDOContents()->prepare(
												 'SELECT ucp.*, u.displayName AS ownerDisplayName, u.id AS ownerId '
												 . 'FROM userContents ucp '
												 . 'LEFT JOIN common.user u ON ucp.userCode = u.userCode '
												 . 'WHERE ucp.contentCode = ? LIMIT 1'
												 );
		$stmt->execute(array($trimmed));

		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row === false) {
			return null;
		}

		return $row;
	}



	private function buildGuidanceItem($row)
	{
		if ($row == null) {
			return null;
		}

		$contentCode = isset($row['contentCode']) ? trim($row['contentCode']) : '';
		if ($contentCode === '') {
			return null;
		}

		$contentType = isset($row['contentType']) ? trim($row['contentType']) : '';
		$category = $this->mapContentTypeToCategory($contentType);
		$fileName = isset($row['fileName']) ? $row['fileName'] : null;
		$fileSize = isset($row['fileSize']) ? (int)$row['fileSize'] : null;

		$ownerId = isset($row['ownerId']) ? trim($row['ownerId']) : '';
		if ($ownerId === '' && isset($row['userCode'])) {
			$userInfo = $this->getUserInfo($row['userCode']);
			if ($userInfo != null && isset($userInfo['id'])) {
				$ownerId = trim((string) $userInfo['id']);
			}
		}

		$assetKind = $this->extractAssetKindFromPath(isset($row['filePath']) ? $row['filePath'] : null);
                if ($assetKind === null && $contentType !== '') {
                        $assetKind = Util::resolveStorageKind($contentType);
                }

		$storageFileName = Util::extractStoredFileName(isset($row['filePath']) ? $row['filePath'] : null);
		$downloadUrl = null;
		if ($ownerId !== '' && $assetKind !== null && $storageFileName !== null) {
			$downloadUrl = $this->buildAssetUrl($ownerId, $assetKind, $storageFileName);
		}

		$title = $this->deriveGuidanceTitleFromFile($fileName);

		return array(
					 'contentCode' => $contentCode,
					 'contentType' => $contentType,
					 'category' => $category,
					 'fileName' => $fileName,
					 'fileSize' => $fileSize,
					 'mimeType' => isset($row['mimeType']) ? $row['mimeType'] : null,
					 'downloadUrl' => $downloadUrl,
					 'previewUrl' => $downloadUrl,
					 'ownerUserCode' => isset($row['userCode']) ? $row['userCode'] : null,
					 'ownerDisplayName' => isset($row['ownerDisplayName']) ? $row['ownerDisplayName'] : null,
					 'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
					 'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
					 'title' => $title,
					 'ownerId' => $ownerId
					 );
	}



	private function buildGuidanceContentPayload($row, $contentMap = array())
	{
		if ($row == null) {
			return null;
		}

		$guidanceCode = isset($row['guidanceCode']) ? trim($row['guidanceCode']) : '';
		if ($guidanceCode === '') {
			return null;
		}

		$contentCode = isset($row['contentCode']) ? trim($row['contentCode']) : '';
		$contentRow = ($contentCode !== '' && isset($contentMap[$contentCode])) ? $contentMap[$contentCode] : null;

                $category = isset($row['category']) ? $row['category'] : null;
		$fileName = isset($row['fileName']) ? $row['fileName'] : null;
		$fileSize = isset($row['fileSize']) ? (int)$row['fileSize'] : null;
		$contentType = null;
		$mimeType = null;
		$downloadUrl = null;
		$previewUrl = null;
		$ownerId = null;
		$assetKind = null;
		$storageFileName = null;

		$previewImage = isset($row['previewImage']) ? $row['previewImage'] : null;

		if ($contentRow != null) {
			if (isset($contentRow['contentType']) && $contentRow['contentType'] !== '') {
				$contentType = $contentRow['contentType'];
			}
			if (($category === null || $category === '' || $category === 'other') && $contentType !== null) {
				$category = $this->mapContentTypeToCategory($contentType);
			}
			if (($fileName === null || $fileName === '') && isset($contentRow['fileName'])) {
				$fileName = $contentRow['fileName'];
			}
			if ($fileSize === null && isset($contentRow['fileSize'])) {
				$fileSize = (int)$contentRow['fileSize'];
			}
			$mimeType = isset($contentRow['mimeType']) ? $contentRow['mimeType'] : null;
			$ownerId = isset($contentRow['ownerId']) ? $contentRow['ownerId'] : null;
			$assetKind = $this->extractAssetKindFromPath(isset($contentRow['filePath']) ? $contentRow['filePath'] : null);
                        if ($assetKind === null && $contentType !== null) {
                                $assetKind = Util::resolveStorageKind($contentType);
                        }
			$storageFileName = Util::extractStoredFileName(isset($contentRow['filePath']) ? $contentRow['filePath'] : null);

			if ($ownerId && $assetKind && $storageFileName) {
				$assetUrl = $this->buildAssetUrl($ownerId, $assetKind, $storageFileName);
				if ($assetUrl !== null) {
					$downloadUrl = $assetUrl;
					$previewUrl = $assetUrl;
				}
				$siteId = isset($this->siteId) ? trim($this->siteId) : '';
				$normalizedCategory = strtolower((string) $category);
				$isVideoContent = ($normalizedCategory === 'video');
				if ($isVideoContent === false) {
					$normalizedContentType = strtolower(trim((string) $contentType));
					if ($normalizedContentType === 'video' || strpos($normalizedContentType, 'video/') === 0) {
						$isVideoContent = true;
					}
				}
				if ($isVideoContent === false) {
					$extensionSource = $storageFileName !== null ? $storageFileName : $fileName;
					$extension = strtolower((string) pathinfo((string) $extensionSource, PATHINFO_EXTENSION));
					if (Util::isVideoFile((string) $mimeType, $extension)) {
						$isVideoContent = true;
					}
				}
				if ($previewImage === null && $isVideoContent && $siteId !== '') {
					$normalizedOwnerId = $ownerId !== null ? trim((string) $ownerId) : '';
					$normalizedAssetKind = $assetKind !== null ? trim((string) $assetKind) : '';
					$normalizedStorageFileName = $storageFileName !== null ? trim((string) $storageFileName) : '';

					if ($normalizedOwnerId !== '' && $normalizedAssetKind !== '' && $normalizedStorageFileName !== '') {
						$thumbnailPath = $this->dataBasePath
							. '/userdata/' . $normalizedOwnerId
							. '/' . $normalizedAssetKind
							. '/' . $normalizedStorageFileName . '_thumbnail';

						if (is_file($thumbnailPath) && is_readable($thumbnailPath)) {
							$thumbnailData = @file_get_contents($thumbnailPath);
							if ($thumbnailData !== false && $thumbnailData !== '') {
								$previewImage = 'data:image/jpeg;base64,' . base64_encode($thumbnailData);
							}
						}
					}
				}
			}
		}

		$title = isset($row['title']) ? $row['title'] : null;
		if ($title === null || trim($title) === '') {
			$title = $this->deriveGuidanceTitleFromFile($fileName);
		}

		return array(
					 'guidanceCode' => $guidanceCode,
					 'targetCode' => isset($row['targetCode']) ? $row['targetCode'] : null,
					 'contentCode' => $contentCode !== '' ? $contentCode : null,
					 'title' => $title,
					 'category' => $category,
					 'fileName' => $fileName,
					 'fileSize' => $fileSize,
					 'contentType' => $contentType,
					 'mimeType' => $mimeType,
					 'downloadUrl' => $downloadUrl,
					 'previewUrl' => $previewUrl,
					 'previewImage' => $previewImage,
					 'ownerUserCode' => isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null,
					 'ownerDisplayName' => isset($row['ownerDisplayName']) ? $row['ownerDisplayName'] : null,
					 'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
					 'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
					 'displayOrder' => isset($row['displayOrder']) ? (int)$row['displayOrder'] : 0
					 );
	}



	private function deriveGuidanceTitleFromFile($fileName)
	{
		if ($fileName === null || $fileName === '') {
			return 'ガイダンスコンテンツ';
		}

		$base = preg_replace('/\.[^.]+$/', '', $fileName);
		if ($base === null) {
			$base = $fileName;
		}

		$trimmed = trim($base);
		if ($trimmed === '') {
			$trimmed = trim($fileName);
		}

		if ($trimmed === '') {
			return 'ガイダンスコンテンツ';
		}

		return $trimmed;
	}



	private function normalizeAssignedUserCodesParam($value)
	{
		if ($value === null) {
			return array();
		}

		if (is_string($value)) {
			$trimmed = trim($value);
			if ($trimmed === '') {
				return array();
			}
			$decoded = json_decode($trimmed, true);
			if (is_array($decoded)) {
				$value = $decoded;
			} elseif (strtolower($trimmed) === 'null') {
				return array();
			} else {
				$value = preg_split('/[\s,]+/', $trimmed);
			}
		}

		if (is_array($value) == false) {
			$value = array($value);
		}

		$codes = array();
		foreach ($value as $entry) {
			if (is_array($entry)) {
				if (array_key_exists('userCode', $entry)) {
					$entry = $entry['userCode'];
				} else {
					$entry = null;
				}
			}
			if ($entry === null) {
				continue;
			}
			$normalized = Util::normalizeOptionalString((string)$entry, 32);
			if ($normalized === false) {
				return false;
			}
			if ($normalized === null) {
				continue;
			}
			if (in_array($normalized, $codes, true) == false) {
				$codes[] = $normalized;
			}
		}

		return $codes;
	}



	private function normalizeAudienceUsersParam($value)
	{
		if ($value === null) {
			return array();
		}

		if (is_string($value)) {
			$trimmed = trim($value);
			if ($trimmed === '') {
				return array();
			}
			$decoded = json_decode($trimmed, true);
			if (json_last_error() === JSON_ERROR_NONE) {
				if ($decoded === null) {
					return array();
				}
				$value = is_array($decoded) ? $decoded : array($decoded);
			} elseif (strtolower($trimmed) === 'null') {
				return array();
			} else {
				return false;
			}
		}

		if (!is_array($value)) {
			return false;
		}

                $assignments = array();
                foreach ($value as $entry) {
                        $candidate = null;
                        $isActive = true;
                        $endedAt = null;
                        if (is_array($entry)) {
                                if (array_key_exists('userCode', $entry)) {
                                        $candidate = $entry['userCode'];
                                } elseif (array_key_exists('code', $entry)) {
                                        $candidate = $entry['code'];
                                } elseif (array_key_exists('id', $entry)) {
                                        $candidate = $entry['id'];
                                }
                                if (array_key_exists('isActive', $entry)) {
                                        $isActive = ((int)$entry['isActive']) !== 0;
                                }
                                if (array_key_exists('endedAt', $entry)) {
                                        $endedAt = Util::normalizeOptionalString($entry['endedAt'], 32);
                                        if ($endedAt === false) {
                                                return false;
                                        }
                                }
                        } elseif (is_string($entry)) {
                                $candidate = $entry;
                        }

                        if ($candidate === null) {
                                continue;
                        }

                        $normalized = Util::normalizeOptionalString((string) $candidate, 32);
                        if ($normalized === false) {
                                return false;
                        }
                        if ($normalized === null) {
                                continue;
                        }
                        if (array_key_exists($normalized, $assignments)) {
                                if ($assignments[$normalized]['isActive'] === false && $isActive === true) {
                                        $assignments[$normalized]['isActive'] = true;
                                        $assignments[$normalized]['endedAt'] = null;
                                }
                                continue;
                        }
                        $assignments[$normalized] = array(
                                'userCode' => $normalized,
                                'isActive' => $isActive,
                                'endedAt' => $endedAt
                        );
                }

                return array_values($assignments);
        }



	private function normalizeAudienceGroupsParam($value)
	{
		if ($value === null) {
			return array();
		}

		if (is_string($value)) {
			$trimmed = trim($value);
			if ($trimmed === '' || strtolower($trimmed) === 'null') {
				return array();
			}
			$decoded = json_decode($trimmed, true);
			if (json_last_error() === JSON_ERROR_NONE) {
				if ($decoded === null) {
					return array();
				}
				$value = is_array($decoded) ? $decoded : array($decoded);
			} else {
				return false;
			}
		}

		if (!is_array($value)) {
			return false;
		}

		$codes = array();
		foreach ($value as $entry) {
			$candidate = null;
			if (is_array($entry)) {
				if (array_key_exists('groupCode', $entry)) {
					$candidate = $entry['groupCode'];
				} elseif (array_key_exists('code', $entry)) {
					$candidate = $entry['code'];
				} elseif (array_key_exists('id', $entry)) {
					$candidate = $entry['id'];
				}
			} elseif (is_string($entry)) {
				$candidate = $entry;
			}

			if ($candidate === null) {
				continue;
			}

			$normalized = self::normalizeGroupCode($candidate);
			if ($normalized === null) {
				continue;
			}

			if (in_array($normalized, $codes, true) == false) {
				$codes[] = $normalized;
			}
		}

		return $codes;
	}

	private function normalizeGuidanceItemsParam($value)
	{
		if ($value === null) {
			return array();
		}

		if (is_string($value)) {
			$trimmed = trim($value);
			if ($trimmed === '' || strtolower($trimmed) === 'null') {
				return array();
			}
			$decoded = json_decode($trimmed, true);
			if (json_last_error() !== JSON_ERROR_NONE) {
				return false;
			}
			$value = $decoded;
		}

		if (!is_array($value)) {
			return array();
		}

		$items = array();
		foreach ($value as $entry) {
			if (is_array($entry)) {
				$items[] = $entry;
			}
		}

		return $items;
	}



	private function resolveAssignedUserCodes()
	{
		$hasArray = array_key_exists('assignedUserCodes', $this->params);
		$hasSingle = array_key_exists('assignedUserCode', $this->params);

		if ($hasArray === false && $hasSingle === false) {
			return array('provided' => false, 'codes' => array());
		}

		$codes = array();

		if ($hasArray) {
			$list = $this->normalizeAssignedUserCodesParam($this->params['assignedUserCodes']);
			if ($list === false) {
				return array('error' => 'invalid');
			}
			$codes = array_merge($codes, $list);
		}

		if ($hasSingle) {
			$single = Util::normalizeOptionalString($this->params['assignedUserCode'], 32);
			if ($single === false) {
				return array('error' => 'invalid');
			}
			if ($single !== null) {
				$codes[] = $single;
			}
		}

		$unique = array();
		foreach ($codes as $code) {
			if (in_array($code, $unique, true) == false) {
				$unique[] = $code;
			}
		}

		foreach ($unique as $code) {
			$userInfo = $this->getUserInfo($code);
			if ($userInfo == null) {
				return array('error' => 'usernotfound');
			}
		}

		return array('provided' => true, 'codes' => $unique);
	}



        private function saveAssignedUsers($targetCode, $assignments)
        {
                if ($targetCode === null || $targetCode === '') {
                        return;
                }

                $pdo = $this->getPDOTarget();
                $existingStmt = $pdo->prepare('SELECT userCode, isActive, endedAt, displayOrder FROM targetAssignedUsers WHERE targetCode = ?');
                $existingStmt->execute(array($targetCode));
                $existing = array();
                while ($row = $existingStmt->fetch(PDO::FETCH_ASSOC)) {
                        if (!isset($row['userCode'])) {
                                continue;
                        }
                        $existing[$row['userCode']] = array(
                                'isActive' => array_key_exists('isActive', $row) ? ((int)$row['isActive']) !== 0 : true,
                                'endedAt' => array_key_exists('endedAt', $row) ? $row['endedAt'] : null,
                                'displayOrder' => array_key_exists('displayOrder', $row) ? (int)$row['displayOrder'] : 0
                        );
                }

                $assignments = is_array($assignments) ? $assignments : array();
                $insertStmt = $pdo->prepare('INSERT INTO targetAssignedUsers (targetCode, userCode, isActive, endedAt, displayOrder) VALUES (?, ?, ?, ?, ?)');
                $updateStmt = $pdo->prepare('UPDATE targetAssignedUsers SET isActive = ?, endedAt = ?, displayOrder = ? WHERE targetCode = ? AND userCode = ?');

                $now = new DateTime('now');
                $timestamp = $now->format('Y-m-d H:i:s');
                $order = 0;
                $provided = array();

                foreach ($assignments as $entry) {
                        $userCode = null;
                        $isActive = true;
                        $endedAt = null;
                        if (is_array($entry)) {
                                if (array_key_exists('userCode', $entry)) {
                                        $userCode = $entry['userCode'];
                                } elseif (array_key_exists('code', $entry)) {
                                        $userCode = $entry['code'];
                                }
                                if (array_key_exists('isActive', $entry)) {
                                        $isActive = ((int)$entry['isActive']) !== 0;
                                }
                                if (array_key_exists('endedAt', $entry)) {
                                        $endedAt = Util::normalizeOptionalString($entry['endedAt'], 32);
                                        if ($endedAt === false) {
                                                $endedAt = null;
                                        }
                                }
                        } else {
                                $userCode = $entry;
                        }

                        $normalizedCode = Util::normalizeOptionalString((string)$userCode, 32);
                        if ($normalizedCode === null) {
                                continue;
                        }

                        if ($isActive === false && $endedAt === null) {
                                $endedAt = $timestamp;
                        }

                        $provided[$normalizedCode] = true;

                        if (array_key_exists($normalizedCode, $existing)) {
                                $updateStmt->execute(array(
                                        $isActive ? 1 : 0,
                                        $isActive ? null : $endedAt,
                                        $order,
                                        $targetCode,
                                        $normalizedCode
                                ));
                        } else {
                                $insertStmt->execute(array(
                                        $targetCode,
                                        $normalizedCode,
                                        $isActive ? 1 : 0,
                                        $isActive ? null : $endedAt,
                                        $order
                                ));
                        }

                        $order += 1;
                }

                foreach ($existing as $code => $row) {
                        if (array_key_exists($code, $provided)) {
                                continue;
                        }
                        if ($row['isActive']) {
                                $updateStmt->execute(array(0, $timestamp, $row['displayOrder'], $targetCode, $code));
                        }
                }
        }



	private function syncTargetGuidanceItems($targetCode)
	{
		if (array_key_exists('guidanceItems', $this->params) == false) {
			return true;
		}

		$items = $this->normalizeGuidanceItemsParam($this->params['guidanceItems']);
		if ($items === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return false;
		}

		$ownerCode = $this->getLoginUserCode();
		if ($ownerCode === null || $ownerCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return false;
		}

		$fileEntries = array();
		if (isset($this->files['guidanceFiles'])) {
			$fileEntries = $this->normalizeUploadedFileEntries($this->files['guidanceFiles']);
		}

		$pdo = $this->getPDOTarget();
		$storedPaths = array();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

			$existingRows = $this->fetchTargetGuidanceRows($targetCode);
			$existingMap = array();
			foreach ($existingRows as $row) {
				if ($row == null || !isset($row['guidanceCode'])) {
					continue;
				}
				$code = trim($row['guidanceCode']);
				if ($code === '') {
					continue;
				}
				$existingMap[$code] = $row;
			}

			$processed = array();
			$usedFileIndexes = array();
			$displayOrder = 0;

			foreach ($items as $item) {
				if (!is_array($item)) {
					continue;
				}

				$type = isset($item['type']) ? strtolower(trim($item['type'])) : '';
				if ($type !== 'existing' && $type !== 'new' && $type !== 'contents') {
					continue;
				}

				$displayOrder += 1;

				if ($type === 'existing') {
					$guidanceCode = isset($item['guidanceCode']) ? trim($item['guidanceCode']) : '';
					if ($guidanceCode === '' || isset($processed[$guidanceCode])) {
						continue;
					}
					if (array_key_exists($guidanceCode, $existingMap) == false) {
						continue;
					}

					$titleValue = null;
					if (array_key_exists('title', $item)) {
						$titleValue = Util::normalizeOptionalString($item['title'], 256);
						if ($titleValue === false) {
							throw new \RuntimeException('invalid');
						}
						if ($titleValue !== null) {
							$titleValue = trim($titleValue);
							if ($titleValue === '') {
								$titleValue = null;
							}
						}
					}

					$stmt = $pdo->prepare('UPDATE targetGuidanceContents SET title = ?, displayOrder = ?, updatedAt = ? WHERE guidanceCode = ? AND targetCode = ?');
					$stmt->execute(array($titleValue, $displayOrder, $timestamp, $guidanceCode, $targetCode));
					$processed[$guidanceCode] = true;
					continue;
				}

				if ($type === 'contents') {
					$contentCodeRaw = isset($item['contentCode']) ? $item['contentCode'] : null;
					$contentCodeValue = Util::normalizeOptionalString($contentCodeRaw, 64);
					if ($contentCodeValue === false || $contentCodeValue === null || $contentCodeValue === '') {
						throw new \RuntimeException('invalid');
					}

					$contentsRow = $this->fetchContentRowByCode($contentCodeValue);
					if ($contentsRow == null) {
						throw new \RuntimeException('invalid');
					}

					$titleValue = null;
					if (array_key_exists('title', $item)) {
						$titleValue = Util::normalizeOptionalString($item['title'], 256);
						if ($titleValue === false) {
							throw new \RuntimeException('invalid');
						}
						if ($titleValue !== null) {
							$titleValue = trim($titleValue);
							if ($titleValue === '') {
								$titleValue = null;
							}
						}
					}

					$fileNameValue = isset($contentsRow['fileName']) ? $contentsRow['fileName'] : null;
					if ($titleValue === null || $titleValue === '') {
						$titleValue = $this->deriveGuidanceTitleFromFile($fileNameValue);
					}

					$categoryValue = $this->mapContentTypeToCategory(isset($contentsRow['contentType']) ? $contentsRow['contentType'] : null);
					$fileSizeValue = isset($contentsRow['fileSize']) ? (int)$contentsRow['fileSize'] : null;
					$ownerUserCodeValue = isset($contentsRow['userCode']) && $contentsRow['userCode'] !== '' ? $contentsRow['userCode'] : $ownerCode;

					$insertStmt = $pdo->prepare('INSERT INTO targetGuidanceContents (guidanceCode, targetCode, contentCode, title, category, fileName, fileSize, ownerUserCode, createdAt, updatedAt, displayOrder, isDeleted) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)');
					$insertStmt->execute(array(
											   $this->generateUniqid(),
											   $targetCode,
											   $contentCodeValue,
											   $titleValue,
											   $categoryValue,
											   $fileNameValue,
											   $fileSizeValue,
											   $ownerUserCodeValue,
											   $timestamp,
											   $timestamp,
											   $displayOrder
											   ));

					continue;
				}

				$fileIndex = null;
				if (isset($item['fileIndex'])) {
					$fileIndex = (int)$item['fileIndex'];
				}
				if ($fileIndex === null || $fileIndex < 0 || array_key_exists($fileIndex, $fileEntries) == false) {
					throw new \RuntimeException('upload');
				}
				if (array_key_exists($fileIndex, $usedFileIndexes)) {
					throw new \RuntimeException('upload');
				}

				$entry = $fileEntries[$fileIndex];
				if (!isset($entry['error']) || $entry['error'] !== UPLOAD_ERR_OK) {
					throw new \RuntimeException('upload');
				}
				$usedFileIndexes[$fileIndex] = true;

				//
				// reference
				//
				$referenceCategory = $this->deriveReferenceCategoryFromFile(

																   isset($entry['type']) ? $entry['type'] : '',

																   isset($entry['name']) ? $entry['name'] : '',

																   'document'

																   );
				$referenceCategory = trim((string) $referenceCategory);
				$referenceStoredResult = $this->storeReferenceFile($ownerCode, $referenceCategory, $timestamp, $entry);
				// reference

				//
				// schedule
				//
				$category = $this->deriveScheduleCategoryFromFile(

																   isset($entry['type']) ? $entry['type'] : '',

																   isset($entry['name']) ? $entry['name'] : '',

																   'document'

																   );
				$category = trim((string) $category);
				$storedResult = $this->storeScheduleFile($ownerCode, $category, $timestamp, $entry);
				// schedule

				$storedPaths[] = $referenceStoredResult['absolutePath'];
				if (isset($referenceStoredResult['thumbnailPath']) && $referenceStoredResult['thumbnailPath'] !== null) {
					$storedPaths[] = $referenceStoredResult['thumbnailPath'];
				}
				$storedPaths[] = $storedResult['absolutePath'];
				if (isset($storedResult['thumbnailPath']) && $storedResult['thumbnailPath'] !== null) {
					$storedPaths[] = $storedResult['thumbnailPath'];
				}
				$attachment = $storedResult['attachment'];

				$titleValue = null;
				if (array_key_exists('title', $item)) {
					$titleValue = Util::normalizeOptionalString($item['title'], 256);
					if ($titleValue === false) {
						throw new \RuntimeException('invalid');
					}
					if ($titleValue !== null) {
						$titleValue = trim($titleValue);
						if ($titleValue === '') {
							$titleValue = null;
						}
					}
				}

				if ($titleValue === null || $titleValue === '') {
					$titleValue = $this->deriveGuidanceTitleFromFile(isset($attachment['fileName']) ? $attachment['fileName'] : null);
				}

				$insertStmt = $pdo->prepare('INSERT INTO targetGuidanceContents (guidanceCode, targetCode, contentCode, title, category, fileName, fileSize, ownerUserCode, createdAt, updatedAt, displayOrder, isDeleted) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)');
				$insertStmt->execute(array(
										   $this->generateUniqid(),
										   $targetCode,
										   isset($attachment['contentCode']) ? $attachment['contentCode'] : null,
										   $titleValue,
										   $category,
										   isset($attachment['fileName']) ? $attachment['fileName'] : null,
										   isset($attachment['fileSize']) ? (int)$attachment['fileSize'] : null,
										   $ownerCode,
										   $timestamp,
										   $timestamp,
										   $displayOrder
										   ));
			}

			foreach ($existingMap as $guidanceCode => $row) {
				if (isset($processed[$guidanceCode])) {
					continue;
				}
				$deleteStmt = $pdo->prepare('UPDATE targetGuidanceContents SET isDeleted = 1, updatedAt = ? WHERE guidanceCode = ? AND targetCode = ?');
				$deleteStmt->execute(array($timestamp, $guidanceCode, $targetCode));
			}

			$pdo->commit();
			return true;
		} catch (\RuntimeException $runtimeError) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			Util::cleanupStoredPaths($storedPaths);

			$reason = $runtimeError->getMessage();
			$this->status = parent::RESULT_ERROR;
			if ($reason === 'invalid' || $reason === 'invalid_mime') {
				$this->errorReason = 'invalid';
			} else {
				$this->errorReason = 'upload';
			}

			return false;
		} catch (Exception $exception) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			Util::cleanupStoredPaths($storedPaths);
			throw $exception;
		}
	}



        private function fetchAssignedUsersForTargets($targetCodes)
        {
                $map = array();
                if (!is_array($targetCodes) || count($targetCodes) === 0) {
                        return $map;
                }

                $codes = array();
                foreach ($targetCodes as $code) {
                        if ($code === null || $code === '') {
                                continue;
                        }
                        if (array_key_exists($code, $map) == false) {
                                $map[$code] = array();
                        }
                        $codes[] = $code;
                }

                if (count($codes) === 0) {
                        return $map;
                }

                $placeholders = implode(', ', array_fill(0, count($codes), '?'));
                $stmt = $this->getPDOTarget()->prepare('SELECT targetCode, userCode, isActive, endedAt, displayOrder FROM targetAssignedUsers WHERE targetCode IN (' . $placeholders . ') ORDER BY targetCode ASC, displayOrder ASC, id ASC');
                $stmt->execute($codes);
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $targetCode = isset($row['targetCode']) ? $row['targetCode'] : null;
                        $userCode = isset($row['userCode']) ? $row['userCode'] : null;
                        if ($targetCode === null || $targetCode === '' || $userCode === null || $userCode === '') {
                                continue;
                        }
                        if (array_key_exists($targetCode, $map) == false) {
                                $map[$targetCode] = array();
                        }
                        $map[$targetCode][] = array(
                                'userCode' => $userCode,
                                'isActive' => array_key_exists('isActive', $row) ? ((int)$row['isActive'] !== 0) : true,
                                'endedAt' => array_key_exists('endedAt', $row) ? $row['endedAt'] : null,
                                'displayOrder' => array_key_exists('displayOrder', $row) ? (int)$row['displayOrder'] : 0
                        );
                }

                return $map;
        }

        private function buildDisplayFlagsFromRow($row)
        {
                $flags = array();
                foreach ($this->displayFlagKeys as $key) {
                        $value = (is_array($row) && array_key_exists($key, $row)) ? $row[$key] : 1;
                        $flags[$key] = $this->normalizeDisplayFlagValue($value, 1);
                }

                return $flags;
        }

        private function normalizeDisplayFlagsFromParams($params, $default = 1)
        {
                $displaySettings = $this->extractDisplaySettings($params);

                $flags = array();
                foreach ($this->displayFlagKeys as $key) {
                        if (array_key_exists($key, $params)) {
                                $source = $params[$key];
                        } elseif (array_key_exists($key, $displaySettings)) {
                                $source = $displaySettings[$key];
                        } else {
                                $source = $default;
                        }
                        $flags[$key] = $this->normalizeDisplayFlagValue($source, $default);
                }

                return $flags;
        }

        private function normalizeDisplayFlagsForUpdate($params, $currentRow)
        {
                $displaySettings = $this->extractDisplaySettings($params);

                $flags = array();
                foreach ($this->displayFlagKeys as $key) {
                        if (array_key_exists($key, $params)) {
                                $current = is_array($currentRow) && array_key_exists($key, $currentRow) ? $currentRow[$key] : 1;
                                $flags[$key] = $this->normalizeDisplayFlagValue($params[$key], $current);
                        } elseif (array_key_exists($key, $displaySettings)) {
                                $current = is_array($currentRow) && array_key_exists($key, $currentRow) ? $currentRow[$key] : 1;
                                $flags[$key] = $this->normalizeDisplayFlagValue($displaySettings[$key], $current);
                        }
                }

                return $flags;
        }

        private function extractDisplaySettings($params)
        {
                if (!is_array($params)) {
                        return array();
                }

                $settings = array();

                if (array_key_exists('displaySettings', $params)) {
                        $rawSettings = $params['displaySettings'];
                        if (is_string($rawSettings)) {
                                $decoded = json_decode($rawSettings, true);
                                if (is_array($decoded)) {
                                        $rawSettings = $decoded;
                                }
                        }

                        if (is_array($rawSettings)) {
                                $settings = $rawSettings;
                        }
                }

                return $settings;
        }

        private function normalizeDisplayFlagValue($value, $default)
        {
                $defaultValue = ((int)$default !== 0) ? 1 : 0;

                if ($value === null) {
                        return $defaultValue;
                }
                if (is_bool($value)) {
                        return $value ? 1 : 0;
                }
                if (is_int($value)) {
                        return $value !== 0 ? 1 : 0;
                }

                $trimmed = trim((string) $value);
                if ($trimmed === '') {
                        return $defaultValue;
                }

                $lower = strtolower($trimmed);
                if ($lower === '1' || $lower === 'true' || $lower === 'yes' || $lower === 'on') {
                        return 1;
                }
                if ($lower === '0' || $lower === 'false' || $lower === 'no' || $lower === 'off') {
                        return 0;
                }
                if (is_numeric($trimmed)) {
                        return ((int)$trimmed !== 0) ? 1 : 0;
                }

                return $defaultValue;
        }

        private function normalizeStatus($value, $default)
        {
                $normalizedDefault = trim((string) $default);
                if ($normalizedDefault === '') {
                        $normalizedDefault = 'draft';
		}

		if ($value === null) {
			$trimmed = $normalizedDefault;
		} else {
			$trimmed = trim((string) $value);
			if ($trimmed === '') {
				$trimmed = $normalizedDefault;
			}
		}

		if ($trimmed === 'draft') {
			return 'draft';
		}

                if ($trimmed === 'review') {
                        $trimmed = 'active';
                }

		return htmlspecialchars($trimmed, ENT_QUOTES, "UTF-8");
	}



	private function normalizePriority($value, $default)
	{
		if ($value === null) {
			return $default;
		}

		$trimmed = trim($value);
		if ($trimmed === '') {
			return $default;
		}

		if (in_array($trimmed, $this->allowedPriority) == false) {
			return false;
		}

		return htmlspecialchars($trimmed, ENT_QUOTES, "UTF-8");
	}

	private function extractAssetKindFromPath($path)
	{
		if (!is_string($path)) {
			return null;
		}

		$trimmed = ltrim(trim($path), '/');
		if ($trimmed === '') {
			return null;
		}

		$segments = explode('/', $trimmed, 2);
		$candidate = $segments[0];

                return $candidate;
        }

	private function buildAssetUrl($ownerId, $assetKind, $storageFileName)
	{
		$normalizedOwnerId = trim((string) $ownerId);
		$normalizedAssetKind = trim((string) $assetKind, '/');
		$normalizedFileName = ltrim(trim((string) $storageFileName), '/');

		if ($normalizedOwnerId === '' || $normalizedAssetKind === '' || $normalizedFileName === '') {
			return null;
		}

		return '/userdata/' . $normalizedOwnerId . '/' . $normalizedAssetKind . '/' . $normalizedFileName;
	}
	
	private function fetchTargetAgreements($targetCode, $pdoTarget)
	{
		if ($targetCode === null || $targetCode === '') {
			return array();
		}

		

		$stmt = $pdoTarget->prepare(
											   'SELECT a.*, creator.displayName AS createdByDisplayName, updater.displayName AS updatedByDisplayName '
											   . 'FROM targetAgreements a '
											   . 'LEFT JOIN common.user creator ON a.createdByUserCode = creator.userCode '
											   . 'LEFT JOIN common.user updater ON a.updatedByUserCode = updater.userCode '
											   . 'WHERE a.targetCode = ? AND (a.isDeleted IS NULL OR a.isDeleted = 0) '
											   . 'ORDER BY a.displayOrder ASC, a.updatedAt DESC, a.createdAt DESC, a.id DESC'
											   );
		$stmt->execute(array($targetCode));
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$agreements = array();
		foreach ($rows as $row) {
			$payload = $this->buildAgreementPayload($row);
			if ($payload != null) {
				$agreements[] = $payload;
			}
		}

		return $agreements;
	}

        private function buildAgreementPayload($row)
        {
                if ($row == null) {
                        return null;
                }

		$agreementCode = isset($row['agreementCode']) ? trim($row['agreementCode']) : '';
		if ($agreementCode === '') {
			return null;
		}

		$targetCode = isset($row['targetCode']) ? $row['targetCode'] : null;

		$type = null;
                if (isset($row['agreementKind']) && $row['agreementKind'] !== null) {
                        $typeCandidate = trim($row['agreementKind']);
			if ($typeCandidate !== '') {
				$type = $typeCandidate;
			}
		}
		if ($type === null && isset($row['type']) && $row['type'] !== null) {
			$typeCandidate = trim($row['type']);
			if ($typeCandidate !== '') {
				$type = $typeCandidate;
			}
		}

		$title = isset($row['title']) ? $row['title'] : null;
		$content = isset($row['content']) ? $row['content'] : null;
		$notes = isset($row['notes']) ? $row['notes'] : null;
		$createdAt = isset($row['createdAt']) ? $row['createdAt'] : null;
		$updatedAt = isset($row['updatedAt']) ? $row['updatedAt'] : null;

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

		$displayOrder = 0;
		if (isset($row['displayOrder']) && $row['displayOrder'] !== null && $row['displayOrder'] !== '') {
			$displayOrder = (int)$row['displayOrder'];
		}

		return array(
					 'agreementCode' => $agreementCode,
					 'targetCode' => $targetCode,
					 'type' => $type,
					 'title' => $title,
					 'content' => $content,
					 'notes' => $notes,
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



        private function mapContentTypeToCategory($contentType)
        {
                if ($contentType === null) {
                        return 'document';
                }

                $normalized = strtolower(trim((string) $contentType));
                if ($normalized === '') {
                        return 'document';
                }

                if ($normalized === 'video' || strpos($normalized, 'video/') === 0) {
                        return 'video';
                }

                if ($normalized === 'image' || strpos($normalized, 'image/') === 0) {
                        return 'image';
                }

                if ($normalized === 'audio' || strpos($normalized, 'audio/') === 0) {
                        return 'audio';
                }

                return 'document';
        }
}

?>
