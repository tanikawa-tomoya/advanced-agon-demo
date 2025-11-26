<?php

Base::requireFromShm('class/class.TargetManagementUtil.php');

class TargetManagementGoals extends Base
{
	public function __construct($context)
	{
		parent::__construct($context);
	}
	
	protected function validationTargetGoalList()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetGoalCreate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetGoalUpdate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['goalCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}
	
	protected function validationTargetGoalDelete()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['goalCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}
	
	public function procTargetGoalList()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
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

		$goals = $this->fetchTargetGoals($targetCode);
		$this->response = array('goals' => $goals);
	}



	public function procTargetGoalCreate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		if ($this->requireGoalManagementPermission($targetRow) == false) {
			return;
		}

		$title = Util::normalizeRequiredString($this->params['title'] ?? '', 256);
		if ($title === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$targetUserCodes = $this->normalizeTargetUserCodes($this->params);
		$primaryTargetUserCode = count($targetUserCodes) > 0 ? $targetUserCodes[0] : '';
		$targetUserId = $this->resolveUserIdFromCode($primaryTargetUserCode);

		$targetValue = Util::normalizeOptionalString($this->params['targetValue'] ?? '', 256);
		if ($targetValue === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$evidence = Util::normalizeOptionalString($this->params['evidence'] ?? '', 2000);
		if ($evidence === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$memo = Util::normalizeOptionalString($this->params['memo'] ?? '', 2000);
		if ($memo === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$creatorUserCode = $this->getLoginUserCode();
		$creatorUserId = $this->getLoginUserId();
		if ($creatorUserCode === null || $creatorUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		

		$pdo = $this->getPDOTarget();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');
		$goalCode = $this->generateUniqid();

		try {
			$pdo->beginTransaction();

			$displayOrder = $this->resolveNextGoalDisplayOrder($pdo, $targetCode);

			$stmt = $pdo->prepare(
								  'INSERT INTO targetGoals '
								  . '(goalCode, targetCode, title, targetUserId, targetUserCode, targetValue, evidence, memo, '
								  . 'createdByUserId, createdByUserCode, updatedByUserId, updatedByUserCode, createdAt, updatedAt, displayOrder, isDeleted) '
								  . 'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
								  );
			$stmt->execute(array(
								 $goalCode,
								 $targetCode,
								 $title,
								 $targetUserId,
								 $primaryTargetUserCode,
								 $targetValue,
								 $evidence,
								 $memo,
								 $creatorUserId,
								 $creatorUserCode,
								 $creatorUserId,
								 $creatorUserCode,
								 $timestamp,
								 $timestamp,
								 $displayOrder
								 ));

			$this->replaceGoalAssignees($pdo, $goalCode, $targetUserCodes);

			$pdo->commit();
		} catch (Exception $exception) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$goal = $this->fetchTargetGoalByCode($goalCode);
		if ($goal == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$this->response = array('goal' => $goal);
	}



	public function procTargetGoalUpdate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$goalCode = htmlspecialchars($this->params['goalCode'], ENT_QUOTES, "UTF-8");

		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		if ($this->requireGoalManagementPermission($targetRow) == false) {
			return;
		}

		$existing = $this->fetchTargetGoalByCode($goalCode);
		if ($existing == null || $existing['targetCode'] !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$title = Util::normalizeRequiredString($this->params['title'] ?? $existing['title'], 256);
		if ($title === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$existingAssignees = $this->fetchGoalAssigneeCodes($goalCode);
		$targetUserCodes = $this->normalizeTargetUserCodes($this->params, $existingAssignees);
		$primaryTargetUserCode = count($targetUserCodes) > 0 ? $targetUserCodes[0] : '';
		$targetUserId = $this->resolveUserIdFromCode($primaryTargetUserCode);

		$targetValue = Util::normalizeOptionalString($this->params['targetValue'] ?? $existing['targetValue'], 256);
		if ($targetValue === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$evidence = Util::normalizeOptionalString($this->params['evidence'] ?? $existing['evidence'], 2000);
		if ($evidence === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$memo = Util::normalizeOptionalString($this->params['memo'] ?? $existing['memo'], 2000);
		if ($memo === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$updaterUserCode = $this->getLoginUserCode();
		$updaterUserId = $this->getLoginUserId();
		if ($updaterUserCode === null || $updaterUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		

		$pdo = $this->getPDOTarget();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

			$stmt = $pdo->prepare(
								  'UPDATE targetGoals SET '
								  . 'title = ?, targetUserId = ?, targetUserCode = ?, targetValue = ?, evidence = ?, memo = ?, '
								  . 'updatedByUserId = ?, updatedByUserCode = ?, updatedAt = ? '
								  . 'WHERE goalCode = ? AND targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0)'
								  );
			$stmt->execute(array(
								 $title,
								 $targetUserId,
								 $primaryTargetUserCode,
								 $targetValue,
								 $evidence,
								 $memo,
								 $updaterUserId,
								 $updaterUserCode,
								 $timestamp,
								 $goalCode,
								 $targetCode
								 ));

			$this->replaceGoalAssignees($pdo, $goalCode, $targetUserCodes);

			$pdo->commit();
		} catch (Exception $exception) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$goal = $this->fetchTargetGoalByCode($goalCode);
		if ($goal == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$this->response = array('goal' => $goal);
	}



	public function procTargetGoalDelete()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$goalCode = htmlspecialchars($this->params['goalCode'], ENT_QUOTES, "UTF-8");

		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		if ($this->requireGoalManagementPermission($targetRow) == false) {
			return;
		}

		$existing = $this->fetchTargetGoalByCode($goalCode);
		if ($existing == null || $existing['targetCode'] !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$updaterUserCode = $this->getLoginUserCode();
		$updaterUserId = $this->getLoginUserId();
		if ($updaterUserCode === null || $updaterUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		

		$pdo = $this->getPDOTarget();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

			$stmt = $pdo->prepare(
								  'UPDATE targetGoals SET isDeleted = 1, updatedAt = ?, updatedByUserId = ?, updatedByUserCode = ? '
								  . 'WHERE goalCode = ? AND targetCode = ?'
								  );
			$stmt->execute(array(
								 $timestamp,
								 $updaterUserId,
								 $updaterUserCode,
								 $goalCode,
								 $targetCode
								 ));

			$this->replaceGoalAssignees($pdo, $goalCode, array());

			$pdo->commit();
		} catch (Exception $exception) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->response = array('goalCode' => $goalCode);
	}



	private function requireGoalManagementPermission($targetRow)
	{
		if ($this->isSupervisor() || $this->isOperator()) {
			return true;
		}

		$this->status = parent::RESULT_ERROR;
		$this->errorReason = 'permission';
		return false;
	}



	private function normalizeTargetUserCode($params, $fallback = null)
	{
		$candidateKeys = array('targetUserCode', 'targetUser', 'userCode');
		foreach ($candidateKeys as $key) {
			if (array_key_exists($key, $params)) {
				$raw = $params[$key];
				if ($raw === null) {
					return '';
				}
				$trimmed = trim((string)$raw);
				if ($trimmed === '') {
					return '';
				}
				if (mb_strlen($trimmed) > 64) {
					return $fallback;
				}
				return $trimmed;
			}
		}
		if ($fallback !== null) {
			return $fallback;
		}
		return '';
	}



        private function normalizeTargetUserCodes($params, $fallback = array())
        {
                $scope = 'users';
                if (is_array($params)) {
                        $scopeCandidates = array('targetUserScope', 'audienceScope', 'scope');
                        foreach ($scopeCandidates as $key) {
                                if (!array_key_exists($key, $params)) {
                                        continue;
                                }
                                $normalizedScope = trim(strtolower((string)$params[$key]));
                                if ($normalizedScope === 'all' || $normalizedScope === 'everyone') {
                                        $scope = 'all';
                                        break;
                                }
                                if ($normalizedScope === 'users') {
                                        $scope = 'users';
                                        break;
                                }
                        }

                        if ($scope === 'users' && array_key_exists('assignAll', $params) && $params['assignAll']) {
                                $scope = 'all';
                        }
                }

                if ($scope === 'all') {
                        return array();
                }

                $codes = array();
                $hasExplicit = is_array($params) && array_key_exists('targetUserCodes', $params);

                if ($hasExplicit) {
                        $rawCodes = $params['targetUserCodes'];
                        if (!is_array($rawCodes)) {
                                $rawCodes = $this->splitTargetUserCodes($rawCodes);
                        }

                        $normalized = array();
                        foreach ($rawCodes as $rawCode) {
                                foreach ($this->splitTargetUserCodes($rawCode) as $candidate) {
                                        if ($candidate === null) {
                                                continue;
                                        }
                                        $trimmed = trim((string)$candidate);
                                        if ($trimmed === '') {
                                                continue;
                                        }
                                        if (mb_strlen($trimmed) > 64) {
                                                continue;
                                        }
                                        $lower = strtolower($trimmed);
                                        if (isset($normalized[$lower])) {
                                                continue;
                                        }
                                        $normalized[$lower] = true;
                                        $codes[] = $trimmed;
                                }
                        }

                        if (!empty($codes)) {
                                return $codes;
                        }

                        if ($hasExplicit) {
                                return array();
                        }
                }

                $single = $this->normalizeTargetUserCode($params);
                if ($single !== '') {
                        return array($single);
                }

                if ($fallback === null) {
                        return array();
                }

                if (is_array($fallback)) {
                        $normalized = array();
                        foreach ($fallback as $entry) {
                                foreach ($this->splitTargetUserCodes($entry) as $candidate) {
                                        if ($candidate === null) {
                                                continue;
                                        }
                                        $trimmed = trim((string)$candidate);
                                        if ($trimmed === '') {
                                                continue;
                                        }
                                        if (mb_strlen($trimmed) > 64) {
                                                continue;
                                        }
                                        $lower = strtolower($trimmed);
                                        if (isset($normalized[$lower])) {
                                                continue;
                                        }
                                        $normalized[$lower] = true;
                                        $codes[] = $trimmed;
                                }
                        }
                        return $codes;
                }

                if (is_string($fallback)) {
                        $codes = array();
                        foreach ($this->splitTargetUserCodes($fallback) as $candidate) {
                                $trimmed = trim((string)$candidate);
                                if ($trimmed !== '') {
                                        $codes[] = $trimmed;
                                }
                        }
                        return $codes;
                }

                return array();
        }


        private function splitTargetUserCodes($value)
        {
                if ($value === null) {
                        return array();
                }

                if (is_array($value)) {
                        return $value;
                }

                $trimmed = trim((string)$value);
                if ($trimmed === '') {
                        return array();
                }

                $parts = preg_split('/[、，,]/u', $trimmed);
                if ($parts === false) {
                        return array($trimmed);
                }

                $result = array();
                foreach ($parts as $part) {
                        $normalized = trim((string)$part);
                        if ($normalized === '') {
                                continue;
                        }
                        $result[] = $normalized;
                }

                if (empty($result)) {
                        return array($trimmed);
                }

                return $result;
        }



	private function resolveUserIdFromCode($userCode)
	{
		if ($userCode === null || $userCode === '') {
			return null;
		}

		$userInfo = $this->getUserInfo($userCode);
		if ($userInfo != null && isset($userInfo['id'])) {
			$userId = (int)$userInfo['id'];
			if ($userId > 0) {
				return $userId;
			}
		}
		return null;
	}



	private function fetchGoalAssigneeCodes($goalCode)
	{
		if ($goalCode === null || $goalCode === '') {
			return array();
		}

		$map = $this->fetchGoalAssigneesForCodes(array($goalCode));
		if (!isset($map[$goalCode]) || !is_array($map[$goalCode])) {
			return array();
		}

		$codes = array();
		foreach ($map[$goalCode] as $assignee) {
			if (!isset($assignee['userCode'])) {
				continue;
			}
			$code = trim((string)$assignee['userCode']);
			if ($code === '') {
				continue;
			}
			$codes[] = $code;
		}

		return $codes;
	}


	private function replaceGoalAssignees($pdo, $goalCode, $userCodes)
	{
		if ($goalCode === null || $goalCode === '') {
			return;
		}

		$deleteStmt = $pdo->prepare('DELETE FROM targetGoalAssignees WHERE goalCode = ?');
		$deleteStmt->execute(array($goalCode));

		if (!is_array($userCodes) || empty($userCodes)) {
			return;
		}

		$insertStmt = $pdo->prepare('INSERT INTO targetGoalAssignees (goalCode, userCode, displayOrder) VALUES (?, ?, ?)');
		$order = 0;
		foreach ($userCodes as $code) {
			if ($code === null) {
				continue;
			}
			$trimmed = trim((string)$code);
			if ($trimmed === '') {
				continue;
			}
			$insertStmt->execute(array($goalCode, $trimmed, $order));
			$order++;
		}
	}



	private function resolveNextGoalDisplayOrder($pdo, $targetCode)
	{
		$stmt = $pdo->prepare('SELECT MAX(displayOrder) AS maxOrder FROM targetGoals WHERE targetCode = ?');
		if ($stmt === false) {
			throw new Exception(__FILE__ . ":" . __LINE__);
		}
		$stmt->execute(array($targetCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row && isset($row['maxOrder']) && $row['maxOrder'] !== null) {
			$maxOrder = (int)$row['maxOrder'];
			return $maxOrder + 1;
		}
		return 0;
	}
}

?>
