<?php

class AnnouncementManagement extends Base
{
	private $validatedAnnouncementId;
	private $validatedTitle;
	private $validatedContent;
	private $validatedAudienceScope;
	private $validatedAudienceUserCodes;
	private $ackUserCode;
	private $ackTimestamp;
	private $recipientStatusFilter;
	private $announcementsSchemaEnsured;
	private $recipientsSchemaEnsured;

	public function __construct($context)
	{
		$this->validatedAnnouncementId = null;
		$this->validatedTitle = null;
		$this->validatedContent = null;
		$this->validatedAudienceScope = 'all';
		$this->ackUserCode = null;
		$this->ackTimestamp = null;
		$this->recipientStatusFilter = 'all';
		$this->announcementsSchemaEnsured = false;
		$this->validatedAudienceUserCodes = array();
		$this->recipientsSchemaEnsured = false;
		parent::__construct($context);
	}

	protected function validationAnnouncementList()
	{
		$this->ensureLoggedIn();
	}

	protected function procAnnouncementList()
	{
		try {
			$pageRaw = $this->getSafeParam('page', '1');
			$perPageRaw = $this->getSafeParam('perPage', '');

			$page = (int) filter_var($pageRaw, FILTER_VALIDATE_INT, array('options' => array('min_range' => 1)));
			if ($page < 1) {
				$page = 1;
			}

			$perPage = (int) filter_var($perPageRaw, FILTER_VALIDATE_INT, array('options' => array('min_range' => 1)));
			if ($perPage < 1) {
				$perPage = 25;
			}

			$maxPerPage = 100;
			if ($perPage > $maxPerPage) {
				$perPage = $maxPerPage;
			}

			$offset = ($page - 1) * $perPage;

			$pdo = $this->getPDOCommon();
			$this->ensureAnnouncementsSchema($pdo);
			$announcementResult = $this->fetchAnnouncements($pdo, $perPage, $offset);
			$announcements = isset($announcementResult['items']) ? $announcementResult['items'] : array();
			$totalCount = isset($announcementResult['totalCount']) ? (int) $announcementResult['totalCount'] : 0;

			if (count($announcements) === 0 || $perPage < 1) {
				$acknowledgements = array();
			} else {
				$acknowledgements = $this->fetchAcknowledgements($pdo, $perPage, $offset);
			}

			$totalPages = 0;
			if ($perPage > 0 && $totalCount > 0) {
				$totalPages = (int) ceil($totalCount / $perPage);
			}

			$hasNextPage = $totalPages > 0 && $page < $totalPages;
			$hasPreviousPage = $page > 1;

			$nextPage = $hasNextPage ? $page + 1 : null;
			if ($nextPage !== null && $totalPages > 0 && $nextPage > $totalPages) {
				$nextPage = null;
			}

			$previousPage = $hasPreviousPage ? $page - 1 : null;

			$this->response = array(
									'announcements' => $announcements,
									'acknowledgements' => $acknowledgements,
									'pagination' => array(
														  'page' => $page,
														  'perPage' => $perPage,
														  'totalCount' => $totalCount,
														  'totalPages' => $totalPages,
														  'hasNextPage' => $hasNextPage ? 1 : 0,
														  'hasPreviousPage' => $hasPreviousPage ? 1 : 0,
														  'nextPage' => $nextPage,
														  'previousPage' => $previousPage,
														  ),
									);
			$this->status = self::RESULT_SUCCESS;
			$this->refreshAnnouncementSessionToken();
		} catch (PDOException $exception) {
			$this->status = self::RESULT_ERROR;
			$this->errorReason = 'database_error';
			$this->response = array(
									'message' => 'お知らせ情報を取得できませんでした。',
									'details' => $exception->getMessage(),
									);
		}
	}

	protected function validationAnnouncementCreate()
	{
		$this->ensureSupervisorAccess();
		$this->requireParams(array('title', 'content'));

		$title = $this->sanitizeText($this->params['title']);
		$content = $this->sanitizeText($this->params['content']);
		$scope = isset($this->params['audienceScope']) ? $this->normalizeAudienceScope($this->params['audienceScope']) : 'all';

		if ($title === '') {
			throw new Exception('タイトルを入力してください。');
		}
		if ($content === '') {
			throw new Exception('内容を入力してください。');
		}

		$this->validatedAnnouncementId = null;
		$this->validatedTitle = $title;
		$this->validatedContent = $content;
		$this->validatedAudienceScope = $scope;
		$this->validatedAudienceUserCodes = $scope === 'custom' ? $this->collectAudienceUserCodesFromParams() : array();

		if ($this->validatedAudienceScope === 'custom' && count($this->validatedAudienceUserCodes) === 0) {
			throw new Exception('対象ユーザーを選択してください。');
		}
	}

	protected function procAnnouncementCreate()
	{
		try {
			$pdo = $this->getPDOCommon();
			$this->ensureAnnouncementsSchema($pdo);
			$pdo->beginTransaction();

			$code = $this->generateAnnouncementCode($pdo);
			$now = $this->currentTimestamp();
			$creatorUserCode = $this->requireCurrentUserCode();

			$stmt = $pdo->prepare(
								  'INSERT INTO announcements (announcementCode, title, content, audienceScope, createdByUserCode, createdAt, updatedAt) VALUES (:code, :title, :content, :audienceScope, :createdByUserCode, :createdAt, :updatedAt)'
								  );
			$stmt->execute(array(
								 ':code' => $code,
								 ':title' => $this->validatedTitle,
								 ':content' => $this->validatedContent,
								 ':audienceScope' => $this->validatedAudienceScope,
								 ':createdByUserCode' => $creatorUserCode,
								 ':createdAt' => $now,
								 ':updatedAt' => $now,
								 ));

			$id = (int) $pdo->lastInsertId();
			$this->ensureAnnouncementRecipientsSchema($pdo);
			$this->replaceAnnouncementRecipients(
												 $pdo,
												 $id,
												 $this->validatedAudienceScope === 'custom' ? $this->validatedAudienceUserCodes : array()
												 );
			$pdo->commit();

			$announcement = $this->getAnnouncementById($pdo, $id);

			$this->response = $announcement ?: array();
			$this->status = self::RESULT_SUCCESS;
			$this->refreshAnnouncementSessionToken();
		} catch (Exception $exception) {
			if (isset($pdo) && $pdo->inTransaction()) {
				$pdo->rollBack();
			}
			throw $exception;
		}
	}

	protected function validationAnnouncementUpdate()
	{
		$this->ensureSupervisorAccess();
		$this->requireParams(array('id', 'title', 'content'));

		$id = $this->filterAnnouncementId($this->params['id']);
		if ($id === null) {
			throw new Exception('有効なお知らせIDを指定してください。');
		}

		$title = $this->sanitizeText($this->params['title']);
		$content = $this->sanitizeText($this->params['content']);
		$scope = isset($this->params['audienceScope']) ? $this->normalizeAudienceScope($this->params['audienceScope']) : 'all';

		if ($title === '') {
			throw new Exception('タイトルを入力してください。');
		}
		if ($content === '') {
			throw new Exception('内容を入力してください。');
		}

		$this->validatedAnnouncementId = $id;
		$this->validatedTitle = $title;
		$this->validatedContent = $content;
		$this->validatedAudienceScope = $scope;
		$this->validatedAudienceUserCodes = $scope === 'custom' ? $this->collectAudienceUserCodesFromParams() : array();

		if ($this->validatedAudienceScope === 'custom' && count($this->validatedAudienceUserCodes) === 0) {
			throw new Exception('対象ユーザーを選択してください。');
		}
	}

	protected function procAnnouncementUpdate()
	{
		try {
			$pdo = $this->getPDOCommon();
			$this->ensureAnnouncementsSchema($pdo);

			if ($this->announcementExists($pdo, $this->validatedAnnouncementId) === false) {
				throw new Exception('指定されたお知らせが見つかりませんでした。');
			}

			$stmt = $pdo->prepare(
								  'UPDATE announcements SET title = :title, content = :content, audienceScope = :audienceScope, updatedAt = :updatedAt WHERE id = :id'
								  );
			$stmt->execute(array(
								 ':title' => $this->validatedTitle,
								 ':content' => $this->validatedContent,
								 ':audienceScope' => $this->validatedAudienceScope,
								 ':updatedAt' => $this->currentTimestamp(),
								 ':id' => $this->validatedAnnouncementId,
								 ));

			$this->ensureAnnouncementRecipientsSchema($pdo);
			$this->replaceAnnouncementRecipients(
												 $pdo,
												 $this->validatedAnnouncementId,
												 $this->validatedAudienceScope === 'custom' ? $this->validatedAudienceUserCodes : array()
												 );

			$announcement = $this->getAnnouncementById($pdo, $this->validatedAnnouncementId);

			$this->response = $announcement ?: array();
			$this->status = self::RESULT_SUCCESS;
			$this->refreshAnnouncementSessionToken();
		} catch (PDOException $exception) {
			$this->status = self::RESULT_ERROR;
			$this->errorReason = 'database_error';
			$this->response = array(
									'message' => 'お知らせを更新できませんでした。',
									'details' => $exception->getMessage(),
									);
		}
	}

	protected function validationAnnouncementDelete()
	{
		$this->ensureSupervisorAccess();
		$this->requireParams(array('id'));

		$id = $this->filterAnnouncementId($this->params['id']);
		if ($id === null) {
			throw new Exception('有効なお知らせIDを指定してください。');
		}

		$this->validatedAnnouncementId = $id;
	}

	protected function procAnnouncementDelete()
	{
		try {
			$pdo = $this->getPDOCommon();
			$this->ensureAnnouncementsSchema($pdo);

			$stmt = $pdo->prepare('DELETE FROM announcements WHERE id = :id');
			$stmt->execute(array(':id' => $this->validatedAnnouncementId));

			$this->response = array('deleted' => $stmt->rowCount() > 0);
			$this->status = self::RESULT_SUCCESS;
			$this->refreshAnnouncementSessionToken();
		} catch (PDOException $exception) {
			$this->status = self::RESULT_ERROR;
			$this->errorReason = 'database_error';
			$this->response = array(
									'message' => 'お知らせを削除できませんでした。',
									'details' => $exception->getMessage(),
									);
		}
	}

	protected function validationAnnouncementAcknowledge()
	{
		$this->ensureLoggedIn();
		$this->requireParams(array('id', 'userCode'));

		$id = $this->filterAnnouncementId($this->params['id']);
		if ($id === null) {
			throw new Exception('有効なお知らせIDを指定してください。');
		}

		$userCode = $this->sanitizeText($this->params['userCode']);
		if ($userCode === '') {
			throw new Exception('ユーザーコードを指定してください。');
		}

		$ackTimestamp = null;
		if (isset($this->params['acknowledgedAt'])) {
			$ackTimestamp = $this->normalizeAcknowledgedAt($this->params['acknowledgedAt']);
		}

		$this->validatedAnnouncementId = $id;
		$this->ackUserCode = $userCode;
		$this->ackTimestamp = $ackTimestamp;

		if ($this->hasSupervisorAccess() === false) {
			$sessionUserCode = isset($this->session['userCode']) ? $this->session['userCode'] : '';
			$normalizedSession = $this->normalizeUserCode($sessionUserCode);
			$normalizedTarget = $this->normalizeUserCode($userCode);

			if ($normalizedSession === '' || $normalizedSession !== $normalizedTarget) {
				throw new Exception('permission denied');
			}
		}
	}

	protected function procAnnouncementAcknowledge()
	{
		try {
			$pdo = $this->getPDOCommon();

			if ($this->announcementExists($pdo, $this->validatedAnnouncementId) === false) {
				throw new Exception('指定されたお知らせが見つかりませんでした。');
			}

			if ($this->userExists($pdo, $this->ackUserCode) === false) {
				throw new Exception('指定されたユーザーが見つかりませんでした。');
			}

			if ($this->ackTimestamp === null) {
				$stmt = $pdo->prepare(
									  'DELETE FROM announcementAcknowledgements WHERE announcementId = :id AND userCode = :userCode'
									  );
				$stmt->execute(array(
									 ':id' => $this->validatedAnnouncementId,
									 ':userCode' => $this->ackUserCode,
									 ));

				$this->response = array('acknowledgedAt' => null);
			} else {
				$sql = 'INSERT INTO announcementAcknowledgements (announcementId, userCode, acknowledgedAt) ' .
					'VALUES (:id, :userCode, :acknowledgedAt) ' .
					'ON CONFLICT(announcementId, userCode) DO UPDATE SET acknowledgedAt = excluded.acknowledgedAt';
				$stmt = $pdo->prepare($sql);
				$stmt->execute(array(
									 ':id' => $this->validatedAnnouncementId,
									 ':userCode' => $this->ackUserCode,
									 ':acknowledgedAt' => $this->ackTimestamp,
									 ));

				$this->response = array('acknowledgedAt' => $this->ackTimestamp);
			}

			$this->status = self::RESULT_SUCCESS;
			$this->refreshAnnouncementSessionToken();
		} catch (PDOException $exception) {
			$this->status = self::RESULT_ERROR;
			$this->errorReason = 'database_error';
			$this->response = array(
									'message' => '確認状態を更新できませんでした。',
									'details' => $exception->getMessage(),
									);
		}
	}
	protected function validationAnnouncementRecipients()
	{
		$this->ensureSupervisorAccess();
		$this->requireParams(array('id'));

		$id = $this->filterAnnouncementId($this->params['id']);
		if ($id === null) {
			throw new Exception('有効なお知らせIDを指定してください。');
		}

		$status = 'all';
		if (isset($this->params['status'])) {
			$candidate = $this->toLowerString($this->sanitizeText($this->params['status']));
			if ($candidate === 'acknowledged' || $candidate === 'unacknowledged' || $candidate === 'all') {
				$status = $candidate;
			}
		}

		$this->validatedAnnouncementId = $id;
		$this->recipientStatusFilter = $status;
	}

	protected function procAnnouncementRecipients()
	{
		try {
			$pdo = $this->getPDOCommon();

			$announcement = $this->getAnnouncementById($pdo, $this->validatedAnnouncementId);
			if ($announcement === null) {
				throw new Exception('指定されたお知らせが見つかりませんでした。');
			}
			$audienceScope = isset($announcement['audienceScope']) ? $announcement['audienceScope'] : 'all';

			$acknowledgements = $this->fetchAcknowledgementsForAnnouncement($pdo, $this->validatedAnnouncementId);
			$ackLookup = array();
			foreach ($acknowledgements as $ack) {
				$normalized = $this->normalizeUserCode(isset($ack['userCode']) ? $ack['userCode'] : '');
				if ($normalized === '') {
					continue;
				}
				$ackLookup[$normalized] = array(
												'userCode' => $ack['userCode'],
												'acknowledgedAt' => $ack['acknowledgedAt'],
												);
			}

			$users = $this->fetchActiveUsers($pdo);
			$recipients = array();
			$seen = array();

			foreach ($users as $user) {
				$code = isset($user['userCode']) ? $user['userCode'] : '';
				$normalized = $this->normalizeUserCode($code);
				$ackInfo = $normalized !== '' && isset($ackLookup[$normalized]) ? $ackLookup[$normalized] : null;

				$recipients[] = array(
									  'userCode' => $code,
									  'displayName' => isset($user['displayName']) && $user['displayName'] !== '' ? $user['displayName'] : $code,
									  'role' => $this->deriveUserRoleLabel($user),
									  'acknowledgedAt' => $ackInfo ? $ackInfo['acknowledgedAt'] : null,
									  'isSupervisor' => isset($user['isSupervisor']) ? (int) $user['isSupervisor'] : 0,
									  'isOperator' => isset($user['isOperator']) ? (int) $user['isOperator'] : 0,
									  );

				if ($normalized !== '') {
					$seen[$normalized] = true;
				}
			}

			foreach ($ackLookup as $normalized => $ackInfo) {
				if (isset($seen[$normalized])) {
					continue;
				}

				$userCode = $ackInfo['userCode'];
				$recipients[] = array(
									  'userCode' => $userCode,
									  'displayName' => $userCode,
									  'role' => '―',
									  'acknowledgedAt' => $ackInfo['acknowledgedAt'],
									  'isSupervisor' => null,
									  'isOperator' => null,
									  );
			}

			if ($audienceScope === 'custom') {
				$audienceUsers = isset($announcement['audienceUsers']) ? $announcement['audienceUsers'] : array();
				foreach ($audienceUsers as $entry) {
					if (!is_array($entry)) {
						continue;
					}
					$userCode = isset($entry['userCode']) ? $entry['userCode'] : '';
					$normalized = $this->normalizeUserCode($userCode);
					if ($normalized === '' || isset($seen[$normalized])) {
						continue;
					}

					$recipients[] = array(
										  'userCode' => $userCode,
										  'displayName' => (isset($entry['displayName']) && $entry['displayName'] !== '') ? $entry['displayName'] : $userCode,
										  'role' => isset($entry['role']) ? $entry['role'] : '―',
										  'acknowledgedAt' => null,
										  'isSupervisor' => null,
										  'isOperator' => null,
										  );
					$seen[$normalized] = true;
				}
			}

			$customAudienceLookup = array();
			if ($audienceScope === 'custom') {
				$audienceUsers = isset($announcement['audienceUsers']) ? $announcement['audienceUsers'] : array();
				$customAudienceLookup = $this->buildCustomAudienceLookup($audienceUsers);
			}

			$filteredByAudience = $this->filterRecipientsByAudience($recipients, $audienceScope, $customAudienceLookup);
			$filtered = $this->filterRecipientsByStatus($filteredByAudience, $this->recipientStatusFilter);

			usort($filtered, function ($a, $b) {
					$nameA = $this->buildSortKey($a);
					$nameB = $this->buildSortKey($b);
					return strcmp($nameA, $nameB);
				});

			$this->response = array('recipients' => $filtered);
			$this->status = self::RESULT_SUCCESS;
			$this->refreshAnnouncementSessionToken();
		} catch (PDOException $exception) {
			$this->status = self::RESULT_ERROR;
			$this->errorReason = 'database_error';
			$this->response = array(
									'message' => '確認状況を取得できませんでした。',
									'details' => $exception->getMessage(),
									);
		}
	}

	private function resolveAnnouncementAuthClaims(): ?array
	{
		$payload = $this->getAuthPayload();
		if (!is_array($payload) || empty($payload)) {
			try {
				$payload = $this->requireAuth();
			} catch (\Throwable $throwable) {
				$this->logAnnouncementTokenError(
												 '[WARN] Failed to load auth payload while resolving announcement claims',
												 array('exception' => $throwable)
												 );
				$payload = null;
			}
		}

		$userId = isset($payload['userId']) ? (int) $payload['userId'] : 0;
		if ($userId <= 0 && isset($this->session['userId'])) {
			$userId = (int) $this->session['userId'];
		}

		if ($userId <= 0) {
			$missingIdentifiers = array('userId');
			$this->logAnnouncementTokenError(
											 sprintf('[WARN] Announcement auth claims unavailable; missing identifiers: %s', implode(', ', $missingIdentifiers)),
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

		return $claims;
	}

	private function issueAnnouncementAuthToken(array $claims): ?string
	{
		try {
			$token = $this->issueJwt($claims);
			$this->setAuthPayload($claims);
			$this->syncSessionWithAuthPayload($claims, true);
			$this->setAuthTokenCookie($token, self::AUTH_TOKEN_TTL);
			return $token;
		} catch (\Throwable $throwable) {
			$this->logAnnouncementTokenError(
											 '[ERROR] Failed to issue announcement auth token',
											 array('exception' => $throwable, 'claims' => $claims)
											 );
			throw $throwable;
		}
	}

	private function refreshAnnouncementSessionToken(): void
	{
		$claims = $this->resolveAnnouncementAuthClaims();
		if ($claims === null) {
			$this->logAnnouncementTokenError(
											 '[ERROR] Announcement auth claims unavailable; aborting token refresh'
											 );
			throw new RuntimeException('Failed to resolve announcement auth claims for session token refresh');
		}

		$token = $this->issueAnnouncementAuthToken($claims);
		if (!is_string($token) || $token === '') {
			$this->logAnnouncementTokenError(
											 '[ERROR] Issued an empty announcement auth token',
											 array('claims' => $claims)
											 );
			throw new RuntimeException('Failed to issue announcement session token');
		}

		$this->setSessionResponse(array('token' => $token));
		$this->injectTokenIntoResponse($token);
	}

	private function logAnnouncementTokenError($message, array $context = array()): void
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
			$encoded = '[AnnouncementManagement] ' . $message;
		}

		Base::writeLog($encoded, 'announcement-management');
	}

	private function ensureLoggedIn()
	{
		$isLoggedIn = !empty($this->session['userId']);
		if (!$isLoggedIn) {
			throw new Exception('login required');
		}
	}

	private function hasSupervisorAccess()
	{
		$groupCode = isset($this->session['groupCode']) ? $this->session['groupCode'] : null;
		$isSupervisor = !empty($this->session['isSupervisor']);
		if ($groupCode) {
			$groupKey = 'isSupervisor_' . $groupCode;
			if (!empty($this->session[$groupKey])) {
				$isSupervisor = true;
			}
		}

		return $isSupervisor;
	}

	private function ensureSupervisorAccess()
	{
		$this->ensureLoggedIn();

		if ($this->hasSupervisorAccess() === false) {
			throw new Exception('permission denied');
		}
	}

	private function fetchAnnouncements(PDO $pdo, $limit, $offset)
	{
		$countStmt = $pdo->query('SELECT COUNT(*) AS count FROM announcements');
		$countRow = $countStmt !== false ? $countStmt->fetch(PDO::FETCH_ASSOC) : false;
		$totalCount = 0;
		if ($countRow && isset($countRow['count'])) {
			$totalCount = (int) $countRow['count'];
		}

		if ($totalCount === 0) {
			return array('items' => array(), 'totalCount' => 0);
		}

		$stmt = $pdo->prepare(
							  'SELECT a.id, a.announcementCode, a.title, a.content, a.audienceScope, a.createdByUserCode, a.createdAt, a.updatedAt, '
							  . 'creator.displayName AS createdByDisplayName '
							  . 'FROM announcements a '
							  . 'LEFT JOIN user creator ON creator.userCode = a.createdByUserCode COLLATE NOCASE '
							  . 'ORDER BY datetime(a.createdAt) DESC, a.id DESC LIMIT :limit OFFSET :offset'
							  );
		$stmt->bindValue(':limit', (int) $limit, PDO::PARAM_INT);
		$stmt->bindValue(':offset', (int) $offset, PDO::PARAM_INT);
		$stmt->execute();

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
		$announcements = array();

		foreach ($rows as $row) {
			$announcements[] = $this->formatAnnouncementRow($row);
		}

		if (count($announcements) > 0) {
			$audienceMap = $this->loadAudienceUsersForAnnouncements($pdo, array_map(function ($item) {
						return isset($item['id']) ? (int) $item['id'] : 0;
					}, $announcements));

			foreach ($announcements as &$announcement) {
				$id = isset($announcement['id']) ? (int) $announcement['id'] : 0;
				if ($id > 0 && isset($audienceMap[$id])) {
					$announcement['audienceUsers'] = $audienceMap[$id];
				}
			}
			unset($announcement);
		}

		return array('items' => $announcements, 'totalCount' => $totalCount);
	}

	private function fetchAcknowledgements(PDO $pdo, $limit, $offset)
	{
		if ($limit < 1) {
			return array();
		}

		$countStmt = $pdo->prepare(
								   'WITH paged_announcements AS (
                                SELECT id FROM announcements ORDER BY datetime(createdAt) DESC, id DESC LIMIT :countLimit OFFSET :countOffset
                        )
                        SELECT COUNT(*) AS count
                        FROM announcementAcknowledgements aa
                        INNER JOIN paged_announcements pa ON pa.id = aa.announcementId'
								   );
		$countStmt->bindValue(':countLimit', (int) $limit, PDO::PARAM_INT);
		$countStmt->bindValue(':countOffset', (int) $offset, PDO::PARAM_INT);
		$countStmt->execute();
		$countRow = $countStmt->fetch(PDO::FETCH_ASSOC);
		$totalCount = 0;
		if ($countRow && isset($countRow['count'])) {
			$totalCount = (int) $countRow['count'];
		}

		if ($totalCount === 0) {
			return array();
		}

		$stmt = $pdo->prepare(
							  'WITH paged_announcements AS (
                                SELECT id FROM announcements ORDER BY datetime(createdAt) DESC, id DESC LIMIT :dataLimit OFFSET :dataOffset
                        )
                        SELECT aa.announcementId, aa.userCode, aa.acknowledgedAt
                        FROM announcementAcknowledgements aa
                        INNER JOIN paged_announcements pa ON pa.id = aa.announcementId
                        ORDER BY aa.announcementId ASC, datetime(aa.acknowledgedAt) ASC, aa.userCode ASC'
							  );
		$stmt->bindValue(':dataLimit', (int) $limit, PDO::PARAM_INT);
		$stmt->bindValue(':dataOffset', (int) $offset, PDO::PARAM_INT);
		$stmt->execute();

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
		$acknowledgements = array();

		foreach ($rows as $row) {
			$acknowledgements[] = array(
										'announcementId' => isset($row['announcementId']) ? (string) $row['announcementId'] : '',
										'userCode' => isset($row['userCode']) ? $row['userCode'] : '',
										'acknowledgedAt' => isset($row['acknowledgedAt']) ? $row['acknowledgedAt'] : null,
										);
		}

		return $acknowledgements;
	}

	private function sanitizeText($value)
	{
		if ($value === null) {
			return '';
		}

		return trim((string) $value);
	}

	private function filterAnnouncementId($value)
	{
		$options = array('options' => array('min_range' => 1));
		$id = filter_var($value, FILTER_VALIDATE_INT, $options);
		if ($id === false || $id === null) {
			return null;
		}

		return (int) $id;
	}

	private function generateAnnouncementCode(PDO $pdo)
	{
		$attempts = 0;
		do {
			$attempts++;
			$random = bin2hex(random_bytes(4));
			$code = 'announcement-' . date('YmdHis') . '-' . $random;

			$stmt = $pdo->prepare('SELECT COUNT(1) FROM announcements WHERE announcementCode = :code');
			$stmt->execute(array(':code' => $code));
			$exists = (int) $stmt->fetchColumn() > 0;
		} while ($exists && $attempts < 5);

		return $code;
	}

	private function currentTimestamp()
	{
		$now = new DateTimeImmutable('now');
		return $now->format('Y-m-d H:i:s');
	}

	private function getAnnouncementById(PDO $pdo, $id)
	{
		$stmt = $pdo->prepare(
							  'SELECT a.id, a.announcementCode, a.title, a.content, a.audienceScope, a.createdByUserCode, a.createdAt, a.updatedAt, '
							  . 'creator.displayName AS createdByDisplayName '
							  . 'FROM announcements a '
							  . 'LEFT JOIN user creator ON creator.userCode = a.createdByUserCode COLLATE NOCASE '
							  . 'WHERE a.id = :id LIMIT 1'
							  );
		$stmt->execute(array(':id' => $id));

		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row === false) {
			return null;
		}

		$announcement = $this->formatAnnouncementRow($row);
		$id = isset($announcement['id']) ? (int) $announcement['id'] : 0;
		if ($id > 0) {
			$audienceMap = $this->loadAudienceUsersForAnnouncements($pdo, array($id));
			if (isset($audienceMap[$id])) {
				$announcement['audienceUsers'] = $audienceMap[$id];
			}
		}

		return $announcement;
	}

	private function formatAnnouncementRow($row)
	{
		$createdByUserCode = isset($row['createdByUserCode']) ? $row['createdByUserCode'] : null;
		$createdByDisplayName = isset($row['createdByDisplayName']) ? $row['createdByDisplayName'] : null;

		if (($createdByDisplayName === null || $createdByDisplayName === '') && $createdByUserCode !== null && $createdByUserCode !== '') {
			$createdByDisplayName = $createdByUserCode;
		}

		return array(
					 'id' => isset($row['id']) ? (string) $row['id'] : '',
					 'announcementCode' => isset($row['announcementCode']) ? $row['announcementCode'] : '',
					 'title' => isset($row['title']) ? $row['title'] : '',
					 'content' => isset($row['content']) ? $row['content'] : '',
					 'audienceScope' => isset($row['audienceScope']) ? $this->normalizeAudienceScope($row['audienceScope']) : 'all',
					 'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
					 'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
					 'createdByUserCode' => $createdByUserCode !== null ? $createdByUserCode : '',
					 'createdByDisplayName' => $createdByDisplayName !== null ? $createdByDisplayName : '',
					 'audienceUsers' => array(),
					 'recipients' => array(),
					 );
	}

	private function announcementExists(PDO $pdo, $id)
	{
		$stmt = $pdo->prepare('SELECT 1 FROM announcements WHERE id = :id LIMIT 1');
		$stmt->execute(array(':id' => $id));
		$row = $stmt->fetch(PDO::FETCH_NUM);

		return $row !== false;
	}

	private function userExists(PDO $pdo, $userCode)
	{
		$stmt = $pdo->prepare('SELECT 1 FROM user WHERE userCode = :userCode COLLATE NOCASE LIMIT 1');
		$stmt->execute(array(':userCode' => $userCode));
		$row = $stmt->fetch(PDO::FETCH_NUM);

		return $row !== false;
	}

	private function fetchActiveUsers(PDO $pdo)
	{
		$stmt = $pdo->query('SELECT userCode, displayName, isSupervisor, isOperator, isDeleted FROM user');

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
		$users = array();

		foreach ($rows as $row) {
			$isDeleted = isset($row['isDeleted']) ? (int) $row['isDeleted'] : 0;
			if ($isDeleted === 1) {
				continue;
			}

			$users[] = array(
							 'userCode' => isset($row['userCode']) ? $row['userCode'] : '',
							 'displayName' => isset($row['displayName']) ? $row['displayName'] : '',
							 'isSupervisor' => isset($row['isSupervisor']) ? (int) $row['isSupervisor'] : 0,
							 'isOperator' => isset($row['isOperator']) ? (int) $row['isOperator'] : 0,
							 );
		}

		return $users;
	}

	private function fetchAcknowledgementsForAnnouncement(PDO $pdo, $announcementId)
	{
		$stmt = $pdo->prepare('SELECT userCode, acknowledgedAt FROM announcementAcknowledgements WHERE announcementId = :id');
		$stmt->execute(array(':id' => $announcementId));

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
		$acknowledgements = array();

		foreach ($rows as $row) {
			$acknowledgements[] = array(
										'userCode' => isset($row['userCode']) ? $row['userCode'] : '',
										'acknowledgedAt' => isset($row['acknowledgedAt']) ? $row['acknowledgedAt'] : null,
										);
		}

		return $acknowledgements;
	}

	private function normalizeUserCode($userCode)
	{
		$trimmed = trim((string) $userCode);
		if ($trimmed === '') {
			return '';
		}

		return $this->toLowerString($trimmed);
	}

	private function deriveUserRoleLabel($user)
	{
		if (!is_array($user)) {
			return '―';
		}

		$labels = array();
		if (!empty($user['isSupervisor'])) {
			$labels[] = '管理者';
		}
		if (!empty($user['isOperator'])) {
			$labels[] = 'オペレーター';
		}
		if (count($labels) === 0) {
			$labels[] = 'メンバー';
		}

		return implode(' / ', $labels);
	}

	private function filterRecipientsByStatus($recipients, $status)
	{
		if ($status === 'acknowledged') {
			return array_values(array_filter($recipients, function ($recipient) {
						return !empty($recipient['acknowledgedAt']);
					}));
		}

		if ($status === 'unacknowledged') {
			return array_values(array_filter($recipients, function ($recipient) {
						return empty($recipient['acknowledgedAt']);
					}));
		}

		return array_values($recipients);
	}

	private function filterRecipientsByAudience($recipients, $scope, $customAudienceLookup = array())
	{
		$normalizedScope = $this->normalizeAudienceScope($scope);
		if ($normalizedScope === 'all') {
			return array_values($recipients);
		}

		if ($normalizedScope === 'custom') {
			if (!is_array($customAudienceLookup) || count($customAudienceLookup) === 0) {
				return array();
			}

			return array_values(array_filter($recipients, function ($recipient) use ($customAudienceLookup) {
						$userCode = isset($recipient['userCode']) ? $recipient['userCode'] : '';
						$normalized = $this->normalizeUserCode($userCode);
						return $normalized !== '' && isset($customAudienceLookup[$normalized]);
					}));
		}

		return array_values(array_filter($recipients, function ($recipient) use ($normalizedScope) {
					$isSupervisor = isset($recipient['isSupervisor']) ? (int) $recipient['isSupervisor'] : null;
					$isOperator = isset($recipient['isOperator']) ? (int) $recipient['isOperator'] : null;
					if ($isSupervisor === null && $isOperator === null) {
						return true;
					}
					if ($normalizedScope === 'supervisors') {
						return $isSupervisor === 1;
					}
					if ($normalizedScope === 'operators') {
						return $isOperator === 1;
					}
					if ($normalizedScope === 'members') {
						return $isSupervisor !== 1 && $isOperator !== 1;
					}
					return true;
				}));
	}

	private function buildCustomAudienceLookup($audienceUsers)
	{
		$lookup = array();
		if (!is_array($audienceUsers)) {
			return $lookup;
		}

		foreach ($audienceUsers as $entry) {
			if (!is_array($entry)) {
				if (is_string($entry)) {
					$normalized = $this->normalizeUserCode($entry);
					if ($normalized !== '') {
						$lookup[$normalized] = true;
					}
				}
				continue;
			}

			$userCode = '';
			if (isset($entry['userCode'])) {
				$userCode = $entry['userCode'];
			} elseif (isset($entry['code'])) {
				$userCode = $entry['code'];
			}

			$normalized = $this->normalizeUserCode($userCode);
			if ($normalized === '') {
				continue;
			}

			$lookup[$normalized] = true;
		}

		return $lookup;
	}

	private function buildSortKey($recipient)
	{
		$name = '';
		if (isset($recipient['displayName']) && $recipient['displayName'] !== '') {
			$name = $recipient['displayName'];
		} elseif (isset($recipient['userCode'])) {
			$name = $recipient['userCode'];
		}

		if ($name === '') {
			return '';
		}

		return $this->toLowerString($name);
	}

	private function toLowerString($value)
	{
		$string = (string) $value;
		if ($string === '') {
			return '';
		}

		if (function_exists('mb_strtolower')) {
			return mb_strtolower($string, 'UTF-8');
		}

		return strtolower($string);
	}

	private function normalizeAudienceScope($value)
	{
		$normalized = $this->toLowerString($this->sanitizeText($value));
		switch ($normalized) {
		case 'supervisors':
		case 'operators':
		case 'members':
		case 'custom':
			return $normalized;
		default:
			return 'all';
		}
	}

	private function collectAudienceUserCodesFromParams()
	{
		$result = array();
		$seen = array();

		if (isset($this->params['audienceUsers'])) {
			$this->appendCodesFromAudienceUsers($result, $seen, $this->params['audienceUsers']);
		}

		if (isset($this->params['audienceUserCodes'])) {
			$this->appendCodesFromAudienceUserCodes($result, $seen, $this->params['audienceUserCodes']);
		}

		return $result;
	}

	private function appendCodesFromAudienceUsers(array &$result, array &$seen, $value)
	{
		$entries = $this->normalizeAudiencePayloadToArray($value);
		foreach ($entries as $entry) {
			if (is_array($entry) && isset($entry['userCode'])) {
				$this->appendAudienceUserCode($result, $seen, $entry['userCode']);
			} elseif (is_string($entry)) {
				$this->appendAudienceUserCode($result, $seen, $entry);
			}
		}
	}

	private function appendCodesFromAudienceUserCodes(array &$result, array &$seen, $value)
	{
		if (is_string($value)) {
			$trimmed = trim($value);
			if ($trimmed === '') {
				return;
			}
			$value = preg_split('/[\s,]+/', $trimmed);
		}

		if (!is_array($value)) {
			return;
		}

		foreach ($value as $entry) {
			if (is_array($entry) && isset($entry['userCode'])) {
				$this->appendAudienceUserCode($result, $seen, $entry['userCode']);
			} elseif (is_string($entry)) {
				$this->appendAudienceUserCode($result, $seen, $entry);
			}
		}
	}

	private function normalizeAudiencePayloadToArray($value)
	{
		if (is_string($value)) {
			$trimmed = trim($value);
			if ($trimmed === '') {
				return array();
			}

			$decoded = json_decode($trimmed, true);
			if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
				return $decoded;
			}

			return array($trimmed);
		}

		if (is_array($value)) {
			return $value;
		}

		return array();
	}

	private function appendAudienceUserCode(array &$result, array &$seen, $code)
	{
		$trimmed = $this->sanitizeText($code);
		if ($trimmed === '') {
			return;
		}

		$normalized = $this->normalizeUserCode($trimmed);
		if ($normalized === '' || isset($seen[$normalized])) {
			return;
		}

		$seen[$normalized] = true;
		$result[] = $trimmed;
	}

	private function normalizeAcknowledgedAt($value)
	{
		$trimmed = $this->sanitizeText($value);
		if ($trimmed === '') {
			return null;
		}

		try {
			$dateTime = new DateTimeImmutable($trimmed);
		} catch (Exception $exception) {
			throw new Exception('有効な確認日時を指定してください。');
		}

		return $dateTime->setTimezone(new DateTimeZone(date_default_timezone_get()))->format('Y-m-d H:i:s');
	}

	private function ensureAnnouncementsSchema(PDO $pdo)
	{
		if ($this->announcementsSchemaEnsured) {
			return;
		}

		$this->announcementsSchemaEnsured = true;

		try {
			$stmt = $pdo->query('PRAGMA table_info(announcements)');
			$hasCreatedByUserCode = false;
			$hasAudienceScope = false;
			if ($stmt !== false) {
				while ($column = $stmt->fetch(PDO::FETCH_ASSOC)) {
					if (isset($column['name'])) {
						if ($column['name'] === 'createdByUserCode') {
							$hasCreatedByUserCode = true;
						}
						if ($column['name'] === 'audienceScope') {
							$hasAudienceScope = true;
						}
					}
				}
			}

			if ($hasCreatedByUserCode === false) {
				try {
					$pdo->exec('ALTER TABLE announcements ADD COLUMN createdByUserCode VARCHAR(32)');
				} catch (Exception $exception) {
					// 別プロセスで追加された場合は無視する
				}
			}

			if ($hasAudienceScope === false) {
				try {
					$pdo->exec("ALTER TABLE announcements ADD COLUMN audienceScope VARCHAR(32) DEFAULT 'all'");
				} catch (Exception $exception) {
					// 別プロセスで追加された場合は無視する
				}
			}

			$missingCreatorStmt = $pdo->query("SELECT COUNT(1) FROM announcements WHERE createdByUserCode IS NULL OR createdByUserCode = ''");
			$missingCreatorCount = $missingCreatorStmt !== false ? (int) $missingCreatorStmt->fetchColumn() : 0;
			if ($missingCreatorCount > 0) {
				$defaultUserCode = $this->resolveDefaultAnnouncementCreator($pdo);
				if ($defaultUserCode === '') {
					throw new Exception('お知らせの作成者コードを補完できませんでした。');
				}

				$updateStmt = $pdo->prepare(
											"UPDATE announcements SET createdByUserCode = :userCode WHERE createdByUserCode IS NULL OR createdByUserCode = ''"
											);
				$updateStmt->execute(array(':userCode' => $defaultUserCode));
			}

			$missingAudienceStmt = $pdo->query("SELECT COUNT(1) FROM announcements WHERE audienceScope IS NULL OR audienceScope = ''");
			$missingAudienceCount = $missingAudienceStmt !== false ? (int) $missingAudienceStmt->fetchColumn() : 0;
			if ($missingAudienceCount > 0) {
				$pdo->exec("UPDATE announcements SET audienceScope = 'all' WHERE audienceScope IS NULL OR audienceScope = ''");
			}
		} catch (Exception $exception) {
			throw $exception;
		}
	}

	private function ensureAnnouncementRecipientsSchema(PDO $pdo)
	{
		if ($this->recipientsSchemaEnsured) {
			return;
		}

		$this->recipientsSchemaEnsured = true;

		$sql = 'CREATE TABLE IF NOT EXISTS announcementRecipients (
announcementId INTEGER NOT NULL,
userCode VARCHAR(32) NOT NULL,
sortOrder INTEGER NOT NULL DEFAULT 0,
createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (announcementId, userCode)
)';

		$pdo->exec($sql);
	}

	private function replaceAnnouncementRecipients(PDO $pdo, $announcementId, array $userCodes)
	{
		$announcementId = (int) $announcementId;
		if ($announcementId <= 0) {
			return;
		}

		$this->ensureAnnouncementRecipientsSchema($pdo);

		$deleteStmt = $pdo->prepare('DELETE FROM announcementRecipients WHERE announcementId = :id');
		$deleteStmt->execute(array(':id' => $announcementId));

		if (count($userCodes) === 0) {
			return;
		}

		$insertStmt = $pdo->prepare('INSERT INTO announcementRecipients (announcementId, userCode, sortOrder) VALUES (:id, :userCode, :sortOrder)');
		foreach ($userCodes as $index => $code) {
			$trimmed = $this->sanitizeText($code);
			if ($trimmed === '') {
				continue;
			}

			$insertStmt->execute(array(
									   ':id' => $announcementId,
									   ':userCode' => $trimmed,
									   ':sortOrder' => (int) $index,
									   ));
		}
	}

	private function loadAudienceUsersForAnnouncements(PDO $pdo, array $announcementIds)
	{
		$ids = array();
		foreach ($announcementIds as $id) {
			$normalized = (int) $id;
			if ($normalized > 0) {
				$ids[] = $normalized;
			}
		}

		if (count($ids) === 0) {
			return array();
		}

		$this->ensureAnnouncementRecipientsSchema($pdo);

		$rows = $this->fetchStoredAudienceRows($pdo, $ids);
		if (count($rows) === 0) {
			return array();
		}

		$userCodes = array();
		foreach ($rows as $row) {
			if (isset($row['userCode'])) {
				$userCodes[] = $row['userCode'];
			}
		}

		$details = $this->fetchAudienceUserDetails($pdo, $userCodes);
		$audience = array();

		foreach ($rows as $row) {
			$announcementId = isset($row['announcementId']) ? (int) $row['announcementId'] : 0;
			if ($announcementId <= 0) {
				continue;
			}

			$code = isset($row['userCode']) ? $row['userCode'] : '';
			$normalized = $this->normalizeUserCode($code);
			$detail = $normalized !== '' && isset($details[$normalized]) ? $details[$normalized] : null;
			$displayName = ($detail && isset($detail['displayName']) && $detail['displayName'] !== '') ? $detail['displayName'] : $code;
			$role = $detail ? $this->deriveUserRoleLabel($detail) : '―';

			if (!isset($audience[$announcementId])) {
				$audience[$announcementId] = array();
			}

			$audience[$announcementId][] = array(
												 'userCode' => $code,
												 'displayName' => $displayName !== '' ? $displayName : $code,
												 'role' => $role,
												 );
		}

		return $audience;
	}

	private function fetchStoredAudienceRows(PDO $pdo, array $announcementIds)
	{
		if (count($announcementIds) === 0) {
			return array();
		}

		$placeholders = implode(', ', array_fill(0, count($announcementIds), '?'));
		$sql = 'SELECT announcementId, userCode FROM announcementRecipients WHERE announcementId IN (' . $placeholders . ') ORDER BY announcementId ASC, sortOrder ASC, userCode ASC';
		$stmt = $pdo->prepare($sql);
		$stmt->execute($announcementIds);

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
		if ($rows === false) {
			return array();
		}

		return $rows;
	}

	private function fetchAudienceUserDetails(PDO $pdo, array $userCodes)
	{
		$candidates = array();
		$seen = array();

		foreach ($userCodes as $code) {
			$trimmed = $this->sanitizeText($code);
			if ($trimmed === '') {
				continue;
			}

			$normalized = $this->normalizeUserCode($trimmed);
			if ($normalized === '' || isset($seen[$normalized])) {
				continue;
			}

			$seen[$normalized] = true;
			$candidates[] = $trimmed;
		}

		if (count($candidates) === 0) {
			return array();
		}

		$placeholders = implode(', ', array_fill(0, count($candidates), '?'));
		$sql = 'SELECT userCode, displayName, isSupervisor, isOperator FROM user WHERE userCode COLLATE NOCASE IN (' . $placeholders . ')';
		$stmt = $pdo->prepare($sql);
		$stmt->execute($candidates);

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
		if ($rows === false) {
			return array();
		}

		$details = array();
		foreach ($rows as $row) {
			$normalized = $this->normalizeUserCode(isset($row['userCode']) ? $row['userCode'] : '');
			if ($normalized === '') {
				continue;
			}
			$details[$normalized] = $row;
		}

		return $details;
	}

	private function requireCurrentUserCode()
	{
		$userCode = isset($this->session['userCode']) ? $this->sanitizeText($this->session['userCode']) : '';
		if ($userCode === '') {
			throw new Exception('ログイン中のユーザー情報が取得できませんでした。');
		}

		return $userCode;
	}

	private function resolveDefaultAnnouncementCreator(PDO $pdo)
	{
		$sessionUserCode = isset($this->session['userCode']) ? $this->sanitizeText($this->session['userCode']) : '';
		if ($sessionUserCode !== '' && $this->hasSupervisorAccess()) {
			return $sessionUserCode;
		}

		$supervisorStmt = $pdo->query(
									  "SELECT userCode FROM user WHERE (isDeleted IS NULL OR isDeleted = 0) AND isSupervisor = 1 ORDER BY userCode COLLATE NOCASE ASC LIMIT 1"
									  );
		$supervisorRow = $supervisorStmt !== false ? $supervisorStmt->fetch(PDO::FETCH_ASSOC) : false;
		if ($supervisorRow && isset($supervisorRow['userCode'])) {
			$normalized = $this->sanitizeText($supervisorRow['userCode']);
			if ($normalized !== '') {
				return $normalized;
			}
		}

		$userStmt = $pdo->query(
								"SELECT userCode FROM user WHERE isDeleted IS NULL OR isDeleted = 0 ORDER BY userCode COLLATE NOCASE ASC LIMIT 1"
								);
		$userRow = $userStmt !== false ? $userStmt->fetch(PDO::FETCH_ASSOC) : false;
		if ($userRow && isset($userRow['userCode'])) {
			$normalized = $this->sanitizeText($userRow['userCode']);
			if ($normalized !== '') {
				return $normalized;
			}
		}

		return '';
	}
}

?>
