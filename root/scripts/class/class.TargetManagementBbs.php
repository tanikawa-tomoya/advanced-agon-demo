<?php

Base::requireFromShm('class/class.TargetManagementUtil.php');

class TargetManagementBbs extends Base
{
        public function __construct($context)
        {
                parent::__construct($context);
        }

        private function buildBbsUtilDependencies()
        {
                $pdo = $this->getPDOTarget();

                return array(
                        'pdo' => $pdo,
                        'buildParticipant' => array($this, 'buildBbsParticipantPayload'),
                        'buildAttachment' => array($this, 'buildBbsAttachmentPayload'),
                        );
        }

	protected function validationTargetBbsThreadList()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetBbsParticipantProfiles()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['userCodes']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

        protected function validationTargetBbsThreadCreate()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

	protected function validationTargetBbsMessageCreate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['threadCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['content']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetBbsThreadDelete()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['threadCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetBbsMessageDelete()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['threadCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['messageCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetBbsThreadMarkRead()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['threadCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	public function procTargetBbsThreadList()
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

		$threadsLimitRaw = $this->getSafeParam('threadsLimit', '');
		$threadsOffsetRaw = $this->getSafeParam('threadsOffset', '');
		$threadsCursorRaw = $this->getSafeParam('threadsCursor', '');
		$threadCodesRaw = $this->getSafeParam('threadCodes', '');

		$messagesLimitRaw = $this->getSafeParam('messagesLimit', '');
		$messagesOffsetRaw = $this->getSafeParam('messagesOffset', '');
		$messagesCursorRaw = $this->getSafeParam('messagesCursor', '');

		$threadsLimit = (int) filter_var($threadsLimitRaw, FILTER_VALIDATE_INT, array('options' => array('min_range' => 1)));
		if ($threadsLimit < 1) {
			$threadsLimit = 20;
		}

		$maxThreadsLimit = 50;
		if ($threadsLimit > $maxThreadsLimit) {
			$threadsLimit = $maxThreadsLimit;
		}

		$threadsOffsetCandidate = $threadsCursorRaw !== '' ? $threadsCursorRaw : $threadsOffsetRaw;
		$threadsOffset = (int) filter_var($threadsOffsetCandidate, FILTER_VALIDATE_INT, array('options' => array('min_range' => 0)));
		if ($threadsOffset < 0) {
			$threadsOffset = 0;
		}

		$requestedThreadCodes = array();
		if ($threadCodesRaw !== '') {
			$decodedThreadCodes = json_decode($threadCodesRaw, true);
			if (is_array($decodedThreadCodes)) {
				foreach ($decodedThreadCodes as $value) {
					if ($value === null) {
						continue;
					}
					$code = trim((string) $value);
					if ($code === '') {
						continue;
					}
					$requestedThreadCodes[] = $code;
				}
			}
		}

		$messagesLimit = (int) filter_var($messagesLimitRaw, FILTER_VALIDATE_INT, array('options' => array('min_range' => 1)));
		if ($messagesLimit < 1) {
			$messagesLimit = 50;
		}

		$maxMessagesLimit = 200;
		if ($messagesLimit > $maxMessagesLimit) {
			$messagesLimit = $maxMessagesLimit;
		}

		$messagesOffset = 0;
		$messageOffsets = array();
		$messagesOffsetCandidate = $messagesCursorRaw !== '' ? $messagesCursorRaw : $messagesOffsetRaw;
		if ($messagesOffsetCandidate !== '') {
			$decodedMessageOffsets = json_decode($messagesOffsetCandidate, true);
			if (is_array($decodedMessageOffsets)) {
				foreach ($decodedMessageOffsets as $key => $value) {
					if ($value === null) {
						continue;
					}
					$offsetValue = (int) filter_var($value, FILTER_VALIDATE_INT, array('options' => array('min_range' => 0)));
					if ($offsetValue < 0) {
						$offsetValue = 0;
					}
					if (is_string($key)) {
						$normalizedKey = trim($key);
						if ($normalizedKey !== '') {
							$messageOffsets[$normalizedKey] = $offsetValue;
						}
					}
				}
			} else {
				$messagesOffset = (int) filter_var($messagesOffsetCandidate, FILTER_VALIDATE_INT, array('options' => array('min_range' => 0)));
				if ($messagesOffset < 0) {
					$messagesOffset = 0;
				}
			}
		}

$viewerUserCode = $this->getLoginUserCode();
$bbsDependencies = $this->buildBbsUtilDependencies();
$bbsData = TargetManagementUtil::fetchTargetBbsData(
   $targetCode,
   $viewerUserCode,
   array(
 'threadsLimit' => $threadsLimit,
 'threadsOffset' => $threadsOffset,
 'messagesLimit' => $messagesLimit,
 'messagesOffset' => $messagesOffset,
 'messageOffsets' => $messageOffsets,
 'threadCodes' => $requestedThreadCodes,
 ),
   $bbsDependencies
   );

		$threads = isset($bbsData['threads']) && is_array($bbsData['threads']) ? $bbsData['threads'] : array();
		$participants = isset($bbsData['participants']) && is_array($bbsData['participants']) ? $bbsData['participants'] : array();
		$pagination = isset($bbsData['pagination']) && is_array($bbsData['pagination']) ? $bbsData['pagination'] : array();

		$this->response = array(
								'threads' => $threads,
								'participants' => $participants,
								'pagination' => $pagination,
								);
	}



	public function procTargetBbsParticipantProfiles()
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
			$this->errorReason = 'forbidden';
			return;
		}

		if ($this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) == false && $this->isSupervisor() == false && $this->isOperator() == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

		$userCodesParam = isset($this->params['userCodes']) ? $this->params['userCodes'] : array();
		if (is_string($userCodesParam)) {
			$decoded = json_decode($userCodesParam, true);
			if (is_array($decoded)) {
				$userCodesParam = $decoded;
			} else {
				$userCodesParam = array();
			}
		} elseif (!is_array($userCodesParam)) {
			$userCodesParam = array();
		}

		$userCodes = array();
		foreach ($userCodesParam as $value) {
			if ($value === null) {
				continue;
			}
			$trimmed = trim((string) $value);
			if ($trimmed === '') {
				continue;
			}
			$normalized = strtolower($trimmed);
			if (array_key_exists($normalized, $userCodes)) {
				continue;
			}
			$userCodes[$normalized] = $trimmed;
		}

		if (count($userCodes) === 0) {
			$this->response = array('participants' => array());
			return;
		}

		$allowedCodes = array();
		$allowedCodes[strtolower($loginUserCode)] = true;
if (isset($targetRow['createdByUserCode']) && $targetRow['createdByUserCode'] !== '') {
$allowedCodes[strtolower($targetRow['createdByUserCode'])] = true;
}

$assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
		if (isset($assignedUsersMap[$targetCode]) && is_array($assignedUsersMap[$targetCode])) {
			foreach ($assignedUsersMap[$targetCode] as $assignedCode) {
				if ($assignedCode === null || $assignedCode === '') {
					continue;
				}
				$allowedCodes[strtolower($assignedCode)] = true;
			}
		}

$bbsDependencies = $this->buildBbsUtilDependencies();
$bbsData = TargetManagementUtil::fetchTargetBbsData($targetCode, $loginUserCode, array(), $bbsDependencies);
		if (isset($bbsData['participants']) && is_array($bbsData['participants'])) {
			foreach ($bbsData['participants'] as $participant) {
				if (!is_array($participant)) {
					continue;
				}
				$participantCode = isset($participant['userCode']) ? trim((string) $participant['userCode']) : '';
				if ($participantCode === '') {
					continue;
				}
				$allowedCodes[strtolower($participantCode)] = true;
			}
		}

		$participants = array();
		foreach ($userCodes as $normalized => $originalCode) {
			if ($this->isSupervisor() == false && $this->isOperator() == false) {
				if (isset($allowedCodes[$normalized]) == false) {
					continue;
				}
			}

			$participant = $this->buildBbsParticipantPayload($originalCode, null);
			if ($participant == null) {
				continue;
			}
			$participants[] = $participant;
		}

		$this->response = array('participants' => $participants);
	}



        public function procTargetBbsThreadCreate()
        {
                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                $contentRaw = isset($this->params['content']) ? $this->params['content'] : null;
                $contentValue = Util::normalizeOptionalString($contentRaw, 4000);

                if ($targetCode === '' || $contentValue === false) {
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
			$this->errorReason = 'forbidden';
			return;
		}

		if ($this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) == false && $this->isSupervisor() == false && $this->isOperator() == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

		$recipientCodesRaw = isset($this->params['recipientCodes']) ? $this->params['recipientCodes'] : array();
		$recipientCodes = $this->parseBbsRecipientCodes($recipientCodesRaw);
		$filteredRecipients = array();
		foreach ($recipientCodes as $code) {
			if ($code === $loginUserCode) {
				continue;
			}
			$userInfo = $this->getUserInfo($code);
			if ($userInfo == null) {
				continue;
			}
			$filteredRecipients[] = $code;
		}

		$filteredRecipients = array_values(array_unique($filteredRecipients));

		if (count($filteredRecipients) === 0 && $this->isSupervisor() == false && $this->isOperator() == false) {
			if (isset($targetRow['createdByUserCode']) && $targetRow['createdByUserCode'] !== '' && $targetRow['createdByUserCode'] !== $loginUserCode) {
				$filteredRecipients[] = $targetRow['createdByUserCode'];
			}
		}

                $threadTypeParam = isset($this->params['threadType']) ? $this->params['threadType'] : null;
                $threadType = $this->normalizeBbsThreadTypeValue($threadTypeParam, count($filteredRecipients));
                if ($threadType === 'discussion') {
                        $threadType = 'group';
                }

                $bbsDependencies = $this->buildBbsUtilDependencies();

                $threadCode = $this->generateUniqid();
                $now = date('Y-m-d H:i:s');

                $lastMessageAt = null;
                $lastMessageSnippet = null;
                $lastMessageSenderCode = null;

                if ($contentValue !== null) {
                        $lastMessageAt = $now;
                        $lastMessageSnippet = $this->createBbsSnippet($contentValue);
                        $lastMessageSenderCode = $loginUserCode;
                }

                $pdo = $bbsDependencies['pdo'];

                try {
                        $pdo->beginTransaction();

                        $stmt = $pdo->prepare('INSERT INTO targetBbsThreads (threadCode, targetCode, threadType, title, description, createdByUserCode, createdAt, updatedAt, lastMessageAt, lastMessageSnippet, lastMessageSenderCode, isArchived, isLocked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)');
                        $stmt->execute(array($threadCode, $targetCode, $threadType, null, null, $loginUserCode, $now, $now, $lastMessageAt, $lastMessageSnippet, $lastMessageSenderCode));

                        $memberStmt = $pdo->prepare('INSERT OR IGNORE INTO targetBbsThreadMembers (threadCode, userCode, joinedAt, notificationsMuted) VALUES (?, ?, ?, 0)');
                        $memberStmt->execute(array($threadCode, $loginUserCode, $now));
                        foreach ($filteredRecipients as $code) {
                                $memberRole = $this->deriveBbsMemberRole($targetRow, $code);
                                $memberStmt->execute(array($threadCode, $code, $now));
                        }

                        if ($contentValue !== null) {
                                $messageCode = $this->generateUniqid();
                                $metadata = json_encode(array('emphasis' => 'normal'));
                                if ($metadata === false) {
                                        $metadata = '{}';
                                }

                                $messageStmt = $pdo->prepare('INSERT INTO targetBbsMessages (messageCode, threadCode, senderUserCode, content, sentAt, deliveredAt, readAt, createdAt, updatedAt, replyToMessageCode, metadata, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0)');
                                $messageStmt->execute(array($messageCode, $threadCode, $loginUserCode, $contentValue, $now, $now, $now, $now, $now, $metadata));

                                $readStmt = $pdo->prepare('INSERT OR REPLACE INTO targetBbsMessageReads (messageCode, userCode, readAt, createdAt) VALUES (?, ?, ?, ?)');
                                $readStmt->execute(array($messageCode, $loginUserCode, $now, $now));

                                $updateStmt = $pdo->prepare('UPDATE targetBbsThreads SET lastMessageAt = ?, lastMessageSnippet = ?, lastMessageSenderCode = ?, updatedAt = ? WHERE threadCode = ?');
                                $updateStmt->execute(array($now, $lastMessageSnippet, $loginUserCode, $now, $threadCode));
                        }

                        $pdo->commit();
                } catch (Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->buildBbsThreadResponse($targetCode, $threadCode);
	}



	public function procTargetBbsMessageCreate()
	{
                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                $threadCode = htmlspecialchars($this->params['threadCode'], ENT_QUOTES, "UTF-8");
                $contentValue = Util::normalizeOptionalString($this->params['content'], 4000);
                $senderUserCodeParam = isset($this->params['senderUserCode']) ? Util::normalizeOptionalString($this->params['senderUserCode'], 64) : '';

                if ($targetCode === '' || $threadCode === '' || $contentValue === false || $contentValue === null || $senderUserCodeParam === false) {
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

                $bbsDependencies = $this->buildBbsUtilDependencies();

                $pdo = $bbsDependencies['pdo'];
		$stmt = $pdo->prepare('SELECT threadCode, targetCode, threadType FROM targetBbsThreads WHERE threadCode = ? AND (isArchived IS NULL OR isArchived = 0) LIMIT 1');
		$stmt->execute(array($threadCode));
		$threadRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($threadRow == false || !isset($threadRow['targetCode']) || $threadRow['targetCode'] !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$loginUserCode = $this->getLoginUserCode();
		if ($loginUserCode === null || $loginUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

                if ($this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) == false && $this->isSupervisor() == false && $this->isOperator() == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'forbidden';
                        return;
                }

                $senderOverrideSpecified = is_string($senderUserCodeParam) && $senderUserCodeParam !== '';
                if ($senderOverrideSpecified && $this->isSupervisor() == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'forbidden';
                        return;
                }

                $senderUserCode = $senderOverrideSpecified ? $senderUserCodeParam : $loginUserCode;

                if ($senderOverrideSpecified) {
                        $memberCheck = $pdo->prepare('SELECT 1 FROM targetBbsThreadMembers WHERE threadCode = ? AND userCode = ? LIMIT 1');
                        $memberCheck->execute(array($threadCode, $senderUserCode));
                        $memberExists = $memberCheck->fetchColumn();
                        if ($memberExists === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                }

                $now = date('Y-m-d H:i:s');
                $messageCode = $this->generateUniqid();
                $snippet = $this->createBbsSnippet($contentValue);
                $metadata = json_encode(array('emphasis' => 'normal'));
		if ($metadata === false) {
			$metadata = '{}';
		}

		try {
			$pdo->beginTransaction();

                        $memberStmt = $pdo->prepare('INSERT OR IGNORE INTO targetBbsThreadMembers (threadCode, userCode, joinedAt, notificationsMuted) VALUES (?, ?, ?, 0)');
                        $memberStmt->execute(array($threadCode, $loginUserCode, $now));
                        if ($senderUserCode !== $loginUserCode) {
                                $memberStmt->execute(array($threadCode, $senderUserCode, $now));
                        }

                        $messageStmt = $pdo->prepare('INSERT INTO targetBbsMessages (messageCode, threadCode, senderUserCode, content, sentAt, deliveredAt, readAt, createdAt, updatedAt, replyToMessageCode, metadata, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0)');
                        $messageStmt->execute(array($messageCode, $threadCode, $senderUserCode, $contentValue, $now, $now, $now, $now, $now, $metadata));

                        $readStmt = $pdo->prepare('INSERT OR REPLACE INTO targetBbsMessageReads (messageCode, userCode, readAt, createdAt) VALUES (?, ?, ?, ?)');
                        $readStmt->execute(array($messageCode, $senderUserCode, $now, $now));
                        if ($senderUserCode !== $loginUserCode) {
                                $readStmt->execute(array($messageCode, $loginUserCode, $now, $now));
                        }

                        $updateStmt = $pdo->prepare('UPDATE targetBbsThreads SET lastMessageAt = ?, lastMessageSnippet = ?, lastMessageSenderCode = ?, updatedAt = ? WHERE threadCode = ?');
                        $updateStmt->execute(array($now, $snippet, $senderUserCode, $now, $threadCode));

			$pdo->commit();
		} catch (Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->buildBbsThreadResponse($targetCode, $threadCode);
	}



	public function procTargetBbsThreadMarkRead()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$threadCode = htmlspecialchars($this->params['threadCode'], ENT_QUOTES, "UTF-8");

		if ($targetCode === '' || $threadCode === '') {
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

                $bbsDependencies = $this->buildBbsUtilDependencies();

                $pdo = $bbsDependencies['pdo'];
		$stmt = $pdo->prepare('SELECT threadCode, targetCode FROM targetBbsThreads WHERE threadCode = ? AND (isArchived IS NULL OR isArchived = 0) LIMIT 1');
		$stmt->execute(array($threadCode));
		$threadRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($threadRow == false || !isset($threadRow['targetCode']) || $threadRow['targetCode'] !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$loginUserCode = $this->getLoginUserCode();
		if ($loginUserCode === null || $loginUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

		if ($this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) == false && $this->isSupervisor() == false && $this->isOperator() == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

		$messageStmt = $pdo->prepare('SELECT messageCode FROM targetBbsMessages WHERE threadCode = ? AND (isDeleted IS NULL OR isDeleted = 0)');
		$messageStmt->execute(array($threadCode));

		$messageCodes = array();
		while ($row = $messageStmt->fetch(PDO::FETCH_ASSOC)) {
			$code = isset($row['messageCode']) ? trim((string)$row['messageCode']) : '';
			if ($code === '') {
				continue;
			}
			if (in_array($code, $messageCodes, true)) {
				continue;
			}
			$messageCodes[] = $code;
		}

		if (count($messageCodes) > 0) {
			$now = date('Y-m-d H:i:s');

			try {
				$pdo->beginTransaction();

				$existingMap = array();
				$placeholders = implode(', ', array_fill(0, count($messageCodes), '?'));
				$existingStmt = $pdo->prepare('SELECT messageCode, createdAt FROM targetBbsMessageReads WHERE userCode = ? AND messageCode IN (' . $placeholders . ')');
				$existingParams = array_merge(array($loginUserCode), $messageCodes);
				$existingStmt->execute($existingParams);
				while ($existingRow = $existingStmt->fetch(PDO::FETCH_ASSOC)) {
					$messageCode = isset($existingRow['messageCode']) ? trim((string)$existingRow['messageCode']) : '';
					if ($messageCode === '') {
						continue;
					}
					$existingMap[$messageCode] = isset($existingRow['createdAt']) ? $existingRow['createdAt'] : null;
				}

				$readStmt = $pdo->prepare('INSERT OR REPLACE INTO targetBbsMessageReads (messageCode, userCode, readAt, createdAt) VALUES (?, ?, ?, ?)');
				foreach ($messageCodes as $messageCode) {
					$createdAt = array_key_exists($messageCode, $existingMap) && $existingMap[$messageCode] !== null ? $existingMap[$messageCode] : $now;
					$readStmt->execute(array($messageCode, $loginUserCode, $now, $createdAt));
				}

				$pdo->commit();
			} catch (Exception $error) {
				if ($pdo->inTransaction()) {
					$pdo->rollBack();
				}
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'failed';
				return;
			}
		}

		$this->buildBbsThreadResponse($targetCode, $threadCode);
	}



	public function procTargetBbsThreadDelete()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$threadCode = htmlspecialchars($this->params['threadCode'], ENT_QUOTES, "UTF-8");

		if ($targetCode === '' || $threadCode === '') {
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
			$this->errorReason = 'forbidden';
			return;
		}

		if ($this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) == false && $this->isSupervisor() == false && $this->isOperator() == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

                $bbsDependencies = $this->buildBbsUtilDependencies();

                $pdo = $bbsDependencies['pdo'];
		$threadStmt = $pdo->prepare('SELECT threadCode, targetCode, createdByUserCode FROM targetBbsThreads WHERE threadCode = ? AND (isArchived IS NULL OR isArchived = 0) LIMIT 1');
		$threadStmt->execute(array($threadCode));
		$threadRow = $threadStmt->fetch(PDO::FETCH_ASSOC);

		if ($threadRow == false || !isset($threadRow['targetCode']) || $threadRow['targetCode'] !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$creatorCode = isset($threadRow['createdByUserCode']) ? trim((string)$threadRow['createdByUserCode']) : '';
		$canDelete = ($creatorCode !== '' && $creatorCode === $loginUserCode);

		if ($canDelete == false && ($this->isSupervisor() || $this->isOperator())) {
			$canDelete = true;
		}

		if ($canDelete == false) {
			$firstMessageStmt = $pdo->prepare('SELECT senderUserCode FROM targetBbsMessages WHERE threadCode = ? AND (isDeleted IS NULL OR isDeleted = 0) ORDER BY sentAt ASC, id ASC LIMIT 1');
			$firstMessageStmt->execute(array($threadCode));
			$firstMessageRow = $firstMessageStmt->fetch(PDO::FETCH_ASSOC);
			if ($firstMessageRow != false) {
				$firstSender = isset($firstMessageRow['senderUserCode']) ? trim((string)$firstMessageRow['senderUserCode']) : '';
				if ($firstSender !== '' && $firstSender === $loginUserCode) {
					$canDelete = true;
				}
			}
		}

		if ($canDelete == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

		$now = date('Y-m-d H:i:s');

		$messageCodes = array();
		$messageCodeStmt = $pdo->prepare('SELECT messageCode FROM targetBbsMessages WHERE threadCode = ?');
		$messageCodeStmt->execute(array($threadCode));
		while ($row = $messageCodeStmt->fetch(PDO::FETCH_ASSOC)) {
			if (isset($row['messageCode'])) {
				$code = trim((string)$row['messageCode']);
				if ($code !== '') {
					$messageCodes[] = $code;
				}
			}
		}

		try {
			$pdo->beginTransaction();

			if (count($messageCodes) > 0) {
				$placeholders = implode(', ', array_fill(0, count($messageCodes), '?'));
				$attachmentStmt = $pdo->prepare('DELETE FROM targetBbsMessageAttachments WHERE messageCode IN (' . $placeholders . ')');
				$attachmentStmt->execute($messageCodes);

				$readStmt = $pdo->prepare('DELETE FROM targetBbsMessageReads WHERE messageCode IN (' . $placeholders . ')');
				$readStmt->execute($messageCodes);
			}

			$deleteMessagesStmt = $pdo->prepare('UPDATE targetBbsMessages SET isDeleted = 1, updatedAt = ? WHERE threadCode = ?');
			$deleteMessagesStmt->execute(array($now, $threadCode));

			$archiveThreadStmt = $pdo->prepare('UPDATE targetBbsThreads SET isArchived = 1, lastMessageAt = NULL, lastMessageSnippet = NULL, lastMessageSenderCode = NULL, updatedAt = ? WHERE threadCode = ?');
			$archiveThreadStmt->execute(array($now, $threadCode));

			$pdo->commit();
		} catch (Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->buildBbsThreadResponse($targetCode, $threadCode);
	}



	public function procTargetBbsMessageDelete()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$threadCode = htmlspecialchars($this->params['threadCode'], ENT_QUOTES, "UTF-8");
		$messageCode = htmlspecialchars($this->params['messageCode'], ENT_QUOTES, "UTF-8");

		if ($targetCode === '' || $threadCode === '' || $messageCode === '') {
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
			$this->errorReason = 'forbidden';
			return;
		}

		if ($this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) == false && $this->isSupervisor() == false && $this->isOperator() == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

                $bbsDependencies = $this->buildBbsUtilDependencies();

                $pdo = $bbsDependencies['pdo'];
		$threadStmt = $pdo->prepare('SELECT threadCode, targetCode FROM targetBbsThreads WHERE threadCode = ? AND (isArchived IS NULL OR isArchived = 0) LIMIT 1');
		$threadStmt->execute(array($threadCode));
		$threadRow = $threadStmt->fetch(PDO::FETCH_ASSOC);

		if ($threadRow == false || !isset($threadRow['targetCode']) || $threadRow['targetCode'] !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$messageStmt = $pdo->prepare('SELECT messageCode, threadCode, senderUserCode FROM targetBbsMessages WHERE messageCode = ? AND (isDeleted IS NULL OR isDeleted = 0) LIMIT 1');
		$messageStmt->execute(array($messageCode));
		$messageRow = $messageStmt->fetch(PDO::FETCH_ASSOC);

		if ($messageRow == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		if (!isset($messageRow['threadCode']) || $messageRow['threadCode'] !== $threadCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$senderUserCode = isset($messageRow['senderUserCode']) ? trim((string)$messageRow['senderUserCode']) : '';
		if ($senderUserCode !== '' && $senderUserCode === $loginUserCode) {
			// allowed
		} elseif ($this->isSupervisor() || $this->isOperator()) {
			// allowed by role
		} else {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'forbidden';
			return;
		}

		$now = date('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

			$deleteAttachmentsStmt = $pdo->prepare('DELETE FROM targetBbsMessageAttachments WHERE messageCode = ?');
			$deleteAttachmentsStmt->execute(array($messageCode));

			$deleteReadsStmt = $pdo->prepare('DELETE FROM targetBbsMessageReads WHERE messageCode = ?');
			$deleteReadsStmt->execute(array($messageCode));

			$deleteMessageStmt = $pdo->prepare('UPDATE targetBbsMessages SET isDeleted = 1, updatedAt = ? WHERE messageCode = ?');
			$deleteMessageStmt->execute(array($now, $messageCode));

			$lastMessageStmt = $pdo->prepare('SELECT sentAt, createdAt, updatedAt, content, senderUserCode FROM targetBbsMessages WHERE threadCode = ? AND (isDeleted IS NULL OR isDeleted = 0) ORDER BY COALESCE(sentAt, createdAt, updatedAt) DESC, id DESC LIMIT 1');
			$lastMessageStmt->execute(array($threadCode));
			$lastMessageRow = $lastMessageStmt->fetch(PDO::FETCH_ASSOC);

			$lastSentAt = null;
			$lastSnippet = null;
			$lastSender = null;
			if ($lastMessageRow != false) {
				if (isset($lastMessageRow['sentAt']) && $lastMessageRow['sentAt'] !== null && $lastMessageRow['sentAt'] !== '') {
					$lastSentAt = $lastMessageRow['sentAt'];
				} elseif (isset($lastMessageRow['createdAt']) && $lastMessageRow['createdAt'] !== null && $lastMessageRow['createdAt'] !== '') {
					$lastSentAt = $lastMessageRow['createdAt'];
				} elseif (isset($lastMessageRow['updatedAt']) && $lastMessageRow['updatedAt'] !== null && $lastMessageRow['updatedAt'] !== '') {
					$lastSentAt = $lastMessageRow['updatedAt'];
				}
				$lastSnippet = $this->createBbsSnippet(isset($lastMessageRow['content']) ? $lastMessageRow['content'] : null);
				if (isset($lastMessageRow['senderUserCode'])) {
					$lastSender = $lastMessageRow['senderUserCode'];
				}
			}

			$updateThreadStmt = $pdo->prepare('UPDATE targetBbsThreads SET lastMessageAt = ?, lastMessageSnippet = ?, lastMessageSenderCode = ?, updatedAt = ? WHERE threadCode = ?');
			$updateThreadStmt->execute(array($lastSentAt, $lastSnippet, $lastSender, $now, $threadCode));

			$pdo->commit();
		} catch (Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->buildBbsThreadResponse($targetCode, $threadCode);
	}

        public function buildBbsParticipantPayload($userCode, $role)
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
                $initial = $this->deriveDisplayInitial($displayName !== null ? $displayName : $userCode, '?');

                return array(
                                         'userCode' => $userCode,
                                         'displayName' => $displayName !== null ? $displayName : $userCode,
                                         'avatar' => $avatarPayload['payload'],
                                         'avatarUrl' => $avatarPayload['url'],
                                         'avatarInitial' => $initial,
                                         'avatarTransform' => $avatarPayload['transform'],
                                         );
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



        public function buildBbsAttachmentPayload($row)
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



	private function parseBbsRecipientCodes($value)
	{
		if (is_string($value)) {
			$trimmed = trim($value);
			if ($trimmed === '') {
				return array();
			}

			$decoded = json_decode($trimmed, true);
			if (is_array($decoded)) {
				$value = $decoded;
			} else {
				$value = array($trimmed);
			}
		}

		if (!is_array($value)) {
			return array();
		}

		$codes = array();
		foreach ($value as $entry) {
			if (is_array($entry) && isset($entry['userCode'])) {
				$entry = $entry['userCode'];
			}

			$normalized = Util::normalizeOptionalString((string) $entry, 32);
			if ($normalized === false || $normalized === null) {
				continue;
			}

			$codes[] = $normalized;
		}

		if (count($codes) === 0) {
			return array();
		}

		$codes = array_values(array_unique($codes));

		return $codes;
	}



	private function normalizeBbsThreadTypeValue($value, $recipientCount)
	{
		$type = is_string($value) ? strtolower(trim($value)) : '';

		if ($type === 'direct' || $type === 'group' || $type === 'discussion') {
			return $type;
		}

		if ((int) $recipientCount <= 1) {
			return 'direct';
		}

		return 'group';
	}



	private function deriveBbsMemberRole($targetRow, $userCode)
	{
		if ($userCode === null || $userCode === '') {
			return 'member';
		}

		if ($this->isSupervisor() || $this->isOperator()) {
			return 'facilitator';
		}

		if ($targetRow != null) {
			if (isset($targetRow['createdByUserCode']) && $targetRow['createdByUserCode'] === $userCode) {
				return 'facilitator';
			}

			if (isset($targetRow['assignedUserCode']) && $targetRow['assignedUserCode'] === $userCode) {
				return 'member';
			}
		}

		return 'member';
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


        private function createBbsSnippet($content)
        {
                if ($content === null) {
			return null;
		}

		$text = trim((string) $content);
		if ($text === '') {
			return null;
		}

		if (mb_strlen($text) > 120) {
			return mb_substr($text, 0, 120);
		}

		return $text;
	}



	private function buildBbsThreadResponse($targetCode, $threadCode)
	{
$viewerUserCode = $this->getLoginUserCode();
$fetchOptions = array();
if ($threadCode !== null && $threadCode !== '') {
$fetchOptions['threadCodes'] = array($threadCode);
}
$bbsDependencies = $this->buildBbsUtilDependencies();
$bbsData = TargetManagementUtil::fetchTargetBbsData($targetCode, $viewerUserCode, $fetchOptions, $bbsDependencies);
		$rawThreads = isset($bbsData['threads']) && is_array($bbsData['threads']) ? $bbsData['threads'] : array();
		$threads = array();
		foreach ($rawThreads as $thread) {
			if (!is_array($thread)) {
				continue;
			}
			if ($threadCode !== null && isset($thread['threadCode']) && $thread['threadCode'] !== $threadCode) {
				continue;
			}
			$threads[] = $thread;
		}

		$rawParticipants = isset($bbsData['participants']) && is_array($bbsData['participants']) ? $bbsData['participants'] : array();
		$participants = array_values($rawParticipants);

		$this->response = array(
								'threads' => $threads,
								'participants' => $participants,
								'pagination' => isset($bbsData['pagination']) && is_array($bbsData['pagination']) ? $bbsData['pagination'] : array(),
								);

		if ($threadCode !== null) {
			$this->response['threadCode'] = $threadCode;
		}
	}
}

?>
