<?php

Base::requireFromShm('class/class.TargetManagementUtil.php');

class TargetManagementAnnouncements extends Base
{
	public function __construct($context)
	{
		parent::__construct($context);
	}

	protected function validationTargetAnnouncementList()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetAnnouncementCreate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['title']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['content']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetAnnouncementUpdate()
	{
		if (isset($this->params['id']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['title']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['content']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetAnnouncementDelete()
	{
		if (isset($this->params['id']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



        protected function validationTargetAnnouncementAcknowledge()
        {
                if (isset($this->params['id']) == false && isset($this->params['announcementCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['userCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



	protected function validationTargetAnnouncementRecipients()
	{
		if (isset($this->params['id']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	public function procTargetAnnouncementList()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		if ($targetCode === '') {
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

		$payload = $this->loadTargetAnnouncementCollections($targetRow);
		$this->response = array(
								'announcements' => isset($payload['announcements']) ? $payload['announcements'] : array(),
								'acknowledgements' => isset($payload['acknowledgements']) ? $payload['acknowledgements'] : array(),
								);
		$this->refreshTargetAnnouncementSessionToken();
	}



	public function procTargetAnnouncementCreate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		if ($targetCode === '') {
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

		$title = Util::normalizeRequiredString($this->params['title'], 256);
		if ($title === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$content = Util::normalizeRequiredString($this->params['content'], 4000);
		if ($content === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$creatorUserCode = $this->getLoginUserCode();
		if ($creatorUserCode === null || $creatorUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		if ($this->canManageTargetAnnouncements($targetRow, $creatorUserCode) == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		
		$pdo = $this->getPDOTarget();
		$now = date('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

			$displayStmt = $pdo->prepare('SELECT COALESCE(MAX(displayOrder), 0) FROM targetAnnouncements WHERE targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0)');
			$displayStmt->execute(array($targetCode));
			$displayOrder = ((int)$displayStmt->fetchColumn()) + 1;

			$announcementCode = $this->generateUniqid();
			$insertStmt = $pdo->prepare(
										'INSERT INTO targetAnnouncements (announcementCode, targetCode, title, content, createdByUserCode, createdAt, updatedAt, displayOrder, isDeleted) '
										. 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)'
										);
			$insertStmt->execute(array(
									   $announcementCode,
									   $targetCode,
									   $title,
									   $content,
									   $creatorUserCode,
									   $now,
									   $now,
									   $displayOrder
									   ));

			$announcementId = (int)$pdo->lastInsertId();
			$pdo->commit();
		} catch (Exception $exception) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$announcementRow = $this->fetchTargetAnnouncementById($announcementId);
		if ($announcementRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
		$assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();
		$payload = $this->buildTargetAnnouncementPayload($announcementRow, $targetRow, $assignedUsers, array());

		$this->response = $payload !== null ? $payload : array();
		$this->refreshTargetAnnouncementSessionToken();
	}



	public function procTargetAnnouncementUpdate()
	{
		$announcementId = $this->filterTargetAnnouncementId($this->params['id']);
		if ($announcementId === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		if ($targetCode === '') {
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

		$announcementRow = $this->fetchTargetAnnouncementById($announcementId);
		if ($announcementRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$announcementTargetCode = isset($announcementRow['targetCode']) ? trim((string)$announcementRow['targetCode']) : '';
		if ($announcementTargetCode !== '' && $announcementTargetCode !== $targetCode) {
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

		$content = Util::normalizeRequiredString($this->params['content'], 4000);
		if ($content === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$updaterUserCode = $this->getLoginUserCode();
		if ($updaterUserCode === null || $updaterUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		if ($this->canManageTargetAnnouncements($targetRow, $updaterUserCode) == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		
		$pdo = $this->getPDOTarget();
		$now = date('Y-m-d H:i:s');

		try {
			$stmt = $pdo->prepare('UPDATE targetAnnouncements SET title = ?, content = ?, updatedAt = ? WHERE id = ?');
			$stmt->execute(array($title, $content, $now, $announcementId));
		} catch (Exception $exception) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$updatedRow = $this->fetchTargetAnnouncementById($announcementId);
		if ($updatedRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
		$assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();
		$acknowledgements = $this->fetchTargetAnnouncementAcknowledgements(array($announcementId));
		$ackLookup = $this->indexTargetAnnouncementAcknowledgements($acknowledgements);
		$payload = $this->buildTargetAnnouncementPayload($updatedRow, $targetRow, $assignedUsers, $ackLookup);

		$this->response = $payload !== null ? $payload : array();
		$this->refreshTargetAnnouncementSessionToken();
	}



	public function procTargetAnnouncementDelete()
	{
		$announcementId = $this->filterTargetAnnouncementId($this->params['id']);
		if ($announcementId === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$announcementRow = $this->fetchTargetAnnouncementById($announcementId);
		if ($announcementRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$targetCode = isset($announcementRow['targetCode']) ? trim((string)$announcementRow['targetCode']) : '';
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$loginUserCode = $this->getLoginUserCode();
		if ($loginUserCode === null || $loginUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		if ($this->canManageTargetAnnouncements($targetRow, $loginUserCode) == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		
		$pdo = $this->getPDOTarget();
		$now = date('Y-m-d H:i:s');

		try {
			$stmt = $pdo->prepare('UPDATE targetAnnouncements SET isDeleted = 1, updatedAt = ? WHERE id = ?');
			$stmt->execute(array($now, $announcementId));
		} catch (Exception $exception) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->response = array('deleted' => true);
		$this->refreshTargetAnnouncementSessionToken();
	}



        public function procTargetAnnouncementAcknowledge()
        {
                $announcementId = null;
                if (isset($this->params['id'])) {
                        $announcementId = $this->filterTargetAnnouncementId($this->params['id']);
                }

                if ($announcementId === null && isset($this->params['announcementCode'])) {
                        $code = trim((string)$this->params['announcementCode']);
                        if ($code !== '') {
                                $announcementId = $this->fetchTargetAnnouncementIdByCode($code);
                        }
                }

                if ($announcementId === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
			return;
		}

		$userCodeRaw = isset($this->params['userCode']) ? $this->params['userCode'] : '';
		$userCode = trim((string)$userCodeRaw);
		if ($userCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$announcementRow = $this->fetchTargetAnnouncementById($announcementId);
		if ($announcementRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$targetCode = isset($announcementRow['targetCode']) ? trim((string)$announcementRow['targetCode']) : '';
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$loginUserCode = $this->getLoginUserCode();
		if ($loginUserCode === null || $loginUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		$normalizedLogin = $this->normalizeUserCodeValue($loginUserCode);
		$normalizedTarget = $this->normalizeUserCodeValue($userCode);
		$canManage = $this->canManageTargetAnnouncements($targetRow, $loginUserCode);

		if ($canManage == false) {
			if ($normalizedLogin === '' || $normalizedLogin !== $normalizedTarget) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}
		}

		$userInfo = $this->getUserInfo($userCode);
		if ($userInfo == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$acknowledgedAt = null;
		if (array_key_exists('acknowledgedAt', $this->params)) {
			$timestampValue = Util::normalizeOptionalString($this->params['acknowledgedAt'], 64);
			if ($timestampValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$acknowledgedAt = $timestampValue;
		}

		
		$pdo = $this->getPDOTarget();

		try {
			if ($acknowledgedAt === null) {
				$stmt = $pdo->prepare('DELETE FROM targetAnnouncementAcknowledgements WHERE targetAnnouncementId = ? AND userCode = ?');
				$stmt->execute(array($announcementId, $userCode));
				$this->response = array('acknowledgedAt' => null);
			} else {
				$stmt = $pdo->prepare(
									  'INSERT INTO targetAnnouncementAcknowledgements (targetAnnouncementId, userCode, acknowledgedAt) '
									  . 'VALUES (?, ?, ?) '
									  . 'ON CONFLICT(targetAnnouncementId, userCode) DO UPDATE SET acknowledgedAt = excluded.acknowledgedAt'
									  );
				$stmt->execute(array($announcementId, $userCode, $acknowledgedAt));
				$this->response = array('acknowledgedAt' => $acknowledgedAt);
			}
		} catch (Exception $exception) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'database';
			return;
		}

		$this->refreshTargetAnnouncementSessionToken();
	}



        public function procTargetAnnouncementRecipients()
        {
                $announcementId = null;
                if (isset($this->params['id'])) {
                        $announcementId = $this->filterTargetAnnouncementId($this->params['id']);
                }

                if ($announcementId === null && isset($this->params['announcementCode'])) {
                        $code = trim((string)$this->params['announcementCode']);
                        if ($code !== '') {
                                $announcementId = $this->fetchTargetAnnouncementIdByCode($code);
                        }
                }

                if ($announcementId === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
			return;
		}

		$status = 'all';
		if (isset($this->params['status'])) {
			$candidate = strtolower(trim((string)$this->params['status']));
			if ($candidate === 'acknowledged' || $candidate === 'unacknowledged' || $candidate === 'all') {
				$status = $candidate;
			}
		}

		$announcementRow = $this->fetchTargetAnnouncementById($announcementId);
		if ($announcementRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$targetCode = isset($announcementRow['targetCode']) ? trim((string)$announcementRow['targetCode']) : '';
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
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

		$assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
		$assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();

		$acknowledgements = $this->fetchTargetAnnouncementAcknowledgements(array($announcementId));
		$ackLookup = $this->indexTargetAnnouncementAcknowledgements($acknowledgements);
		$announcementKey = (string)$announcementId;
		$recipientAck = isset($ackLookup[$announcementKey]) ? $ackLookup[$announcementKey] : array();
		$recipients = $this->buildTargetAnnouncementRecipients($targetRow, $assignedUsers, $recipientAck);

		if ($status === 'acknowledged') {
			$recipients = array_values(array_filter($recipients, function ($recipient) {
						return isset($recipient['acknowledgedAt']) && $recipient['acknowledgedAt'] !== null && $recipient['acknowledgedAt'] !== '';
					}));
		} elseif ($status === 'unacknowledged') {
			$recipients = array_values(array_filter($recipients, function ($recipient) {
						return empty($recipient['acknowledgedAt']);
					}));
		}

		$this->response = array('recipients' => $recipients);
		$this->refreshTargetAnnouncementSessionToken();
	}




	private function resolveTargetAnnouncementAuthClaims(): ?array
	{
		$payload = $this->getAuthPayload();
		if (!is_array($payload) || empty($payload)) {
			try {
				$payload = $this->requireAuth();
			} catch (\Throwable $throwable) {
				$this->logTargetAnnouncementTokenError(
													   '[WARN] Failed to load auth payload while resolving target announcement claims',
													   array('exception' => $throwable)
													   );
				$payload = null;
			}
		}

		$userId = isset($payload['userId']) ? (int)$payload['userId'] : 0;
		if ($userId <= 0 && isset($this->session['userId'])) {
			$userId = (int)$this->session['userId'];
		}

		if ($userId <= 0) {
			$missingIdentifiers = array('userId');
			$this->logTargetAnnouncementTokenError(
												   sprintf('[WARN] Target announcement auth claims unavailable; missing identifiers: %s', implode(', ', $missingIdentifiers)),
												   array(
														 'payloadUserId' => isset($payload['userId']) ? $payload['userId'] : null,
														 'sessionUserId' => isset($this->session['userId']) ? $this->session['userId'] : null,
														 'payloadKeys' => is_array($payload) ? array_keys($payload) : array(),
														 )
												   );
			return null;
		}

		$isSupervisor = !empty($payload['isSupervisor']) || !empty($this->session['isSupervisor']);
		$isOperator = !empty($payload['isOperator']) || !empty($this->session['isOperator']);

		$claims = array(
                        'userId' => $userId,
                        'isSupervisor' => $isSupervisor ? 1 : 0,
                        'isOperator' => $isOperator ? 1 : 0,
						);

		$userId = null;
		if (isset($payload['userId'])) {
			$userId = trim((string)$payload['userId']);
		}
		if ($userId === null || $userId === '') {
			if (isset($this->session['userId'])) {
				$userId = trim((string)$this->session['userId']);
			}
		}
		if ($userId !== null && $userId !== '') {
			$claims['userId'] = $userId;
		}

		return $claims;
	}

	private function issueTargetAnnouncementAuthToken(array $claims): ?string
	{
		try {
			$token = $this->issueJwt($claims);
			$this->setAuthPayload($claims);
			$this->syncSessionWithAuthPayload($claims, true);
			$this->setAuthTokenCookie($token, self::AUTH_TOKEN_TTL);
			return $token;
		} catch (\Throwable $throwable) {
			$this->logTargetAnnouncementTokenError(
												   '[ERROR] Failed to issue target announcement auth token',
												   array('exception' => $throwable, 'claims' => $claims)
												   );
			throw $throwable;
		}
	}

	private function refreshTargetAnnouncementSessionToken(): void
	{
		$claims = $this->resolveTargetAnnouncementAuthClaims();
		if ($claims === null) {
			$this->logTargetAnnouncementTokenError(
												   '[ERROR] Target announcement auth claims unavailable; aborting token refresh'
												   );
			throw new RuntimeException('Failed to resolve target announcement auth claims for session token refresh');
		}

		$token = $this->issueTargetAnnouncementAuthToken($claims);
		if (!is_string($token) || $token === '') {
			$this->logTargetAnnouncementTokenError(
												   '[ERROR] Issued an empty target announcement auth token',
												   array('claims' => $claims)
												   );
			throw new RuntimeException('Failed to issue target announcement session token');
		}

		$this->setSessionResponse(array('token' => $token));
		$this->injectTokenIntoResponse($token);
	}

	private function logTargetAnnouncementTokenError($message, array $context = array()): void
	{
		$requestType = $this->type !== null ? $this->type : '(none)';
		$payload = array(
						 'handler' => static::class,
						 'requestType' => $requestType,
						 'message' => $message,
						 );

		if (isset($context['exception']) && $context['exception'] instanceof \Throwable) {
			/** @var \Throwable $exception */
			$exception = $context['exception'];
			$payload['exception'] = array(
										  'class' => get_class($exception),
										  'message' => $exception->getMessage(),
										  'file' => $exception->getFile(),
										  'line' => $exception->getLine(),
										  );
			unset($context['exception']);
		}

		if (!empty($context)) {
			$payload['context'] = $context;
		}

		$encoded = json_encode($payload);
		if ($encoded === false) {
			$encoded = '[TargetManagement-Announcements] ' . $message;
		}

		Base::writeLog($encoded, 'target-management');
	}

	private function loadTargetAnnouncementCollections($targetRow)
	{
		if ($targetRow == null || !is_array($targetRow)) {
			return array('announcements' => array(), 'acknowledgements' => array());
		}

		$targetCode = isset($targetRow['targetCode']) ? trim((string)$targetRow['targetCode']) : '';
		if ($targetCode === '') {
			return array('announcements' => array(), 'acknowledgements' => array());
		}

		
		$pdo = $this->getPDOTarget();

		$stmt = $pdo->prepare(
							  'SELECT id, announcementCode, targetCode, title, content, createdByUserCode, createdAt, updatedAt, displayOrder '
							  . 'FROM targetAnnouncements WHERE targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0) '
							  . 'ORDER BY displayOrder ASC, datetime(createdAt) DESC, id DESC'
							  );
		$stmt->execute(array($targetCode));
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$announcementIds = array();
		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}
			$id = isset($row['id']) ? (int)$row['id'] : 0;
			if ($id > 0) {
				$announcementIds[] = $id;
			}
		}

		$acknowledgements = $this->fetchTargetAnnouncementAcknowledgements($announcementIds);
		$ackLookup = $this->indexTargetAnnouncementAcknowledgements($acknowledgements);

		$assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
		$assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();

		$announcements = array();
		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}
			$payload = $this->buildTargetAnnouncementPayload($row, $targetRow, $assignedUsers, $ackLookup);
			if ($payload !== null) {
				$announcements[] = $payload;
			}
		}

		return array('announcements' => $announcements, 'acknowledgements' => $acknowledgements);
	}



	private function fetchTargetAnnouncementById($announcementId)
	{
		if ($announcementId === null) {
			return null;
		}

		$id = (int)$announcementId;
		if ($id <= 0) {
			return null;
		}

		
		$pdo = $this->getPDOTarget();
		$stmt = $pdo->prepare(
							  'SELECT id, announcementCode, targetCode, title, content, createdByUserCode, createdAt, updatedAt, displayOrder, isDeleted '
							  . 'FROM targetAnnouncements WHERE id = ? LIMIT 1'
							  );
		$stmt->execute(array($id));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($row == false) {
			return null;
		}

		if (isset($row['isDeleted']) && (int)$row['isDeleted'] !== 0) {
			return null;
		}

		return $row;
	}



        private function filterTargetAnnouncementId($value)
        {
                $options = array('options' => array('min_range' => 1));
                $id = filter_var($value, FILTER_VALIDATE_INT, $options);
                if ($id === false || $id === null) {
                        return null;
                }

                return (int)$id;
        }


        private function fetchTargetAnnouncementIdByCode($announcementCode)
        {
                $code = trim((string)$announcementCode);
                if ($code === '') {
                        return null;
                }

                $stmt = $this->getPDOTarget()->prepare('SELECT id FROM targetAnnouncements WHERE announcementCode = ? AND (isDeleted IS NULL OR isDeleted = 0) LIMIT 1');
                $stmt->execute(array($code));

                $id = $stmt->fetchColumn();
                if ($id === false || $id === null) {
                        return null;
                }

                return (int)$id;
        }



	private function fetchTargetAnnouncementAcknowledgements($announcementIds)
	{
		$list = array();
		if (!is_array($announcementIds) || count($announcementIds) === 0) {
			return $list;
		}

		$ids = array();
		foreach ($announcementIds as $id) {
			$intId = (int)$id;
			if ($intId > 0) {
				$ids[] = $intId;
			}
		}

		if (count($ids) === 0) {
			return $list;
		}

		$placeholders = implode(', ', array_fill(0, count($ids), '?'));
		$stmt = $this->getPDOTarget()->prepare(
											   'SELECT targetAnnouncementId, userCode, acknowledgedAt FROM targetAnnouncementAcknowledgements '
											   . 'WHERE targetAnnouncementId IN (' . $placeholders . ')'
											   );
		$stmt->execute($ids);

		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			if (!is_array($row)) {
				continue;
			}
			$announcementId = isset($row['targetAnnouncementId']) ? (int)$row['targetAnnouncementId'] : 0;
			if ($announcementId <= 0) {
				continue;
			}
			$userCode = isset($row['userCode']) ? trim((string)$row['userCode']) : '';
			if ($userCode === '') {
				continue;
			}
			$ackAt = isset($row['acknowledgedAt']) ? Util::normalizeTimestampValue($row['acknowledgedAt']) : null;
			$list[] = array(
							'announcementId' => (string)$announcementId,
							'userCode' => $userCode,
							'acknowledgedAt' => $ackAt,
							);
		}

		return $list;
	}



        private function indexTargetAnnouncementAcknowledgements($acknowledgements)
        {
                $lookup = array();
                if (!is_array($acknowledgements)) {
                        return $lookup;
		}

		foreach ($acknowledgements as $ack) {
			if (!is_array($ack)) {
				continue;
			}
			$announcementId = isset($ack['announcementId']) ? (string)$ack['announcementId'] : '';
			if ($announcementId === '') {
				continue;
			}
			$userCode = isset($ack['userCode']) ? trim((string)$ack['userCode']) : '';
			if ($userCode === '') {
				continue;
			}
			$normalized = $this->normalizeUserCodeValue($userCode);
			if ($normalized === '') {
				continue;
			}
			if (isset($lookup[$announcementId]) == false) {
				$lookup[$announcementId] = array();
			}
			$lookup[$announcementId][$normalized] = array(
														  'userCode' => $userCode,
														  'acknowledgedAt' => isset($ack['acknowledgedAt']) ? $ack['acknowledgedAt'] : null,
														  );
		}

                return $lookup;
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



        private function buildTargetAnnouncementPayload($row, $targetRow, $assignedUserCodes, $ackLookup)
        {
                if (!is_array($row)) {
                        return null;
                }

		$announcementId = isset($row['id']) ? (int)$row['id'] : 0;
		if ($announcementId <= 0) {
			return null;
		}
		$announcementKey = (string)$announcementId;

		$targetCode = isset($row['targetCode']) ? trim((string)$row['targetCode']) : '';
		$title = isset($row['title']) ? $row['title'] : '';
		$content = isset($row['content']) ? $row['content'] : '';
		$createdAt = isset($row['createdAt']) ? Util::normalizeTimestampValue($row['createdAt']) : null;
		$updatedAt = isset($row['updatedAt']) ? Util::normalizeTimestampValue($row['updatedAt']) : null;
		$displayOrder = isset($row['displayOrder']) ? (int)$row['displayOrder'] : 0;

		$creatorUserCode = isset($row['createdByUserCode']) ? trim((string)$row['createdByUserCode']) : '';
		$creatorSummary = $this->resolveActivityActorSummary($creatorUserCode);
		$creatorName = isset($creatorSummary[1]) ? $creatorSummary[1] : ($creatorUserCode !== '' ? $creatorUserCode : '');

		$ackEntries = isset($ackLookup[$announcementKey]) ? $ackLookup[$announcementKey] : array();
		$recipients = $this->buildTargetAnnouncementRecipients($targetRow, $assignedUserCodes, $ackEntries);

		$targetTitle = isset($targetRow['title']) ? $targetRow['title'] : (isset($targetRow['name']) ? $targetRow['name'] : '');
		$targetSummary = isset($targetRow['description']) ? $targetRow['description'] : '';

		return array(
					 'id' => $announcementKey,
					 'announcementCode' => isset($row['announcementCode']) ? $row['announcementCode'] : $announcementKey,
					 'targetCode' => $targetCode,
					 'targetTitle' => $targetTitle,
					 'targetSummary' => $targetSummary,
					 'title' => $title,
					 'content' => $content,
					 'createdAt' => $createdAt,
					 'updatedAt' => $updatedAt,
					 'displayOrder' => $displayOrder,
					 'createdByUserCode' => $creatorUserCode,
					 'createdByDisplayName' => $creatorName,
					 'createdByUserDisplayName' => $creatorName,
					 'recipients' => $recipients,
					 'recipientCount' => count($recipients),
					 );
	}



	private function buildTargetAnnouncementRecipients($targetRow, $assignedUserCodes, $ackEntries)
	{
		$recipientMap = array();
		$assigned = is_array($assignedUserCodes) ? $assignedUserCodes : array();

                foreach ($assigned as $code) {
                        $resolvedCode = $this->resolveAssignedUserCode($code);
                        if ($resolvedCode === null) {
                                continue;
                        }

                        $trimmed = trim((string)$resolvedCode);
                        if ($trimmed === '') {
                                continue;
                        }
			$normalized = $this->normalizeUserCodeValue($trimmed);
			if ($normalized === '') {
				continue;
			}
			if (isset($recipientMap[$normalized]) == false) {
				$recipientMap[$normalized] = $trimmed;
			}
		}

		if (is_array($targetRow)) {
			if (isset($targetRow['assignedUserCode'])) {
				$assignedCode = trim((string)$targetRow['assignedUserCode']);
				if ($assignedCode !== '') {
					$normalized = $this->normalizeUserCodeValue($assignedCode);
					if ($normalized !== '' && isset($recipientMap[$normalized]) == false) {
						$recipientMap[$normalized] = $assignedCode;
					}
				}
			}
			if (isset($targetRow['createdByUserCode'])) {
				$creatorCode = trim((string)$targetRow['createdByUserCode']);
				if ($creatorCode !== '') {
					$normalized = $this->normalizeUserCodeValue($creatorCode);
					if ($normalized !== '' && isset($recipientMap[$normalized]) == false) {
						$recipientMap[$normalized] = $creatorCode;
					}
				}
			}
		}

		if (is_array($ackEntries)) {
			foreach ($ackEntries as $normalized => $ack) {
				if ($normalized === '') {
					continue;
				}
				if (isset($ack['userCode'])) {
					$code = trim((string)$ack['userCode']);
					if ($code !== '' && isset($recipientMap[$normalized]) == false) {
						$recipientMap[$normalized] = $code;
					}
				}
			}
		}

		$recipients = array();
		foreach ($recipientMap as $normalized => $code) {
			$ack = isset($ackEntries[$normalized]) ? $ackEntries[$normalized] : null;
			$recipient = $this->buildTargetAnnouncementRecipientPayload($targetRow, $code, $ack);
			if ($recipient !== null) {
				$recipients[] = $recipient;
			}
		}

                usort($recipients, function ($a, $b) {
                                $nameA = isset($a['displayName']) ? $a['displayName'] : '';
                                $nameB = isset($b['displayName']) ? $b['displayName'] : '';
                                $codeA = isset($a['userCode']) ? $a['userCode'] : '';
                                $codeB = isset($b['userCode']) ? $b['userCode'] : '';

				$keyA = $nameA !== '' ? $nameA : $codeA;
				$keyB = $nameB !== '' ? $nameB : $codeB;

				return strcmp($keyA, $keyB);
			});

                return $recipients;
        }



        private function resolveAssignedUserCode($assigned)
        {
                if (is_array($assigned)) {
                        return isset($assigned['userCode']) ? $assigned['userCode'] : null;
                }

                return $assigned;
        }


        private function buildTargetAnnouncementRecipientPayload($targetRow, $userCode, $ack)
        {
                $resolvedCode = trim((string)$userCode);
                if ($resolvedCode === '') {
                        return null;
		}

		$userInfo = $this->getUserInfo($resolvedCode);
		$displayName = ($userInfo != null && isset($userInfo['displayName']) && $userInfo['displayName'] !== '')
			? $userInfo['displayName']
			: $resolvedCode;

		$role = $this->resolveTargetAnnouncementRecipientRole($targetRow, $resolvedCode);

		$acknowledgedAt = null;
		if (is_array($ack) && isset($ack['acknowledgedAt']) && $ack['acknowledgedAt'] !== null && $ack['acknowledgedAt'] !== '') {
			$acknowledgedAt = $ack['acknowledgedAt'];
		}

		$payload = array(
						 'userCode' => $resolvedCode,
						 'displayName' => $displayName,
						 'role' => $role,
						 'acknowledgedAt' => $acknowledgedAt,
						 );

		if ($acknowledgedAt !== null && $acknowledgedAt !== '') {
			$payload['acknowledgedAtDisplay'] = $acknowledgedAt;
                }

                return $payload;
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



        private function normalizeUserCodeValue($value)
        {
                if ($value === null) {
                        return '';
                }

                $trimmed = trim((string)$value);
                if ($trimmed === '') {
                        return '';
                }

                return strtolower($trimmed);
        }




	private function resolveTargetAnnouncementRecipientRole($targetRow, $userCode)
	{
		$normalizedUser = trim((string)$userCode);
		if ($normalizedUser === '') {
			return 'participant';
		}

		if (is_array($targetRow) && isset($targetRow['createdByUserCode'])) {
			$creatorCode = trim((string)$targetRow['createdByUserCode']);
			if ($creatorCode !== '' && strcasecmp($creatorCode, $normalizedUser) === 0) {
				return 'coach';
			}
		}

		return 'participant';
	}



	private function canManageTargetAnnouncements($targetRow, $userCode)
	{
		$resolvedCode = trim((string)$userCode);
		if ($resolvedCode === '') {
			return false;
		}

		if ($this->isSupervisor() || $this->isOperator()) {
			return true;
		}

		if (is_array($targetRow) && isset($targetRow['createdByUserCode'])) {
			$creatorCode = trim((string)$targetRow['createdByUserCode']);
			if ($creatorCode !== '' && strcasecmp($creatorCode, $resolvedCode) === 0) {
				return true;
			}
		}

		return false;
	}

}

?>
