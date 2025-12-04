<?php

Base::requireFromShm('class/class.TargetManagementUtil.php');

class TargetManagementAgreements extends Base
{
        public function __construct($context)
        {
                parent::__construct($context);
        }

        private function normalizeAgreementPosition($rawValue)
        {
                if ($rawValue === null || $rawValue === '') {
                        return null;
                }

                $filtered = filter_var(
                        $rawValue,
                        FILTER_VALIDATE_INT,
                        array('options' => array('min_range' => 0))
                );

                if ($filtered === false || $filtered === null) {
                        return null;
                }

                return (int)$filtered;
        }

        protected function validationTargetAgreementList()
        {
                if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
        }



	protected function validationTargetAgreementCreate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetAgreementUpdate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['agreementCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetAgreementDelete()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['agreementCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	public function procTargetAgreementList()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$agreements = $this->fetchTargetAgreements($targetCode, $this->getPDOTarget());
		$this->response = array('agreements' => $agreements);
	}



	public function procTargetAgreementCreate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
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

		$type = null;
		$typeKeys = array('agreementType', 'kind');
		foreach ($typeKeys as $key) {
			if (array_key_exists($key, $this->params) == false) {
				continue;
			}
			$typeValue = Util::normalizeOptionalString($this->params[$key], 128);
			if ($typeValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$type = $typeValue;
			break;
		}

		if ($type === null && array_key_exists('type', $this->params)) {
			$typeValue = Util::normalizeOptionalString($this->params['type'], 128);
			if ($typeValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			if ($typeValue !== $this->type) {
				$type = $typeValue;
			}
		}

		$content = null;
		if (isset($this->params['content'])) {
			$contentValue = Util::normalizeOptionalString($this->params['content'], 4000);
			if ($contentValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$content = $contentValue;
		}

		$notes = null;
                if (isset($this->params['notes'])) {
                        $notesValue = Util::normalizeOptionalString($this->params['notes'], 2000);
                        if ($notesValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $notes = $notesValue;
                }

                $position = null;
                if (array_key_exists('position', $this->params)) {
                        $positionValue = $this->normalizeAgreementPosition($this->params['position']);
                        if ($positionValue === null && $this->params['position'] !== null && $this->params['position'] !== '') {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $position = $positionValue;
                }

                $creatorUserCode = $this->getLoginUserCode();
                if ($creatorUserCode === null || $creatorUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
			return;
		}
		$creatorUserId = $this->getLoginUserId();

		
		$pdo = $this->getPDOTarget();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');
		$agreementCode = $this->generateUniqid();

		try {
                        $pdo->beginTransaction();

                        $stmt = $pdo->prepare(
                                                                  'INSERT INTO targetAgreements '
                                                                  . '(agreementCode, targetCode, agreementKind, title, content, notes, createdByUserId, createdByUserCode, updatedByUserId, updatedByUserCode, createdAt, updatedAt, position, displayOrder, isDeleted) '
                                                                  . 'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)'
                                                                  );
                        $stmt->execute(array(
                                                                 $agreementCode,
                                                                 $targetCode,
                                                                 $type,
                                                                 $title,
                                                                 $content,
                                                                 $notes,
                                                                 $creatorUserId,
                                                                 $creatorUserCode,
                                                                 $creatorUserId,
                                                                 $creatorUserCode,
                                                                 $timestamp,
                                                                 $timestamp,
                                                                 $position
                                                                 ));

			$pdo->commit();
		} catch (\Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$agreement = $this->fetchAgreementByCode($agreementCode);
		if ($agreement == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$this->response = array('agreement' => $agreement);
	}



	public function procTargetAgreementUpdate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$agreementCode = htmlspecialchars($this->params['agreementCode'], ENT_QUOTES, "UTF-8");

		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		
		$agreement = $this->fetchAgreementByCode($agreementCode);
		if ($agreement == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$agreementTargetCode = isset($agreement['targetCode']) ? trim($agreement['targetCode']) : '';
		if ($agreementTargetCode !== '' && $agreementTargetCode !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

                $titleSource = array_key_exists('title', $this->params)
                        ? Util::normalizeRequiredString($this->params['title'], 256)
                        : Util::normalizeRequiredString(isset($agreement['title']) ? $agreement['title'] : '', 256);
                if ($titleSource === false || $titleSource === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }
                $title = $titleSource;

                $type = null;
                $typeKeys = array('agreementType', 'kind', 'type');
                foreach ($typeKeys as $key) {
                        if (array_key_exists($key, $this->params) == false) {
				continue;
			}
			$typeValue = Util::normalizeOptionalString($this->params[$key], 128);
			if ($typeValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			if ($key === 'type' && $typeValue === $this->type) {
				continue;
			}
                        $type = $typeValue;
                        break;
                }

                if ($type === null) {
                        $existingType = null;
                        if (isset($agreement['type']) && $agreement['type'] !== '') {
                                $existingType = $agreement['type'];
                        } else if (isset($agreement['agreementKind']) && $agreement['agreementKind'] !== '') {
                                $existingType = $agreement['agreementKind'];
                        }

                        if ($existingType !== null) {
                                $typeValue = Util::normalizeOptionalString($existingType, 128);
                                if ($typeValue === false) {
                                        $this->status = parent::RESULT_ERROR;
                                        $this->errorReason = 'invalid';
                                        return;
                                }
                                $type = $typeValue;
                        }
                }

                $content = null;
                if (array_key_exists('content', $this->params)) {
                        $contentValue = Util::normalizeOptionalString($this->params['content'], 4000);
                        if ($contentValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $content = $contentValue;
                } else if (array_key_exists('content', $agreement)) {
                        $content = $agreement['content'];
                }

                $notes = null;
                if (array_key_exists('notes', $this->params)) {
                        $notesValue = Util::normalizeOptionalString($this->params['notes'], 2000);
			if ($notesValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $notes = $notesValue;
                } else if (array_key_exists('notes', $agreement)) {
                        $notes = $agreement['notes'];
                }

                $position = null;
                $positionSpecified = array_key_exists('position', $this->params);
                if ($positionSpecified) {
                        $positionValue = $this->normalizeAgreementPosition($this->params['position']);
                        if ($positionValue === null && $this->params['position'] !== null && $this->params['position'] !== '') {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $position = $positionValue;
                } else if (isset($agreement['position']) && $agreement['position'] !== null && $agreement['position'] !== '') {
                        $position = (int)$agreement['position'];
                }

                $updaterUserCode = $this->getLoginUserCode();
                if ($updaterUserCode === null || $updaterUserCode === '') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
			return;
		}
		$updaterUserId = $this->getLoginUserId();

		$pdo = $this->getPDOTarget();
		$now = new DateTime('now');
                $timestamp = $now->format('Y-m-d H:i:s');

                try {
                        $stmt = $pdo->prepare(
                                                                  'UPDATE targetAgreements SET agreementKind = ?, title = ?, content = ?, notes = ?, position = ?, '
                                                                  . 'updatedByUserId = ?, updatedByUserCode = ?, updatedAt = ? WHERE agreementCode = ? AND targetCode = ?'
                                                                  );
                        $stmt->execute(array(
                                                                 $type,
                                                                 $title,
                                                                 $content,
                                                                 $notes,
                                                                 $position,
                                                                 $updaterUserId,
                                                                 $updaterUserCode,
                                                                 $timestamp,
                                                                 $agreementCode,
                                                                 $targetCode
								 ));
		} catch (\Exception $error) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$updatedAgreement = $this->fetchAgreementByCode($agreementCode);
		if ($updatedAgreement == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$this->response = array('agreement' => $updatedAgreement);
	}



	public function procTargetAgreementDelete()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$agreementCode = htmlspecialchars($this->params['agreementCode'], ENT_QUOTES, "UTF-8");

		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		
		$agreement = $this->fetchAgreementByCode($agreementCode);
		if ($agreement == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$agreementTargetCode = isset($agreement['targetCode']) ? trim($agreement['targetCode']) : '';
		if ($agreementTargetCode !== '' && $agreementTargetCode !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$updaterUserCode = $this->getLoginUserCode();
		if ($updaterUserCode === null || $updaterUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}
		$updaterUserId = $this->getLoginUserId();

		$pdo = $this->getPDOTarget();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		try {
			$stmt = $pdo->prepare(
								  'UPDATE targetAgreements SET isDeleted = 1, updatedByUserId = ?, updatedByUserCode = ?, updatedAt = ? '
								  . 'WHERE agreementCode = ? AND targetCode = ?'
								  );
			$stmt->execute(array(
								 $updaterUserId,
								 $updaterUserCode,
								 $timestamp,
								 $agreementCode,
								 $targetCode
								 ));
		} catch (\Exception $error) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->response = array('agreementCode' => $agreementCode);
	}






	private function fetchAgreementByCode($agreementCode)
	{
		if ($agreementCode === null || $agreementCode === '') {
			return null;
		}

		

		$stmt = $this->getPDOTarget()->prepare(
											   'SELECT a.*, creator.displayName AS createdByDisplayName, updater.displayName AS updatedByDisplayName '
											   . 'FROM targetAgreements a '
											   . 'LEFT JOIN common.user creator ON a.createdByUserCode = creator.userCode '
											   . 'LEFT JOIN common.user updater ON a.updatedByUserCode = updater.userCode '
											   . 'WHERE a.agreementCode = ? AND (a.isDeleted IS NULL OR a.isDeleted = 0) LIMIT 1'
											   );
		$stmt->execute(array($agreementCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row == null) {
			return null;
		}

		return $this->buildAgreementPayload($row);
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

                $position = null;
                if (array_key_exists('position', $row) && $row['position'] !== null && $row['position'] !== '') {
                        $position = (int)$row['position'];
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
                                         'position' => $position,
                                         'displayOrder' => $displayOrder
                                         );
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
											   . 'ORDER BY CASE WHEN a.position IS NULL THEN 1 ELSE 0 END ASC, a.position ASC, a.updatedAt DESC, a.createdAt DESC, a.id DESC'
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
}

?>
