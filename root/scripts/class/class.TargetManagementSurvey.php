<?php

Base::requireFromShm('class/class.TargetManagementUtil.php');

class TargetManagementSurvey extends Base
{
        private $targetSurveySchemaEnsured = false;

        public function __construct($context)
        {
                parent::__construct($context);
        }

        private function logSurveyEvent($message, array $context = array())
        {
                $log = '[TargetManagementSurvey] ' . $message;
                if (empty($context) == false) {
                        try {
                                $log .= ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                        } catch (Exception $exception) {
                                $log .= ' [context_json_error=' . $exception->getMessage() . ']';
                        }
                }

                Base::writeLog($log, 'survey');
        }

	protected function validationTargetSurveyList()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetSurveyCreate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['title']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['content']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



        protected function validationTargetSurveyUpdate()
        {
                if (isset($this->params['id']) == false && isset($this->params['surveyCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['title']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['content']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



    protected function validationTargetSurveyDelete()
    {
            if (isset($this->params['id']) == false && isset($this->params['surveyCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
    }



        protected function validationTargetSurveyAcknowledge()
        {
                if (isset($this->params['id']) == false && isset($this->params['surveyCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['userCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyDetail()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['id']) == false && isset($this->params['surveyCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyRemind()
        {
                if (isset($this->params['id']) == false && isset($this->params['surveyCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['userCodes']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveySubmit()
        {
                if (isset($this->params['id']) == false && isset($this->params['surveyCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyResponseDelete()
        {
                if (isset($this->params['id']) == false && isset($this->params['surveyCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['userCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyRecipients()
        {
                if (isset($this->params['id']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }

        protected function validationTargetSurveyDownloadCSV()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['id']) == false && isset($this->params['surveyCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyItemList()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['targetSurveyId']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyItemCreate()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['targetSurveyId']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['kind']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyItemUpdate()
        {
                if (isset($this->params['id']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyItemDelete()
        {
                if (isset($this->params['id']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyItemKindList()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['targetSurveyItemId']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyItemKindCreate()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['targetSurveyItemId']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['title']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyItemKindUpdate()
        {
                if (isset($this->params['id']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
                if (isset($this->params['title']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



        protected function validationTargetSurveyItemKindDelete()
        {
                if (isset($this->params['id']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



	public function procTargetSurveyList()
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

		$payload = $this->loadTargetSurveyCollections($targetRow);
		$this->response = array(
								'survey' => isset($payload['survey']) ? $payload['survey'] : array(),
								'acknowledgements' => isset($payload['acknowledgements']) ? $payload['acknowledgements'] : array(),
								);
		$this->refreshTargetSurveyessionToken();
	}



        public function procTargetSurveyCreate()
        {
                $this->logSurveyEvent('procTargetSurveyCreate start', array(
                        'targetCodeParam' => isset($this->params['targetCode']) ? $this->params['targetCode'] : null,
                        'titleParam' => isset($this->params['title']) ? $this->params['title'] : null,
                        'startAtParam' => isset($this->params['startAt']) ? $this->params['startAt'] : null,
                        'endAtParam' => isset($this->params['endAt']) ? $this->params['endAt'] : null,
                        'recipientCountParam' => isset($this->params['recipients']) && is_array($this->params['recipients'])
                                ? count($this->params['recipients'])
                                : 0,
                ));

                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                if ($targetCode === '') {
                        $this->logSurveyEvent('procTargetSurveyCreate abort: empty targetCode');
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->logSurveyEvent('procTargetSurveyCreate abort: target not found', array('targetCode' => $targetCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $title = Util::normalizeRequiredString($this->params['title'], 256);
                if ($title === false) {
                        $this->logSurveyEvent('procTargetSurveyCreate abort: invalid title', array('targetCode' => $targetCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $content = Util::normalizeRequiredString($this->params['content'], 4000);
                if ($content === false) {
                        $this->logSurveyEvent('procTargetSurveyCreate abort: invalid content', array('targetCode' => $targetCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $startAt = Util::normalizeOptionalDateTime($this->params['startAt']);
                if ($startAt === false || $startAt === null) {
                        $this->logSurveyEvent('procTargetSurveyCreate abort: invalid startAt', array('targetCode' => $targetCode, 'startAtParam' => $this->params['startAt']));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $endAt = Util::normalizeOptionalDateTime($this->params['endAt']);
                if ($endAt === false || $endAt === null) {
                        $this->logSurveyEvent('procTargetSurveyCreate abort: invalid endAt', array('targetCode' => $targetCode, 'endAtParam' => $this->params['endAt']));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $startTimestamp = strtotime($startAt);
                $endTimestamp = strtotime($endAt);
                if ($startTimestamp === false || $endTimestamp === false || $startTimestamp > $endTimestamp) {
                        $this->logSurveyEvent('procTargetSurveyCreate abort: inconsistent datetime', array('targetCode' => $targetCode, 'startAt' => $startAt, 'endAt' => $endAt));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $isGuestMode = $this->normalizeBooleanParam($this->params['isGuestMode'] ?? null, false);

                $creatorUserCode = $this->getLoginUserCode();
                if ($creatorUserCode === null || $creatorUserCode === '') {
                        $this->logSurveyEvent('procTargetSurveyCreate abort: missing creator', array('targetCode' => $targetCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                if ($this->canManageTargetSurvey($targetRow, $creatorUserCode) == false) {
                        $this->logSurveyEvent('procTargetSurveyCreate abort: permission denied', array('targetCode' => $targetCode, 'creatorUserCode' => $creatorUserCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }


                $pdo = $this->getPDOTarget();
                $this->ensureTargetSurveySchema($pdo);
                $now = date('Y-m-d H:i:s');

                $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                $assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();
                $recipientCodes = $this->normalizeRecipientCodes(
                        isset($this->params['recipients']) ? $this->params['recipients'] : array(),
                        $assignedUsers
                );

                $hasOuterTransaction = $pdo->inTransaction();

                $this->logSurveyEvent('procTargetSurveyCreate begin transaction', array('targetCode' => $targetCode, 'creatorUserCode' => $creatorUserCode, 'hasOuterTransaction' => $hasOuterTransaction));

                try {
                        if ($hasOuterTransaction == false) {
                                $pdo->beginTransaction();
                        }

                        $displayStmt = $pdo->prepare('SELECT COALESCE(MAX(displayOrder), 0) FROM targetSurvey WHERE targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0)');
                        $displayStmt->execute(array($targetCode));
                        $displayOrder = ((int)$displayStmt->fetchColumn()) + 1;

                        $surveyCode = $this->generateUniqid();
                        $insertStmt = $pdo->prepare(
                                                                                'INSERT INTO targetSurvey (surveyCode, targetCode, title, content, startAt, endAt, isGuestMode, recipientsJson, createdByUserCode, createdAt, updatedAt, displayOrder, isDeleted) '
                                                                                . 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
                                                                                );
                        $insertStmt->execute(array(
                                                                           $surveyCode,
                                                                           $targetCode,
                                                                           $title,
                                                                           $content,
                                                                           $startAt,
                                                                           $endAt,
                                                                           $isGuestMode ? 1 : 0,
                                                                           json_encode($recipientCodes),
                                                                           $creatorUserCode,
                                                                           $now,
                                                                           $now,
                                                                           $displayOrder
                                                                           ));

                        $surveyId = (int)$pdo->lastInsertId();
                        if (array_key_exists('items', $this->params)) {
                                $this->replaceTargetSurveyItems($surveyId, $this->params['items']);
                        }
                        $pdo->commit();
                } catch (Exception $exception) {
                        if ($pdo->inTransaction()) {
                                $pdo->rollBack();
                        }
                        $this->logSurveyEvent('procTargetSurveyCreate failed during insert', array('targetCode' => $targetCode, 'exception' => $exception->getMessage()));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

		$surveyRow = $this->fetchTargetSurveyById($surveyId);
		if ($surveyRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
                }

                $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                $assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();
                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $payload = $this->buildTargetSurveyPayload($surveyRow, $targetRow, $assignedUsers, array(), $itemLookup);

		$this->response = $payload !== null ? $payload : array();
		$this->refreshTargetSurveyessionToken();
	}



        public function procTargetSurveyUpdate()
        {
                $this->logSurveyEvent('procTargetSurveyUpdate start', array(
                        'idParam' => isset($this->params['id']) ? $this->params['id'] : null,
                        'surveyCodeParam' => isset($this->params['surveyCode']) ? $this->params['surveyCode'] : null,
                        'targetCodeParam' => isset($this->params['targetCode']) ? $this->params['targetCode'] : null,
                        'recipientCountParam' => isset($this->params['recipients']) && is_array($this->params['recipients'])
                                ? count($this->params['recipients'])
                                : 0,
                ));

                $surveyId = null;
                if (isset($this->params['id'])) {
                        $surveyId = $this->filterTargetSurveyId($this->params['id']);
                }

                if ($surveyId === null && isset($this->params['surveyCode'])) {
                        $code = trim((string)$this->params['surveyCode']);
                        if ($code !== '') {
                                $surveyId = $this->fetchTargetSurveyIdByCode($code);
                        }
                }

                if ($surveyId === null) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: missing surveyId');
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                if ($targetCode === '') {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: empty targetCode', array('surveyId' => $surveyId));
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

		$surveyRow = $this->fetchTargetSurveyById($surveyId);
		if ($surveyRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$surveyTargetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
		if ($surveyTargetCode !== '' && $surveyTargetCode !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

                $title = Util::normalizeRequiredString($this->params['title'], 256);
                if ($title === false) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: invalid title', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $content = Util::normalizeRequiredString($this->params['content'], 4000);
                if ($content === false) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: invalid content', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $startAt = Util::normalizeOptionalDateTime($this->params['startAt']);
                if ($startAt === false || $startAt === null) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: invalid startAt', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $endAt = Util::normalizeOptionalDateTime($this->params['endAt']);
                if ($endAt === false || $endAt === null) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: invalid endAt', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $startTimestamp = strtotime($startAt);
                $endTimestamp = strtotime($endAt);
                if ($startTimestamp === false || $endTimestamp === false || $startTimestamp > $endTimestamp) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: inconsistent datetime', array('surveyId' => $surveyId, 'startAt' => $startAt, 'endAt' => $endAt));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $isGuestMode = $this->normalizeBooleanParam($this->params['isGuestMode'] ?? null, isset($surveyRow['isGuestMode']) ? ((int)$surveyRow['isGuestMode'] !== 0) : false);

                $updaterUserCode = $this->getLoginUserCode();
                if ($updaterUserCode === null || $updaterUserCode === '') {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: missing updater', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                if ($this->canManageTargetSurvey($targetRow, $updaterUserCode) == false) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: permission denied', array('surveyId' => $surveyId, 'updaterUserCode' => $updaterUserCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

		
                $pdo = $this->getPDOTarget();
                $now = date('Y-m-d H:i:s');

                $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                $assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();
                $recipientCodes = $this->normalizeRecipientCodes(
                        isset($this->params['recipients']) ? $this->params['recipients'] : array(),
                        $assignedUsers
                );

                $this->logSurveyEvent('procTargetSurveyUpdate begin transaction', array('surveyId' => $surveyId, 'targetCode' => $targetCode, 'updaterUserCode' => $updaterUserCode));

                try {
                        $stmt = $pdo->prepare('UPDATE targetSurvey SET title = ?, content = ?, startAt = ?, endAt = ?, isGuestMode = ?, recipientsJson = ?, updatedAt = ? WHERE id = ?');
                        $stmt->execute(array($title, $content, $startAt, $endAt, $isGuestMode ? 1 : 0, json_encode($recipientCodes), $now, $surveyId));
                        if (array_key_exists('items', $this->params)) {
                                $this->replaceTargetSurveyItems($surveyId, $this->params['items']);
                        }
                } catch (Exception $exception) {
                        $this->logSurveyEvent('procTargetSurveyUpdate failed during update', array('surveyId' => $surveyId, 'exception' => $exception->getMessage()));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $updatedRow = $this->fetchTargetSurveyById($surveyId);
                if ($updatedRow == null) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: updatedRow missing', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                $assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();
                $acknowledgements = $this->fetchTargetSurveyAcknowledgements(array($surveyId));
                $ackLookup = $this->indexTargetSurveyAcknowledgements($acknowledgements);
                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $responseLookup = $this->buildTargetSurveyResponseLookup(array($surveyId), $itemLookup);
                $payload = $this->buildTargetSurveyPayload($updatedRow, $targetRow, $assignedUsers, $ackLookup, $itemLookup, $responseLookup);

                $this->response = $payload !== null ? $payload : array();
                $this->refreshTargetSurveyessionToken();

                $this->logSurveyEvent('procTargetSurveyUpdate finished', array('surveyId' => $surveyId, 'responseReady' => is_array($this->response)));
        }



    public function procTargetSurveyDelete()
    {
            $surveyId = null;
            if (isset($this->params['id'])) {
                    $surveyId = $this->filterTargetSurveyId($this->params['id']);
            }

            if ($surveyId === null && isset($this->params['surveyCode'])) {
                    $code = trim((string)$this->params['surveyCode']);
                    if ($code !== '') {
                            $surveyId = $this->fetchTargetSurveyIdByCode($code);
                    }
            }
            if ($surveyId === null) {
                    $this->status = parent::RESULT_ERROR;
                    $this->errorReason = 'invalid';
                    return;
            }

            $surveyRow = $this->fetchTargetSurveyById($surveyId);
            if ($surveyRow == null) {
                    $this->status = parent::RESULT_ERROR;
                    $this->errorReason = 'notfound';
                    return;
            }

		$targetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
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

		if ($this->canManageTargetSurvey($targetRow, $loginUserCode) == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		
		$pdo = $this->getPDOTarget();
		$now = date('Y-m-d H:i:s');

		try {
			$stmt = $pdo->prepare('UPDATE targetSurvey SET isDeleted = 1, updatedAt = ? WHERE id = ?');
			$stmt->execute(array($now, $surveyId));
		} catch (Exception $exception) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->response = array('deleted' => true);
		$this->refreshTargetSurveyessionToken();
	}



        public function procTargetSurveyAcknowledge()
        {
                $surveyId = null;
                if (isset($this->params['id'])) {
                        $surveyId = $this->filterTargetSurveyId($this->params['id']);
                }

                if ($surveyId === null && isset($this->params['surveyCode'])) {
                        $code = trim((string)$this->params['surveyCode']);
                        if ($code !== '') {
                                $surveyId = $this->fetchTargetSurveyIdByCode($code);
                        }
                }

                if ($surveyId === null) {
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

		$surveyRow = $this->fetchTargetSurveyById($surveyId);
		if ($surveyRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$targetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
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
		$canManage = $this->canManageTargetSurvey($targetRow, $loginUserCode);

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
                        $stmt = $pdo->prepare(
                                                                  'INSERT INTO targetSurveyAcknowledgements (targetSurveyId, userCode, acknowledgedAt) '
                                                                  . 'VALUES (?, ?, ?) '
                                                                  . 'ON CONFLICT(targetSurveyId, userCode) DO UPDATE SET acknowledgedAt = excluded.acknowledgedAt'
                                                                  );
                        $stmt->execute(array($surveyId, $userCode, $acknowledgedAt));
                        $this->response = array('acknowledgedAt' => $acknowledgedAt);
                } catch (Exception $exception) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database';
                        return;
                }

                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyDetail()
        {
                $surveyId = null;
                if (isset($this->params['id'])) {
                        $surveyId = $this->filterTargetSurveyId($this->params['id']);
                }

                if ($surveyId === null && isset($this->params['surveyCode'])) {
                        $code = trim((string)$this->params['surveyCode']);
                        if ($code !== '') {
                                $surveyId = $this->fetchTargetSurveyIdByCode($code);
                        }
                }

                if ($surveyId === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $targetCodeParam = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                if ($targetCodeParam === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $targetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
                if ($targetCode === '' || $targetCode !== $targetCodeParam) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: target not found', array('surveyId' => $surveyId, 'targetCode' => $targetCode));
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

                $acknowledgements = $this->fetchTargetSurveyAcknowledgements(array($surveyId));
                $ackLookup = $this->indexTargetSurveyAcknowledgements($acknowledgements);
                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $responseLookup = $this->buildTargetSurveyResponseLookup(array($surveyId), $itemLookup);
                $payload = $this->buildTargetSurveyPayload($surveyRow, $targetRow, $assignedUsers, $ackLookup, $itemLookup, $responseLookup);

                $this->response = $payload !== null ? $payload : array();
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyRecipients()
        {
                $surveyId = null;
                if (isset($this->params['id'])) {
                        $surveyId = $this->filterTargetSurveyId($this->params['id']);
                }

                if ($surveyId === null && isset($this->params['surveyCode'])) {
                        $code = trim((string)$this->params['surveyCode']);
                        if ($code !== '') {
                                $surveyId = $this->fetchTargetSurveyIdByCode($code);
                        }
                }

                if ($surveyId === null) {
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

		$surveyRow = $this->fetchTargetSurveyById($surveyId);
		if ($surveyRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$targetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
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

                $acknowledgements = $this->fetchTargetSurveyAcknowledgements(array($surveyId));
                $ackLookup = $this->indexTargetSurveyAcknowledgements($acknowledgements);
                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $responseLookup = $this->buildTargetSurveyResponseLookup(array($surveyId), $itemLookup);
                $surveyKey = (string)$surveyId;
                $recipientAck = isset($ackLookup[$surveyKey]) ? $ackLookup[$surveyKey] : array();
                $recipientResponses = isset($responseLookup[$surveyKey]) ? $responseLookup[$surveyKey] : array();
                $recipients = $this->buildTargetSurveyRecipients($targetRow, $assignedUsers, $recipientAck, $recipientResponses);

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
		$this->refreshTargetSurveyessionToken();
	}




        



public function procTargetSurveyDownloadCSV()
        {
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		if ($targetCode === '') {
		$this->status = parent::RESULT_ERROR;
		$this->errorReason = 'invalid';
		return;
		}

		$surveyId = null;
		if (isset($this->params['id'])) {
		$surveyId = $this->filterTargetSurveyId($this->params['id']);
		}

		if ($surveyId === null && isset($this->params['surveyCode'])) {
		$code = trim((string)$this->params['surveyCode']);
		if ($code !== '') {
				$surveyId = $this->fetchTargetSurveyIdByCode($code);
		}
		}

		if ($surveyId === null) {
		$this->status = parent::RESULT_ERROR;
		$this->errorReason = 'invalid';
		return;
		}

		$surveyRow = $this->fetchTargetSurveyById($surveyId);
		if ($surveyRow == null) {
		$this->status = parent::RESULT_ERROR;
		$this->errorReason = 'notfound';
		return;
		}

		$surveyTargetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
		if ($surveyTargetCode !== '' && strcasecmp($surveyTargetCode, $targetCode) !== 0) {
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

		$assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                $assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();

                $acknowledgements = $this->fetchTargetSurveyAcknowledgements(array($surveyId));
                $ackLookup = $this->indexTargetSurveyAcknowledgements($acknowledgements);
                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $responseLookup = $this->buildTargetSurveyResponseLookup(array($surveyId), $itemLookup);
                $payload = $this->buildTargetSurveyPayload($surveyRow, $targetRow, $assignedUsers, $ackLookup, $itemLookup, $responseLookup);

		if ($payload === null) {
		$this->status = parent::RESULT_ERROR;
		$this->errorReason = 'notfound';
		return;
		}

		$items = (isset($payload['items']) && is_array($payload['items'])) ? $payload['items'] : array();
		$recipients = (isset($payload['recipients']) && is_array($payload['recipients'])) ? $payload['recipients'] : array();

		$extractAnswers = function ($recipient) {
		if (!is_array($recipient)) {
				return array();
		}
		if (isset($recipient['answers']) && is_array($recipient['answers'])) {
				return $recipient['answers'];
		}
		if (isset($recipient['responses']) && is_array($recipient['responses'])) {
				return $recipient['responses'];
		}
		if (isset($recipient['items']) && is_array($recipient['items'])) {
				return $recipient['items'];
		}
		if (isset($recipient['answerMap']) && is_array($recipient['answerMap'])) {
				$mapped = array();
				foreach ($recipient['answerMap'] as $key => $value) {
				$mapped[] = array('itemId' => $key, 'value' => $value);
				}
				return $mapped;
		}
		return array();
		};

		$findAnswerForItem = function ($answers, $itemId) {
		if (!is_array($answers)) {
				return null;
		}
		$id = ($itemId === null) ? '' : (string)$itemId;
		foreach ($answers as $answer) {
				if (!is_array($answer)) {
				continue;
				}
				$ids = array(
				isset($answer['itemId']) ? $answer['itemId'] : null,
				isset($answer['surveyItemId']) ? $answer['surveyItemId'] : null,
				isset($answer['targetSurveyItemId']) ? $answer['targetSurveyItemId'] : null,
				isset($answer['id']) ? $answer['id'] : null,
				);
				foreach ($ids as $candidate) {
				if ($candidate === null) {
				        continue;
				}
				if ($id !== '' && $id === (string)$candidate) {
				        return $answer;
				}
				}
		}
		return null;
		};

		$normalizeAnswerValue = function ($answer, $item) {
		$value = null;
		if (is_array($answer)) {
				if (array_key_exists('value', $answer)) {
				$value = $answer['value'];
				} elseif (array_key_exists('answer', $answer)) {
				$value = $answer['answer'];
				} elseif (array_key_exists('response', $answer)) {
				$value = $answer['response'];
				} elseif (array_key_exists('text', $answer)) {
				$value = $answer['text'];
				} elseif (array_key_exists('content', $answer)) {
				$value = $answer['content'];
				}
		}

		$listValue = null;
		if (is_array($value)) {
				$listValue = $value;
		}

		if (is_array($listValue)) {
				$labels = array();
				foreach ($listValue as $entry) {
				if (is_array($entry)) {
				        $labels[] = isset($entry['title']) ? $entry['title'] : (isset($entry['label']) ? $entry['label'] : (isset($entry['value']) ? $entry['value'] : ''));
				} else {
				        $labels[] = $entry;
				}
				}
				$labels = array_filter(array_map(function ($label) {
				return trim((string)$label);
				}, $labels), function ($label) {
				return $label !== '';
				});
				return implode('、', $labels);
		}

		if (is_array($answer) && isset($answer['choices']) && is_array($answer['choices'])) {
				$labels = array();
				foreach ($answer['choices'] as $entry) {
				if (is_array($entry)) {
				        $labels[] = isset($entry['title']) ? $entry['title'] : (isset($entry['label']) ? $entry['label'] : (isset($entry['value']) ? $entry['value'] : ''));
				} else {
				        $labels[] = $entry;
				}
				}
				$labels = array_filter(array_map(function ($label) {
				return trim((string)$label);
				}, $labels), function ($label) {
				return $label !== '';
				});
				return implode('、', $labels);
		}

		if (is_array($answer)) {
				if (isset($answer['title'])) {
				$mapped = trim((string)$answer['title']);
				if ($mapped !== '') {
				        return $mapped;
				}
				}
				if (isset($answer['label'])) {
				$mapped = trim((string)$answer['label']);
				if ($mapped !== '') {
				        return $mapped;
				}
				}
		}

		if ($value !== null) {
				$mapped = trim((string)$value);
				if ($mapped !== '') {
				return $mapped;
				}
		}

		return '';
		};

		$resolveAnswerText = function ($recipient, $item) use ($extractAnswers, $findAnswerForItem, $normalizeAnswerValue) {
		$answers = $extractAnswers($recipient);
		$answer = $findAnswerForItem($answers, isset($item['id']) ? $item['id'] : null);
		$value = $normalizeAnswerValue($answer, $item);
		return ($value === '' || $value === null) ? '' : $value;
		};

		$headers = array('ユーザーコード', '氏名', '役割');
		foreach ($items as $index => $item) {
		$title = '';
		if (is_array($item)) {
				if (isset($item['title'])) {
				$title = trim((string)$item['title']);
				} elseif (isset($item['label'])) {
				$title = trim((string)$item['label']);
				}
		}
		if ($title === '') {
				$title = '項目 ' . ($index + 1);
		}
		$headers[] = $title;
		}
		$headers[] = '回答日時';

		$handle = fopen('php://temp', 'r+');
		if ($handle === false) {
		$this->status = parent::RESULT_ERROR;
		$this->errorReason = 'failed';
		return;
		}

		fputcsv($handle, $headers);

		foreach ($recipients as $recipient) {
		if (!is_array($recipient)) {
				continue;
		}

		$row = array(
				isset($recipient['userCode']) ? $recipient['userCode'] : '',
				isset($recipient['displayName']) ? $recipient['displayName'] : '',
				isset($recipient['role']) ? $recipient['role'] : '',
		);

		foreach ($items as $item) {
				$row[] = $resolveAnswerText($recipient, $item);
		}

		$row[] = isset($recipient['acknowledgedAt']) ? $recipient['acknowledgedAt'] : '';
		fputcsv($handle, $row);
		}

		rewind($handle);
		$csvContent = stream_get_contents($handle);
		fclose($handle);

		$suffix = isset($payload['surveyCode']) ? $payload['surveyCode'] : $surveyId;
		$fileName = 'target-survey-' . $suffix . '.csv';

		$this->response = array(
		'csv' => $csvContent,
		'fileName' => $fileName,
		);

		$this->refreshTargetSurveyessionToken();
		}



public function procTargetSurveyItemList()
        {
                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                if ($targetCode === '') {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: empty targetCode', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $surveyId = $this->filterTargetSurveyId($this->params['targetSurveyId']);
                if ($surveyId === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: target not found', array('surveyId' => $surveyId, 'targetCode' => $targetCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: survey not found', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyTargetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
                if ($surveyTargetCode !== '' && $surveyTargetCode !== $targetCode) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: mismatched targetCode', array('surveyId' => $surveyId, 'surveyTargetCode' => $surveyTargetCode, 'requestTargetCode' => $targetCode));
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

                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $items = isset($itemLookup[(string)$surveyId]) ? $itemLookup[(string)$surveyId] : array();

                $this->response = array('items' => $items);
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyRemind()
        {
                $surveyId = null;
                if (isset($this->params['id'])) {
                        $surveyId = $this->filterTargetSurveyId($this->params['id']);
                }

                if ($surveyId === null && isset($this->params['surveyCode'])) {
                        $code = trim((string)$this->params['surveyCode']);
                        if ($code !== '') {
                                $surveyId = $this->fetchTargetSurveyIdByCode($code);
                        }
                }

                if ($surveyId === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: survey not found', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $targetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
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

                if ($this->canManageTargetSurvey($targetRow, $loginUserCode) == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $userCodes = array();
                if (isset($this->params['userCodes']) && is_array($this->params['userCodes'])) {
                        $userCodes = $this->params['userCodes'];
                }

                $normalizedTargets = array();
                foreach ($userCodes as $entry) {
                        if ($entry === null) {
                                continue;
                        }
                        $raw = trim((string)$entry);
                        if ($raw === '') {
                                continue;
                        }
                        $normalized = $this->normalizeUserCodeValue($raw);
                        if ($normalized === '') {
                                continue;
                        }
                        $normalizedTargets[$normalized] = $raw;
                }

                if (count($normalizedTargets) === 0) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                $assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();

                $acknowledgements = $this->fetchTargetSurveyAcknowledgements(array($surveyId));
                $ackLookup = $this->indexTargetSurveyAcknowledgements($acknowledgements);
                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $responseLookup = $this->buildTargetSurveyResponseLookup(array($surveyId), $itemLookup);
                $surveyKey = (string)$surveyId;
                $recipientAck = isset($ackLookup[$surveyKey]) ? $ackLookup[$surveyKey] : array();
                $recipientResponses = isset($responseLookup[$surveyKey]) ? $responseLookup[$surveyKey] : array();
                $recipients = $this->buildTargetSurveyRecipients($targetRow, $assignedUsers, $recipientAck, $recipientResponses);

                $eligible = array();
                foreach ($recipients as $recipient) {
                        if (!is_array($recipient)) {
                                continue;
                        }
                        $code = isset($recipient['userCode']) ? trim((string)$recipient['userCode']) : '';
                        if ($code === '') {
                                continue;
                        }
                        $normalized = $this->normalizeUserCodeValue($code);
                        if ($normalized === '') {
                                continue;
                        }
                        $role = isset($recipient['role']) ? strtolower((string)$recipient['role']) : '';
                        if ($role !== '' && $role !== 'participant') {
                                continue;
                        }
                        if (isset($recipient['isActive']) && $recipient['isActive'] === false) {
                                continue;
                        }
                        $eligible[$normalized] = $code;
                }

                $targets = array();
                foreach ($normalizedTargets as $normalized => $raw) {
                        if (isset($eligible[$normalized])) {
                                $targets[$normalized] = $eligible[$normalized];
                        }
                }

                if (count($targets) === 0) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $pdo = $this->getPDOTarget();

                try {
                        $stmt = $pdo->prepare(
                                                                  'INSERT INTO targetSurveyAcknowledgements (targetSurveyId, userCode, acknowledgedAt) '
                                                                  . 'VALUES (?, ?, NULL) '
                                                                  . 'ON CONFLICT(targetSurveyId, userCode) DO UPDATE SET acknowledgedAt = NULL'
                                                                  );
                        foreach ($targets as $code) {
                                $stmt->execute(array($surveyId, $code));
                        }
                } catch (Exception $exception) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database';
                        return;
                }

                $acknowledgements = $this->fetchTargetSurveyAcknowledgements(array($surveyId));
                $ackLookup = $this->indexTargetSurveyAcknowledgements($acknowledgements);
                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $responseLookup = $this->buildTargetSurveyResponseLookup(array($surveyId), $itemLookup);
                $payload = $this->buildTargetSurveyPayload($surveyRow, $targetRow, $assignedUsers, $ackLookup, $itemLookup, $responseLookup);

                $this->response = array('survey' => $payload);
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveySubmit()
        {
                $surveyId = null;
                if (isset($this->params['id'])) {
                        $surveyId = $this->filterTargetSurveyId($this->params['id']);
                }

                if ($surveyId === null && isset($this->params['surveyCode'])) {
                        $code = trim((string)$this->params['surveyCode']);
                        if ($code !== '') {
                                $surveyId = $this->fetchTargetSurveyIdByCode($code);
                        }
                }

                if ($surveyId === null) {
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

                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyTargetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
                if ($surveyTargetCode !== '' && $surveyTargetCode !== $targetCode) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: mismatched targetCode', array('surveyId' => $surveyId, 'surveyTargetCode' => $surveyTargetCode, 'requestTargetCode' => $targetCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $isGuestMode = isset($surveyRow['isGuestMode']) ? ((int)$surveyRow['isGuestMode'] !== 0) : false;

                $loginUserCode = $this->getLoginUserCode();
                $userCodeRaw = isset($this->params['userCode']) ? trim((string)$this->params['userCode']) : '';
                $userCode = $userCodeRaw !== '' ? $userCodeRaw : $loginUserCode;
                $guestResponse = false;
                if ($isGuestMode && $userCode === '') {
                        $userCode = 'guest-' . $this->generateUniqid();
                        $guestResponse = true;
                }
                if ($userCode === null || $userCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $normalizedLogin = $this->normalizeUserCodeValue($loginUserCode);
                $normalizedUser = $this->normalizeUserCodeValue($userCode);
                $canManage = $this->canManageTargetSurvey($targetRow, $loginUserCode);

                if ($canManage == false) {
                        if ($normalizedLogin === '') {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'permission';
                                return;
                        }
                        if ($guestResponse === false && $normalizedLogin !== $normalizedUser) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'permission';
                                return;
                        }
                        if ($this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) == false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'permission';
                                return;
                        }
                }

                $nowTimestamp = time();
                $startTimestamp = isset($surveyRow['startAt']) ? strtotime($surveyRow['startAt']) : null;
                $endTimestamp = isset($surveyRow['endAt']) ? strtotime($surveyRow['endAt']) : null;
                if (($startTimestamp !== false && $startTimestamp !== null && $startTimestamp > $nowTimestamp)
                    || ($endTimestamp !== false && $endTimestamp !== null && $endTimestamp < $nowTimestamp)) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $answerEntries = array();
                if (isset($this->params['answers']) && is_array($this->params['answers'])) {
                        $answerEntries = $this->params['answers'];
                } elseif (isset($this->params['responses']) && is_array($this->params['responses'])) {
                        $answerEntries = $this->params['responses'];
                }

                $answerMap = array();
                foreach ($answerEntries as $entry) {
                        if (!is_array($entry)) {
                                continue;
                        }
                        $itemId = null;
                        if (isset($entry['itemId'])) {
                                $itemId = $this->filterTargetSurveyItemId($entry['itemId']);
                        }
                        if ($itemId === null && isset($entry['surveyItemId'])) {
                                $itemId = $this->filterTargetSurveyItemId($entry['surveyItemId']);
                        }
                        if ($itemId === null && isset($entry['targetSurveyItemId'])) {
                                $itemId = $this->filterTargetSurveyItemId($entry['targetSurveyItemId']);
                        }
                        if ($itemId === null) {
                                continue;
                        }
                        $answerMap[(string)$itemId] = $entry;
                }

                $respondedAt = null;
                if (array_key_exists('respondedAt', $this->params)) {
                        $respondedAt = Util::normalizeOptionalString($this->params['respondedAt'], 64);
                        if ($respondedAt === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                }

                $pdo = $this->getPDOTarget();
                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $items = isset($itemLookup[(string)$surveyId]) ? $itemLookup[(string)$surveyId] : array();
                $now = date('Y-m-d H:i:s');
                if ($respondedAt === null || $respondedAt === '') {
                        $respondedAt = $now;
                }

                try {
                        $pdo->beginTransaction();

                        $responseId = null;
                        $appendResponse = $isGuestMode;
                        $responseAction = null;

                        if ($guestResponse || $appendResponse) {
                                $insertResponse = $pdo->prepare('INSERT INTO targetSurveyResponses (targetSurveyId, userCode, respondedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)');
                                $insertResponse->execute(array($surveyId, $userCode, $respondedAt, $now, $now));
                                $responseId = (int)$pdo->lastInsertId();
                                $responseAction = 'insert';
                        } else {
                                $existingStmt = $pdo->prepare('SELECT id FROM targetSurveyResponses WHERE targetSurveyId = ? AND userCode = ? LIMIT 1');
                                $existingStmt->execute(array($surveyId, $userCode));
                                $existingId = $existingStmt->fetchColumn();
                                if ($existingId !== false && $existingId !== null) {
                                        $responseId = (int)$existingId;
                                        $updateStmt = $pdo->prepare('UPDATE targetSurveyResponses SET respondedAt = ?, updatedAt = ? WHERE id = ?');
                                        $updateStmt->execute(array($respondedAt, $now, $responseId));
                                        $responseAction = 'update';
                                } else {
                                        $insertResponse = $pdo->prepare('INSERT INTO targetSurveyResponses (targetSurveyId, userCode, respondedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)');
                                        $insertResponse->execute(array($surveyId, $userCode, $respondedAt, $now, $now));
                                        $responseId = (int)$pdo->lastInsertId();
                                        $responseAction = 'insert';
                                }
                        }

                        $deleteStmt = $pdo->prepare('DELETE FROM targetSurveyResponseItems WHERE responseId = ?');
                        $deleteStmt->execute(array($responseId));

                        $insertItem = $pdo->prepare('INSERT INTO targetSurveyResponseItems (responseId, surveyItemId, value, text, json, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');

                        foreach ($items as $item) {
                                if (!is_array($item)) {
                                        continue;
                                }
                                $itemId = isset($item['id']) ? (int)$item['id'] : 0;
                                if ($itemId <= 0) {
                                        continue;
                                }
                                $key = (string)$itemId;
                                $normalizedAnswer = isset($answerMap[$key]) ? $this->normalizeTargetSurveyAnswerForStorage($item, $answerMap[$key]) : null;
                                $isRequired = isset($item['isRequired']) ? ((int)$item['isRequired'] !== 0) : false;
                                if ($normalizedAnswer === false) {
                                        if ($pdo->inTransaction()) {
                                                $pdo->rollBack();
                                        }
                                        $this->status = parent::RESULT_ERROR;
                                        $this->errorReason = 'invalid';
                                        return;
                                }
                                if ($normalizedAnswer === null && $isRequired) {
                                        if ($pdo->inTransaction()) {
                                                $pdo->rollBack();
                                        }
                                        $this->status = parent::RESULT_ERROR;
                                        $this->errorReason = 'invalid';
                                        return;
                                }
                                if ($normalizedAnswer === null) {
                                        continue;
                                }

                                $insertItem->execute(array(
                                        $responseId,
                                        $itemId,
                                        isset($normalizedAnswer['value']) ? $normalizedAnswer['value'] : null,
                                        isset($normalizedAnswer['text']) ? $normalizedAnswer['text'] : null,
                                        isset($normalizedAnswer['json']) ? $normalizedAnswer['json'] : null,
                                        $now,
                                        $now,
                                ));
                        }

                        if ($guestResponse == false) {
                                $ackStmt = $pdo->prepare(
                                                                'INSERT INTO targetSurveyAcknowledgements (targetSurveyId, userCode, acknowledgedAt) '
                                                                . 'VALUES (?, ?, ?) '
                                                                . 'ON CONFLICT(targetSurveyId, userCode) DO UPDATE SET acknowledgedAt = excluded.acknowledgedAt'
                                                                );
                                $ackStmt->execute(array($surveyId, $userCode, $respondedAt));
                        }

                        $pdo->commit();

                        if ($isGuestMode && $responseAction !== null) {
                                $this->logSurveyEvent('procTargetSurveySubmit guest response ' . $responseAction, array(
                                        'surveyId' => $surveyId,
                                        'targetCode' => $targetCode,
                                        'userCode' => $userCode,
                                        'responseId' => $responseId,
                                        'guestResponse' => $guestResponse,
                                ));
                        }
                } catch (Exception $exception) {
                        if ($pdo->inTransaction()) {
                                $pdo->rollBack();
                        }
                        $this->logSurveyEvent('procTargetSurveyCreate failed during insert', array('targetCode' => $targetCode, 'exception' => $exception->getMessage()));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                $assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();
                $acknowledgements = $this->fetchTargetSurveyAcknowledgements(array($surveyId));
                $ackLookup = $this->indexTargetSurveyAcknowledgements($acknowledgements);
                $responseLookup = $this->buildTargetSurveyResponseLookup(array($surveyId), $itemLookup);

                $payload = $this->buildTargetSurveyPayload($surveyRow, $targetRow, $assignedUsers, $ackLookup, $itemLookup, $responseLookup);

                $this->response = $payload !== null ? $payload : array('respondedAt' => $respondedAt);
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyResponseDelete()
        {
                $surveyId = null;
                if (isset($this->params['id'])) {
                        $surveyId = $this->filterTargetSurveyId($this->params['id']);
                }

                if ($surveyId === null && isset($this->params['surveyCode'])) {
                        $code = trim((string)$this->params['surveyCode']);
                        if ($code !== '') {
                                $surveyId = $this->fetchTargetSurveyIdByCode($code);
                        }
                }

                if ($surveyId === null) {
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

                $userCodeRaw = isset($this->params['userCode']) ? $this->params['userCode'] : '';
                $userCode = trim((string)$userCodeRaw);
                if ($userCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyTargetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
                if ($surveyTargetCode !== '' && $surveyTargetCode !== $targetCode) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
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

                if ($this->canManageTargetSurvey($targetRow, $loginUserCode) == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $userInfo = $this->getUserInfo($userCode);
                if ($userInfo == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $pdo = $this->getPDOTarget();
                $now = date('Y-m-d H:i:s');

                try {
                        $pdo->beginTransaction();

                        $responseStmt = $pdo->prepare('SELECT id FROM targetSurveyResponses WHERE targetSurveyId = ? AND userCode = ? LIMIT 1');
                        $responseStmt->execute(array($surveyId, $userCode));
                        $responseId = $responseStmt->fetchColumn();

                        if ($responseId !== false && $responseId !== null) {
                                $deleteItems = $pdo->prepare('DELETE FROM targetSurveyResponseItems WHERE responseId = ?');
                                $deleteItems->execute(array((int)$responseId));

                                $deleteResponse = $pdo->prepare('DELETE FROM targetSurveyResponses WHERE id = ?');
                                $deleteResponse->execute(array((int)$responseId));
                        }

                        $deleteAck = $pdo->prepare('DELETE FROM targetSurveyAcknowledgements WHERE targetSurveyId = ? AND userCode = ?');
                        $deleteAck->execute(array($surveyId, $userCode));

                        $pdo->commit();
                } catch (Exception $exception) {
                        if ($pdo->inTransaction()) {
                                $pdo->rollBack();
                        }
                        $this->logSurveyEvent('procTargetSurveyCreate failed during insert', array('targetCode' => $targetCode, 'exception' => $exception->getMessage()));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $acknowledgements = $this->fetchTargetSurveyAcknowledgements(array($surveyId));
                $ackLookup = $this->indexTargetSurveyAcknowledgements($acknowledgements);
                $responseLookup = $this->buildTargetSurveyResponseLookup(array($surveyId), $itemLookup);
                $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                $assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();
                $payload = $this->buildTargetSurveyPayload($surveyRow, $targetRow, $assignedUsers, $ackLookup, $itemLookup, $responseLookup);

                $this->response = $payload !== null ? $payload : array('deleted' => true);
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyItemCreate()
        {
                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                if ($targetCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $surveyId = $this->filterTargetSurveyId($this->params['targetSurveyId']);
                if ($surveyId === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $kindValue = $this->normalizeTargetSurveyItemKindValue($this->params['kind']);
                if ($kindValue === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $titleValue = Util::normalizeOptionalString(isset($this->params['title']) ? $this->params['title'] : '', 256);
                if ($titleValue === false) {
                        $titleValue = '';
                }

                $descriptionValue = Util::normalizeOptionalString(isset($this->params['description']) ? $this->params['description'] : '', 2048);
                if ($descriptionValue === false) {
                        $descriptionValue = '';
                }

                $isRequired = $this->normalizeBooleanParam($this->params['isRequired'] ?? ($this->params['required'] ?? null), false);

                $position = null;
                if (isset($this->params['position'])) {
                        $position = $this->normalizeTargetSurveyItemPosition($this->params['position']);
                        if ($position === null) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                }

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: target not found', array('surveyId' => $surveyId, 'targetCode' => $targetCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: survey not found', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyTargetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
                if ($surveyTargetCode !== '' && $surveyTargetCode !== $targetCode) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: mismatched targetCode', array('surveyId' => $surveyId, 'surveyTargetCode' => $surveyTargetCode, 'requestTargetCode' => $targetCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $creatorUserCode = $this->getLoginUserCode();
                if ($creatorUserCode === null || $creatorUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                if ($this->canManageTargetSurvey($targetRow, $creatorUserCode) == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $pdo = $this->getPDOTarget();
                $now = date('Y-m-d H:i:s');

                try {
                        $pdo->beginTransaction();

                        if ($position === null) {
                                $posStmt = $pdo->prepare('SELECT COALESCE(MAX(position), 0) FROM targetSurveyItem WHERE targetSurveyId = ? AND (isDeleted IS NULL OR isDeleted = 0)');
                                $posStmt->execute(array($surveyId));
                                $position = ((int)$posStmt->fetchColumn()) + 1;
                        }

                        $stmt = $pdo->prepare('INSERT INTO targetSurveyItem (targetSurveyId, title, description, kind, position, isRequired, createdAt, updatedAt, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)');
                        $stmt->execute(array($surveyId, $titleValue, $descriptionValue, $kindValue, $position, $isRequired ? 1 : 0, $now, $now));

                        $itemId = (int)$pdo->lastInsertId();
                        $pdo->commit();
                } catch (Exception $exception) {
                        if ($pdo->inTransaction()) {
                                $pdo->rollBack();
                        }
                        $this->logSurveyEvent('procTargetSurveyCreate failed during insert', array('targetCode' => $targetCode, 'exception' => $exception->getMessage()));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $itemPayload = $this->findTargetSurveyItemPayload($itemLookup, $itemId);
                $surveyPayload = $this->buildTargetSurveyPayloadForSurvey($surveyRow, $targetRow);

                $this->response = array(
                        'item' => $itemPayload,
                        'items' => isset($itemLookup[(string)$surveyId]) ? $itemLookup[(string)$surveyId] : array(),
                        'survey' => $surveyPayload !== null ? $surveyPayload : array(),
                );
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyItemUpdate()
        {
                $itemId = $this->filterTargetSurveyItemId($this->params['id']);
                if ($itemId === null) {
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

                $itemRow = $this->fetchTargetSurveyItemById($itemId);
                if ($itemRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyId = isset($itemRow['targetSurveyId']) ? (int)$itemRow['targetSurveyId'] : 0;
                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyTargetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
                if ($surveyTargetCode !== '' && $surveyTargetCode !== $targetCode) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $kindValue = null;
                if (isset($this->params['kind'])) {
                        $kindValue = $this->normalizeTargetSurveyItemKindValue($this->params['kind']);
                        if ($kindValue === null) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                }

                $position = null;
                if (isset($this->params['position'])) {
                        $position = $this->normalizeTargetSurveyItemPosition($this->params['position']);
                        if ($position === null) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                }

                $titleValue = null;
                if (isset($this->params['title'])) {
                        $titleValue = Util::normalizeOptionalString($this->params['title'], 256);
                        if ($titleValue === false) {
                                $titleValue = '';
                        }
                }

                $descriptionValue = null;
                if (isset($this->params['description'])) {
                        $descriptionValue = Util::normalizeOptionalString($this->params['description'], 2048);
                        if ($descriptionValue === false) {
                                $descriptionValue = '';
                        }
                }

                $isRequired = null;
                if (array_key_exists('isRequired', $this->params) || array_key_exists('required', $this->params)) {
                        $isRequired = $this->normalizeBooleanParam(
                                $this->params['isRequired'] ?? $this->params['required'],
                                isset($itemRow['isRequired']) ? ((int)$itemRow['isRequired'] !== 0) : false
                        );
                }

                $updaterUserCode = $this->getLoginUserCode();
                if ($updaterUserCode === null || $updaterUserCode === '') {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: missing updater', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                if ($this->canManageTargetSurvey($targetRow, $updaterUserCode) == false) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: permission denied', array('surveyId' => $surveyId, 'updaterUserCode' => $updaterUserCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $resolvedKind = $kindValue !== null ? $kindValue : (isset($itemRow['kind']) ? $itemRow['kind'] : '');
                if ($resolvedKind === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $resolvedTitle = $titleValue !== null ? $titleValue : (isset($itemRow['title']) ? $itemRow['title'] : '');
                $resolvedDescription = $descriptionValue !== null ? $descriptionValue : (isset($itemRow['description']) ? $itemRow['description'] : '');
                $resolvedPosition = $position !== null ? $position : (isset($itemRow['position']) ? (int)$itemRow['position'] : 0);
                $resolvedRequired = $isRequired !== null ? $isRequired : (isset($itemRow['isRequired']) ? ((int)$itemRow['isRequired'] !== 0) : false);

                $pdo = $this->getPDOTarget();
                $now = date('Y-m-d H:i:s');

                try {
                        $stmt = $pdo->prepare('UPDATE targetSurveyItem SET title = ?, description = ?, kind = ?, position = ?, isRequired = ?, updatedAt = ? WHERE id = ?');
                        $stmt->execute(array($resolvedTitle, $resolvedDescription, $resolvedKind, $resolvedPosition, $resolvedRequired ? 1 : 0, $now, $itemId));
                } catch (Exception $exception) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $itemPayload = $this->findTargetSurveyItemPayload($itemLookup, $itemId);
                $surveyPayload = $this->buildTargetSurveyPayloadForSurvey($surveyRow, $targetRow);

                $this->response = array(
                        'item' => $itemPayload,
                        'items' => isset($itemLookup[(string)$surveyId]) ? $itemLookup[(string)$surveyId] : array(),
                        'survey' => $surveyPayload !== null ? $surveyPayload : array(),
                );
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyItemDelete()
        {
                $itemId = $this->filterTargetSurveyItemId($this->params['id']);
                if ($itemId === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $itemRow = $this->fetchTargetSurveyItemById($itemId);
                if ($itemRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyId = isset($itemRow['targetSurveyId']) ? (int)$itemRow['targetSurveyId'] : 0;
                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $targetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
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

                if ($this->canManageTargetSurvey($targetRow, $loginUserCode) == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $pdo = $this->getPDOTarget();
                $now = date('Y-m-d H:i:s');

                try {
                        $stmt = $pdo->prepare('UPDATE targetSurveyItem SET isDeleted = 1, updatedAt = ? WHERE id = ?');
                        $stmt->execute(array($now, $itemId));

                        $kindStmt = $pdo->prepare('UPDATE targetSurveyItemKind SET isDeleted = 1, updatedAt = ? WHERE targetSurveyItemId = ?');
                        $kindStmt->execute(array($now, $itemId));
                } catch (Exception $exception) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $surveyPayload = $this->buildTargetSurveyPayloadForSurvey($surveyRow, $targetRow);

                $this->response = array(
                        'deleted' => true,
                        'items' => isset($itemLookup[(string)$surveyId]) ? $itemLookup[(string)$surveyId] : array(),
                        'survey' => $surveyPayload !== null ? $surveyPayload : array(),
                );
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyItemKindList()
        {
                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                if ($targetCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $itemId = $this->filterTargetSurveyItemId($this->params['targetSurveyItemId']);
                if ($itemId === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $itemRow = $this->fetchTargetSurveyItemById($itemId);
                if ($itemRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyId = isset($itemRow['targetSurveyId']) ? (int)$itemRow['targetSurveyId'] : 0;
                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyTargetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
                if ($surveyTargetCode !== '' && $surveyTargetCode !== $targetCode) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
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

                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $item = $this->findTargetSurveyItemPayload($itemLookup, $itemId);
                $kinds = is_array($item) && isset($item['kinds']) ? $item['kinds'] : array();

                $this->response = array(
                        'item' => $item,
                        'kinds' => $kinds,
                );
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyItemKindCreate()
        {
                $targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
                if ($targetCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $itemId = $this->filterTargetSurveyItemId($this->params['targetSurveyItemId']);
                if ($itemId === null) {
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

                $itemRow = $this->fetchTargetSurveyItemById($itemId);
                if ($itemRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyId = isset($itemRow['targetSurveyId']) ? (int)$itemRow['targetSurveyId'] : 0;
                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyTargetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
                if ($surveyTargetCode !== '' && $surveyTargetCode !== $targetCode) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $creatorUserCode = $this->getLoginUserCode();
                if ($creatorUserCode === null || $creatorUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                if ($this->canManageTargetSurvey($targetRow, $creatorUserCode) == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $pdo = $this->getPDOTarget();
                $now = date('Y-m-d H:i:s');

                try {
                        $stmt = $pdo->prepare('INSERT INTO targetSurveyItemKind (targetSurveyItemId, title, createdAt, updatedAt, isDeleted) VALUES (?, ?, ?, ?, 0)');
                        $stmt->execute(array($itemId, $title, $now, $now));
                        $kindId = (int)$pdo->lastInsertId();
                } catch (Exception $exception) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $itemPayload = $this->findTargetSurveyItemPayload($itemLookup, $itemId);
                $surveyPayload = $this->buildTargetSurveyPayloadForSurvey($surveyRow, $targetRow);

                $kindPayload = array();
                $kindRow = $this->fetchTargetSurveyItemKindById($kindId);
                if ($kindRow != null) {
                        $kindMap = $this->indexTargetSurveyItemKinds(array($kindRow));
                        $kindPayload = isset($kindMap[(string)$itemId]) && isset($kindMap[(string)$itemId][0]) ? $kindMap[(string)$itemId][0] : array();
                }

                $this->response = array(
                        'kind' => $kindPayload,
                        'item' => $itemPayload,
                        'survey' => $surveyPayload !== null ? $surveyPayload : array(),
                );
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyItemKindUpdate()
        {
                $kindId = $this->filterTargetSurveyItemId($this->params['id']);
                if ($kindId === null) {
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

                $title = Util::normalizeRequiredString($this->params['title'], 256);
                if ($title === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $kindRow = $this->fetchTargetSurveyItemKindById($kindId);
                if ($kindRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $itemId = isset($kindRow['targetSurveyItemId']) ? (int)$kindRow['targetSurveyItemId'] : 0;
                $itemRow = $this->fetchTargetSurveyItemById($itemId);
                if ($itemRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyId = isset($itemRow['targetSurveyId']) ? (int)$itemRow['targetSurveyId'] : 0;
                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyTargetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
                if ($surveyTargetCode !== '' && $surveyTargetCode !== $targetCode) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                if ($targetRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $updaterUserCode = $this->getLoginUserCode();
                if ($updaterUserCode === null || $updaterUserCode === '') {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: missing updater', array('surveyId' => $surveyId));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                if ($this->canManageTargetSurvey($targetRow, $updaterUserCode) == false) {
                        $this->logSurveyEvent('procTargetSurveyUpdate abort: permission denied', array('surveyId' => $surveyId, 'updaterUserCode' => $updaterUserCode));
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $pdo = $this->getPDOTarget();
                $now = date('Y-m-d H:i:s');

                try {
                        $stmt = $pdo->prepare('UPDATE targetSurveyItemKind SET title = ?, updatedAt = ? WHERE id = ?');
                        $stmt->execute(array($title, $now, $kindId));
                } catch (Exception $exception) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $itemPayload = $this->findTargetSurveyItemPayload($itemLookup, $itemId);
                $surveyPayload = $this->buildTargetSurveyPayloadForSurvey($surveyRow, $targetRow);

                $kindPayload = array();
                $kindRow = $this->fetchTargetSurveyItemKindById($kindId);
                if ($kindRow != null) {
                        $kindMap = $this->indexTargetSurveyItemKinds(array($kindRow));
                        $kindPayload = isset($kindMap[(string)$itemId]) && isset($kindMap[(string)$itemId][0]) ? $kindMap[(string)$itemId][0] : array();
                }

                $this->response = array(
                        'kind' => $kindPayload,
                        'item' => $itemPayload,
                        'survey' => $surveyPayload !== null ? $surveyPayload : array(),
                );
                $this->refreshTargetSurveyessionToken();
        }



        public function procTargetSurveyItemKindDelete()
        {
                $kindId = $this->filterTargetSurveyItemId($this->params['id']);
                if ($kindId === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $kindRow = $this->fetchTargetSurveyItemKindById($kindId);
                if ($kindRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $itemId = isset($kindRow['targetSurveyItemId']) ? (int)$kindRow['targetSurveyItemId'] : 0;
                $itemRow = $this->fetchTargetSurveyItemById($itemId);
                if ($itemRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $surveyId = isset($itemRow['targetSurveyId']) ? (int)$itemRow['targetSurveyId'] : 0;
                $surveyRow = $this->fetchTargetSurveyById($surveyId);
                if ($surveyRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $targetCode = isset($surveyRow['targetCode']) ? trim((string)$surveyRow['targetCode']) : '';
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

                if ($this->canManageTargetSurvey($targetRow, $loginUserCode) == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $pdo = $this->getPDOTarget();
                $now = date('Y-m-d H:i:s');

                try {
                        $stmt = $pdo->prepare('UPDATE targetSurveyItemKind SET isDeleted = 1, updatedAt = ? WHERE id = ?');
                        $stmt->execute(array($now, $kindId));
                } catch (Exception $exception) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'failed';
                        return;
                }

                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $itemPayload = $this->findTargetSurveyItemPayload($itemLookup, $itemId);
                $surveyPayload = $this->buildTargetSurveyPayloadForSurvey($surveyRow, $targetRow);

                $this->response = array(
                        'deleted' => true,
                        'item' => $itemPayload,
                        'survey' => $surveyPayload !== null ? $surveyPayload : array(),
                );
                $this->refreshTargetSurveyessionToken();
        }



        private function resolveTargetSurveyAuthClaims(): ?array
	{
		$payload = $this->getAuthPayload();
		if (!is_array($payload) || empty($payload)) {
			try {
				$payload = $this->requireAuth();
			} catch (\Throwable $throwable) {
				$this->logTargetSurveyTokenError(
													   '[WARN] Failed to load auth payload while resolving target survey claims',
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
			$this->logTargetSurveyTokenError(
												   sprintf('[WARN] Target survey auth claims unavailable; missing identifiers: %s', implode(', ', $missingIdentifiers)),
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

	private function issueTargetSurveyAuthToken(array $claims): ?string
	{
		try {
			$token = $this->issueJwt($claims);
			$this->setAuthPayload($claims);
			$this->syncSessionWithAuthPayload($claims, true);
			$this->setAuthTokenCookie($token, self::AUTH_TOKEN_TTL);
			return $token;
		} catch (\Throwable $throwable) {
			$this->logTargetSurveyTokenError(
												   '[ERROR] Failed to issue target survey auth token',
												   array('exception' => $throwable, 'claims' => $claims)
												   );
			throw $throwable;
		}
	}

	private function refreshTargetSurveyessionToken(): void
	{
		$claims = $this->resolveTargetSurveyAuthClaims();
		if ($claims === null) {
			$this->logTargetSurveyTokenError(
												   '[ERROR] Target survey auth claims unavailable; aborting token refresh'
												   );
			throw new RuntimeException('Failed to resolve target survey auth claims for session token refresh');
		}

		$token = $this->issueTargetSurveyAuthToken($claims);
		if (!is_string($token) || $token === '') {
			$this->logTargetSurveyTokenError(
												   '[ERROR] Issued an empty target survey auth token',
												   array('claims' => $claims)
												   );
			throw new RuntimeException('Failed to issue target survey session token');
		}

		$this->setSessionResponse(array('token' => $token));
		$this->injectTokenIntoResponse($token);
	}

        private function logTargetSurveyTokenError($message, array $context = array()): void
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
                        $encoded = '[TargetManagement-Survey] ' . $message;
                }

                Base::writeLog($encoded, 'target-management');
        }

        private function ensureTargetSurveySchema(PDO $pdo)
        {
                if ($this->targetSurveySchemaEnsured) {
                        return;
                }

                $this->targetSurveySchemaEnsured = true;

                try {
                        $stmt = $pdo->query('PRAGMA table_info(targetSurvey)');
                        $hasIsGuestMode = false;
                        $hasRecipientsJson = false;
                        if ($stmt !== false) {
                                while ($column = $stmt->fetch(PDO::FETCH_ASSOC)) {
                                        if (isset($column['name']) && $column['name'] === 'isGuestMode') {
                                                $hasIsGuestMode = true;
                                        }
                                        if (isset($column['name']) && $column['name'] === 'recipientsJson') {
                                                $hasRecipientsJson = true;
                                        }
                                }
                        }

                        if ($hasIsGuestMode === false) {
                                try {
                                        $pdo->exec('ALTER TABLE targetSurvey ADD COLUMN isGuestMode INTEGER NOT NULL DEFAULT 0');
                                } catch (Exception $exception) {
                                        // 別プロセスで追加された場合は無視する
                                }
                        }

                        if ($hasRecipientsJson === false) {
                                try {
                                        $pdo->exec('ALTER TABLE targetSurvey ADD COLUMN recipientsJson TEXT DEFAULT "[]"');
                                } catch (Exception $exception) {
                                        // 別プロセスで追加された場合は無視する
                                }
                        }

                        $pdo->exec('UPDATE targetSurvey SET isGuestMode = 0 WHERE isGuestMode IS NULL');
                        $pdo->exec("UPDATE targetSurvey SET recipientsJson = '[]' WHERE recipientsJson IS NULL OR recipientsJson = ''");
                } catch (Exception $exception) {
                        throw $exception;
                }
        }

        private function loadTargetSurveyCollections($targetRow)
        {
                if ($targetRow == null || !is_array($targetRow)) {
                        return array('survey' => array(), 'acknowledgements' => array());
		}

		$targetCode = isset($targetRow['targetCode']) ? trim((string)$targetRow['targetCode']) : '';
		if ($targetCode === '') {
			return array('survey' => array(), 'acknowledgements' => array());
		}


                $pdo = $this->getPDOTarget();
                $this->ensureTargetSurveySchema($pdo);

                $stmt = $pdo->prepare(
                                                           'SELECT id, surveyCode, targetCode, title, content, startAt, endAt, isGuestMode, recipientsJson, createdByUserCode, createdAt, updatedAt, displayOrder '
                                                            . 'FROM targetSurvey WHERE targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0) '
                                                            . 'ORDER BY displayOrder ASC, datetime(createdAt) DESC, id DESC'
                                                            );
		$stmt->execute(array($targetCode));
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$surveyIds = array();
		foreach ($rows as $row) {
			if (!is_array($row)) {
				continue;
			}
			$id = isset($row['id']) ? (int)$row['id'] : 0;
			if ($id > 0) {
				$surveyIds[] = $id;
			}
		}

                $acknowledgements = $this->fetchTargetSurveyAcknowledgements($surveyIds);
                $ackLookup = $this->indexTargetSurveyAcknowledgements($acknowledgements);

                $itemLookup = $this->buildTargetSurveyItemLookup($surveyIds);
                $responseLookup = $this->buildTargetSurveyResponseLookup($surveyIds, $itemLookup);

                $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                $assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();

                $survey = array();
                foreach ($rows as $row) {
                        if (!is_array($row)) {
                                continue;
                        }
                        $payload = $this->buildTargetSurveyPayload($row, $targetRow, $assignedUsers, $ackLookup, $itemLookup, $responseLookup);
                        if ($payload !== null) {
                                $survey[] = $payload;
                        }
                }

		return array('survey' => $survey, 'acknowledgements' => $acknowledgements);
	}



        private function fetchTargetSurveyById($surveyId)
        {
                if ($surveyId === null) {
                        return null;
                }

		$id = (int)$surveyId;
                if ($id <= 0) {
                        return null;
                }


                $pdo = $this->getPDOTarget();
                $this->ensureTargetSurveySchema($pdo);
                $stmt = $pdo->prepare(
                                                            'SELECT id, surveyCode, targetCode, title, content, startAt, endAt, isGuestMode, recipientsJson, createdByUserCode, createdAt, updatedAt, displayOrder, isDeleted '
                                                            . 'FROM targetSurvey WHERE id = ? LIMIT 1'
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



        private function filterTargetSurveyId($value)
        {
                $options = array('options' => array('min_range' => 1));
                $id = filter_var($value, FILTER_VALIDATE_INT, $options);
                if ($id === false || $id === null) {
                        return null;
                }

                return (int)$id;
        }


        private function fetchTargetSurveyIdByCode($surveyCode)
        {
                $code = trim((string)$surveyCode);
                if ($code === '') {
                        return null;
                }

                $stmt = $this->getPDOTarget()->prepare('SELECT id FROM targetSurvey WHERE surveyCode = ? AND (isDeleted IS NULL OR isDeleted = 0) LIMIT 1');
                $stmt->execute(array($code));

                $id = $stmt->fetchColumn();
                if ($id === false || $id === null) {
                        return null;
                }

                return (int)$id;
        }



	private function fetchTargetSurveyAcknowledgements($surveyIds)
	{
		$list = array();
		if (!is_array($surveyIds) || count($surveyIds) === 0) {
			return $list;
		}

		$ids = array();
		foreach ($surveyIds as $id) {
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
											   'SELECT targetSurveyId, userCode, acknowledgedAt FROM targetSurveyAcknowledgements '
											   . 'WHERE targetSurveyId IN (' . $placeholders . ')'
											   );
		$stmt->execute($ids);

		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			if (!is_array($row)) {
				continue;
			}
			$surveyId = isset($row['targetSurveyId']) ? (int)$row['targetSurveyId'] : 0;
			if ($surveyId <= 0) {
				continue;
			}
			$userCode = isset($row['userCode']) ? trim((string)$row['userCode']) : '';
			if ($userCode === '') {
				continue;
			}
			$ackAt = isset($row['acknowledgedAt']) ? Util::normalizeTimestampValue($row['acknowledgedAt']) : null;
			$list[] = array(
							'surveyId' => (string)$surveyId,
							'userCode' => $userCode,
							'acknowledgedAt' => $ackAt,
							);
		}

		return $list;
	}



        private function indexTargetSurveyAcknowledgements($acknowledgements)
        {
                $lookup = array();
                if (!is_array($acknowledgements)) {
                        return $lookup;
		}

		foreach ($acknowledgements as $ack) {
			if (!is_array($ack)) {
				continue;
			}
			$surveyId = isset($ack['surveyId']) ? (string)$ack['surveyId'] : '';
			if ($surveyId === '') {
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
                        if (isset($lookup[$surveyId]) == false) {
                                $lookup[$surveyId] = array();
                        }
                        $lookup[$surveyId][$normalized] = array(
                                                                                  'userCode' => $userCode,
                                                                                  'acknowledgedAt' => isset($ack['acknowledgedAt']) ? $ack['acknowledgedAt'] : null,
                                                                                  'hasAcknowledgement' => true,
                                                                                  );
                }

                return $lookup;
        }



        private function fetchTargetSurveyResponses($surveyIds)
        {
                $list = array();
                if (!is_array($surveyIds) || count($surveyIds) === 0) {
                        return $list;
                }

                $ids = array();
                foreach ($surveyIds as $id) {
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
                                                                                   'SELECT r.id, r.targetSurveyId, r.userCode, r.respondedAt, r.createdAt, r.updatedAt, s.isGuestMode '
                                                                                   . 'FROM targetSurveyResponses r '
                                                                                   . 'LEFT JOIN targetSurvey s ON s.id = r.targetSurveyId '
                                                                                   . 'WHERE r.targetSurveyId IN (' . $placeholders . ')'
                                                                                   );
                $stmt->execute($ids);

                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        if (!is_array($row)) {
                                continue;
                        }
                        $surveyId = isset($row['targetSurveyId']) ? (int)$row['targetSurveyId'] : 0;
                        $isGuestMode = isset($row['isGuestMode']) ? ((int)$row['isGuestMode'] !== 0) : false;
                        $userCode = isset($row['userCode']) ? trim((string)$row['userCode']) : '';
                        $responseId = isset($row['id']) ? (int)$row['id'] : 0;
                        if ($surveyId <= 0) {
                                continue;
                        }
                        if ($userCode === '' && $isGuestMode) {
                                $userCode = 'guest:' . ($responseId > 0 ? $responseId : $this->generateUniqid());
                                $row['isGuestResponse'] = true;
                                $row['guestDisplayName'] = $responseId > 0 ? ('ゲスト回答 #' . $responseId) : 'ゲスト回答';
                        }
                        $row['isGuestResponse'] = isset($row['isGuestResponse']) ? ((bool)$row['isGuestResponse']) : $isGuestMode;
                        $row['isGuestMode'] = $isGuestMode;
                        if ($userCode === '') {
                                continue;
                        }
                        $row['respondedAt'] = isset($row['respondedAt']) ? Util::normalizeTimestampValue($row['respondedAt']) : null;
                        $row['createdAt'] = isset($row['createdAt']) ? Util::normalizeTimestampValue($row['createdAt']) : null;
                        $row['updatedAt'] = isset($row['updatedAt']) ? Util::normalizeTimestampValue($row['updatedAt']) : null;
                        $list[] = $row;
                }

                return $list;
        }



        private function fetchTargetSurveyResponseItems($responseIds)
        {
                $list = array();
                if (!is_array($responseIds) || count($responseIds) === 0) {
                        return $list;
                }

                $ids = array();
                foreach ($responseIds as $id) {
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
                                                                                   'SELECT id, responseId, surveyItemId, value, text, json, createdAt, updatedAt '
                                                                                   . 'FROM targetSurveyResponseItems WHERE responseId IN (' . $placeholders . ')'
                                                                                   );
                $stmt->execute($ids);

                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        if (!is_array($row)) {
                                continue;
                        }
                        $row['createdAt'] = isset($row['createdAt']) ? Util::normalizeTimestampValue($row['createdAt']) : null;
                        $row['updatedAt'] = isset($row['updatedAt']) ? Util::normalizeTimestampValue($row['updatedAt']) : null;
                        $list[] = $row;
                }

                return $list;
        }



        private function normalizeTargetSurveyAnswerRow($row)
        {
                if (!is_array($row)) {
                        return null;
                }

                $itemId = isset($row['surveyItemId']) ? (int)$row['surveyItemId'] : 0;
                if ($itemId <= 0) {
                        return null;
                }

                $entry = array('itemId' => (string)$itemId);

                if (array_key_exists('value', $row) && $row['value'] !== null) {
                        $entry['value'] = $row['value'];
                }
                if (array_key_exists('text', $row) && $row['text'] !== null && $row['text'] !== '') {
                        $entry['text'] = $row['text'];
                        if (isset($entry['value']) == false) {
                                $entry['value'] = $row['text'];
                        }
                }
                if (array_key_exists('json', $row) && $row['json'] !== null && $row['json'] !== '') {
                        $decoded = json_decode($row['json'], true);
                        if (json_last_error() === JSON_ERROR_NONE) {
                                $entry['json'] = $decoded;
                                $entry['value'] = $decoded;
                        } else {
                                $entry['json'] = $row['json'];
                        }
                }

                return $entry;
        }



        private function normalizeTargetSurveyAnswerForStorage($item, $answer)
        {
                if (!is_array($item)) {
                        return null;
                }

                $kind = isset($item['kind']) ? $item['kind'] : '';
                $normalized = array('value' => null, 'text' => null, 'json' => null);

                if ($kind === 'text') {
                        $candidate = null;
                        if (is_array($answer)) {
                                if (array_key_exists('text', $answer)) {
                                        $candidate = $answer['text'];
                                } elseif (array_key_exists('value', $answer)) {
                                        $candidate = $answer['value'];
                                }
                        } else {
                                $candidate = $answer;
                        }

                        $textValue = Util::normalizeOptionalString($candidate, 4000);
                        if ($textValue === false) {
                                return false;
                        }
                        if ($textValue === null || $textValue === '') {
                                return null;
                        }

                        $normalized['text'] = $textValue;
                        $normalized['value'] = $textValue;
                        return $normalized;
                }

                if ($kind === 'choiceSingle') {
                        $candidate = null;
                        if (is_array($answer)) {
                                if (array_key_exists('value', $answer)) {
                                        $candidate = $answer['value'];
                                } elseif (array_key_exists('text', $answer)) {
                                        $candidate = $answer['text'];
                                }
                        } else {
                                $candidate = $answer;
                        }

                        if (is_array($candidate) && count($candidate) > 0) {
                                $candidate = $candidate[0];
                        }

                        $value = Util::normalizeOptionalString($candidate, 512);
                        if ($value === false) {
                                return false;
                        }
                        if ($value === null || $value === '') {
                                return null;
                        }

                        $normalized['value'] = $value;
                        return $normalized;
                }

                if ($kind === 'choiceMultiple') {
                        $values = array();
                        if (is_array($answer)) {
                                if (isset($answer['values']) && is_array($answer['values'])) {
                                        $values = $answer['values'];
                                } elseif (isset($answer['value']) && is_array($answer['value'])) {
                                        $values = $answer['value'];
                                } elseif (isset($answer['choices']) && is_array($answer['choices'])) {
                                        $values = $answer['choices'];
                                }
                        } elseif ($answer !== null) {
                                $values = array($answer);
                        }

                        $normalizedValues = array();
                        foreach ($values as $entry) {
                                $candidate = Util::normalizeOptionalString($entry, 512);
                                if ($candidate === false) {
                                        return false;
                                }
                                $candidate = $candidate === null ? '' : trim((string)$candidate);
                                if ($candidate !== '') {
                                        $normalizedValues[] = $candidate;
                                }
                        }

                        if (count($normalizedValues) === 0) {
                                return null;
                        }

                        $encoded = json_encode($normalizedValues);
                        if ($encoded === false) {
                                return false;
                        }

                        $normalized['json'] = $encoded;
                        return $normalized;
                }

                return null;
        }



        private function buildTargetSurveyResponseLookup($surveyIds, $itemLookup)
        {
                $lookup = array();
                if (!is_array($surveyIds) || count($surveyIds) === 0) {
                        return $lookup;
                }

                $responses = $this->fetchTargetSurveyResponses($surveyIds);
                $responseIds = array();
                foreach ($responses as $response) {
                        if (!is_array($response)) {
                                continue;
                        }
                        $responseId = isset($response['id']) ? (int)$response['id'] : 0;
                        if ($responseId > 0) {
                                $responseIds[] = $responseId;
                        }
                }

                $responseItems = $this->fetchTargetSurveyResponseItems($responseIds);
                $responseItemMap = array();
                foreach ($responseItems as $itemRow) {
                        $responseId = isset($itemRow['responseId']) ? (int)$itemRow['responseId'] : 0;
                        if ($responseId <= 0) {
                                continue;
                        }
                        if (isset($responseItemMap[$responseId]) == false) {
                                $responseItemMap[$responseId] = array();
                        }
                        $responseItemMap[$responseId][] = $itemRow;
                }

                $positionLookup = array();
                if (is_array($itemLookup)) {
                        foreach ($itemLookup as $itemsForSurvey) {
                                if (!is_array($itemsForSurvey)) {
                                        continue;
                                }
                                foreach ($itemsForSurvey as $item) {
                                        if (!is_array($item)) {
                                                continue;
                                        }
                                        $itemId = isset($item['id']) ? (int)$item['id'] : 0;
                                        if ($itemId <= 0) {
                                                continue;
                                        }
                                        $positionLookup[$itemId] = isset($item['position']) ? (int)$item['position'] : 0;
                                }
                        }
                }

                foreach ($responses as $response) {
                        if (!is_array($response)) {
                                continue;
                        }
                        $surveyId = isset($response['targetSurveyId']) ? (int)$response['targetSurveyId'] : 0;
                        $userCode = isset($response['userCode']) ? trim((string)$response['userCode']) : '';
                        $isGuestResponse = isset($response['isGuestResponse']) ? ((bool)$response['isGuestResponse']) : false;
                        $isGuestMode = isset($response['isGuestMode']) ? ((int)$response['isGuestMode'] !== 0) : false;
                        if ($surveyId <= 0 || $userCode === '') {
                                continue;
                        }
                        $normalizedUser = $this->normalizeUserCodeValue($userCode);
                        if ($normalizedUser === '') {
                                continue;
                        }
                        if ($isGuestMode && $isGuestResponse === false) {
                                $isGuestResponse = true;
                        }

                        $responseId = isset($response['id']) ? (int)$response['id'] : 0;
                        $responseKey = $normalizedUser;
                        if ($isGuestResponse) {
                                $responseKey = $normalizedUser . '#resp-' . ($responseId > 0 ? $responseId : $this->generateUniqid());
                        }
                        $answers = array();
                        if ($responseId > 0 && isset($responseItemMap[$responseId])) {
                                foreach ($responseItemMap[$responseId] as $itemRow) {
                                        $normalized = $this->normalizeTargetSurveyAnswerRow($itemRow);
                                        if ($normalized === null) {
                                                continue;
                                        }
                                        $answers[] = $normalized;
                                }

                                usort($answers, function ($a, $b) use ($positionLookup) {
                                                        $itemA = isset($a['itemId']) ? (int)$a['itemId'] : 0;
                                                        $itemB = isset($b['itemId']) ? (int)$b['itemId'] : 0;
                                                        $posA = isset($positionLookup[$itemA]) ? $positionLookup[$itemA] : 0;
                                                        $posB = isset($positionLookup[$itemB]) ? $positionLookup[$itemB] : 0;
                                                        if ($posA === $posB) {
                                                                if ($itemA === $itemB) {
                                                                        return 0;
                                                                }
                                                                return ($itemA < $itemB) ? -1 : 1;
                                                        }
                                                        return ($posA < $posB) ? -1 : 1;
                                                });
                        }

                        $surveyKey = (string)$surveyId;
                        if (isset($lookup[$surveyKey]) == false) {
                                $lookup[$surveyKey] = array();
                        }

                        $lookup[$surveyKey][$responseKey] = array(
                                'userCode' => $userCode,
                                'respondedAt' => isset($response['respondedAt']) ? $response['respondedAt'] : null,
                                'answers' => $answers,
                                'isGuestResponse' => $isGuestResponse,
                                'isGuestMode' => $isGuestMode,
                                'normalizedUserCode' => $normalizedUser,
                                'guestDisplayName' => isset($response['guestDisplayName']) ? $response['guestDisplayName'] : null,
                        );
                }

                return $lookup;
        }



        private function fetchTargetSurveyItems($surveyIds)
        {
                $list = array();
                if (!is_array($surveyIds) || count($surveyIds) === 0) {
                        return $list;
                }

                $ids = array();
                foreach ($surveyIds as $id) {
                        $intId = (int)$id;
                        if ($intId > 0) {
                                $ids[] = $intId;
                        }
                }

                if (count($ids) === 0) {
                        return $list;
                }

                $placeholders = implode(', ', array_fill(0, count($ids), '?'));

                try {
                        $stmt = $this->getPDOTarget()->prepare(
                                                                                          'SELECT id, targetSurveyId, title, description, kind, position, isRequired, createdAt, updatedAt, isDeleted '
                                                                                          . 'FROM targetSurveyItem WHERE targetSurveyId IN (' . $placeholders . ')'
                                                                                          );
                        $stmt->execute($ids);

                        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                                if (!is_array($row)) {
                                        continue;
                                }
                                if (isset($row['isDeleted']) && (int)$row['isDeleted'] !== 0) {
                                        continue;
                                }
                                $list[] = $row;
                        }
                } catch (Exception $exception) {
                        $list = array();
                }

                return $list;
        }



        private function replaceTargetSurveyItems($surveyId, $items)
        {
                $id = (int)$surveyId;
                if ($id <= 0) {
                        return;
                }

                $pdo = $this->getPDOTarget();
                $now = date('Y-m-d H:i:s');

                $normalizedItems = $this->normalizeTargetSurveyItemsForUpsert($items);
                $existingItems = $this->fetchTargetSurveyItems(array($surveyId));
                $existingItemIds = array();
                foreach ($existingItems as $entry) {
                        if (!is_array($entry)) {
                                continue;
                        }
                        $existingId = isset($entry['id']) ? (int)$entry['id'] : 0;
                        if ($existingId > 0) {
                                $existingItemIds[] = $existingId;
                        }
                }

                $hasOuterTransaction = $pdo->inTransaction();

                $this->logSurveyEvent('replaceTargetSurveyItems start', array(
                        'surveyId' => $id,
                        'normalizedItemCount' => count($normalizedItems),
                        'hasOuterTransaction' => $hasOuterTransaction,
                ));

                try {
                        if ($hasOuterTransaction == false) {
                                $pdo->beginTransaction();
                        }

                        if (count($existingItemIds) > 0) {
                                $placeholders = implode(', ', array_fill(0, count($existingItemIds), '?'));

                                $kindDelete = $pdo->prepare(
                                        'DELETE FROM targetSurveyItemKind WHERE targetSurveyItemId IN (' . $placeholders . ')'
                                );
                                $kindDelete->execute($existingItemIds);

                                $itemDelete = $pdo->prepare('DELETE FROM targetSurveyItem WHERE id IN (' . $placeholders . ')');
                                $itemDelete->execute($existingItemIds);
                        }

                        foreach ($normalizedItems as $item) {
                                $kind = isset($item['kind']) ? $item['kind'] : 'text';
                                $position = isset($item['position']) ? (int)$item['position'] : 0;
                                $title = isset($item['title']) ? $item['title'] : '';
                                $description = isset($item['description']) ? $item['description'] : '';
                                $isRequired = isset($item['isRequired']) ? ((bool)$item['isRequired']) : false;

                                $insert = $pdo->prepare('INSERT INTO targetSurveyItem (targetSurveyId, title, description, kind, position, isRequired, createdAt, updatedAt, isDeleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)');
                                $insert->execute(array($surveyId, $title, $description, $kind, $position, $isRequired ? 1 : 0, $now, $now));

                                $itemId = (int)$pdo->lastInsertId();

                                if (isset($item['choices']) && is_array($item['choices'])) {
                                        foreach ($item['choices'] as $choice) {
                                                $title = isset($choice['title']) ? $choice['title'] : '';
                                                $titleValue = Util::normalizeOptionalString($title, 256);
                                                if ($titleValue === false) {
                                                        $titleValue = '';
                                                }

                                                $choiceStmt = $pdo->prepare('INSERT INTO targetSurveyItemKind (targetSurveyItemId, title, createdAt, updatedAt, isDeleted) VALUES (?, ?, ?, ?, 0)');
                                                $choiceStmt->execute(array($itemId, $titleValue, $now, $now));
                                        }
                                }
                        }

                        if ($hasOuterTransaction == false) {
                                $pdo->commit();
                        }
                } catch (Exception $exception) {
                        if ($hasOuterTransaction == false && $pdo->inTransaction()) {
                                $pdo->rollBack();
                        }

                        $this->logSurveyEvent('replaceTargetSurveyItems failed', array('surveyId' => $id, 'exception' => $exception->getMessage()));

                        throw $exception;
                }
        }



        private function normalizeTargetSurveyItemsForUpsert($items)
        {
                $normalized = array();
                if (!is_array($items)) {
                        return $normalized;
                }

                $index = 0;
                foreach ($items as $item) {
                        if (!is_array($item)) {
                                continue;
                        }

                        $kind = $this->normalizeTargetSurveyItemKindValue(isset($item['kind']) ? $item['kind'] : null);
                        if ($kind === null) {
                                $kind = 'text';
                        }

                        $title = Util::normalizeOptionalString(isset($item['title']) ? $item['title'] : '', 256);
                        if ($title === false) {
                                $title = '';
                        }

                        $description = Util::normalizeOptionalString(isset($item['description']) ? $item['description'] : '', 2048);
                        if ($description === false) {
                                $description = '';
                        }

                        $isRequired = $this->normalizeBooleanParam(
                                isset($item['isRequired']) ? $item['isRequired'] : (isset($item['required']) ? $item['required'] : false),
                                false
                        );

                        $position = null;
                        if (isset($item['position'])) {
                                $position = $this->normalizeTargetSurveyItemPosition($item['position']);
                        }
                        if ($position === null) {
                                $position = $index;
                        }

                        $choices = array();
                        if (isset($item['choices']) && is_array($item['choices'])) {
                                foreach ($item['choices'] as $choice) {
                                        if (!is_array($choice)) {
                                                continue;
                                        }

                                        $title = Util::normalizeOptionalString(isset($choice['title']) ? $choice['title'] : '', 256);
                                        if ($title === false) {
                                                $title = '';
                                        }

                                        $choices[] = array('title' => $title);
                                }
                        }

                        $normalized[] = array(
                                'title' => $title,
                                'description' => $description,
                                'kind' => $kind,
                                'position' => $position,
                                'isRequired' => $isRequired,
                                'choices' => $choices,
                        );
                        $index += 1;
                }

                return $normalized;
        }



        private function fetchTargetSurveyItemById($itemId)
        {
                $id = (int)$itemId;
                if ($id <= 0) {
                        return null;
                }

                $stmt = $this->getPDOTarget()->prepare(
                                                                                  'SELECT id, targetSurveyId, title, description, kind, position, isRequired, createdAt, updatedAt, isDeleted '
                                                                                  . 'FROM targetSurveyItem WHERE id = ? LIMIT 1'
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

        private function normalizeRecipientCodes($recipients, $fallback)
        {
                $input = is_array($recipients) ? $recipients : null;
                if ($input === null) {
                        $input = is_array($fallback) ? $fallback : array();
                }

                $normalized = array();
                foreach ($input as $entry) {
                        $resolved = $this->resolveAssignedUserCode($entry);
                        if ($resolved === null) {
                                continue;
                        }
                        $trimmed = trim((string)$resolved);
                        if ($trimmed === '') {
                                continue;
                        }
                        $code = $this->normalizeUserCodeValue($trimmed);
                        if ($code === '') {
                                continue;
                        }
                        if (in_array($code, $normalized, true) == false) {
                                $normalized[] = $code;
                        }
                }

                return $normalized;
        }



        private function fetchTargetSurveyItemKinds($itemIds)
        {
                $list = array();
                if (!is_array($itemIds) || count($itemIds) === 0) {
                        return $list;
                }

                $ids = array();
                foreach ($itemIds as $id) {
                        $intId = (int)$id;
                        if ($intId > 0) {
                                $ids[] = $intId;
                        }
                }

                if (count($ids) === 0) {
                        return $list;
                }

                $placeholders = implode(', ', array_fill(0, count($ids), '?'));
                try {
                        $stmt = $this->getPDOTarget()->prepare(
                                                                                           'SELECT id, targetSurveyItemId, title, createdAt, updatedAt, isDeleted '
                                                                                           . 'FROM targetSurveyItemKind WHERE targetSurveyItemId IN (' . $placeholders . ')'
                                                                                           );
                        $stmt->execute($ids);

                        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                                if (!is_array($row)) {
                                        continue;
                                }
                                if (isset($row['isDeleted']) && (int)$row['isDeleted'] !== 0) {
                                        continue;
                                }
                                $list[] = $row;
                        }
                } catch (Exception $exception) {
                        $list = array();
                }

                return $list;
        }



        private function fetchTargetSurveyItemKindById($kindId)
        {
                $id = (int)$kindId;
                if ($id <= 0) {
                        return null;
                }

                $stmt = $this->getPDOTarget()->prepare(
                                                                                   'SELECT id, targetSurveyItemId, title, createdAt, updatedAt, isDeleted '
                                                                                   . 'FROM targetSurveyItemKind WHERE id = ? LIMIT 1'
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



        private function buildTargetSurveyItemLookup($surveyIds)
        {
                $items = $this->fetchTargetSurveyItems($surveyIds);

                $itemIds = array();
                foreach ($items as $item) {
                        if (!is_array($item)) {
                                continue;
                        }
                        $itemId = isset($item['id']) ? (int)$item['id'] : 0;
                        if ($itemId > 0) {
                                $itemIds[] = $itemId;
                        }
                }

                $kindLookup = $this->indexTargetSurveyItemKinds($this->fetchTargetSurveyItemKinds($itemIds));

                $lookup = array();
                foreach ($items as $item) {
                        $payload = $this->buildTargetSurveyItemPayload($item, $kindLookup);
                        if ($payload === null) {
                                continue;
                        }

                        $surveyKey = isset($payload['targetSurveyId']) ? $payload['targetSurveyId'] : '';
                        if ($surveyKey === '') {
                                continue;
                        }

                        if (isset($lookup[$surveyKey]) == false) {
                                $lookup[$surveyKey] = array();
                        }
                        $lookup[$surveyKey][] = $payload;
                }

                foreach ($lookup as $surveyKey => $itemsForSurvey) {
                        usort($itemsForSurvey, function ($a, $b) {
                                                $posA = isset($a['position']) ? (int)$a['position'] : 0;
                                                $posB = isset($b['position']) ? (int)$b['position'] : 0;
                                                if ($posA === $posB) {
                                                        $idA = isset($a['id']) ? (int)$a['id'] : 0;
                                                        $idB = isset($b['id']) ? (int)$b['id'] : 0;
                                                        if ($idA === $idB) {
                                                                return 0;
                                                        }
                                                        return ($idA < $idB) ? -1 : 1;
                                                }
                                                return ($posA < $posB) ? -1 : 1;
                                        });

                        $lookup[$surveyKey] = $itemsForSurvey;
                }

                return $lookup;
        }



        private function buildTargetSurveyItemPayload($row, $kindLookup)
        {
                if (!is_array($row)) {
                        return null;
                }

                $itemId = isset($row['id']) ? (int)$row['id'] : 0;
                $surveyId = isset($row['targetSurveyId']) ? (int)$row['targetSurveyId'] : 0;
                if ($itemId <= 0 || $surveyId <= 0) {
                        return null;
                }

                $title = isset($row['title']) ? $row['title'] : '';
                $description = isset($row['description']) ? $row['description'] : '';
                $kind = isset($row['kind']) ? $row['kind'] : '';
                $position = isset($row['position']) ? (int)$row['position'] : 0;

                $itemKey = (string)$itemId;
                $surveyKey = (string)$surveyId;

                $payload = array(
                                                 'id' => $itemKey,
                                                 'targetSurveyId' => $surveyKey,
                                                 'title' => $title,
                                                 'description' => $description,
                                                 'kind' => $kind,
                                                 'position' => $position,
                                                 'isRequired' => isset($row['isRequired']) ? ((int)$row['isRequired'] !== 0) : false,
                                                 'kinds' => isset($kindLookup[$itemKey]) ? $kindLookup[$itemKey] : array(),
                                                 );

                if (isset($row['createdAt'])) {
                        $payload['createdAt'] = Util::normalizeTimestampValue($row['createdAt']);
                }
                if (isset($row['updatedAt'])) {
                        $payload['updatedAt'] = Util::normalizeTimestampValue($row['updatedAt']);
                }

                return $payload;
        }



        private function indexTargetSurveyItemKinds($kinds)
        {
                $lookup = array();
                if (!is_array($kinds)) {
                        return $lookup;
                }

                foreach ($kinds as $kind) {
                        if (!is_array($kind)) {
                                continue;
                        }
                        $id = isset($kind['id']) ? (int)$kind['id'] : 0;
                        $itemId = isset($kind['targetSurveyItemId']) ? (int)$kind['targetSurveyItemId'] : 0;
                        if ($id <= 0 || $itemId <= 0) {
                                continue;
                        }

                        $itemKey = (string)$itemId;
                        if (isset($lookup[$itemKey]) == false) {
                                $lookup[$itemKey] = array();
                        }

                        $entry = array(
                                                'id' => (string)$id,
                                                'targetSurveyItemId' => $itemKey,
                                                'title' => isset($kind['title']) ? $kind['title'] : '',
                                                );

                        if (isset($kind['createdAt'])) {
                                $entry['createdAt'] = Util::normalizeTimestampValue($kind['createdAt']);
                        }
                        if (isset($kind['updatedAt'])) {
                                $entry['updatedAt'] = Util::normalizeTimestampValue($kind['updatedAt']);
                        }

                        $lookup[$itemKey][] = $entry;
                }

                foreach ($lookup as $itemKey => $entries) {
                        usort($entries, function ($a, $b) {
                                                $idA = isset($a['id']) ? (int)$a['id'] : 0;
                                                $idB = isset($b['id']) ? (int)$b['id'] : 0;
                                                if ($idA === $idB) {
                                                        return 0;
                                                }

                                                return ($idA < $idB) ? -1 : 1;
                                        });

                        $lookup[$itemKey] = $entries;
                }

                return $lookup;
        }


        private function filterTargetSurveyItemId($value)
        {
                $options = array('options' => array('min_range' => 1));
                $id = filter_var($value, FILTER_VALIDATE_INT, $options);
                if ($id === false || $id === null) {
                        return null;
                }

                return (int)$id;
        }



        private function normalizeTargetSurveyItemKindValue($value)
        {
                if ($value === null) {
                        return null;
                }

                $trimmed = strtolower(trim((string)$value));
                if ($trimmed === '') {
                        return null;
                }

                if ($trimmed === 'choicesingle') {
                        return 'choiceSingle';
                }
                if ($trimmed === 'choicemultiple') {
                        return 'choiceMultiple';
                }
                if ($trimmed === 'text') {
                        return 'text';
                }

                return null;
        }



        private function normalizeTargetSurveyItemPosition($value)
        {
                $options = array('options' => array('min_range' => 0));
                $position = filter_var($value, FILTER_VALIDATE_INT, $options);
                if ($position === false || $position === null) {
                        return null;
                }

                return (int)$position;
        }



        private function buildTargetSurveyPayloadForSurvey($surveyRow, $targetRow)
        {
                if (!is_array($surveyRow) || !is_array($targetRow)) {
                        return null;
                }

                $surveyId = isset($surveyRow['id']) ? (int)$surveyRow['id'] : 0;
                $targetCode = isset($targetRow['targetCode']) ? trim((string)$targetRow['targetCode']) : '';
                if ($surveyId <= 0 || $targetCode === '') {
                        return null;
                }

                $acknowledgements = $this->fetchTargetSurveyAcknowledgements(array($surveyId));
                $ackLookup = $this->indexTargetSurveyAcknowledgements($acknowledgements);
                $itemLookup = $this->buildTargetSurveyItemLookup(array($surveyId));
                $responseLookup = $this->buildTargetSurveyResponseLookup(array($surveyId), $itemLookup);

                $assignedUsersMap = $this->fetchAssignedUsersForTargets(array($targetCode));
                $assignedUsers = isset($assignedUsersMap[$targetCode]) ? $assignedUsersMap[$targetCode] : array();

                return $this->buildTargetSurveyPayload($surveyRow, $targetRow, $assignedUsers, $ackLookup, $itemLookup, $responseLookup);
        }



        private function findTargetSurveyItemPayload($itemLookup, $itemId)
        {
                $id = (int)$itemId;
                if ($id <= 0 || !is_array($itemLookup)) {
                        return array();
                }

                foreach ($itemLookup as $items) {
                        if (!is_array($items)) {
                                continue;
                        }
                        foreach ($items as $item) {
                                if (!is_array($item)) {
                                        continue;
                                }

                                $payloadId = isset($item['id']) ? (int)$item['id'] : 0;
                                if ($payloadId === $id) {
                                        return $item;
                                }
                        }
                }

                return array();
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



        private function buildTargetSurveyPayload($row, $targetRow, $assignedUserCodes, $ackLookup, $itemLookup = array(), $responseLookup = array())
        {
                if (!is_array($row)) {
                        return null;
                }

		$surveyId = isset($row['id']) ? (int)$row['id'] : 0;
		if ($surveyId <= 0) {
			return null;
		}
		$surveyKey = (string)$surveyId;

                $targetCode = isset($row['targetCode']) ? trim((string)$row['targetCode']) : '';
                $title = isset($row['title']) ? $row['title'] : '';
                $content = isset($row['content']) ? $row['content'] : '';
                $startAt = isset($row['startAt']) ? Util::normalizeTimestampValue($row['startAt']) : null;
                $endAt = isset($row['endAt']) ? Util::normalizeTimestampValue($row['endAt']) : null;
                $createdAt = isset($row['createdAt']) ? Util::normalizeTimestampValue($row['createdAt']) : null;
                $updatedAt = isset($row['updatedAt']) ? Util::normalizeTimestampValue($row['updatedAt']) : null;
                $displayOrder = isset($row['displayOrder']) ? (int)$row['displayOrder'] : 0;

		$creatorUserCode = isset($row['createdByUserCode']) ? trim((string)$row['createdByUserCode']) : '';
		$creatorSummary = $this->resolveActivityActorSummary($creatorUserCode);
		$creatorName = isset($creatorSummary[1]) ? $creatorSummary[1] : ($creatorUserCode !== '' ? $creatorUserCode : '');

                $ackEntries = isset($ackLookup[$surveyKey]) ? $ackLookup[$surveyKey] : array();
                $responses = isset($responseLookup[$surveyKey]) ? $responseLookup[$surveyKey] : array();
                $recipientCodes = $this->extractRecipientCodesFromRow($row, $assignedUserCodes);
                $recipients = $this->buildTargetSurveyRecipients($targetRow, $recipientCodes, $ackEntries, $responses);

                $items = array();
                if (isset($itemLookup[$surveyKey]) && is_array($itemLookup[$surveyKey])) {
                        $items = $itemLookup[$surveyKey];
                }

                $targetTitle = isset($targetRow['title']) ? $targetRow['title'] : (isset($targetRow['name']) ? $targetRow['name'] : '');
                $targetSummary = isset($targetRow['description']) ? $targetRow['description'] : '';

		return array(
					 'id' => $surveyKey,
					 'surveyCode' => isset($row['surveyCode']) ? $row['surveyCode'] : $surveyKey,
					 'targetCode' => $targetCode,
					 'targetTitle' => $targetTitle,
					 'targetSummary' => $targetSummary,
                                         'title' => $title,
                                         'content' => $content,
                                         'startAt' => $startAt,
                                         'endAt' => $endAt,
                                         'isGuestMode' => isset($row['isGuestMode']) ? ((int)$row['isGuestMode'] !== 0) : false,
                                         'createdAt' => $createdAt,
                                         'updatedAt' => $updatedAt,
                                         'displayOrder' => $displayOrder,
                                         'createdByUserCode' => $creatorUserCode,
                                         'createdByDisplayName' => $creatorName,
                                         'createdByUserDisplayName' => $creatorName,
                                         'items' => $items,
                                         'itemCount' => count($items),
                                         'recipients' => $recipients,
                                         'recipientCount' => count($recipients),
                                         );
        }

        private function extractRecipientCodesFromRow($row, $fallbackCodes)
        {
                $codes = $fallbackCodes;
                if (isset($row['recipientsJson'])) {
                        $decoded = json_decode($row['recipientsJson'], true);
                        if (is_array($decoded)) {
                                $codes = $decoded;
                        }
                }
                return $this->normalizeRecipientCodes($codes, $fallbackCodes);
        }



        private function buildTargetSurveyRecipients($targetRow, $assignedUserCodes, $ackEntries, $responseEntries = array())
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

                if (is_array($responseEntries)) {
                        foreach ($responseEntries as $normalized => $response) {
                                if ($normalized === '') {
                                        continue;
                                }
                                if (isset($response['userCode'])) {
                                        $code = trim((string)$response['userCode']);
                                        if ($code !== '' && isset($recipientMap[$normalized]) == false) {
                                                $recipientMap[$normalized] = $code;
                                        }
                                }
                        }
                }

                $recipients = array();
                foreach ($recipientMap as $normalized => $code) {
                        $ack = isset($ackEntries[$normalized]) ? $ackEntries[$normalized] : null;
                        $response = isset($responseEntries[$normalized]) ? $responseEntries[$normalized] : null;
                        $recipient = $this->buildTargetSurveyRecipientPayload($targetRow, $code, $ack, $response);
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


        private function buildTargetSurveyRecipientPayload($targetRow, $userCode, $ack, $response = null)
        {
                $resolvedCode = trim((string)$userCode);
                if ($resolvedCode === '') {
                        return null;
                }

                $userInfo = $this->getUserInfo($resolvedCode);
                $displayName = ($userInfo != null && isset($userInfo['displayName']) && $userInfo['displayName'] !== '')
                        ? $userInfo['displayName']
                        : $resolvedCode;
                $guestDisplayName = (is_array($response) && isset($response['guestDisplayName'])) ? trim((string)$response['guestDisplayName']) : '';
                $isGuestResponse = is_array($response) && isset($response['isGuestResponse']) ? ((bool)$response['isGuestResponse']) : false;
                if ($guestDisplayName !== '') {
                        $displayName = $guestDisplayName;
                }

                $role = $this->resolveTargetSurveyRecipientRole($targetRow, $resolvedCode);

                $hasAcknowledgement = is_array($ack);

                $acknowledgedAt = null;
                $respondedAt = null;
                if (is_array($ack) && isset($ack['acknowledgedAt']) && $ack['acknowledgedAt'] !== null && $ack['acknowledgedAt'] !== '') {
                        $acknowledgedAt = $ack['acknowledgedAt'];
                }

                if (is_array($response) && isset($response['respondedAt']) && $response['respondedAt'] !== null && $response['respondedAt'] !== '') {
                        $respondedAt = Util::normalizeTimestampValue($response['respondedAt']);
                }

                $isActive = true;
                if (is_array($userInfo)) {
                        if (isset($userInfo['isActive']) && ($userInfo['isActive'] === false || $userInfo['isActive'] === 0 || $userInfo['isActive'] === '0' || $userInfo['isActive'] === 'false')) {
                                $isActive = false;
                        }
                        if (isset($userInfo['active']) && ($userInfo['active'] === false || $userInfo['active'] === 0 || $userInfo['active'] === '0' || $userInfo['active'] === 'false')) {
                                $isActive = false;
                        }
                        if (isset($userInfo['status']) && strtolower((string)$userInfo['status']) === 'inactive') {
                                $isActive = false;
                        }
                        if (isset($userInfo['endedAt']) && $userInfo['endedAt'] !== null && $userInfo['endedAt'] !== '') {
                                $isActive = false;
                        }
                }

                $payload = array(
                                                 'userCode' => $resolvedCode,
                                                 'displayName' => $displayName,
                                                 'role' => $role,
                                                 'acknowledgedAt' => $acknowledgedAt,
                                                 'hasAcknowledgement' => $hasAcknowledgement,
                                                 'isActive' => $isActive,
                                                 );

                if ($isGuestResponse) {
                        $payload['isGuest'] = true;
                }

                if ($acknowledgedAt !== null && $acknowledgedAt !== '') {
                        $payload['acknowledgedAtDisplay'] = $acknowledgedAt;
                }

                if ($respondedAt !== null && $respondedAt !== '') {
                        $payload['respondedAt'] = $respondedAt;
                        $payload['respondedAtDisplay'] = $respondedAt;
                }

                if (is_array($response) && isset($response['answers']) && is_array($response['answers'])) {
                        $payload['answers'] = $response['answers'];
                }

                if (is_array($userInfo)) {
                        if (isset($userInfo['avatarUrl'])) {
                                $payload['avatarUrl'] = $userInfo['avatarUrl'];
                        }
                        if (isset($userInfo['avatarTransform'])) {
                                $payload['avatarTransform'] = $userInfo['avatarTransform'];
                        }
                        if (isset($userInfo['avatarInitial'])) {
                                $payload['avatarInitial'] = $userInfo['avatarInitial'];
                        }
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



        private function normalizeBooleanParam($value, $default = false)
        {
                if ($value === null) {
                        return (bool)$default;
                }

                if (is_bool($value)) {
                        return $value;
                }

                if (is_int($value)) {
                        return $value !== 0;
                }

                $text = strtolower(trim((string)$value));
                if ($text === '') {
                        return (bool)$default;
                }

                return in_array($text, array('1', 'true', 'on', 'yes'), true);
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




	private function resolveTargetSurveyRecipientRole($targetRow, $userCode)
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



	private function canManageTargetSurvey($targetRow, $userCode)
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
