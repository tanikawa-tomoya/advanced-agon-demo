<?php

class User extends Base
{
    public function __construct($context)
    {
        parent::__construct($context);
	}

	protected function validationUserGetAll()
	{
	}

	protected function validationUserAdd()
	{
		$this->requireParams(['userCode', 'displayName']);
	}

	protected function validationUserGet()
	{
	}    

	protected function validationUserUpdate()
	{
		$this->requireParams(['id']);
	}

	protected function validationUserDelete()
	{
		$this->requireParams(['id']);
	}

	protected function validationUserMailCheckSend()
	{
		$this->requireParams(['id']);
	}

	protected function validationUserMailCheckConfirm()
	{
		$this->requireParams(['keyword', 'keywordHash', 'q']);
	}

	protected function validationUserPasswordResetSend()
	{
		$this->requireParams(['mail', 'check']);
	}

        protected function validationUserPasswordResetConfirm()
        {
                $this->requireParams(['keyword', 'keywordHash', 'q']);
        }

        protected function validationUserAvatar()
        {
                $this->requireParams(['id']);
        }

        protected function validationUserSelectableList()
        {
        }

        protected function validationUserSelectableSave()
        {
                $this->requireParams(['operatorUserId']);
        }

	protected function validationRegister()
	{
		$this->requireParams(['groupCode', 'userMail', 'loginURL']);
	}

	protected function validationRegisterConfirm()
	{
		$this->requireParams(['t', 'l']);
	}

        private function clampPositiveIntParam($rawValue, $defaultValue, $minValue = 1, $maxValue = null)
        {
                if (!is_string($rawValue) || $rawValue === '') {
                        $value = (int) $defaultValue;
                } else if (ctype_digit($rawValue) === false) {
			$value = (int) $defaultValue;
		} else {
			$value = (int) $rawValue;
		}

		if (!is_int($minValue) || $minValue < 1) {
			$minValue = 1;
		}

		if ($value < $minValue) {
			$value = $minValue;
		}

		if ($maxValue !== null) {
			$maxCandidate = (int) $maxValue;
			if ($maxCandidate >= $minValue && $value > $maxCandidate) {
				$value = $maxCandidate;
			}
                }

                return $value;
        }

        private function normalizeUserRecord($userInfo)
        {
                if (!is_array($userInfo)) {
                        return array();
                }

                if (array_key_exists('mail', $userInfo)) {
                        $userInfo['mail'] = $this->decrypt($userInfo['mail']);
                }

                $roleRaw = isset($userInfo['role']) ? trim((string) $userInfo['role']) : '';
                $userInfo['role'] = $roleRaw;

                if (array_key_exists('useContentsManagement', $userInfo)) {
                        $userInfo['useContentsManagement'] = ((int) $userInfo['useContentsManagement'] === 1) ? 1 : 0;
                } else {
                        $userInfo['useContentsManagement'] = 1;
                }

                if (array_key_exists('organization', $userInfo)) {
                        $userInfo['organization'] = $userInfo['organization'] === null
                                ? null
                                : trim((string) $userInfo['organization']);
                }

                $baseDir = $this->dataBasePath . '/userdata/' . $userInfo['id'];
                $avatarSettings = $this->readUserAvatarSettings($baseDir);
                if (!empty($avatarSettings)) {
                        if (isset($avatarSettings['transform'])) {
                                $userInfo['avatarTransform'] = $avatarSettings['transform'];
                        }
                        if (array_key_exists('creatorState', $avatarSettings)) {
                                $userInfo['avatarCreatorState'] = $avatarSettings['creatorState'];
                        }
                }

                $avatarMetadata = $this->resolveUserAvatarMetadata($userInfo);
                $avatarKeys = array(
                                                    'avatarFileName',
                                                    'avatarUrl',
                                                    'avatarUrlSmall',
                                                    'avatarUrlMedium',
                                                    'avatarUrlOriginal',
                                                    'avatarVersion',
                                                    'avatarUpdatedAt',
                                                    'imageUpdatedAt',
                                                    );
                foreach ($avatarKeys as $key) {
                        if (array_key_exists($key, $avatarMetadata)) {
                                $userInfo[$key] = $avatarMetadata[$key];
                        }
                }
                if (isset($avatarMetadata['avatar'])) {
                        $userInfo['avatar'] = $avatarMetadata['avatar'];
                }

                return $userInfo;
        }

        private function buildInClausePlaceholders($items)
        {
                $count = count($items);
                if ($count <= 0) {
                        return '';
                }
                return implode(', ', array_fill(0, $count, '?'));
        }

        private function fetchUserSelectableMap(array $operatorIds)
        {
                $map = array();
                $pdoCommon = $this->getPDOCommon();

                $operatorIds = array_values(array_unique(array_map('intval', $operatorIds)));
                if (count($operatorIds) === 0) {
                        return $map;
                }

                $placeholders = $this->buildInClausePlaceholders($operatorIds);
                $stmt = $pdoCommon->prepare("SELECT operatorUserId, userId FROM userSelectable WHERE operatorUserId IN ($placeholders)");
                $stmt->execute($operatorIds);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $userIds = array();
                foreach ($rows as $row) {
                        $opId = (int) $row['operatorUserId'];
                        if (!isset($map[$opId])) {
                                $map[$opId] = array();
                        }
                        $userIds[] = (int) $row['userId'];
                }

                $userIds = array_values(array_unique($userIds));
                $userDetails = array();
                if (count($userIds) > 0) {
                        $userPlaceholders = $this->buildInClausePlaceholders($userIds);
                        $stmtUsers = $pdoCommon->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND id IN ($userPlaceholders)");
                        $stmtUsers->execute($userIds);
                        $userRows = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);
                        foreach ($userRows as $entry) {
                                $userDetails[(int) $entry['id']] = $this->normalizeUserRecord($entry);
                        }
                }

                foreach ($rows as $row) {
                        $opId = (int) $row['operatorUserId'];
                        $userId = (int) $row['userId'];
                        if (!isset($map[$opId])) {
                                $map[$opId] = array();
                        }
                        if (isset($userDetails[$userId])) {
                                $map[$opId][] = $userDetails[$userId];
                        }
                }

                foreach ($operatorIds as $opId) {
                        if (!isset($map[(int) $opId])) {
                                $map[(int) $opId] = array();
                        }
                }

                return $map;
        }

        private function normalizeUserCodeList($raw)
        {
                if ($raw === null) {
                        return array();
                }

                if (is_string($raw)) {
                        $decoded = json_decode($raw, true);
                        if (is_array($decoded)) {
                                $raw = $decoded;
                        } else {
                                $raw = explode(',', $raw);
                        }
                }

                if (!is_array($raw)) {
                        return array();
                }

                $codes = array();
                foreach ($raw as $item) {
                        if ($item === null) {
                                continue;
                        }
                        $text = trim((string) $item);
                        if ($text === '') {
                                continue;
                        }
                        $codes[] = $text;
                }

                return array_values(array_unique($codes));
        }

        private function resolveUserIdsFromCodes(array $codes)
        {
                $ids = array();
                if (count($codes) === 0) {
                        return $ids;
                }

                $pdoCommon = $this->getPDOCommon();
                $placeholders = $this->buildInClausePlaceholders($codes);
                $stmt = $pdoCommon->prepare("SELECT id, userCode FROM user WHERE isDeleted IS NULL AND userCode IN ($placeholders)");
                $stmt->execute($codes);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($rows as $row) {
                        $ids[(int) $row['id']] = $row['userCode'];
                }

                return array_keys($ids);
        }

	public function procUserGetAll()
	{
		$includeDeleted = false;
		if (isset($this->params["includeDeleted"])) {
			$flag = strtolower((string) $this->params["includeDeleted"]);
			$includeDeleted = !($flag === '' || $flag === '0' || $flag === 'false');
		}

		$pageRaw = $this->getSafeParam('page', '');
		$perPageRaw = $this->getSafeParam('perPage', '');

		$requestedPage = $this->clampPositiveIntParam($pageRaw, 1, 1);
		$perPage = $this->clampPositiveIntParam(
												$perPageRaw,
												Base::USER_LIST_DEFAULT_PER_PAGE, // TODO
												1,
												Base::USER_LIST_MAX_PER_PAGE // TODO
												);

		$pdoCommon = $this->getPDOCommon();

		$whereClause = $includeDeleted ? '' : ' WHERE isDeleted IS NULL';

                $countStmt = $pdoCommon->prepare('SELECT COUNT(*) AS totalCount FROM user' . $whereClause);
                $countStmt->execute();
                $countRow = $countStmt->fetch(PDO::FETCH_ASSOC);
                $totalCount = 0;
                if ($countRow !== false && isset($countRow['totalCount'])) {
			$totalCount = (int) $countRow['totalCount'];
			if ($totalCount < 0) {
				$totalCount = 0;
			}
		}

		$totalPages = 0;
		if ($perPage > 0 && $totalCount > 0) {
			$totalPages = (int) ceil($totalCount / $perPage);
		}

		$effectivePage = $requestedPage;
		if ($totalPages > 0 && $effectivePage > $totalPages) {
			$effectivePage = $totalPages;
		}
		if ($effectivePage < 1) {
			$effectivePage = 1;
		}

		$offset = ($effectivePage - 1) * $perPage;
		if ($offset < 0) {
			$offset = 0;
		}

		if ($includeDeleted) {
			$stmt = $pdoCommon->prepare('SELECT * FROM user LIMIT :limit OFFSET :offset');
		} else {
			$stmt = $pdoCommon->prepare('SELECT * FROM user WHERE isDeleted IS NULL LIMIT :limit OFFSET :offset');
		}
		$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
		$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
                $stmt->execute();
                $userList = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $operatorIds = array();
                foreach ($userList as &$userInfo) {
                        $userInfo = $this->normalizeUserRecord($userInfo);
                        if (isset($userInfo['isOperator']) && (int) $userInfo['isOperator'] === 1) {
                                $operatorIds[] = (int) $userInfo['id'];
                        }
                }
                $selectableMap = $this->fetchUserSelectableMap($operatorIds);
                foreach ($userList as &$userInfo) {
                        $id = (int) $userInfo['id'];
                        $userInfo['selectableUsers'] = isset($selectableMap[$id]) ? $selectableMap[$id] : array();
                }
                $hasNext = $totalPages > 0 && $effectivePage < $totalPages;
                $hasPrevious = $totalPages > 0 && $effectivePage > 1;

		$pagination = array(
							'page' => $totalPages === 0 ? 1 : $effectivePage,
							'perPage' => $perPage,
							'totalCount' => $totalCount,
							'total' => $totalCount,
							'totalPages' => $totalPages,
							'hasNext' => $hasNext,
							'hasPrevious' => $hasPrevious,
							);

		if ($hasNext) {
			$pagination['nextPage'] = $effectivePage + 1;
		}

		if ($hasPrevious) {
			$pagination['previousPage'] = $effectivePage - 1;
		}

		$this->response = array(
								'userList' => $userList,
								'users' => $userList,
								'pagination' => $pagination,
								);
	}

	public function procUserAdd()
	{
                $userCode = htmlspecialchars($this->params['userCode'], ENT_QUOTES, "UTF-8");
                $displayName = htmlspecialchars($this->params['displayName'], ENT_QUOTES, "UTF-8");
                $organization = NULL;
                if (array_key_exists('organization', $this->params)) {
                        $organizationValue = $this->params['organization'];
                        if ($organizationValue !== NULL) {
                                $organizationValue = trim($organizationValue);
                        }
                        if ($organizationValue !== '' && $organizationValue !== NULL) {
                                $organization = htmlspecialchars($organizationValue, ENT_QUOTES, "UTF-8");
                        }
                }

                $mail = NULL;
                if (array_key_exists('mail', $this->params)) {
                        $mailValue = $this->params['mail'];
                        if ($mailValue !== NULL) {
                                $mailValue = trim($mailValue);
                        }
                        if ($mailValue !== '' && $mailValue !== NULL) {
                                $mail = htmlspecialchars($mailValue, ENT_QUOTES, "UTF-8");
                        }
                }

                $isSupervisor = 0;
                if (array_key_exists('isSupervisor', $this->params)) {
                        $isSupervisor = $this->normalizeRoleFlagValue($this->params['isSupervisor']);
                }
                $isOperator = 0;
                if (array_key_exists('isOperator', $this->params)) {
                        $isOperator = $this->normalizeRoleFlagValue($this->params['isOperator']);
                }
                $useContentsManagement = 1;
                if (array_key_exists('useContentsManagement', $this->params)) {
                        $useContentsManagement = $this->normalizeRoleFlagValue($this->params['useContentsManagement']);
                }
                if ($isSupervisor === 1) {
                        $isOperator = 1;
                }

		if ($userCode == "admin") {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = "reserved";
			return;
		}

		// 現状4文字以上
		if (strlen($userCode) < 4) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = "length";
			return;
		}

		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND userCode = ?");
		$stmt->execute(array($userCode));
		$userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($userInfo) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = "duplicated";
			return;
		}

		$pdoCommon = $this->getPDOCommon();

		try {
			$pdoCommon->beginTransaction();

                        $autoPassword = $this->generateAutoPassword(4);
                        $encryptedMail = $mail === NULL ? NULL : $this->encrypt($mail);

                        $defaultRole = '';

                        $stmt = $pdoCommon->prepare("INSERT INTO user (userCode, displayName, organization, autoPassword, mail, role, isSupervisor, isOperator, useContentsManagement) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)");
                        $stmt->execute(array($userCode, $displayName, $organization, $autoPassword, $encryptedMail, $defaultRole, $isSupervisor, $isOperator, $useContentsManagement));
						
			$userId = $pdoCommon->lastInsertId();

			$pdoCommon->commit();

			$this->response = array(
									"userCode" => $userCode,
									"autoPassword" => $autoPassword,
									);
		} catch (Exception $exception) {
			if ($pdoCommon->inTransaction()) {
				$pdoCommon->rollBack();
			}

			$this->status = parent::RESULT_ERROR;
			$this->errorReason = "system";
			$this->response = array("message" => "ユーザー登録処理中にエラーが発生しました。");
		}
	}

	public function procUserGet()
	{
		$payload = $this->requireAuth();
		$this->setAuthPayload($payload);
		$this->syncSessionWithAuthPayload($payload, false);

		$userId = isset($payload['userId']) ? (int) $payload['userId'] : 0;
		if ($userId <= 0) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'unauthorized';
			return;
		}

		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND id = ?");
		$stmt->execute(array($userId));
		$userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
		if (!$userInfo) {
			$this->status = parent::RESULT_ERROR;
			return;
		}
	  
		$baseDir = $this->dataBasePath . "/userdata/" . $userInfo["id"];
		
                $claims = array(
                        'userId'       => (int) $userInfo['id'],
                        'isSupervisor' => (int) $userInfo['isSupervisor'] === 1 ? 1 : 0,
                        'isOperator'   => (int) $userInfo['isOperator'] === 1 ? 1 : 0,
                        'useContentsManagement' => isset($userInfo['useContentsManagement']) && (int) $userInfo['useContentsManagement'] === 1 ? 1 : 0,
                                                );

		try {
			$token = $this->issueJwt($claims);
		} catch (Throwable $error) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'token_issue_failed';
			$this->response = '認証トークンの発行に失敗しました。';
			return;
		}

		$this->setAuthPayload($claims);
		$this->syncSessionWithAuthPayload($claims, true);
		$this->setAuthTokenCookie($token, self::AUTH_TOKEN_TTL);

                $this->response = array(
                                                                "id" => $userInfo["id"],
                                                                "userCode" => $userInfo["userCode"],
                                                                "displayName" => $userInfo["displayName"],
                                                                "organization" => isset($userInfo['organization']) ? $userInfo['organization'] : null,
                                                                "imageFileName" => $userInfo["imageFileName"],
                                                                "mail" => $this->decrypt($userInfo["mail"]),
                                                                "mailCheckDate" => $userInfo["mailCheckDate"],
                                                                "hint" => $this->decrypt($userInfo["hint"]),
                                                                "isSupervisor" => (int) $userInfo["isSupervisor"],
                                                                "isOperator" => (int) $userInfo["isOperator"],
                                                                "useContentsManagement" => isset($userInfo['useContentsManagement']) ? (int) $userInfo['useContentsManagement'] : 0,
                                                                "role" => isset($userInfo['role']) ? strtolower(trim((string) $userInfo['role'])) : null,
                                                                "token" => $token,
                                                                );

		$avatarSettings = $this->readUserAvatarSettings($baseDir);
		if (!empty($avatarSettings)) {
			if (isset($avatarSettings['transform'])) {
				$this->response['avatarTransform'] = $avatarSettings['transform'];
			}
			if (array_key_exists('creatorState', $avatarSettings)) {
				$this->response['avatarCreatorState'] = $avatarSettings['creatorState'];
			}
		}

		$avatarMetadata = $this->resolveUserAvatarMetadata($userInfo);
		$this->applyAvatarMetadataToResponse($avatarMetadata);
	}

	public function procUserUpdate()
	{
		$id = htmlspecialchars($this->params['id'], ENT_QUOTES, "UTF-8");

		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND id = ?");
		$stmt->execute(array($id));
		$userInfo = $stmt->fetch(PDO::FETCH_ASSOC);

		// 本人または管理者でなければエラー
		if ($userInfo["id"] != $this->session["userId"]) {
			if (!$this->session["isSupervisor"] && !$this->session["isOperator"]) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = "permission";
				return;
			}
		}

		$baseDir = $this->dataBasePath . "/userdata/" . $userInfo["id"];

		if (isset($this->params["userCode"])) {
			$userCode = htmlspecialchars($this->params['userCode'], ENT_QUOTES, "UTF-8");
			if ($userCode == "admin") {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = "reserved";
				return;
			}
			$stmt = $this->getPDOCommon()->prepare("SELECT COUNT(*) AS count FROM user WHERE isDeleted IS NULL AND userCode = ? AND id IS NOT ?");
			$stmt->execute(array($userCode, $userInfo["id"]));
			if ($stmt->fetch(PDO::FETCH_ASSOC)["count"] != 0)  {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = "duplicated";
				return;
			}
		}

		$changed = false;

		$stmt = $this->getPDOCommon()->prepare("PRAGMA TABLE_INFO ('user')");
		$stmt->execute(array());
		$result = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$this->getPDOCommon()->beginTransaction();
		foreach ($result as $r) {
			$key = $r["name"];
			$this->userUpdateSub($key, $id, $changed);
		}

		// パスワード設定したら初期パスワードは終わり
		if (isset($this->params["hash"])) {
			$hash = htmlspecialchars($this->params['hash'], ENT_QUOTES, "UTF-8");
			if ($this->getHash($p) != $userInfo["hash"]) {
				$stmt = $this->getPDOCommon()->prepare("UPDATE user SET autoPassword = NULL WHERE id = ?");
				$stmt->execute(array($id));
			}
		}

		$this->getPDOCommon()->commit();

		$avatarResponse = array();

		$hasAvatarDataParam = array_key_exists('avatarData', $this->params);
		$avatarSettingsHandled = false;

		$avatarData = $this->extractAvatarDataParam($this->params);
		if (!empty($avatarData)) {
			$this->writeUserAvatarSettings($baseDir, $avatarData);
			$avatarResponse['settings'] = $avatarData;
			$avatarSettingsHandled = true;
		} else if ($hasAvatarDataParam && $avatarData === null) {
			$this->writeUserAvatarSettings($baseDir, null);
			$avatarResponse['settings'] = null;
			$avatarSettingsHandled = true;
		}

		$requestedRemoval = $this->shouldRemoveAvatar($this->params);

		if (isset($this->files['imageFile']) && !$requestedRemoval) {
			$file_name = $this->files['imageFile']['name'];
			$extension = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
			if (!in_array($extension, array('jpg', 'jpeg', 'png'), true)) {
				$extension = 'png';
			}
			if ($extension === 'jpeg') {
				$extension = 'jpg';
			}

			$imageDirectory = $baseDir . '/image';
			if (!is_dir($imageDirectory)) {
				@mkdir($imageDirectory, 0775, true);
			}

			$imageFileName = 'user-avatar.' . $extension;
			$tmp_path = $this->files['imageFile']['tmp_name'];
			$imagePath = $imageDirectory . '/' . $imageFileName;

			if (is_uploaded_file($tmp_path)) {
				move_uploaded_file($tmp_path, $imagePath);
			} else {
				file_put_contents($imagePath, file_get_contents($tmp_path));
			}

			$this->generateAvatarVariants($imagePath);

			$stmt = $this->getPDOCommon()->prepare("UPDATE user SET imageFileName = ? WHERE id = ?");
			$stmt->execute(array($imageFileName, $id));

			$avatarResponse['imageFileName'] = $imageFileName;
			$requestedRemoval = false;
			$userInfo["imageFileName"] = $imageFileName;

			if (!$avatarSettingsHandled) {
				$existingSettings = $this->readUserAvatarSettings($baseDir);
				if (!empty($existingSettings)) {
					$avatarResponse['settings'] = $existingSettings;
				} else {
					$defaultSettings = $this->buildDefaultAvatarSettings();
					$this->writeUserAvatarSettings($baseDir, $defaultSettings);
					$avatarResponse['settings'] = $defaultSettings;
				}
				$avatarSettingsHandled = true;
			}
		}

		if ($requestedRemoval) {
			$this->removeUserAvatarFiles($baseDir, $userInfo["imageFileName"]);
			$stmt = $this->getPDOCommon()->prepare("UPDATE user SET imageFileName = NULL WHERE id = ?");
			$stmt->execute(array($id));
			$this->writeUserAvatarSettings($baseDir, null);
			$avatarResponse['imageFileName'] = NULL;
			$avatarResponse['removed'] = true;
			$userInfo["imageFileName"] = NULL;
		}

		$avatarMetadata = $this->resolveUserAvatarMetadata($userInfo);
		if (!empty($avatarMetadata['avatar'])) {
			$avatarDetails = $avatarMetadata['avatar'];
			$avatarResponse = array_merge(
										  array(
												'src' => $avatarDetails['url'],
												'url' => $avatarDetails['url'],
												'fileName' => $avatarDetails['fileName'] ?? ($avatarMetadata['avatarFileName'] ?? null),
												'updatedAt' => $avatarMetadata['avatarUpdatedAt'],
												'type' => $avatarDetails['type'] ?? 'uploaded',
												),
										  $avatarResponse
										  );
			if (isset($avatarDetails['urlSmall'])) {
				$avatarResponse['urlSmall'] = $avatarDetails['urlSmall'];
			}
			if (isset($avatarDetails['urlMedium'])) {
				$avatarResponse['urlMedium'] = $avatarDetails['urlMedium'];
			}
		}

		$this->applyAvatarMetadataToResponse($avatarMetadata);

		if (!empty($avatarResponse) || (isset($this->response['avatar']) && is_array($this->response['avatar']))) {
			if (!is_array($this->response)) {
				$this->response = array();
			}
			$currentAvatar = array();
			if (isset($this->response['avatar']) && is_array($this->response['avatar'])) {
				$currentAvatar = $this->response['avatar'];
			}
			$this->response['avatar'] = array_merge($currentAvatar, $avatarResponse);
		}

		$userSnapshot = $this->buildUserSnapshotForResponse($userInfo, $avatarMetadata);
		if (!empty($userSnapshot)) {
			if (!is_array($this->response)) {
				$this->response = array();
			}
			$this->response['user'] = $userSnapshot;
		}
	}

        public function procUserDelete()
        {
                $id = htmlspecialchars($this->params['id'], ENT_QUOTES, "UTF-8");
                $physicalDeleteRaw = isset($this->params['physicalDelete']) ? strtolower(trim((string) $this->params['physicalDelete'])) : '';
                $physicalDelete = ($physicalDeleteRaw === '1' || $physicalDeleteRaw === 'true' || $physicalDeleteRaw === 'yes');

                $stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND id = ?");
                $stmt->execute(array($id));
                $userInfo = $stmt->fetch(PDO::FETCH_ASSOC);

		if (!$userInfo) {
                        $this->status = parent::RESULT_ERROR;
                        return;
                }

                if ($physicalDelete) {
                        $pdo = $this->getPDOCommon();
                        try {
                                $pdo->beginTransaction();
                                $pdo->prepare('DELETE FROM userSelectable WHERE operatorUserId = ? OR userId = ?')->execute(array($id, $id));
                                $pdo->prepare('DELETE FROM user WHERE id = ?')->execute(array($id));
                                $pdo->commit();
                        } catch (Exception $exception) {
                                if ($pdo->inTransaction()) {
                                        $pdo->rollBack();
                                }
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'related_data';
                                $this->response = array('message' => '関連データがあるためユーザーを削除できません。');
                        }
                        return;
                }

                // 論理削除
                $stmt = $this->getPDOCommon()->prepare("UPDATE user SET isDeleted = ? WHERE id = ?");
                $stmt->execute(array(1, $id));
        }

        public function procUserAvatar()
        {
                $rawId = $this->getSafeParam('id', '');
                $userId = $this->sanitizeAvatarFileName($rawId);
                if ($userId === '') {
                        http_response_code(400);
                        echo 'invalid_user';
                        exit;
                }

                $variantRaw = $this->getSafeParam('variant', '');
                $variantNormalized = strtolower(trim((string) $variantRaw));
                $variant = 'original';
                if (in_array($variantNormalized, array('small', 'sm'), true)) {
                        $variant = 'small';
                } else if (in_array($variantNormalized, array('medium', 'md'), true)) {
                        $variant = 'medium';
                }

                $stmt = $this->getPDOCommon()->prepare("SELECT imageFileName FROM user WHERE isDeleted IS NULL AND id = ?");
                $stmt->execute(array($userId));
                $userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$userInfo || !isset($userInfo['imageFileName'])) {
                        http_response_code(404);
                        exit;
                }

                $fileName = $this->sanitizeAvatarFileName((string) $userInfo['imageFileName']);
                if ($fileName === '') {
                        http_response_code(404);
                        exit;
                }

                $baseDir = $this->dataBasePath . '/userdata/' . $userId . '/image';
                $baseRealPath = realpath($baseDir);
                if ($baseRealPath === false) {
                        http_response_code(404);
                        exit;
                }

                $candidates = array();
                if ($variant === 'small') {
                        $candidates = $this->buildAvatarVariantFileNames($fileName, '_sm');
                } else if ($variant === 'medium') {
                        $candidates = $this->buildAvatarVariantFileNames($fileName, '_md');
                } else {
                        $candidates = array($fileName);
                }

                if ($variant !== 'original') {
                        $candidates[] = $fileName;
                }

                $selectedPath = null;
                $selectedFile = null;
                foreach ($candidates as $candidate) {
                        if (!is_string($candidate) || $candidate === '') {
                                continue;
                        }
                        $fullPath = $baseDir . '/' . $candidate;
                        $resolved = realpath($fullPath);
                        if ($resolved === false || strpos($resolved, $baseRealPath) !== 0) {
                                continue;
                        }
                        if (is_file($resolved) && is_readable($resolved)) {
                                $selectedPath = $resolved;
                                $selectedFile = basename($resolved);
                                break;
                        }
                }

                if ($selectedPath === null) {
                        http_response_code(404);
                        exit;
                }

                $mime = 'application/octet-stream';
                $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : false;
                if ($finfo) {
                        $detected = finfo_file($finfo, $selectedPath);
                        if ($detected !== false && is_string($detected) && $detected !== '') {
                                $mime = $detected;
                        }
                        finfo_close($finfo);
                }

                $size = filesize($selectedPath);
                header('Content-Type: ' . $mime);
                header('Content-Length: ' . $size);
                header('Content-Disposition: inline; filename="' . $selectedFile . '"');
                header('Cache-Control: public, max-age=31536000, immutable');

                while (ob_get_level() > 0) {
                        ob_end_clean();
                }

                $handle = fopen($selectedPath, 'rb');
                if ($handle === false) {
                        http_response_code(500);
                        exit;
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
                exit;
        }

        public function procUserMailCheckSend()
	{
		$id = htmlspecialchars($this->params['id'], ENT_QUOTES, "UTF-8");
		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND id = ?");
		$stmt->execute(array($id));
		$userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
		if (!$userInfo) {
			$this->status = parent::RESULT_ERROR;
			return;		  
		}

		$mail = $this->decrypt($userInfo["mail"]);
		$mail = trim((string) $mail);
		if ($mail === '') {
			$this->writeLog('UserMailCheckSend skipped: mail not configured for user ID ' . $userInfo['id']);
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'mail_not_configured';
			$this->response = array(
									'message' => 'メールアドレスが設定されていないため送信できません。'
									);
			return;
		}

		$to = array();
		array_push($to, $mail);

		$siteTitle = $this->getSiteTitle();

		$subjectMessage = array("title" => $siteTitle, "message" => "メールの受信確認");

		$registerExpire = date('Y-m-d H:i:s', strtotime('+3 day', time()));
		$q = md5($mail . $registerExpire);
		$keyword = substr(md5($mail), 0, 4);
		$keywordHash = substr(md5($keyword), 0, 4);

		$redirectParam = null;
		if (isset($this->params['redirect'])) {
			$rawRedirect = htmlspecialchars($this->params['redirect'], ENT_QUOTES, "UTF-8");
			$redirectParam = $this->normalizeMailCheckRedirect($rawRedirect);
		}

		$apiUrl = "https://" . $this->getDomain() . '/scripts/request.php?requestType=Session&token=' . $this->token . '&type=UserMailCheckConfirm&keyword=' . $keyword . '&keywordHash=' . $keywordHash . '&q=' . $q;
		if ($redirectParam !== null) {
			$apiUrl .= '&redirect=' . rawurlencode($redirectParam);
		}
		$apiUrl .= "\n";
    
		$body = "";
		$body .= "メールの受信確認\n\n";
		$body .= "◆このメールが迷惑メールフォルダに入っている場合\n";
		$body .= "\n";    
		$body .= "  => このメールの送信元メールアドレスをご利用中のメールソフトの受信許可リストに追加してください。\n";
		$body .= "\n";
		$body .= "◆このメールが迷惑メールフォルダに入っていない場合\n　または迷惑メールフォルダに入っていても特に支障がない場合\n";
		$body .= "\n";    
		$body .= "　=> 下記のURLをクリックして受信チェックを完了してください。\n";
		$body .= "　   " . $apiUrl;
		$body .= "\n";
		$body .= "\n";    
		$body .= "--\n";
		$body .= $siteTitle . "\n";
		$body .= "https://" . $this->getDomain() . "\n";

		$stmt = $this->getPDORegister()->prepare("INSERT INTO mailCheck(userId, keyword, registerExpire, token, isComplete) VALUES (?, ?, ?, ?, ?)");
		$stmt->execute(array($userInfo["id"], $keyword, $registerExpire, $q, 0));
		$r2 = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
		$stmt->execute(array("notifyMail"));
		$notifyMail = $stmt->fetch(PDO::FETCH_ASSOC)["value"];
		
                foreach( $to as $to_email) {
                        $this->phpMailerSendPostfix($notifyMail, $to_email, $siteTitle, $subjectMessage, $body);
                        sleep(1);
                }

                $this->status = parent::RESULT_SUCCESS;

                return;
        }

        public function procUserSelectableList()
        {
                $payload = $this->requireAuth();
                $this->setAuthPayload($payload);
                $this->syncSessionWithAuthPayload($payload, false);

                $operatorUserId = isset($this->params['operatorUserId']) ? (int) $this->params['operatorUserId'] : 0;
                if ($operatorUserId <= 0 && isset($payload['userId'])) {
                        $operatorUserId = (int) $payload['userId'];
                }

                if (!$this->session['isSupervisor'] && !$this->session['isOperator']) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                if ($operatorUserId <= 0) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_user';
                        return;
                }

                if (!$this->session['isSupervisor'] && $operatorUserId !== (int) $this->session['userId']) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $map = $this->fetchUserSelectableMap(array($operatorUserId));
                $list = isset($map[$operatorUserId]) ? $map[$operatorUserId] : array();

                $codes = array();
                foreach ($list as $entry) {
                        if (is_array($entry) && isset($entry['userCode'])) {
                                $codes[] = $entry['userCode'];
                        }
                }

                $this->response = array(
                                                'operatorUserId' => $operatorUserId,
                                                'selectableUsers' => $list,
                                                'userCodes' => array_values(array_unique($codes)),
                                                );
        }

        public function procUserSelectableSave()
        {
                $payload = $this->requireAuth();
                $this->setAuthPayload($payload);
                $this->syncSessionWithAuthPayload($payload, false);

                $operatorUserId = isset($this->params['operatorUserId']) ? (int) $this->params['operatorUserId'] : 0;
                if ($operatorUserId <= 0) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid_user';
                        return;
                }

                if (!$this->session['isSupervisor'] && !$this->session['isOperator']) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                if (!$this->session['isSupervisor'] && $operatorUserId !== (int) $this->session['userId']) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'permission';
                        return;
                }

                $pdoCommon = $this->getPDOCommon();
                $stmt = $pdoCommon->prepare("SELECT id, isOperator FROM user WHERE id = ? AND isDeleted IS NULL");
                $stmt->execute(array($operatorUserId));
                $operatorRow = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$operatorRow) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'not_found';
                        return;
                }

                if ((int) $operatorRow['isOperator'] !== 1) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'not_operator';
                        return;
                }

                $codes = array();
                if (isset($this->params['userCodes'])) {
                        $codes = $this->normalizeUserCodeList($this->params['userCodes']);
                }

                $userIds = $this->resolveUserIdsFromCodes($codes);

                try {
                        $pdoCommon->beginTransaction();
                        $pdoCommon->prepare('DELETE FROM userSelectable WHERE operatorUserId = ?')->execute(array($operatorUserId));
                        $now = date('Y-m-d H:i:s');
                        $insert = $pdoCommon->prepare('INSERT INTO userSelectable (operatorUserId, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?)');
                        foreach ($userIds as $uid) {
                                $insert->execute(array($operatorUserId, $uid, $now, $now));
                        }
                        $pdoCommon->commit();
                } catch (Exception $exception) {
                        if ($pdoCommon->inTransaction()) {
                                $pdoCommon->rollBack();
                        }
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'system';
                        $this->response = array('message' => '選択可能ユーザーの保存に失敗しました。');
                        return;
                }

                $map = $this->fetchUserSelectableMap(array($operatorUserId));
                $list = isset($map[$operatorUserId]) ? $map[$operatorUserId] : array();
                $userCodes = array();
                foreach ($list as $entry) {
                        if (is_array($entry) && isset($entry['userCode'])) {
                                $userCodes[] = $entry['userCode'];
                        }
                }

                $this->response = array(
                                                'operatorUserId' => $operatorUserId,
                                                'selectableUsers' => $list,
                                                'userCodes' => array_values(array_unique($userCodes)),
                                                );
        }

        protected function procUserMailCheckConfirm()
        {
		// XSS対策
		$keyword = htmlspecialchars($this->params['keyword'], ENT_QUOTES, "UTF-8");
		$keywordHash = htmlspecialchars($this->params['keywordHash'], ENT_QUOTES, "UTF-8");
		$q = htmlspecialchars($this->params['q'], ENT_QUOTES, "UTF-8");
    
		$redirectParam = null;
		if (isset($this->params['redirect'])) {
			$rawRedirect = htmlspecialchars($this->params['redirect'], ENT_QUOTES, "UTF-8");
			$redirectParam = $this->normalizeMailCheckRedirect($rawRedirect);
		}

		$stmt = $this->getPDORegister()->prepare("SELECT * FROM mailCheck where isComplete = 0 AND token = ? ORDER BY id DESC");
		$stmt->execute(array($q));
		$work = $stmt->fetchAll(PDO::FETCH_ASSOC);
		
		if (count($work) == 0) {
			$this->userMessage = $this->makeJsLocation(NULL, '/login.html');
			$this->status = parent::RESULT_ERROR;
			return;      
		}

		$mailCheckInfo = $work[0];
    
		// expire check
		$reqExpire = DateTime::createFromFormat('Y-m-d H:i:s', $mailCheckInfo['registerExpire']);
		$now = new DateTime('now');
		if ($reqExpire < $now) {
			$this->userMessage = $this->makeJsLocation('期限を過ぎています。', '/login.html');
			$this->status = parent::RESULT_ERROR;
			return;
		}
        
		$stmt = $this->getPDOCommon()->prepare("UPDATE user SET mailCheckDate = ? WHERE id = ?");
		$stmt->execute(array($now->format('Y-m-d H:i:s'), $mailCheckInfo['userId']));
    
		// Register ->complete
		$stmt = $this->getPDORegister()->prepare("UPDATE mailCheck SET isComplete = 1 WHERE token = ?");
		$stmt->execute(array($q));

		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND id = ?");
		$stmt->execute(array($mailCheckInfo["userId"]));
		$userInfo = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($redirectParam !== null) {
			$destination = $redirectParam;
		} else {
			$destination = 'login.html';
		}

		$this->userMessage = $this->makeJsLocation('メール受信チェックが完了しました', ltrim($destination, '/'));

		$this->status = parent::RESULT_SUCCESS;
		return;

	}

	public function procUserPasswordResetSend()
	{
		$mail = htmlspecialchars($this->params['mail'], ENT_QUOTES, "UTF-8");
		$mail = trim((string) $mail);
		$check = htmlspecialchars($this->params['check'], ENT_QUOTES, "UTF-8");

		$title = $this->getSiteTitle();
		if ($this->isHiraganaWithMinLength($check, 6) == false) {
			$this->status = parent::RESULT_ERROR;
			return;
		}
	  
		if ($mail === '') {
			$this->writeLog('UserPasswordResetSend skipped: mail parameter is empty');
			$this->errorReason = 'mail_not_configured';
			$this->response = array(
									'message' => 'メールアドレスが設定されていないためパスワードリセットメールを送信できません。'
									);
			$this->status = parent::RESULT_ERROR;
			return;
		}

		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND mail = ?");
		$stmt->execute(array($this->encrypt($mail)));
		$userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
		if (!$userInfo) {
			$this->errorReason = "E1";
			$this->status = parent::RESULT_ERROR;
			return;
		}

		$userMail = trim((string) $this->decrypt($userInfo["mail"]));
		if ($userMail === '') {
			$this->writeLog('UserPasswordResetSend skipped: stored mail is empty for user ID ' . $userInfo['id']);
			$this->errorReason = 'mail_not_configured';
			$this->response = array(
									'message' => 'メールアドレスが設定されていないためパスワードリセットメールを送信できません。'
									);
			$this->status = parent::RESULT_ERROR;
			return;
		}

		if (isset($this->params["hint"])) {
			$hint = htmlspecialchars($this->params['hint'], ENT_QUOTES, "UTF-8");
			if ($userInfo["hint"] != $this->encrypt($hint)) {
				$this->errorReason = "E2";
				$this->status = parent::RESULT_ERROR;			  
				return;		  			  
			}
		}
	  
		$to = array();
		array_push($to, $userMail);
		
		$subjectMessage = array("title" => $title, "message" => "パスワードリセット");
    
		$registerExpire = date('Y-m-d H:i:s', strtotime('+3 day', time()));
		$q = md5($userMail . $registerExpire);
		$keyword = substr(md5($userMail), 0, 4);
		$keywordHash = substr(md5($keyword), 0, 4);
	  
		$loginURLParam = "";
		if (isset($this->params["loginURL"])) {
                    $loginRedirectPath = $this->normalizeLoginRedirectPath($this->params['loginURL'], 'User:procUserPasswordResetSend:loginURL', true);
			if ($loginRedirectPath === null) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid_login_url';
				$this->userMessage = '指定されたログインURLが不正です。';

				return;
			}

			if ($loginRedirectPath !== '/login.html') {
				$loginURLParam = "&l=" . base64_encode($loginRedirectPath);
			}
		}
    
		$apiUrl = "https://" . $this->getDomain() . '/scripts/request.php?requestType=Userb&token=' . $this->token . '&type=UserPasswordResetConfirm&keyword=' . $keyword . '&keywordHash=' . $keywordHash . '&q=' . $q . $loginURLParam . "\n";
    
		$body = "";
		$body .= "パスワードリセット\n\n";
		$body .= "◆このメールが迷惑メールフォルダに入っている場合\n";
		$body .= "\n";    
		$body .= "  => このメールの送信元メールアドレスをご利用中のメールソフトの受信許可リストに追加してください。\n";
		$body .= "\n";
		$body .= "◆このメールが迷惑メールフォルダに入っていない場合\n　または迷惑メールフォルダに入っていても特に支障がない場合\n";
		$body .= "\n";    
		$body .= "　=> 下記のURLをクリックしてパスワードリセットを完了してください。\n";
		$body .= "　   " . $apiUrl;
		$body .= "\n";
		$body .= "\n";    
		$body .= "--\n";
		$body .= $title . "\n";
		$body .= "https://" . $this->getDomain() . "\n";

		$stmt = $this->getPDORegister()->prepare("INSERT INTO passwordReset(mail, keyword, registerExpire, token, isComplete) VALUES (?, ?, ?, ?, ?)");
		$stmt->execute(array($userInfo["mail"], $keyword, $registerExpire, $q, 0));
		$r2 = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
		$stmt->execute(array("notifyMail"));
		$notifyMail = $stmt->fetch(PDO::FETCH_ASSOC)["value"];
		
		foreach( $to as $to_email) {
			$this->phpMailerSendPostfix($notifyMail, $to_email, $title, $subjectMessage, $body);
			sleep(1);
		}

		$this->status = parent::RESULT_SUCCESS;
        
		return;	  
	}

	protected function procUserPasswordResetConfirm()
	{
		// XSS対策
		$keyword = htmlspecialchars($this->params['keyword'], ENT_QUOTES, "UTF-8");
		$keywordHash = htmlspecialchars($this->params['keywordHash'], ENT_QUOTES, "UTF-8");
		$q = htmlspecialchars($this->params['q'], ENT_QUOTES, "UTF-8");
    
		$stmt = $this->getPDORegister()->prepare("SELECT * FROM passwordReset WHERE isComplete = 0 AND token = ? ORDER BY id DESC");
		$stmt->execute(array($q));
		$work = $stmt->fetchAll(PDO::FETCH_ASSOC);
		
		if (count($work) == 0) {
			$this->userMessage = $this->makeJsLocation(NULL, '/login.html');
			$this->status = parent::RESULT_ERROR;
			return;      
		}

		$passwordResetInfo = $work[0];
    
		// expire check
		$reqExpire = DateTime::createFromFormat('Y-m-d H:i:s', $passwordResetInfo['registerExpire']);
		$now = new DateTime('now');
		if ($reqExpire < $now) {
			$this->userMessage = $this->makeJsLocation('期限を過ぎています。', '/login.html');
			$this->status = parent::RESULT_ERROR;
			return;
		}

		$newPassword = $this->generateAutoPassword();
		$hash = $this->getHash($newPassword);
        
		$stmt = $this->getPDOCommon()->prepare("UPDATE user SET hash = ?, passwordResetDate = ? WHERE mail = ?");
		$stmt->execute(array($hash, $now->format('Y-m-d H:i:s'), $passwordResetInfo['mail']));
    
		// Register ->complete
		$stmt = $this->getPDORegister()->prepare("UPDATE passwordReset SET isComplete = 1 WHERE token = ?");
		$stmt->execute(array($q));

		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND mail = ?");
		$stmt->execute(array($passwordResetInfo["mail"]));
		$userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
                $url = $this->normalizeLoginRedirectPath('/login.html', 'User:procUserPasswordResetConfirm:default', false);

		// 指定がある場合はそのURLに飛ばす
		if (isset($this->params["l"])) {
                    $decodedLoginUrl = $this->decodeLoginRedirectParameter($this->params['l'], 'User:procUserPasswordResetConfirm:l');
                        $url = $this->normalizeLoginRedirectPath($decodedLoginUrl, 'User:procUserPasswordResetConfirm:l', false);
                }

                $delimiter = strpos($url, '?') === false ? '?' : '&';
                $url .= $delimiter . 'p=' . rawurlencode($newPassword);

                $this->userMessage = $this->makeJsLocation('パスワードリセットが完了しました', $url);

		$this->status = parent::RESULT_SUCCESS;
		return;
	}

	public function procRegister()
	{
		$userMail = htmlspecialchars($this->params['userMail'], ENT_QUOTES, "UTF-8");
		$userMail = trim((string) $userMail);
            $loginURL = $this->normalizeLoginRedirectPath($this->params['loginURL'], 'User:procRegister:loginURL', true);
		if ($loginURL === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid_login_url';
			$this->userMessage = '指定されたログインURLが不正です。';

			return;
		}

		$hint = NULL;
		if (isset($this->params["hint"])) {
			$hint = htmlspecialchars($this->params['hint'], ENT_QUOTES, "UTF-8");
		}

		$password = NULL;
		if (isset($this->params["password"])) {
			$password = htmlspecialchars($this->params['password'], ENT_QUOTES, "UTF-8");		  
		}

		if (isset($this->params["check"])) {
			$check = htmlspecialchars($this->params['check'], ENT_QUOTES, "UTF-8");
			if ($this->isHiraganaWithMinLength($check, 6) == false) {
				$this->errorReason = "invalid";			  
				$this->status = parent::RESULT_ERROR;
				return;
			}
		}

		if ($userMail === '') {
			$this->writeLog('Register skipped: userMail parameter is empty');
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'mail_not_configured';
			$this->response = array(
									'message' => 'メールアドレスが設定されていないため登録メールを送信できません。'
									);
			return;
		}

		if ($userMail == "admin" || $userMail == "." || $userMail == "..") {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = "reserved";
			return;
		}
	  
		// TODO：重複してもOKにする
		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND userCode = ?");
		$stmt->execute(array($userMail));
		$userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($userInfo) {
			$this->errorReason = "duplicate";
			$this->status = parent::RESULT_ERROR;
			return;
		}

		$to = array();
		array_push($to, $userMail);

		$title = $this->getSiteTitle();
		
		$subjectMessage = array("title" => $title, "message" => "ユーザー登録");
		$registerExpire = date('Y-m-d H:i:s', strtotime('+3 day', time()));
		$newToken = md5($userMail . "_" . $registerExpire);

		$confirmSend = "";
		if (isset($this->params["confirmSend"])) {
			$confirmSend = "&c=1";
		}

		$confirmURL = "https://" . $this->getDomain() . '/scripts/request.php?requestType=User&token=' . $this->token . '&type=RegisterConfirm&t=' . $newToken . "&l=" . base64_encode($loginURL) . $confirmSend . "\n";
    
		$body = "";
		$body .= $title;
		$body .= "\n";    			
		$body .= "ユーザー登録の確認\n\n";
		$body .= "◆このメールが迷惑メールフォルダに入っている場合\n";
		$body .= "\n";    
		$body .= "  => このメールの送信元メールアドレスをご利用中のメールソフトの受信許可リストに追加してください。\n";
		$body .= "\n";
		$body .= "◆このメールが迷惑メールフォルダに入っていない場合\n　または迷惑メールフォルダに入っていても特に支障がない場合\n";
		$body .= "\n";    
		$body .= "　=> 下記のURLをクリックして受信チェックを完了してください。\n";
		$body .= "　   " . $confirmURL;
		$body .= "\n";
		$body .= "\n";    
		$body .= "--\n";
		$body .= $title . "\n";

		$stmt = $this->getPDORegister()->prepare("INSERT INTO register(userMail, registerExpire, token, isComplete, hint, password) VALUES (?, ?, ?, ?, ?, ?)");
		$stmt->execute(array($this->encrypt($userMail), $registerExpire, $newToken, 0, $this->encrypt($hint), $this->encrypt($password)));
		$registerInfo = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
		$stmt->execute(array("notifyMail"));
		$notifyMail = $stmt->fetch(PDO::FETCH_ASSOC)["value"];	  
		
		foreach ($to as $to_email) {
			$this->writeLog($notifyMail . " " . $to_email);
			$this->phpMailerSendPostfix($notifyMail, $to_email, $title, $subjectMessage, $body);
			sleep(1);
		}

		$this->status = parent::RESULT_SUCCESS;
        
		return;	  
	}

	public function procRegisterConfirm()
	{
		$t = htmlspecialchars($this->params['t'], ENT_QUOTES, "UTF-8");
		$l = $this->params['l'];

            $decodedLoginUrl = $this->decodeLoginRedirectParameter($l, 'User:procRegisterConfirm:l');
            $loginURL = $this->normalizeLoginRedirectPath($decodedLoginUrl, 'User:procRegisterConfirm:l', false);
    
		// 複数同じものがあった場合は最新のものを採用する
		$stmt = $this->getPDORegister()->prepare("SELECT * FROM register WHERE isComplete = 0 AND token = ?");
		$stmt->execute(array($t));
		$registerInfo = $stmt->fetchAll(PDO::FETCH_ASSOC);
	  
		if (count($registerInfo) == 0) {
			$this->userMessage = $this->makeJsLocation('不正な操作です(E=S-C)', $loginURL);
			$this->status = parent::RESULT_ERROR;
			return;
		}
    
		// expire check
		$reqExpire = DateTime::createFromFormat('Y-m-d H:i:s', $registerInfo[0]['registerExpire']);
		$current = new DateTime('now');
		if ($reqExpire < $current) {
			$this->userMessage = $this->makeJsLocation('登録可能な期限を過ぎています。', $loginURL);
			$this->status = parent::RESULT_ERROR;
			return;
		}
    
		$stmt = $this->getPDORegister()->prepare("UPDATE register SET isComplete = 1 WHERE id = ?");
		$stmt->execute(array($registerInfo[0]['id']));

		$userCode = $this->decrypt($registerInfo[0]['userMail']);
    
		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND userCode = ?");
		$stmt->execute(array($userCode));
		$userList = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
		// 既に登録されている
		if (count($userList) > 0) {
			$this->userMessage = $this->makeJsLocation('既に登録されています。ログインページからログインしてください', $loginURL);
			$this->status = parent::RESULT_ERROR;
			return;
		}
	  
		// Passwordが設定されていない場合はautopasswordを使う
		if ($registerInfo[0]["password"] == NULL) {
			$password = NULL;
			$autoPassword = $this->generateAutoPassword(4);
			$delimiter = strpos($loginURL, '?') === false ? '?' : '&';
			$loginURL .= $delimiter . 'p=' . rawurlencode($autoPassword);
                    $loginURL = $this->normalizeLoginRedirectPath($loginURL, 'User:procRegisterConfirm:autoPassword', false);
		} else {
			$password = $this->decrypt($registerInfo[0]["password"]);
			$autoPassword = NULL;
			$delimiter = strpos($loginURL, '?') === false ? '?' : '&';
			$loginURL .= $delimiter . 'p=' . rawurlencode($password);
                    $loginURL = $this->normalizeLoginRedirectPath($loginURL, 'User:procRegisterConfirm:password', false);
		}
		// mailは暗号化したまま登録する
		$stmt = $this->getPDOCommon()->prepare("INSERT INTO user (userCode, displayName, hash, autoPassword, mail, hint) VALUES (?, ?, ?, ?, ?, ?)");
		$stmt->execute(array($userCode, $userCode, $this->getHash($password), $autoPassword, $registerInfo[0]["userMail"], $registerInfo[0]["hint"]));
		
		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND userCode = ?");
		$stmt->execute(array($userCode));
		$userInfo = $stmt->fetch(PDO::FETCH_ASSOC);	  		

		$this->userMessage = $this->makeJsLocation('登録が完了しました', $loginURL);
		$this->status = parent::RESULT_SUCCESS;
    
		return;
	}

        private function normalizeRoleFlagValue($value)
        {
                if ($value === NULL) {
                        return 0;
                }
                if ($value === true || $value === 1 || $value === '1') {
                        return 1;
                }
                if (is_string($value)) {
                        $lower = strtolower(trim($value));
                        if ($lower === 'true' || $lower === 'yes' || $lower === 'on') {
                                return 1;
                        }
                }
                return 0;
        }

        private function userUpdateSub($columnName, $id, &$changed)
        {
                if (isset($this->params[$columnName]) == false) {
                        return;
                }

               $value = $this->params[$columnName];
                $isRoleFlag = ($columnName == "isSupervisor" || $columnName == "isOperator");
                $isBooleanFlag = $isRoleFlag || $columnName == "useContentsManagement";
	  	  
		if ($value == "serverTime") {
			$now = new DateTime('now');
			$value = $now->format('Y-m-d H:i:s');
		}			
	  
		// パスワードは空でくる可能性がある、かつ空は許容しない
		if ($columnName == "hash" && $value == "") {
			return;
		}

		// パスワードはhash
		if ($columnName == "hash") {
			$value = $this->getHash($value);
		}
                // メールアドレスはencrypt
                else if ($columnName == "mail") {
                        if ($value !== NULL) {
                                $value = trim($value);
                        }
			if ($value === '' || $value === NULL) {
				$value = NULL;
			} else {
				$value = $this->encrypt(htmlspecialchars($value, ENT_QUOTES, "UTF-8"));
			}
		}
		// hintはencrypt		  
		else if ($columnName == "hint") {
			$value = $this->encrypt($value);
                }
                // organizationはtrim + escape
                else if ($columnName == "organization") {
                        if ($value !== NULL) {
                                $value = trim($value);
                        }
                        if ($value === '' || $value === NULL) {
                                $value = NULL;
                        } else {
                                $value = htmlspecialchars($value, ENT_QUOTES, "UTF-8");
                        }
                }
                else if ($columnName == "isSupervisor" || $columnName == "isOperator" || $columnName == "useContentsManagement") {
                        $value = $this->normalizeRoleFlagValue($value);
                }

                if ($isBooleanFlag) {
                        $stmt = $this->getPDOCommon()->prepare("UPDATE user SET " . $columnName . " = ? WHERE id = ?");
                        $stmt->execute(array((int) $value, $id));
                        if ($changed == false) {
                                $changed = true;
                        }
                        return;
                }

                if ($value == "" || $value == NULL) {
                        $stmt = $this->getPDOCommon()->prepare("UPDATE user SET " . $columnName . " = NULL WHERE id = ?");
                        $stmt->execute(array($id));
                } else {
			$stmt = $this->getPDOCommon()->prepare("UPDATE user SET " . $columnName . " = ? WHERE id = ?");
			$stmt->execute(array($value, $id));	
		}
		if ($changed == false) {
			$changed = true;
		}
	}

	private function getPDORegister()
	{
		if (isset($this->pdoRegister) == false) {
			// registerはSQLログの対象としない
			$this->pdoRegister = $this->getSQLiteConnection($this->dataBasePath . "/db/register.sqlite");
		}
		return $this->pdoRegister;
	}
	
	private function shouldRemoveAvatar($params)
	{
		if (!is_array($params)) {
			return false;
		}
		if (!array_key_exists('removeAvatar', $params)) {
			return false;
		}
		$value = $params['removeAvatar'];
		if (is_bool($value)) {
			return $value;
		}
		if ($value === null) {
			return false;
		}
		$normalized = strtolower(trim((string) $value));
		if ($normalized === '' || $normalized === '0' || $normalized === 'false' || $normalized === 'off' || $normalized === 'no') {
			return false;
		}
		return true;
	}

	private function removeUserAvatarFiles($baseDir, $imageFileName)
	{
		if (!$baseDir) {
			return;
		}
		$imageDirectory = rtrim($baseDir, '/\\') . '/image';
		if (!is_dir($imageDirectory)) {
			return;
		}
		if ($imageFileName) {
			$filePath = $imageDirectory . '/' . $imageFileName;
			if (is_file($filePath)) {
				@unlink($filePath);
			}
			if (is_file($filePath . '_sm')) {
				@unlink($filePath . '_sm');
			}
			if (is_file($filePath . '_md')) {
				@unlink($filePath . '_md');
			}
		}
		$settingsPath = $this->getAvatarSettingsPath($baseDir);
		if (is_file($settingsPath)) {
			@unlink($settingsPath);
		}
	}

	private function generateAvatarVariants($imagePath)
	{
		if (!$imagePath || !is_file($imagePath)) {
			return;
		}
		$escapedPath = escapeshellarg($imagePath);
		$escapedSmall = escapeshellarg($imagePath . '_sm');
		$escapedMedium = escapeshellarg($imagePath . '_md');
		$this->execCommand('convert ' . $escapedPath . ' -resize 120x ' . $escapedSmall);
		$this->execCommand('convert ' . $escapedPath . ' -resize 480x ' . $escapedMedium);
	}

	private function sanitizeAvatarFileName($fileName)
	{
		if (!is_string($fileName)) {
			$fileName = (string) $fileName;
		}
		$trimmed = trim($fileName);
		if ($trimmed === '') {
			return '';
		}
		$trimmed = str_replace(array('/', '\\'), '', $trimmed);
		$trimmed = preg_replace('/[\x00-\x1F\x7F]/', '', $trimmed);
		return $trimmed;
	}

        private function buildAvatarVariantFileNames($fileName, $suffix)
        {
                if (!is_string($fileName) || $fileName === '') {
			return array();
		}
		if (!is_string($suffix) || $suffix === '') {
			return array();
		}

		$candidates = array();

		$candidates[] = $fileName . $suffix;

		$dotPosition = strrpos($fileName, '.');
		if ($dotPosition !== false) {
			$name = substr($fileName, 0, $dotPosition);
			$extension = substr($fileName, $dotPosition);
			if ($name !== '') {
				$candidates[] = $name . $suffix . $extension;
			}
		}

		$unique = array();
		foreach ($candidates as $candidate) {
			if (!is_string($candidate) || $candidate === '') {
				continue;
			}
			$unique[$candidate] = true;
                }

                return array_keys($unique);
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
                        $url = $this->appendAvatarVersionToUrl($url, $version);
                }

                return $url;
        }

        private function appendAvatarVersionToUrl($url, $version)
        {
                if (!is_string($url) || $url === '') {
                        return $url;
                }
                if ($version === null || $version === '') {
                        return $url;
                }

                $separator = strpos($url, '?') === false ? '?' : '&';
                return $url . $separator . 'v=' . rawurlencode((string) $version);
        }

	private function resolveUserAvatarMetadata($userInfo)
	{
		if (!is_array($userInfo)) {
			return array(
						 'imageFileName' => null,
						 'avatarFileName' => null,
						 'avatarUrl' => null,
						 'avatarUrlSmall' => null,
						 'avatarUrlMedium' => null,
						 'avatarVersion' => null,
						 'avatarUpdatedAt' => null,
						 'imageUpdatedAt' => null,
						 );
		}
		
		$imageFileNameRaw = isset($userInfo['imageFileName']) ? (string) $userInfo['imageFileName'] : '';
		$imageFileNameTrimmed = trim($imageFileNameRaw);
		$safeImageFileName = $this->sanitizeAvatarFileName($imageFileNameTrimmed);

		$metadata = array(
						  'imageFileName' => $safeImageFileName !== '' ? $safeImageFileName : null,
						  'avatarFileName' => null,
						  'avatarUrl' => null,
						  'avatarUrlSmall' => null,
						  'avatarUrlMedium' => null,
						  'avatarVersion' => null,
						  'avatarUpdatedAt' => null,
						  'imageUpdatedAt' => null,
						  );

                $metadata['avatarFileName'] = $safeImageFileName;

                $normalizedUserId = $this->sanitizeAvatarFileName(isset($userInfo['id']) ? (string) $userInfo['id'] : '');
                if ($normalizedUserId === '') {
                        return $metadata;
                }

                $imageDirectory = $this->dataBasePath . '/userdata/' . $userInfo["id"] . '/image';
                if (!is_dir($imageDirectory)) {
                        return $metadata;
                }

		$variantCandidates = array(
								   'small' => $this->buildAvatarVariantFileNames($safeImageFileName, '_sm'),
								   'medium' => $this->buildAvatarVariantFileNames($safeImageFileName, '_md'),
								   'original' => array($safeImageFileName),
								   );

		$found = array();
		foreach ($variantCandidates as $variant => $fileNames) {
			foreach ($fileNames as $fileName) {
				$fullPath = $imageDirectory . '/' . $fileName;
				if (is_file($fullPath)) {
                                        $found[$variant] = array(
                                                                                         'fileName' => $fileName,
                                                                                         'path' => $fullPath,
                                                                                         'url' => $this->buildAvatarAccessUrl($normalizedUserId, $variant),
                                                                                         );
                                        break;
                                }
                        }
                }

		if (empty($found)) {
			return $metadata;
		}

		$primary = null;
		if (isset($found['small'])) {
			$primary = $found['small'];
		} elseif (isset($found['medium'])) {
			$primary = $found['medium'];
		} elseif (isset($found['original'])) {
			$primary = $found['original'];
		}

		if ($primary === null) {
			return $metadata;
		}

                $versionSources = array();
                foreach ($found as $variant => $info) {
                        if (!isset($info['path'])) {
                                continue;
                        }
                        $mtime = @filemtime($info['path']);
                        if ($mtime) {
                                $versionSources[] = (int) $mtime;
                                if (isset($found[$variant]['url'])) {
                                        $found[$variant]['url'] = $this->appendAvatarVersionToUrl($found[$variant]['url'], (string) $mtime);
                                }
                        }
                }

                if (!empty($versionSources)) {
                        $version = (string) max($versionSources);
                        $metadata['avatarVersion'] = $version;
                        $metadata['avatarUpdatedAt'] = $version;
                        $metadata['imageUpdatedAt'] = $version;
                }

                $primarySource = isset($found['small']) ? $found['small'] : (isset($found['medium']) ? $found['medium'] : (isset($found['original']) ? $found['original'] : $primary));

                $metadata['avatarUrl'] = $primarySource['url'];
                $metadata['avatarUrlSmall'] = isset($found['small']) ? $found['small']['url'] : $primarySource['url'];
                $metadata['avatarUrlMedium'] = isset($found['medium']) ? $found['medium']['url'] : (isset($found['original']) ? $found['original']['url'] : $primarySource['url']);
                $metadata['avatarUrlOriginal'] = isset($found['original']) ? $found['original']['url'] : $primarySource['url'];

                $metadata['avatar'] = array(
                                                                        'type' => 'uploaded',
                                                                        'url' => $primarySource['url'],
                                                                        'src' => $primarySource['url'],
                                                                        'fileName' => $safeImageFileName,
                                                                        'updatedAt' => $metadata['avatarUpdatedAt'],
									'version' => isset($metadata['avatarVersion']) ? $metadata['avatarVersion'] : null,
									'avatarVersion' => isset($metadata['avatarVersion']) ? $metadata['avatarVersion'] : null,
									'imageUpdatedAt' => isset($metadata['imageUpdatedAt']) ? $metadata['imageUpdatedAt'] : null,
									);

		if (isset($found['small'])) {
			$metadata['avatar']['urlSmall'] = $found['small']['url'];
		}
		if (isset($found['medium'])) {
			$metadata['avatar']['urlMedium'] = $found['medium']['url'];
		}
		if (isset($metadata['avatarUrlOriginal'])) {
			$metadata['avatar']['urlOriginal'] = $metadata['avatarUrlOriginal'];
		}

		return $metadata;
	}

	private function applyAvatarMetadataToResponse(array $metadata)
	{
		if (!is_array($this->response)) {
			$this->response = array();
		}

		if (isset($metadata['avatar'])) {
			$currentAvatar = array();
			if (isset($this->response['avatar']) && is_array($this->response['avatar'])) {
				$currentAvatar = $this->response['avatar'];
			}
			$this->response['avatar'] = array_merge($currentAvatar, $metadata['avatar']);
		}

		foreach ($metadata as $key => $value) {
			if ($key === 'avatar') {
				continue;
			}
			$this->response[$key] = $value;
		}
	}

	private function buildUserSnapshotForResponse(array $userInfo, array $metadata)
	{
		if (!is_array($userInfo)) {
			return array();
		}

                $snapshot = array(
                                                  'id' => isset($userInfo['id']) ? (int) $userInfo['id'] : null,
                                                  'userCode' => isset($userInfo['userCode']) ? $userInfo['userCode'] : null,
                                                  'displayName' => isset($userInfo['displayName']) ? $userInfo['displayName'] : null,
                                                  'useContentsManagement' => isset($userInfo['useContentsManagement']) ? (int) $userInfo['useContentsManagement'] : null,
                                                  );

		if (array_key_exists('imageFileName', $metadata)) {
			$snapshot['imageFileName'] = $metadata['imageFileName'];
		} elseif (isset($userInfo['imageFileName'])) {
			$snapshot['imageFileName'] = $userInfo['imageFileName'];
		}

		$metadataKeys = array(
							  'avatarFileName',
							  'avatarUrl',
							  'avatarUrlSmall',
							  'avatarUrlMedium',
							  'avatarUrlOriginal',
							  'avatarVersion',
							  'avatarUpdatedAt',
							  'imageUpdatedAt',
							  );

		foreach ($metadataKeys as $key) {
			if (array_key_exists($key, $metadata)) {
				$snapshot[$key] = $metadata[$key];
			}
		}

		if (isset($metadata['avatar'])) {
			$snapshot['avatar'] = $metadata['avatar'];
		}

		if (isset($this->response['avatarTransform'])) {
			$snapshot['avatarTransform'] = $this->response['avatarTransform'];
		}
		if (isset($this->response['avatarCreatorState'])) {
			$snapshot['avatarCreatorState'] = $this->response['avatarCreatorState'];
		}
		if (isset($this->response['avatar']) && is_array($this->response['avatar'])) {
			if (!isset($snapshot['avatar']) || !is_array($snapshot['avatar'])) {
				$snapshot['avatar'] = array();
			}
			$snapshot['avatar'] = array_merge($snapshot['avatar'], $this->response['avatar']);
		}

		return $snapshot;
	}

	private function extractAvatarDataParam($params)
	{
		if (!is_array($params) || !array_key_exists('avatarData', $params)) {
			return array();
		}
		$raw = $params['avatarData'];
		if ($raw === null || $raw === '') {
			return null;
		}
		if (is_string($raw)) {
			$decoded = json_decode($raw, true);
		} else {
			$decoded = $raw;
		}
		if (!is_array($decoded)) {
			return array();
		}

		$transform = $this->normalizeAvatarTransformPayload($decoded);
		$creatorState = $this->normalizeAvatarCreatorStatePayload($decoded);

		return array(
					 'transform' => $transform,
					 'creatorState' => $creatorState,
					 );
	}

	private function normalizeAvatarTransformPayload($source)
	{
		$scale = 1.0;
		if (isset($source['scale'])) {
			$scale = $this->clampAvatarScale($source['scale']);
		} else if (isset($source['transform']['scale'])) {
			$scale = $this->clampAvatarScale($source['transform']['scale']);
		}

		$offsetX = 0.0;
		$offsetY = 0.0;
		if (isset($source['offsetX'])) {
			$offsetX = $this->clampAvatarOffset($source['offsetX'], $scale);
		} else if (isset($source['transform']['offsetX'])) {
			$offsetX = $this->clampAvatarOffset($source['transform']['offsetX'], $scale);
		}
		if (isset($source['offsetY'])) {
			$offsetY = $this->clampAvatarOffset($source['offsetY'], $scale);
		} else if (isset($source['transform']['offsetY'])) {
			$offsetY = $this->clampAvatarOffset($source['transform']['offsetY'], $scale);
		}

		return array(
					 'scale' => round($scale, 2),
					 'offsetX' => round($offsetX, 2),
					 'offsetY' => round($offsetY, 2),
					 );
	}

	private function normalizeAvatarCreatorStatePayload($source)
	{
		$objects = array();

		if (isset($source['creatorState']['objects']) && is_array($source['creatorState']['objects'])) {
			$candidateObjects = $source['creatorState']['objects'];
		} else if (isset($source['objects']) && is_array($source['objects'])) {
			$candidateObjects = $source['objects'];
		} else {
			$candidateObjects = array();
		}

		foreach ($candidateObjects as $object) {
			if (!is_array($object)) {
				continue;
			}
			if (!isset($object['partId'])) {
				continue;
			}
			$partId = trim((string) $object['partId']);
			if ($partId === '') {
				continue;
			}
			$objects[] = array(
							   'partId' => $partId,
							   'x' => $this->toNumeric($object, 'x'),
							   'y' => $this->toNumeric($object, 'y'),
							   'scale' => $this->toNumeric($object, 'scale', 1.0),
							   'rotation' => $this->toNumeric($object, 'rotation'),
							   );
			if (count($objects) >= 50) {
				break;
			}
		}

		if (empty($objects)) {
			return null;
		}

		return array('objects' => $objects);
	}

	private function toNumeric($source, $key, $default = 0.0)
	{
		if (!is_array($source) || !array_key_exists($key, $source)) {
			return $default;
		}
		$value = $source[$key];
		if (is_numeric($value)) {
			return (float) $value;
		}
		$numeric = (float) trim((string) $value);
		if (!is_finite($numeric)) {
			return $default;
		}
		return $numeric;
	}

	private function clampAvatarScale($value)
	{
		$numeric = (float) $value;
		if (!is_finite($numeric)) {
			return 1.0;
		}
		if ($numeric < 1.0) {
			return 1.0;
		}
		if ($numeric > 3.0) {
			return 3.0;
		}
		return $numeric;
	}

	private function clampAvatarOffset($value, $scale)
	{
		$numeric = (float) $value;
		if (!is_finite($numeric)) {
			return 0.0;
		}
		$limit = ($scale - 1.0) * 50.0;
		if ($limit < 0) {
			$limit = 0;
		}
		if ($numeric < -$limit) {
			return -$limit;
		}
		if ($numeric > $limit) {
			return $limit;
		}
		return $numeric;
	}

	protected function buildDefaultAvatarSettings()
	{
		return array(
					 'transform' => array(
										  'scale' => 1.0,
										  'offsetX' => 0.0,
										  'offsetY' => 0.0,
										  ),
					 'creatorState' => null,
					 );
	}

	private function writeUserAvatarSettings($baseDir, $settings)
	{
		$path = $this->getAvatarSettingsPath($baseDir);
		if ($settings === null) {
			if (is_file($path)) {
				@unlink($path);
			}
			return;
		}
		if (!is_array($settings)) {
			return;
		}
		$directory = dirname($path);
		if (!is_dir($directory)) {
			@mkdir($directory, 0775, true);
		}
		$json = json_encode($settings, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
		file_put_contents($path, $json);
	}

	private function readUserAvatarSettings($baseDir)
	{
		$path = $this->getAvatarSettingsPath($baseDir);
		if (!is_file($path)) {
			return array();
		}
		$json = file_get_contents($path);
		if ($json === false || $json === '') {
			return array();
		}
		$decoded = json_decode($json, true);
		if (!is_array($decoded)) {
			return array();
		}

		$transform = $this->normalizeAvatarTransformPayload($decoded);
		$creatorState = $this->normalizeAvatarCreatorStatePayload($decoded);

		return array(
					 'transform' => $transform,
					 'creatorState' => $creatorState,
					 );
	}

	private function getAvatarSettingsPath($baseDir)
	{
		$trimmed = rtrim($baseDir, '/\\');
		if ($trimmed === '') {
			return 'avatar-settings.json';
		}
		return $trimmed . '/image/avatar-settings.json';
	}

        protected function normalizeLoginRedirectPath($rawValue, string $context, bool $haltOnInvalid, string $defaultPath = '/login.html')
        {
                $normalizedDefault = '/' . ltrim($defaultPath, '/');

                if ($rawValue === null) {
                        return $normalizedDefault;
                }

                $rawString = trim((string) $rawValue);
                if ($rawString === '') {
                        return $normalizedDefault;
                }

                $parts = parse_url($rawString);
                if ($parts === false) {
                        $this->logLoginRedirectViolation($context, 'parse_url_failed', $rawString);

                        return $haltOnInvalid ? null : $normalizedDefault;
                }

                $path = $parts['path'] ?? '';
                if ($path === '') {
                        $path = $normalizedDefault;
                }

                if (strpos($path, '..') !== false || strpos($path, '\\') !== false) {
                        $this->logLoginRedirectViolation($context, 'path_traversal', $rawString);

                        return $haltOnInvalid ? null : $normalizedDefault;
                }

                if ($path[0] !== '/') {
                        $path = '/' . ltrim($path, '/');
                }

                $query = '';
                if (isset($parts['query']) && $parts['query'] !== '') {
                        $query = '?' . $parts['query'];
                }

                return $path . $query;
        }

	protected function decodeLoginRedirectParameter($encodedValue, string $context)
	{
		if ($encodedValue === null) {
			return null;
		}

		if (is_string($encodedValue) === false) {
			$encodedValue = (string) $encodedValue;
		}

		$decoded = base64_decode($encodedValue, true);
		if ($decoded === false) {
			$this->logLoginRedirectViolation($context, 'base64_decode_failed', $encodedValue);

			return null;
		}

		return $decoded;
	}

	private function logLoginRedirectViolation(string $context, string $reason, $rawValue): void
	{
		$options = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
		$encodedValue = json_encode($rawValue, $options);
		if ($encodedValue === false) {
			$encodedValue = '"<unencodable>"';
		}

		$remoteAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
		$message = sprintf('[login_redirect_violation] context=%s reason=%s value=%s ip=%s', $context, $reason, $encodedValue, $remoteAddress);
		$this->writeLog($message, 'security');
	}

	/**
	 * Login 時の確認用かなチェックを行う
	 */
	protected function isValidLoginCheck($input, $minLength = 6)
	{
		return $this->isHiraganaWithMinLength($input, $minLength);
	}

	protected function normalizeMailCheckRedirect($value)
	{
		if (!is_string($value)) {
			return null;
		}

		$trimmed = trim($value);
		if ($trimmed === '') {
			return null;
		}

		$trimmed = ltrim($trimmed, '/');

		$allowed = array(
						 'admin-users.html',
						 'account-settings.html',
						 );

		if (in_array($trimmed, $allowed, true)) {
			return $trimmed;
		}

		return null;
	}

	protected function isHiraganaWithMinLength($input, $minLength) {
		return preg_match('/^[\p{Hiragana}]{' . $minLength . ',}$/u', $input) === 1;
	}	
}

?>
