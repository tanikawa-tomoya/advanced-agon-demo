<?php

Base::requireFromShm('class/class.TargetManagementUtil.php');

class TargetManagementBadges extends Base
{
        const BADGE_TEMPLATE_VERSION_LATEST = 1;

        public function __construct($context)
        {
                parent::__construct($context);
                $this->badgesSchemaEnsured = false;
        }

	protected function validationBadgeCatalog()
	{
	}

	protected function validationBadgeCreate()
	{
		if (isset($this->params['badgeCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['title']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationBadgeDelete()
	{
		if (isset($this->params['badgeId']) == false && isset($this->params['badgeCode']) == false) {
			throw new Exception(__FILE__ . ":" . __LINE__);
		}
	}



	protected function validationBadgeShowcase()
	{
	}



	protected function validationTargetBadgeList()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetBadgeAward()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['badgeCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['userCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetBadgeRevoke()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['badgeAwardId']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetBadgeAwardUpdate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['badgeAwardId']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	public function procBadgeCatalog()
	{
		$creatorId = $this->getLoginUserId();
		if ($creatorId === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		$mine = true;
		if (isset($this->params['mine'])) {
			$mine = $this->interpretBoolean($this->params['mine'], true);
		}

                if ($mine === false && $this->isOperator() == false && $this->isSupervisor() == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

		$pdo = $this->getPDOTarget();

		$query = "SELECT id, creator_user_id, badge_code, title, description, icon_text, color_hex, highlight_hex, font_key, font_scale, template_version, created_at, updated_at FROM badges";
		$params = array();
		if ($mine) {
			$query .= " WHERE creator_user_id = ?";
			$params[] = $creatorId;
		}
		$query .= " ORDER BY created_at ASC, id ASC";

		$stmt = $pdo->prepare($query);
		$stmt->execute($params);
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$badges = array();
		foreach ($rows as $row) {
			$row = $this->hydrateBadgeRow($row);
			if ($mine && (int)$row['creator_user_id'] !== (int)$creatorId) {
				continue;
			}
			$badges[] = $this->buildBadgePayload($row);
		}

		$this->response = array('badges' => $badges);
	}



	public function procBadgeCreate()
	{
                if ($this->isOperator() == false && $this->isSupervisor() == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

		$creatorId = $this->getLoginUserId();
		if ($creatorId === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		$badgeCode = Util::normalizeRequiredString($this->params['badgeCode'], 64);
		if ($badgeCode === false || preg_match('/^[A-Za-z0-9_-]{1,64}$/', $badgeCode) !== 1) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$title = Util::normalizeRequiredString($this->params['title'], 100);
		if ($title === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$description = null;
		if (array_key_exists('description', $this->params)) {
			$description = Util::normalizeOptionalString($this->params['description'], 255);
			if ($description === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
		}

		$icon = null;
		if (array_key_exists('icon', $this->params)) {
			$icon = Util::normalizeOptionalString($this->params['icon'], 8);
			if ($icon === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
		}
		if ($icon === null || $icon === '') {
			$icon = '★';
		} elseif (mb_strlen($icon, 'UTF-8') > 2) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$color = Util::normalizeHexColor($this->params['color'] ?? null, true);
		if ($color === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$highlight = Util::normalizeHexColor($this->params['highlight'] ?? null, false);
		if ($highlight === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$fontKey = 'sans';
		if (isset($this->params['fontKey'])) {
			$candidateFont = strtolower(trim($this->params['fontKey']));
			$allowedFonts = array('sans', 'serif', 'display');
			if (in_array($candidateFont, $allowedFonts, true)) {
				$fontKey = $candidateFont;
			} else {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
		}

		$fontScale = 1.0;
		if (isset($this->params['fontScale'])) {
			$fontScaleCandidate = (float)$this->params['fontScale'];
			if ($fontScaleCandidate < 0.5 || $fontScaleCandidate > 2.0) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$fontScale = round($fontScaleCandidate, 3);
		}

		$existing = $this->getBadgeInfo($badgeCode, $creatorId);
		if ($existing != null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'duplicate';
			return;
		}

		$templateVersion = $this->getBadgeTemplateVersionLatest();

		$scriptText = $this->buildBadgeScript(array(
													'title' => $title,
													'icon' => $icon,
													'color' => $color,
													'highlight' => $highlight,
													'fontKey' => $fontKey,
													'fontScale' => $fontScale,
													'templateVersion' => $templateVersion,
													));

		$now = new DateTime('now');
		$nowStr = $now->format('Y-m-d H:i:s');

		$pdo = $this->getPDOTarget();

		try {
			$stmt = $pdo->prepare(
								  'INSERT INTO badges (creator_user_id, badge_code, title, description, icon_text, color_hex, highlight_hex, font_key, font_scale, script_text, template_version, created_at, updated_at) '
								  . 'VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
								  );
			$stmt->execute(array(
								 $creatorId,
								 $badgeCode,
								 $title,
								 $description,
								 $icon,
								 $color,
								 $highlight,
								 $fontKey,
								 $fontScale,
								 $scriptText,
								 $templateVersion,
								 $nowStr,
								 $nowStr,
								 ));
			$badgeId = (int)$pdo->lastInsertId();
		} catch (\Exception $exception) {
			if ($exception instanceof \PDOException) {
				$code = $exception->getCode();
				if ($code === '23000' || $code === '23505') {
					$this->status = parent::RESULT_ERROR;
					$this->errorReason = 'duplicate';
					return;
				}
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$created = $this->getBadgeById($badgeId);
		if ($created == null) {
			$created = array(
							 'id' => $badgeId,
							 'creator_user_id' => $creatorId,
							 'badge_code' => $badgeCode,
							 'title' => $title,
							 'description' => $description,
							 'icon_text' => $icon,
							 'color_hex' => $color,
							 'highlight_hex' => $highlight,
							 'font_key' => $fontKey,
							 'font_scale' => $fontScale,
							 'template_version' => $templateVersion,
							 'created_at' => $nowStr,
							 'updated_at' => $nowStr,
							 );
		}

		$this->response = array('badge' => $this->buildBadgePayload($created));
	}



	public function procBadgeDelete()
	{
                if ($this->isOperator() == false && $this->isSupervisor() == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

		$creatorId = $this->getLoginUserId();
		if ($creatorId === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		$badgeId = isset($this->params['badgeId']) ? (int)$this->params['badgeId'] : 0;
		if ($badgeId <= 0 && isset($this->params['badgeCode'])) {
			$badgeRow = $this->getBadgeInfo($this->params['badgeCode'], $creatorId);
			$badgeId = $badgeRow ? (int)$badgeRow['id'] : 0;
		}

		if ($badgeId <= 0) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$badge = $this->getBadgeById($badgeId);
		if ($badge == null || (int)$badge['creator_user_id'] !== (int)$creatorId) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$pdo = $this->getPDOTarget();

		$stmt = $pdo->prepare('SELECT COUNT(*) AS awardCount FROM badge_awards WHERE badge_id = ?');
		$stmt->execute(array($badgeId));
		$countRow = $stmt->fetch(PDO::FETCH_ASSOC);
		$awardCount = $countRow ? (int)$countRow['awardCount'] : 0;
		if ($awardCount > 0) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'cannot_delete_awarded_badge';
			return;
		}

		$stmt = $pdo->prepare('DELETE FROM badges WHERE id = ?');
		$stmt->execute(array($badgeId));

		$cacheKey = $this->buildBadgeCacheKey(isset($badge['badge_code']) ? $badge['badge_code'] : null, $creatorId);
		if ($cacheKey !== null && isset($this->badgeCache[$cacheKey])) {
			unset($this->badgeCache[$cacheKey]);
		}

		$this->response = array('ok' => true);
	}



	public function procBadgeShowcase()
	{
		$loginUserCode = $this->getLoginUserCode();
		if ($loginUserCode === null || $loginUserCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}
		
		$pdo = $this->getPDOTarget();

		$query =
			'SELECT ba.id, ba.badge_id, ba.target_id, ba.awarded_by, ba.awarded_at, ba.note, ba.created_at, ba.updated_at, '
			. 'b.badge_code, b.title AS badge_title, b.description AS badge_description, b.icon_text, b.color_hex, b.highlight_hex, '
			. 'b.font_key, b.font_scale, b.template_version, b.script_text, '
			. 't.targetCode, t.title AS target_title, '
			. 'aw.userCode AS awarded_by_code, aw.displayName AS awarded_by_display_name, '
			. 'creator.userCode AS creator_user_code, creator.displayName AS creator_display_name, '
			. 'CASE WHEN direct_user.userCode = ? THEN direct_user.userCode ELSE assigned_user.userCode END AS assigned_user_code, '
			. 'CASE WHEN direct_user.userCode = ? THEN direct_user.displayName ELSE assigned_user.displayName END AS assigned_user_display_name, '
			. 'CASE WHEN direct_user.userCode = ? THEN direct_user.mail ELSE assigned_user.mail END AS assigned_user_mail, '
			. 'CASE WHEN direct_user.userCode = ? THEN direct_user.id ELSE assigned_user.id END AS assigned_user_id '
			. 'FROM badge_awards ba '
			. 'JOIN badges b ON ba.badge_id = b.id '
			. 'JOIN targets t ON ba.target_id = t.id '
			. 'LEFT JOIN user aw ON ba.awarded_by = aw.id '
			. 'LEFT JOIN user creator ON b.creator_user_id = creator.id '
			. 'LEFT JOIN user direct_user ON t.assignedUserCode = direct_user.userCode '
                        . 'LEFT JOIN targetAssignedUsers tau ON tau.targetCode = t.targetCode AND tau.userCode = ? AND (tau.isActive IS NULL OR tau.isActive = 1) '
			. 'LEFT JOIN user assigned_user ON tau.userCode = assigned_user.userCode '
			. 'WHERE (direct_user.userCode = ? OR tau.userCode = ?) '
			. 'ORDER BY ba.awarded_at DESC, ba.id DESC';

		$params = array_fill(0, 7, $loginUserCode);
		$stmt = $pdo->prepare($query);
		$stmt->execute($params);
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$badges = array();
		foreach ($rows as $row) {
			if (!isset($row['script_text']) || $this->isBlankBadgeValue($row['script_text'])) {
				$badgeRow = $this->getBadgeById(isset($row['badge_id']) ? (int)$row['badge_id'] : 0);
				if (is_array($badgeRow)) {
					if (!isset($row['script_text']) || $this->isBlankBadgeValue($row['script_text'])) {
						$row['script_text'] = isset($badgeRow['script_text']) ? $badgeRow['script_text'] : null;
					}
					if (!isset($row['template_version']) || (int)$row['template_version'] <= 0) {
						$row['template_version'] = isset($badgeRow['template_version']) ? $badgeRow['template_version'] : null;
					}
				}
			}

			$payload = $this->buildBadgeAwardPayload($row);
			if ($payload == null) {
				continue;
			}

			if (!isset($payload['userCode']) || $payload['userCode'] === null || $payload['userCode'] === '') {
				$payload['userCode'] = $loginUserCode;
			}

			if (!isset($payload['userDisplayName']) || $payload['userDisplayName'] === null || $payload['userDisplayName'] === '') {
				$userInfo = $this->getUserInfo($loginUserCode);
				if ($userInfo != null && isset($userInfo['displayName'])) {
					$payload['userDisplayName'] = $userInfo['displayName'];
				}
			}

			$badges[] = array(
							  'awardId' => isset($payload['awardId']) ? $payload['awardId'] : null,
							  'badgeAwardId' => isset($payload['badgeAwardId']) ? $payload['badgeAwardId'] : null,
							  'badgeCode' => isset($payload['badgeCode']) ? $payload['badgeCode'] : null,
							  'title' => isset($payload['badgeTitle']) ? $payload['badgeTitle'] : null,
							  'description' => isset($payload['badgeDescription']) ? $payload['badgeDescription'] : null,
							  'scriptText' => isset($payload['scriptText']) ? $payload['scriptText'] : null,
							  'badgeColor' => isset($payload['badgeColor']) ? $payload['badgeColor'] : null,
							  'badgeHighlight' => isset($payload['badgeHighlight']) ? $payload['badgeHighlight'] : null,
							  'fontKey' => isset($payload['badgeFontKey']) ? $payload['badgeFontKey'] : null,
							  'fontScale' => isset($payload['badgeFontScale']) ? $payload['badgeFontScale'] : null,
							  'awardedAt' => isset($payload['awardedAt']) ? $payload['awardedAt'] : null,
							  'awardedByDisplayName' => isset($payload['awardedByDisplayName']) ? $payload['awardedByDisplayName'] : null,
							  'awardedByUserCode' => isset($payload['awardedByUserCode']) ? $payload['awardedByUserCode'] : null,
							  'note' => isset($payload['note']) ? $payload['note'] : null,
							  'targetCode' => isset($payload['targetCode']) ? $payload['targetCode'] : null,
							  'targetTitle' => isset($payload['targetTitle']) ? $payload['targetTitle'] : null,
							  );
		}

		$this->response = array('badges' => $badges);
	}




	public function procTargetBadgeList()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$isPrivileged = $this->isSupervisor() || $this->isOperator();
		$loginUserCode = $this->getLoginUserCode();

		if ($isPrivileged === false) {
			if ($loginUserCode === null || $loginUserCode === '') {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}
			if ($this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}
		}

		$targetId = isset($targetRow['id']) ? (int)$targetRow['id'] : 0;
		$awards = $targetId > 0 ? $this->fetchBadgeAwardsByTargetId($targetId) : array();
		$this->response = array('awards' => $awards);
	}



	public function procTargetBadgeAward()
	{
                if ($this->isOperator() == false && $this->isSupervisor() == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }
		
		$creatorId = $this->getLoginUserId();
		if ($creatorId === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		$targetRow = null;
		$targetId = isset($this->params['targetId']) ? (int)$this->params['targetId'] : 0;
		if ($targetId > 0) {
			$targetRow = $this->fetchActiveTargetById($targetId);
		}

		if ($targetRow == null && isset($this->params['targetCode'])) {
			$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
			if ($targetCode !== '') {
				$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
			}
		}

		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$targetId = isset($targetRow['id']) ? (int)$targetRow['id'] : 0;
		if ($targetId <= 0) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		if ($this->isSupervisor() == false) {
			$targetCode = null;
			if (isset($targetRow['targetCode'])) {
				$targetCode = $targetRow['targetCode'];
			} elseif (isset($targetRow['target_code'])) {
				$targetCode = $targetRow['target_code'];
			} elseif (isset($this->params['targetCode'])) {
				$candidateTargetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
				if ($candidateTargetCode !== '') {
					$targetCode = $candidateTargetCode;
				}
			}
			$loginUserCode = $this->getLoginUserCode();
			if ($loginUserCode === null || $loginUserCode === '' || $this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}
		}

		$badgeId = isset($this->params['badgeId']) ? (int)$this->params['badgeId'] : 0;
		$badgeRow = null;
		if ($badgeId > 0) {
			$badgeRow = $this->getBadgeById($badgeId);
		}
		if ($badgeRow == null && isset($this->params['badgeCode'])) {
			$badgeRow = $this->getBadgeInfo($this->params['badgeCode'], $creatorId);
			if ($badgeRow != null) {
				$badgeId = (int)$badgeRow['id'];
			}
		}

                if ($badgeRow == null || $badgeId <= 0) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'badgenotfound';
                        return;
                }

                if ((int)$badgeRow['creator_user_id'] !== (int)$creatorId && $this->isSupervisor() == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $awardedById = $creatorId;
                if ($this->isSupervisor()) {
                        $awardedByUserCode = isset($this->params['awardedByUserCode']) ? trim((string)$this->params['awardedByUserCode']) : '';
                        if ($awardedByUserCode !== '') {
                                $awardedByInfo = $this->getUserInfo($awardedByUserCode);
                                if ($awardedByInfo === null || !isset($awardedByInfo['id'])) {
                                        $this->status = parent::RESULT_ERROR;
                                        $this->errorReason = 'invalid';
                                        return;
                                }
                                $awardedById = (int)$awardedByInfo['id'];
                        }
                }

                $note = null;
                if (isset($this->params['note'])) {
                        $noteValue = Util::normalizeOptionalString($this->params['note'], 255);
                        if ($noteValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$note = $noteValue;
		}

		$awardedAt = null;
		if (isset($this->params['awardedAt'])) {
			$awardedAtValue = Util::normalizeOptionalDateTime($this->params['awardedAt']);
			if ($awardedAtValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$awardedAt = $awardedAtValue;
		}

                $now = new DateTime('now');
                $nowStr = $now->format('Y-m-d H:i:s');
                if ($awardedAt === null) {
                        $awardedAt = $nowStr;
                }

                $pdo = $this->getPDOTarget();
                try {
                        $stmt = $pdo->prepare('INSERT INTO badge_awards (badge_id, target_id, awarded_by, awarded_at, note) VALUES(?, ?, ?, ?, ?)');
                        $stmt->execute(array($badgeId, $targetId, $awardedById, $awardedAt, $note));
                        $awardId = (int)$pdo->lastInsertId();
                } catch (\Exception $exception) {
                        $this->status = parent::RESULT_ERROR;
                        if ($exception instanceof \PDOException) {
                                $code = $exception->getCode();
				if ($code === '23000' || $code === '23505') {
					$this->errorReason = 'duplicate';
					return;
				}
				$message = $exception->getMessage();
				if (strpos($message, 'UNIQUE constraint failed') !== false) {
					$this->errorReason = 'duplicate';
					return;
				}
			}
			$this->errorReason = 'failed';
			return;
		}

		$award = $this->fetchBadgeAwardById($awardId);
		$this->response = array('award' => $award);
	}



	public function procTargetBadgeAwardUpdate()
	{
                if ($this->isOperator() == false && $this->isSupervisor() == false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

		$creatorId = $this->getLoginUserId();
		if ($creatorId === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$awardId = isset($this->params['badgeAwardId']) ? (int)$this->params['badgeAwardId'] : 0;

		if ($targetCode === '' || $awardId <= 0) {
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

		$targetId = isset($targetRow['id']) ? (int)$targetRow['id'] : 0;
		if ($targetId <= 0) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		if ($this->isSupervisor() == false) {
			$loginUserCode = $this->getLoginUserCode();
			if ($loginUserCode === null || $loginUserCode === '' || $this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}
		}

		$awardPayload = $this->fetchBadgeAwardById($awardId);
		if ($awardPayload == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$existingTargetId = isset($awardPayload['targetId']) ? (int)$awardPayload['targetId'] : 0;
		if ($existingTargetId !== $targetId) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$existingBadgeId = isset($awardPayload['badgeId']) ? (int)$awardPayload['badgeId'] : 0;
		if ($existingBadgeId <= 0) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'badgenotfound';
			return;
		}

		$badgeRow = $this->getBadgeById($existingBadgeId);
		if ($badgeRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'badgenotfound';
			return;
		}

		if ($this->isSupervisor() == false && (int)$badgeRow['creator_user_id'] !== (int)$creatorId) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		$newBadgeRow = null;
		$requestedBadgeChange = false;
		if (isset($this->params['badgeId'])) {
			$candidateBadgeId = (int)$this->params['badgeId'];
			if ($candidateBadgeId > 0) {
				$requestedBadgeChange = true;
				$candidateRow = $this->getBadgeById($candidateBadgeId);
				if ($candidateRow != null) {
					$newBadgeRow = $candidateRow;
				}
			}
		}

		if ($newBadgeRow == null && isset($this->params['badgeCode'])) {
			$badgeCode = htmlspecialchars($this->params['badgeCode'], ENT_QUOTES, "UTF-8");
			if ($badgeCode !== '') {
				$requestedBadgeChange = true;
				if ($this->isSupervisor()) {
					$newBadgeRow = $this->getBadgeInfo($badgeCode);
				} else {
					$newBadgeRow = $this->getBadgeInfo($badgeCode, $creatorId);
				}
			}
		}

		if ($requestedBadgeChange && $newBadgeRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'badgenotfound';
			return;
		}

		if ($newBadgeRow != null) {
			if ($this->isSupervisor() == false && (int)$newBadgeRow['creator_user_id'] !== (int)$creatorId) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}
			$badgeRow = $newBadgeRow;
			$existingBadgeId = isset($badgeRow['id']) ? (int)$badgeRow['id'] : $existingBadgeId;
		}

		$note = isset($awardPayload['note']) ? $awardPayload['note'] : null;
		if (isset($this->params['note'])) {
			$noteValue = Util::normalizeOptionalString($this->params['note'], 255);
			if ($noteValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$note = $noteValue;
		}

		$awardedAt = isset($awardPayload['awardedAt']) ? $awardPayload['awardedAt'] : null;
		if (isset($this->params['awardedAt'])) {
			$awardedAtValue = Util::normalizeOptionalDateTime($this->params['awardedAt']);
			if ($awardedAtValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			if ($awardedAtValue !== null) {
				$awardedAt = $awardedAtValue;
			}
		}

		if ($awardedAt === null) {
			$awardedAt = isset($awardPayload['awardedAt']) ? $awardPayload['awardedAt'] : null;
			if ($awardedAt === null) {
				$now = new DateTime('now');
				$awardedAt = $now->format('Y-m-d H:i:s');
			}
		}

		$pdo = $this->getPDOTarget();
		try {
			$stmt = $pdo->prepare('UPDATE badge_awards SET badge_id = ?, awarded_by = ?, awarded_at = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
			$stmt->execute(array($existingBadgeId, $creatorId, $awardedAt, $note, $awardId));
		} catch (\Exception $exception) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$updatedAward = $this->fetchBadgeAwardById($awardId);
		$this->response = array('award' => $updatedAward);
	}



	public function procTargetBadgeRevoke()
	{
		if ($this->isOperator() == false && $this->isSupervisor() == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$awardId = isset($this->params['badgeAwardId']) ? (int)$this->params['badgeAwardId'] : 0;

		if ($targetCode === '' || $awardId <= 0) {
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

		$creatorId = $this->getLoginUserId();
		$isSupervisor = $this->isSupervisor();

		$pdo = $this->getPDOTarget();
		$stmt = $pdo->prepare(
							  'SELECT ba.id, ba.badge_id, b.creator_user_id '
							  . 'FROM badge_awards ba '
							  . 'JOIN badges b ON ba.badge_id = b.id '
							  . 'JOIN targets t ON ba.target_id = t.id '
							  . 'WHERE ba.id = ? AND t.targetCode = ? '
							  . 'LIMIT 1'
							  );
		$stmt->execute(array($awardId, $targetCode));
		$awardRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($awardRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		if ($isSupervisor == false) {
			if ($creatorId === null || (int)$awardRow['creator_user_id'] !== (int)$creatorId) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}
		}

		$stmt = $pdo->prepare('DELETE FROM badge_awards WHERE id = ?');
		$stmt->execute(array($awardId));

		$this->response = array('badgeAwardId' => $awardId);
	}



	private function fetchBadgeAwardsByTargetId($targetId)
	{
		$stmt = $this->getPDOTarget()->prepare(
											   'SELECT ba.id, ba.badge_id, ba.target_id, ba.awarded_by, ba.awarded_at, ba.note, ba.created_at, ba.updated_at, '
											   . 'b.badge_code, b.title AS badge_title, b.description AS badge_description, b.icon_text, b.color_hex, b.highlight_hex, b.font_key, b.font_scale, b.template_version, b.script_text, '
											   . 't.targetCode, t.title AS target_title, '
											   . 'aw.userCode AS awarded_by_code, aw.displayName AS awarded_by_display_name, '
											   . 'creator.userCode AS creator_user_code, creator.displayName AS creator_display_name, '
											   . 'assigned.userCode AS assigned_user_code, assigned.displayName AS assigned_user_display_name, assigned.mail AS assigned_user_mail, assigned.id AS assigned_user_id '
											   . 'FROM badge_awards ba '
											   . 'JOIN badges b ON ba.badge_id = b.id '
											   . 'JOIN targets t ON ba.target_id = t.id '
											   . 'LEFT JOIN user aw ON ba.awarded_by = aw.id '
											   . 'LEFT JOIN user creator ON b.creator_user_id = creator.id '
											   . 'LEFT JOIN user assigned ON t.assignedUserCode = assigned.userCode '
											   . 'WHERE ba.target_id = ? '
											   . 'ORDER BY ba.awarded_at DESC, ba.id DESC'
											   );
		$stmt->execute(array($targetId));
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$awards = array();
		foreach ($rows as $row) {
			if (!isset($row['script_text']) || $this->isBlankBadgeValue($row['script_text'])) {
				$badgeRow = $this->getBadgeById(isset($row['badge_id']) ? (int)$row['badge_id'] : 0);
				if (is_array($badgeRow)) {
					if (!isset($row['script_text']) || $this->isBlankBadgeValue($row['script_text'])) {
						$row['script_text'] = isset($badgeRow['script_text']) ? $badgeRow['script_text'] : null;
					}
					if (!isset($row['template_version']) || (int)$row['template_version'] <= 0) {
						$row['template_version'] = isset($badgeRow['template_version']) ? $badgeRow['template_version'] : null;
					}
				}
			}
			$awards[] = $this->buildBadgeAwardPayload($row);
		}

		return $awards;
	}



	private function fetchBadgeAwardById($awardId)
	{
		if ($awardId <= 0) {
			return null;
		}

		$stmt = $this->getPDOTarget()->prepare(
											   'SELECT ba.id, ba.badge_id, ba.target_id, ba.awarded_by, ba.awarded_at, ba.note, ba.created_at, ba.updated_at, '
											   . 'b.badge_code, b.title AS badge_title, b.description AS badge_description, b.icon_text, b.color_hex, b.highlight_hex, b.font_key, b.font_scale, b.template_version, b.script_text, '
											   . 't.targetCode, t.title AS target_title, '
											   . 'aw.userCode AS awarded_by_code, aw.displayName AS awarded_by_display_name, '
											   . 'creator.userCode AS creator_user_code, creator.displayName AS creator_display_name, '
											   . 'assigned.userCode AS assigned_user_code, assigned.displayName AS assigned_user_display_name, assigned.mail AS assigned_user_mail, assigned.id AS assigned_user_id '
											   . 'FROM badge_awards ba '
											   . 'JOIN badges b ON ba.badge_id = b.id '
											   . 'JOIN targets t ON ba.target_id = t.id '
											   . 'LEFT JOIN user aw ON ba.awarded_by = aw.id '
											   . 'LEFT JOIN user creator ON b.creator_user_id = creator.id '
											   . 'LEFT JOIN user assigned ON t.assignedUserCode = assigned.userCode '
											   . 'WHERE ba.id = ? '
											   . 'LIMIT 1'
											   );
		$stmt->execute(array($awardId));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($row == null) {
			return null;
		}

		if (!isset($row['script_text']) || $this->isBlankBadgeValue($row['script_text'])) {
			$badgeRow = $this->getBadgeById(isset($row['badge_id']) ? (int)$row['badge_id'] : 0);
			if (is_array($badgeRow)) {
				if (!isset($row['script_text']) || $this->isBlankBadgeValue($row['script_text'])) {
					$row['script_text'] = isset($badgeRow['script_text']) ? $badgeRow['script_text'] : null;
				}
				if (!isset($row['template_version']) || (int)$row['template_version'] <= 0) {
					$row['template_version'] = isset($badgeRow['template_version']) ? $badgeRow['template_version'] : null;
				}
			}
		}

		return $this->buildBadgeAwardPayload($row);
	}



	private function buildBadgeAwardPayload($row)
	{
		return array(
					 'badgeAwardId' => isset($row['id']) ? (int)$row['id'] : null,
					 'awardId' => isset($row['id']) ? (int)$row['id'] : null,
					 'badgeId' => isset($row['badge_id']) ? (int)$row['badge_id'] : null,
					 'badgeCode' => isset($row['badge_code']) ? $row['badge_code'] : null,
					 'badgeTitle' => isset($row['badge_title']) ? $row['badge_title'] : null,
					 'badgeDescription' => isset($row['badge_description']) ? $row['badge_description'] : null,
					 'badgeTier' => isset($row['badgeTier']) ? $row['badgeTier'] : null,
					 'badgeIcon' => isset($row['icon_text']) ? $row['icon_text'] : null,
					 'badgeColor' => isset($row['color_hex']) ? $row['color_hex'] : null,
					 'badgeHighlight' => isset($row['highlight_hex']) ? $row['highlight_hex'] : null,
					 'badgeFontKey' => isset($row['font_key']) ? $row['font_key'] : null,
					 'badgeFontScale' => isset($row['font_scale']) ? (float)$row['font_scale'] : null,
					 'badgeTemplateVersion' => isset($row['template_version']) ? (int)$row['template_version'] : null,
					 'templateVersion' => isset($row['template_version']) ? (int)$row['template_version'] : null,
					 'badgeScriptText' => isset($row['script_text']) ? $row['script_text'] : null,
					 'scriptText' => isset($row['script_text']) ? $row['script_text'] : null,
					 'targetId' => isset($row['target_id']) ? (int)$row['target_id'] : null,
					 'targetCode' => isset($row['targetCode']) ? $row['targetCode'] : null,
					 'targetTitle' => isset($row['target_title']) ? $row['target_title'] : null,
					 'userId' => isset($row['assigned_user_id']) ? (int)$row['assigned_user_id'] : null,
					 'userCode' => isset($row['assigned_user_code']) ? $row['assigned_user_code'] : null,
					 'userDisplayName' => isset($row['assigned_user_display_name']) ? $row['assigned_user_display_name'] : null,
					 'userMail' => isset($row['assigned_user_mail']) ? $row['assigned_user_mail'] : null,
					 'awardedByUserId' => isset($row['awarded_by']) ? (int)$row['awarded_by'] : null,
					 'awardedByUserCode' => isset($row['awarded_by_code']) ? $row['awarded_by_code'] : null,
					 'awardedByDisplayName' => isset($row['awarded_by_display_name']) ? $row['awarded_by_display_name'] : null,
					 'creatorUserCode' => isset($row['creator_user_code']) ? $row['creator_user_code'] : null,
					 'creatorDisplayName' => isset($row['creator_display_name']) ? $row['creator_display_name'] : null,
					 'awardedAt' => isset($row['awarded_at']) ? $row['awarded_at'] : null,
					 'note' => isset($row['note']) ? $row['note'] : null,
					 'createdAt' => isset($row['created_at']) ? $row['created_at'] : null,
					 'updatedAt' => isset($row['updated_at']) ? $row['updated_at'] : null
					 );
	}



	private function buildBadgeCacheKey($badgeCode, $creatorUserId)
	{
		if ($badgeCode === null || $badgeCode === '') {
			return null;
		}

		$suffix = $badgeCode;
		if ($creatorUserId === null) {
			return ':' . $suffix;
		}

		return (int)$creatorUserId . ':' . $suffix;
	}



	private function buildBadgePayload($row)
	{
		if (!is_array($row)) {
			return array();
		}

		return array(
					 'id' => isset($row['id']) ? (int)$row['id'] : null,
					 'badgeId' => isset($row['id']) ? (int)$row['id'] : null,
					 'badgeCode' => isset($row['badge_code']) ? $row['badge_code'] : (isset($row['badgeCode']) ? $row['badgeCode'] : null),
					 'title' => isset($row['title']) ? $row['title'] : null,
					 'description' => isset($row['description']) ? $row['description'] : null,
					 'tier' => isset($row['tier']) ? $row['tier'] : null,
					 'icon' => isset($row['icon_text']) ? $row['icon_text'] : (isset($row['icon']) ? $row['icon'] : null),
					 'color' => isset($row['color_hex']) ? $row['color_hex'] : (isset($row['color']) ? $row['color'] : null),
					 'highlight' => isset($row['highlight_hex']) ? $row['highlight_hex'] : (isset($row['highlight']) ? $row['highlight'] : null),
					 'fontKey' => isset($row['font_key']) ? $row['font_key'] : null,
					 'fontScale' => isset($row['font_scale']) ? (float)$row['font_scale'] : null,
					 'templateVersion' => isset($row['template_version']) ? (int)$row['template_version'] : null,
					 'createdAt' => isset($row['created_at']) ? $row['created_at'] : (isset($row['createdAt']) ? $row['createdAt'] : null),
					 'updatedAt' => isset($row['updated_at']) ? $row['updated_at'] : (isset($row['updatedAt']) ? $row['updatedAt'] : null)
					 );
	}



	private function getBadgeTemplateVersionLatest()
	{
		return self::BADGE_TEMPLATE_VERSION_LATEST;
	}



	private function resolveBadgeTemplateVersion($badge)
	{
		if (is_array($badge)) {
			if (isset($badge['template_version'])) {
				$candidate = (int)$badge['template_version'];
				if ($candidate > 0) {
					return $candidate;
				}
			}
			if (isset($badge['templateVersion'])) {
				$candidate = (int)$badge['templateVersion'];
				if ($candidate > 0) {
					return $candidate;
				}
			}
		}

		return $this->getBadgeTemplateVersionLatest();
	}



	private function isBlankBadgeValue($value)
	{
		if ($value === null) {
			return true;
		}

		if (is_string($value)) {
			return trim($value) === '';
		}

		return false;
	}



	private function buildBadgeScript($badge)
	{
		$templateVersion = $this->resolveBadgeTemplateVersion($badge);

		switch ($templateVersion) {
		case 1:
		default:
			return $this->buildBadgeScriptV1($badge);
		}
	}



	private function buildBadgeScriptV1($badge)
	{
		$title = '';
		if (isset($badge['title']) && $badge['title'] !== null) {
			$title = $badge['title'];
		} elseif (isset($badge['badgeTitle']) && $badge['badgeTitle'] !== null) {
			$title = $badge['badgeTitle'];
		}

		$icon = '★';
		if (isset($badge['icon']) && $badge['icon'] !== null && $badge['icon'] !== '') {
			$icon = $badge['icon'];
		} elseif (isset($badge['icon_text']) && $badge['icon_text'] !== null && $badge['icon_text'] !== '') {
			$icon = $badge['icon_text'];
		}

		$color = '#4F8BFF';
		if (isset($badge['color']) && $badge['color'] !== null && $badge['color'] !== '') {
			$color = $badge['color'];
		} elseif (isset($badge['color_hex']) && $badge['color_hex'] !== null && $badge['color_hex'] !== '') {
			$color = $badge['color_hex'];
		}

		$highlight = null;
		if (isset($badge['highlight']) && $badge['highlight'] !== null && $badge['highlight'] !== '') {
			$highlight = $badge['highlight'];
		} elseif (isset($badge['highlight_hex']) && $badge['highlight_hex'] !== null && $badge['highlight_hex'] !== '') {
			$highlight = $badge['highlight_hex'];
		}
		if ($highlight === null || $highlight === '') {
			$highlight = $color;
		}

		$fontKey = 'sans';
		if (isset($badge['fontKey']) && $badge['fontKey'] !== null && $badge['fontKey'] !== '') {
			$fontKey = $badge['fontKey'];
		} elseif (isset($badge['font_key']) && $badge['font_key'] !== null && $badge['font_key'] !== '') {
			$fontKey = $badge['font_key'];
		}

		$fontScale = 1.0;
		if (isset($badge['fontScale']) && is_numeric($badge['fontScale'])) {
			$fontScale = (float)$badge['fontScale'];
		} elseif (isset($badge['font_scale']) && is_numeric($badge['font_scale'])) {
			$fontScale = (float)$badge['font_scale'];
		}

		// NOTE: Keep slashes escaped so "</script>" stays harmless when injected into an
		// iframe srcdoc block.
		$badgeConfig = array(
							 'title' => (string)$title,
							 'icon' => (string)$icon,
							 'color' => (string)$color,
							 'highlight' => (string)$highlight,
							 'fontKey' => (string)$fontKey,
							 'fontScale' => (float)$fontScale,
							 );

		$badgeJson = json_encode($badgeConfig, JSON_UNESCAPED_UNICODE);
		if (!is_string($badgeJson) || $badgeJson === '') {
			$badgeJson = json_encode(
									 array(
										   'title' => '',
										   'icon' => '★',
										   'color' => '#4F8BFF',
										   'highlight' => '#4F8BFF',
										   'fontKey' => 'sans',
										   'fontScale' => 1.0,
										   ),
									 JSON_UNESCAPED_UNICODE
									 );
			if (!is_string($badgeJson) || $badgeJson === '') {
				$badgeJson = '{}';
			}
		}

		$script = <<<JAVASCRIPT
			const BADGE = {$badgeJson};

		new p5((p) => {
				const W = 320;
				const H = 180;

				p.setup = function () {
					p.createCanvas(W, H);
					p.noLoop();
				};

				function pickFont() {
					switch (BADGE.fontKey) {
					case 'serif':
						return 'Noto Serif JP, serif';
					case 'display':
						return 'Hanken Grotesk, system-ui, sans-serif';
					default:
						return 'Noto Sans JP, system-ui, sans-serif';
					}
				}

				p.draw = function () {
					const gradient = p.drawingContext.createLinearGradient(0, 0, W, H);
					gradient.addColorStop(0, BADGE.color);
					gradient.addColorStop(1, BADGE.highlight || BADGE.color);
					p.drawingContext.fillStyle = gradient;
					p.noStroke();
					p.rect(0, 0, W, H);

					p.textAlign(p.CENTER, p.CENTER);
					p.textFont(pickFont());
					p.fill(255);

					p.textSize(64 * BADGE.fontScale);
					p.text(BADGE.icon, W * 0.2, H * 0.45);

					p.textSize(22 * BADGE.fontScale);
					p.text(BADGE.title, W * 0.6, H * 0.52);
				};
			});
		JAVASCRIPT;

		return trim($script);
	}



	private function hydrateBadgeRow($row)
	{
		if (!is_array($row)) {
			return $row;
		}

		$existingVersion = isset($row['template_version']) ? (int)$row['template_version'] : null;
		$templateVersion = $this->resolveBadgeTemplateVersion($row);

		$scriptText = isset($row['script_text']) ? $row['script_text'] : null;
		$scriptNeedsUpdate = $this->isBlankBadgeValue($scriptText);
		if ($scriptNeedsUpdate) {
			$scriptBadge = array(
								 'title' => isset($row['title']) ? $row['title'] : null,
								 'badgeTitle' => isset($row['badge_title']) ? $row['badge_title'] : null,
								 'icon' => isset($row['icon_text']) ? $row['icon_text'] : null,
								 'color' => isset($row['color_hex']) ? $row['color_hex'] : null,
								 'highlight' => isset($row['highlight_hex']) ? $row['highlight_hex'] : null,
								 'fontKey' => isset($row['font_key']) ? $row['font_key'] : null,
								 'fontScale' => isset($row['font_scale']) ? $row['font_scale'] : null,
								 'templateVersion' => $templateVersion,
								 );
			$scriptText = $this->buildBadgeScript($scriptBadge);
			$row['script_text'] = $scriptText;
		}

		$versionNeedsUpdate = $existingVersion === null || $existingVersion <= 0;
		$row['template_version'] = $templateVersion;

		if (($scriptNeedsUpdate || $versionNeedsUpdate) && isset($row['id'])) {
			$this->updateBadgeTemplateMetadata(
											   (int)$row['id'],
											   $scriptNeedsUpdate ? $scriptText : null,
											   $templateVersion,
											   $scriptNeedsUpdate,
											   $versionNeedsUpdate
											   );
		}

		return $row;
	}



	private function updateBadgeTemplateMetadata($badgeId, $scriptText, $templateVersion, $updateScript, $updateVersion)
	{
		if ($badgeId <= 0) {
			return;
		}

		$fields = array();
		$params = array();

		if ($updateScript && $scriptText !== null) {
			$fields[] = 'script_text = ?';
			$params[] = $scriptText;
		}

		if ($updateVersion) {
			$fields[] = 'template_version = ?';
			$params[] = $templateVersion;
		}

		if (count($fields) === 0) {
			return;
		}

		$fields[] = 'updated_at = CURRENT_TIMESTAMP';
		$params[] = $badgeId;

		$query = 'UPDATE badges SET ' . implode(', ', $fields) . ' WHERE id = ?';

		try {
			$stmt = $this->getPDOTarget()->prepare($query);
			$stmt->execute($params);
		} catch (Exception $exception) {
			// Ignore update failures to avoid blocking read paths
		}
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


	private function getBadgeInfo($badgeCode, $creatorUserId = null)
	{
		if ($badgeCode === null || $badgeCode === '') {
			return null;
		}

		$cacheKey = $this->buildBadgeCacheKey($badgeCode, $creatorUserId);
		if (array_key_exists($cacheKey, $this->badgeCache)) {
			$cached = $this->badgeCache[$cacheKey];
			return $cached === false ? null : $cached;
		}

		$query = 'SELECT * FROM badges WHERE badge_code = ?';
		$params = array($badgeCode);
		if ($creatorUserId !== null) {
			$query .= ' AND creator_user_id = ?';
			$params[] = $creatorUserId;
		}
		$query .= ' LIMIT 1';

		$stmt = $this->getPDOTarget()->prepare($query);
		$stmt->execute($params);
		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($row) {
			$row = $this->hydrateBadgeRow($row);
			$this->badgeCache[$cacheKey] = $row;
			return $row;
		}

		$this->badgeCache[$cacheKey] = false;
		return null;
	}



	private function getBadgeById($badgeId)
	{
		if ($badgeId <= 0) {
			return null;
		}

		$stmt = $this->getPDOTarget()->prepare('SELECT * FROM badges WHERE id = ? LIMIT 1');
		$stmt->execute(array($badgeId));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($row) {
			$row = $this->hydrateBadgeRow($row);
			$cacheKey = $this->buildBadgeCacheKey(isset($row['badge_code']) ? $row['badge_code'] : null, isset($row['creator_user_id']) ? (int)$row['creator_user_id'] : null);
			if ($cacheKey !== null) {
				$this->badgeCache[$cacheKey] = $row;
			}
			return $row;
		}

		return null;
	}
}

?>
