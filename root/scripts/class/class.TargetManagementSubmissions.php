<?php

Base::requireFromShm('class/class.TargetManagementUtil.php');

class TargetManagementSubmissions extends Base
{
	public function __construct($context)
	{
		parent::__construct($context);
	}

	protected function validationTargetSubmissionList()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetSubmissionCreate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['userCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetSubmissionUpdate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['submissionCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetSubmissionDelete()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['submissionCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationSubmissionDetail()
	{
		if (isset($this->params['submissionCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	public function procTargetSubmissionList()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

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

		$isPrivileged = $this->isSupervisor() || $this->isOperator();
		$loginUserCode = $this->getLoginUserCode();
		$params = array($targetCode);
		$userFilterSql = '';

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
			$userFilterSql = ' AND ts.userCode = ?';
			$params[] = $loginUserCode;
		}

		$pdo = $this->getPDOTarget();

		$countSql =
			"SELECT COUNT(*) FROM targetSubmissions ts " .
			"JOIN submissions s ON ts.submissionCode = s.submissionCode AND (s.isDeleted IS NULL OR s.isDeleted = 0) " .
			"WHERE ts.targetCode = ?" . $userFilterSql;
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

                $stmt = $pdo->prepare(
                                                          "SELECT ts.submissionCode, ts.userCode, ts.contentId, ts.contentsCode, ts.title, ts.description, " .
                                                          "       s.submittedAt, s.status, s.content, s.comment, s.reviewStatus, s.createdAt, s.updatedAt, u.displayName AS userDisplayName, u.imageFileName AS userImageFileName " .
                                                          "FROM targetSubmissions ts " .
                                                          "JOIN submissions s ON ts.submissionCode = s.submissionCode AND (s.isDeleted IS NULL OR s.isDeleted = 0) " .
                                                          "LEFT JOIN common.user u ON ts.userCode = u.userCode " .
                                                          "WHERE ts.targetCode = ?" . $userFilterSql .
                                                          " ORDER BY s.submittedAt DESC, s.createdAt DESC, ts.id DESC LIMIT ? OFFSET ?"
                                                          );

		$paramIndex = 1;
		for ($i = 0; $i < count($params); $i++) {
			$stmt->bindValue($paramIndex, $params[$i]);
			$paramIndex++;
		}
		$stmt->bindValue($paramIndex, (int) $pageSize, PDO::PARAM_INT);
		$paramIndex++;
		$stmt->bindValue($paramIndex, (int) $offset, PDO::PARAM_INT);
		$stmt->execute();
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $submissions = array();
                foreach ($rows as $row) {
                        $contents = $this->fetchSubmissionContents($row['submissionCode']);
                        $primaryContent = $this->pickPrimaryContent($contents);
                        $submissions[] = $this->buildSubmissionPayload($row, $primaryContent, $this->normalizePrimaryContents($primaryContent));
                }

		$rangeStart = 0;
		$rangeEnd = 0;
		if ($totalItems > 0 && count($rows) > 0) {
			$rangeStart = $offset + 1;
			if ($rangeStart > $totalItems) {
				$rangeStart = $totalItems;
			}
			$rangeEnd = $offset + count($rows);
			if ($rangeEnd > $totalItems) {
				$rangeEnd = $totalItems;
			}
		}

		$hasNextPage = $totalPages > 0 && $page < $totalPages;
		$hasPreviousPage = $page > 1;

		$nextPage = $hasNextPage ? $page + 1 : null;
		if ($nextPage !== null && $totalPages > 0 && $nextPage > $totalPages) {
			$nextPage = null;
		}

		$previousPage = $hasPreviousPage ? $page - 1 : null;

		$this->response = array(
								'submissions' => $submissions,
								'pagination' => array(
													  'page' => $page,
													  'pageSize' => $pageSize,
													  'totalItems' => $totalItems,
													  'totalPages' => $totalPages,
													  'range' => array(
																	   'start' => $rangeStart,
																	   'end' => $rangeEnd,
																	   ),
													  'hasNext' => $hasNextPage ? 1 : 0,
													  'hasPrevious' => $hasPreviousPage ? 1 : 0,
													  'nextPage' => $nextPage,
													  'previousPage' => $previousPage,
													  ),
								);
	}



	public function procTargetSubmissionCreate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$userCodeValue = Util::normalizeRequiredString($this->params['userCode'], 32);
		if ($userCodeValue === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$userInfo = $this->getUserInfo($userCodeValue);
		if ($userInfo == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'usernotfound';
			return;
		}

		$isPrivileged = $this->isSupervisor() || $this->isOperator();
		$loginUserCode = $this->getLoginUserCode();

		if ($this->userCanAccessTarget($targetRow, $targetCode, $userCodeValue) === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		if ($isPrivileged === false) {
			if ($loginUserCode === null || $loginUserCode === '') {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}

			if ($loginUserCode !== $userCodeValue) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
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

                $comment = null;
                if (isset($this->params['comment'])) {
                        $commentValue = Util::normalizeOptionalString($this->params['comment'], 2048);
                        if ($commentValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $comment = $commentValue;
                }

                $title = null;
                if (isset($this->params['title'])) {
                        $titleValue = Util::normalizeOptionalString($this->params['title'], 256);
                        if ($titleValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $title = $titleValue;
                }

                $description = null;
                if (isset($this->params['description'])) {
                        $descriptionValue = Util::normalizeOptionalString($this->params['description'], 2048);
                        if ($descriptionValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $description = $descriptionValue;
                }

                $title = null;
                if (isset($this->params['title'])) {
                        $titleValue = Util::normalizeOptionalString($this->params['title'], 256);
                        if ($titleValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $title = $titleValue;
                }

                $description = null;
                if (isset($this->params['description'])) {
                        $descriptionValue = Util::normalizeOptionalString($this->params['description'], 2048);
                        if ($descriptionValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $description = $descriptionValue;
                }

		$submissionCode = $this->generateUniqid();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');
		$status = 'submitted';
		$reviewStatus = 'pending';

		$pdo = $this->getPDOTarget();
		try {
			$pdo->beginTransaction();

                        $stmt = $pdo->prepare(
                                                                  'INSERT INTO submissions (submissionCode, userCode, submittedAt, status, content, comment, reviewStatus, createdAt, updatedAt, isDeleted) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
                                                                  );
                        $stmt->execute(array($submissionCode, $userCodeValue, $timestamp, $status, $content, $comment, $reviewStatus, $timestamp, $timestamp));

                        $attachmentCodes = $this->normalizeContentCodes($this->params);
                        $attachmentOwnerCodes = array($userCodeValue);
                        if ($isPrivileged && $loginUserCode !== null && $loginUserCode !== '') {
                                $attachmentOwnerCodes[] = $loginUserCode;
                        }

                        $attachmentContents = $this->fetchUserContentsByCodes($attachmentOwnerCodes, $attachmentCodes);

                        foreach ($attachmentCodes as $code) {
                                if (isset($attachmentContents[$code]) === false) {
                                        throw new \RuntimeException('invalid_content');
                                }
                        }

                        $primaryContentCode = null;
                        $primaryContentId = null;
                        if (count($attachmentCodes) > 0) {
                                $primaryContentCode = $attachmentCodes[0];
                                if (array_key_exists($primaryContentCode, $attachmentContents)) {
                                        $primaryContentRow = $attachmentContents[$primaryContentCode];
                                        if (isset($primaryContentRow['id'])) {
                                                $primaryContentId = (int) $primaryContentRow['id'];
                                        }
                                        if ($title === null && isset($primaryContentRow['fileName']) && $primaryContentRow['fileName'] !== '') {
                                                $title = $primaryContentRow['fileName'];
                                        }
                                }
                        }

                        foreach ($attachmentContents as $contentCode => $contentRow) {
                                $this->linkSubmissionContent($pdo, $submissionCode, $contentCode, isset($contentRow['contentType']) ? $contentRow['contentType'] : null, $timestamp);
                        }

                        if (count($attachmentCodes) === 0 && ($content === null || $content === '')) {
                                throw new \RuntimeException('nocontent');
                        }

                        $this->upsertTargetSubmission($pdo, $targetCode, $submissionCode, $userCodeValue, $primaryContentId, $primaryContentCode, $title, $description);

                        $pdo->commit();

                        $payloadRow = array(
                                'submissionCode' => $submissionCode,
                                'userCode' => $userCodeValue,
                                'contentId' => $primaryContentId,
                                'contentsCode' => $primaryContentCode,
                                'title' => $title,
                                'description' => $description,
                                'submittedAt' => $timestamp,
                                'status' => $status,
                                'content' => $content,
                                'comment' => $comment,
                                'reviewStatus' => $reviewStatus,
                                'createdAt' => $timestamp,
                                'updatedAt' => $timestamp,
                                'userDisplayName' => $userInfo['displayName'],
                                'userImageFileName' => isset($userInfo['imageFileName']) ? $userInfo['imageFileName'] : null,
                                                                );

                        $contents = $this->fetchSubmissionContents($submissionCode);
                        $primaryContent = $this->pickPrimaryContent($contents);

                        $submissionPayload = $this->buildSubmissionPayload($payloadRow, $primaryContent, $this->normalizePrimaryContents($primaryContent));
                        $this->response = array('submission' => $submissionPayload);
		} catch (\RuntimeException $runtimeError) {
			$pdo->rollBack();

			$reason = $runtimeError->getMessage();
			$this->status = parent::RESULT_ERROR;
			if ($reason === 'nocontent') {
				$this->errorReason = 'nocontent';
			} else if ($reason === 'invalid_content') {
				$this->errorReason = 'invalid';
			} else {
				$this->errorReason = 'upload';
			}
			return;
		} catch (Exception $error) {
			$pdo->rollBack();
			throw $error;
		}
	}



	public function procTargetSubmissionUpdate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$submissionCode = htmlspecialchars($this->params['submissionCode'], ENT_QUOTES, "UTF-8");

		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$pdo = $this->getPDOTarget();
		$stmt = $pdo->prepare(
							  "SELECT s.submissionCode, s.userCode FROM submissions s " .
							  "JOIN targetSubmissions ts ON ts.submissionCode = s.submissionCode " .
							  "WHERE ts.targetCode = ? AND ts.submissionCode = ? " .
							  "AND (s.isDeleted IS NULL OR s.isDeleted = 0) " .
							  "LIMIT 1"
							  );
		$stmt->execute(array($targetCode, $submissionCode));
		$submissionRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($submissionRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$isPrivileged = $this->isSupervisor() || $this->isOperator();
		$loginUserCode = $this->getLoginUserCode();

		if ($this->userCanAccessTarget($targetRow, $targetCode, $submissionRow['userCode']) === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		if ($isPrivileged === false) {
			if ($loginUserCode === null || $loginUserCode === '') {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}

			if ($loginUserCode !== $submissionRow['userCode']) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
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

		$comment = null;
		if (isset($this->params['comment'])) {
			$commentValue = Util::normalizeOptionalString($this->params['comment'], 2048);
			if ($commentValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$comment = $commentValue;
		}

                $existingTargetSubmission = $this->fetchTargetSubmissionRow($targetCode, $submissionCode, $submissionRow['userCode']);

                $existingContents = $this->fetchSubmissionContents($submissionCode);
                $existingContentMap = array();
                foreach ($existingContents as $content) {
                        if (isset($content['contentCode']) && $content['contentCode'] !== null) {
                                $existingContentMap[$content['contentCode']] = $content;
                        }
                }

                $removeContentCodes = array();
                if (isset($this->params['removeContentCodes'])) {
                        $rawValues = $this->params['removeContentCodes'];
                        if (is_array($rawValues) == false) {
				$rawValues = array($rawValues);
			}
			foreach ($rawValues as $value) {
                                $code = trim($value);
                                if ($code === '' || isset($existingContentMap[$code]) == false) {
                                        continue;
                                }
                                if (in_array($code, $removeContentCodes, true)) {
					continue;
				}
				$removeContentCodes[] = $code;
			}
		}

		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

			$stmt = $pdo->prepare('UPDATE submissions SET content = ?, comment = ?, updatedAt = ? WHERE submissionCode = ?');
			$stmt->execute(array($content, $comment, $timestamp, $submissionCode));

			if (count($removeContentCodes) > 0) {
				$placeholders = implode(',', array_fill(0, count($removeContentCodes), '?'));
				$params = $removeContentCodes;
				array_unshift($params, $submissionCode);

				$stmt = $pdo->prepare('DELETE FROM submissionContents WHERE submissionCode = ? AND contentCode IN (' . $placeholders . ')');
				$stmt->execute($params);
			}

                        $newContentCodes = $this->normalizeContentCodes($this->params);
                        $newContentCodes = array_values(array_filter($newContentCodes, function($code) use ($existingContentMap, $removeContentCodes) {
                                                if (in_array($code, $removeContentCodes, true)) {
                                                        return false;
                                                }
                                                return isset($existingContentMap[$code]) == false;
                                        }));

                        $newContentOwnerCodes = array($submissionRow['userCode']);
                        if ($isPrivileged && $loginUserCode !== null && $loginUserCode !== '') {
                                $newContentOwnerCodes[] = $loginUserCode;
                        }

                        $newContentRows = $this->fetchUserContentsByCodes($newContentOwnerCodes, $newContentCodes);

                        foreach ($newContentCodes as $code) {
                                if (isset($newContentRows[$code]) === false) {
                                        throw new \RuntimeException('invalid_content');
                                }
                        }

                        $newContents = array();
                        foreach ($newContentRows as $contentCode => $contentRow) {
                                $this->linkSubmissionContent($pdo, $submissionCode, $contentCode, isset($contentRow['contentType']) ? $contentRow['contentType'] : null, $timestamp);
                                $newContents[] = array(
                                                                                'contentCode' => $contentCode,
                                                                                'contentType' => isset($contentRow['contentType']) ? $contentRow['contentType'] : null,
                                                                                );
                        }

                        $remainingCount = 0;
                        foreach ($existingContentMap as $code => $content) {
                                if (in_array($code, $removeContentCodes, true) == false) {
                                        $remainingCount++;
                                }
                        }
                        $finalContentCount = $remainingCount + count($newContents);

                        if (($content === null || $content === '') && $finalContentCount === 0) {
                                throw new \RuntimeException('nocontent');
                        }

                        $stmt = $pdo->prepare(
                                                                  "SELECT s.submissionCode, s.userCode, s.submittedAt, s.status, s.content, s.comment, s.reviewStatus, s.createdAt, s.updatedAt, u.displayName AS userDisplayName, u.imageFileName AS userImageFileName " .
                                                                  "FROM submissions s " .
                                                                  "LEFT JOIN common.user u ON s.userCode = u.userCode " .
                                                                  "WHERE s.submissionCode = ? LIMIT 1"
                                                                  );
                        $stmt->execute(array($submissionCode));
                        $row = $stmt->fetch(PDO::FETCH_ASSOC);

                        $contents = $this->fetchSubmissionContents($submissionCode);
                        $primaryContent = $this->pickPrimaryContent($contents);
                        $primaryContentId = isset($primaryContent['contentId']) ? $primaryContent['contentId'] : null;
                        $primaryContentCode = isset($primaryContent['contentCode']) ? $primaryContent['contentCode'] : null;

                        $resolvedTitle = $title;
                        if ($resolvedTitle === null) {
                                if (isset($primaryContent['fileName']) && $primaryContent['fileName'] !== '') {
                                        $resolvedTitle = $primaryContent['fileName'];
                                } else if ($existingTargetSubmission !== null && isset($existingTargetSubmission['title'])) {
                                        $resolvedTitle = $existingTargetSubmission['title'];
                                }
                        }

                        $resolvedDescription = $description;
                        if ($resolvedDescription === null && $existingTargetSubmission !== null && isset($existingTargetSubmission['description'])) {
                                $resolvedDescription = $existingTargetSubmission['description'];
                        }

                        $this->upsertTargetSubmission($pdo, $targetCode, $submissionCode, $submissionRow['userCode'], $primaryContentId, $primaryContentCode, $resolvedTitle, $resolvedDescription);

                        $submissionPayload = null;
                        if ($row != null) {
                                $row['contentId'] = $primaryContentId;
                                $row['contentsCode'] = $primaryContentCode;
                                $row['title'] = $resolvedTitle;
                                $row['description'] = $resolvedDescription;
                                $submissionPayload = $this->buildSubmissionPayload($row, $primaryContent, $this->normalizePrimaryContents($primaryContent));
                        }

			$pdo->commit();

			if ($submissionPayload != null) {
				$this->response = array('submission' => $submissionPayload);
			} else {
				$this->response = array('submissionCode' => $submissionCode);
			}
		} catch (\RuntimeException $runtimeError) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$reason = $runtimeError->getMessage();
			$this->status = parent::RESULT_ERROR;
			if ($reason === 'nocontent') {
				$this->errorReason = 'nocontent';
			} else if ($reason === 'invalid_content') {
				$this->errorReason = 'invalid';
			} else {
				$this->errorReason = 'failed';
			}
			return;
		} catch (Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			throw $error;
		}
	}



	public function procTargetSubmissionDelete()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$submissionCode = htmlspecialchars($this->params['submissionCode'], ENT_QUOTES, "UTF-8");

		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$pdo = $this->getPDOTarget();
		$stmt = $pdo->prepare(
							  "SELECT s.submissionCode, s.userCode FROM submissions s " .
							  "JOIN targetSubmissions ts ON ts.submissionCode = s.submissionCode " .
							  "WHERE ts.targetCode = ? AND ts.submissionCode = ? " .
							  "AND (s.isDeleted IS NULL OR s.isDeleted = 0) " .
							  "LIMIT 1"
							  );
		$stmt->execute(array($targetCode, $submissionCode));
		$submissionRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($submissionRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$isPrivileged = $this->isSupervisor() || $this->isOperator();
		$loginUserCode = $this->getLoginUserCode();

		if ($this->userCanAccessTarget($targetRow, $targetCode, $submissionRow['userCode']) === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		if ($isPrivileged === false) {
			if ($loginUserCode === null || $loginUserCode === '') {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}

			if ($loginUserCode !== $submissionRow['userCode']) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}
		}

		$now = new DateTime('now');
		$nowStr = $now->format('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

			$stmt = $pdo->prepare('DELETE FROM targetSubmissions WHERE submissionCode = ?');
			$stmt->execute(array($submissionCode));

			$stmt = $pdo->prepare('DELETE FROM submissionContents WHERE submissionCode = ?');
			$stmt->execute(array($submissionCode));

			$stmt = $pdo->prepare('UPDATE submissions SET isDeleted = 1, updatedAt = ? WHERE submissionCode = ?');
			$stmt->execute(array($nowStr, $submissionCode));

			$pdo->commit();
		} catch (\Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->response = array('submissionCode' => $submissionCode);
	}



	public function procSubmissionDetail()
	{
		$submissionCode = htmlspecialchars($this->params['submissionCode'], ENT_QUOTES, "UTF-8");

                $stmt = $this->getPDOTarget()->prepare(
                                                                                           "SELECT s.submissionCode, s.userCode, s.submittedAt, s.status, s.content, s.comment, s.reviewStatus, s.createdAt, s.updatedAt, u.displayName AS userDisplayName, u.imageFileName AS userImageFileName " .
                                                                                           "FROM submissions s " .
                                                                                           "LEFT JOIN common.user u ON s.userCode = u.userCode " .
                                                                                           "WHERE s.submissionCode = ? AND (s.isDeleted IS NULL OR s.isDeleted = 0) " .
                                                                                           "LIMIT 1"
                                                                                           );
                $stmt->execute(array($submissionCode));
                $row = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($row == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

                $contents = $this->fetchSubmissionContents($submissionCode);
                $primaryContent = $this->pickPrimaryContent($contents);
                $submission = $this->buildSubmissionPayload($row, $primaryContent, $this->normalizePrimaryContents($primaryContent));
                $submission['targets'] = $this->fetchSubmissionTargets($submissionCode);

                $this->response = array('submission' => $submission);
        }



        private function buildSubmissionPayload($row, $primaryContent, $contents = array())
        {
                $primaryContentId = null;
                if (isset($row['contentId']) && $row['contentId'] !== null && $row['contentId'] !== '') {
                        $primaryContentId = (int)$row['contentId'];
                } else if (isset($primaryContent['contentId'])) {
                        $primaryContentId = $primaryContent['contentId'];
                }

                $primaryContentCode = null;
                if (isset($row['contentsCode']) && $row['contentsCode'] !== null && $row['contentsCode'] !== '') {
                        $primaryContentCode = $row['contentsCode'];
                } else if (isset($primaryContent['contentCode']) && $primaryContent['contentCode'] !== null && $primaryContent['contentCode'] !== '') {
                        $primaryContentCode = $primaryContent['contentCode'];
                }

                $title = array_key_exists('title', $row) ? $row['title'] : null;
                if ($title === null && isset($primaryContent['fileName']) && $primaryContent['fileName'] !== '') {
                        $title = $primaryContent['fileName'];
                }

                $description = array_key_exists('description', $row) ? $row['description'] : null;

                return array(
                                         'submissionCode' => $row['submissionCode'],
                                         'userCode' => $row['userCode'],
                                         'userDisplayName' => array_key_exists('userDisplayName', $row) ? $row['userDisplayName'] : null,
                                         'userImageFileName' => array_key_exists('userImageFileName', $row) ? $row['userImageFileName'] : null,
                                         'submittedAt' => $row['submittedAt'],
                                         'status' => $row['status'],
                                         'content' => isset($row['content']) ? $row['content'] : null,
                                         'comment' => $row['comment'],
                                         'reviewStatus' => $row['reviewStatus'],
                                         'contentId' => $primaryContentId,
                                         'contentCode' => $primaryContentCode,
                                         'contentsCode' => $primaryContentCode,
                                         'title' => $title,
                                         'description' => $description,
                                         'createdAt' => $row['createdAt'],
                                         'updatedAt' => $row['updatedAt'],
                                         'contents' => $contents
                                         );
        }



        private function fetchSubmissionContents($submissionCode)
        {
                $targetStmt = $this->getPDOTarget()->prepare('SELECT contentCode, contentType FROM submissionContents WHERE submissionCode = ? ORDER BY id ASC');
                $targetStmt->execute(array($submissionCode));
                $contentRows = $targetStmt->fetchAll(PDO::FETCH_ASSOC);

                $contentCodes = array();
                foreach ($contentRows as $row) {
                        if (!isset($row['contentCode']) || $row['contentCode'] === '') {
                                continue;
                        }
                        $contentCodes[] = $row['contentCode'];
                }

                $contentDetails = array();
                if (count($contentCodes) > 0) {
                        $placeholders = implode(',', array_fill(0, count($contentCodes), '?'));
                        $contentsStmt = $this->getPDOContents()->prepare('SELECT id, contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, createdAt, updatedAt FROM userContents WHERE contentCode IN (' . $placeholders . ')');
                        $contentsStmt->execute($contentCodes);
                        $contentRows = $contentsStmt->fetchAll(PDO::FETCH_ASSOC);

                        foreach ($contentRows as $contentRow) {
                                if (!isset($contentRow['contentCode']) || $contentRow['contentCode'] === '') {
                                        continue;
                                }
                                $contentDetails[$contentRow['contentCode']] = $contentRow;
                        }
                }

                $contents = array();
                foreach ($contentRows as $row) {
                        $code = isset($row['contentCode']) ? $row['contentCode'] : null;
                        $detail = ($code !== null && array_key_exists($code, $contentDetails)) ? $contentDetails[$code] : array();

                        $contents[] = array(
                                                                   'contentCode' => $code,
                                                                   'contentType' => isset($row['contentType']) ? $row['contentType'] : (array_key_exists('contentType', $detail) ? $detail['contentType'] : null),
                                                                   'userCode' => array_key_exists('userCode', $detail) ? $detail['userCode'] : null,
                                                                   'contentId' => array_key_exists('id', $detail) ? (int)$detail['id'] : null,
                                                                   'fileName' => array_key_exists('fileName', $detail) ? $detail['fileName'] : null,
                                                                   'filePath' => array_key_exists('filePath', $detail) ? $detail['filePath'] : null,
                                                                   'mimeType' => array_key_exists('mimeType', $detail) ? $detail['mimeType'] : null,
                                                                   'fileSize' => array_key_exists('fileSize', $detail) && $detail['fileSize'] !== null ? (int)$detail['fileSize'] : null,
                                                                   'duration' => array_key_exists('duration', $detail) && $detail['duration'] !== null ? (int)$detail['duration'] : null,
                                                                   'bitrate' => array_key_exists('bitrate', $detail) && $detail['bitrate'] !== null ? (int)$detail['bitrate'] : null,
                                                                   'width' => array_key_exists('width', $detail) && $detail['width'] !== null ? (int)$detail['width'] : null,
                                                                   'height' => array_key_exists('height', $detail) && $detail['height'] !== null ? (int)$detail['height'] : null,
                                                                   'createdAt' => array_key_exists('createdAt', $detail) ? $detail['createdAt'] : null,
                                                                   'updatedAt' => array_key_exists('updatedAt', $detail) ? $detail['updatedAt'] : null,
                                                                   'storagePath' => array_key_exists('filePath', $detail) ? $detail['filePath'] : null
                                                                   );
                }
                return $contents;
        }



        private function fetchPrimarySubmissionContent($submissionCode)
        {
                $contents = $this->fetchSubmissionContents($submissionCode);
                return $this->pickPrimaryContent($contents);
        }



        private function pickPrimaryContent($contents)
        {
                if (!is_array($contents) || count($contents) === 0) {
                        return array();
                }
                foreach ($contents as $content) {
                        if ($content !== null) {
                                return $content;
                        }
                }
                return array();
        }


        private function normalizePrimaryContents($primaryContent)
        {
                if (is_array($primaryContent) && count($primaryContent) > 0) {
                        return array($primaryContent);
                }
                return array();
        }



        private function fetchSubmissionTargets($submissionCode)
        {
                $stmt = $this->getPDOTarget()->prepare(
                                                                                           "SELECT ts.targetCode, t.title, t.status, t.priority, t.dueDate " .
                                                                                           "FROM targetSubmissions ts " .
                                                                                           "LEFT JOIN targets t ON ts.targetCode = t.targetCode " .
                                                                                           "WHERE ts.submissionCode = ? " .
                                                                                           "ORDER BY ts.id ASC"
                                                                                           );
                $stmt->execute(array($submissionCode));
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $targets = array();
                        foreach ($rows as $row) {
                                if ($row == null) {
                                        continue;
                                }
                        $targets[] = array(
                                                           'targetCode' => $row['targetCode'],
                                                           'title' => isset($row['title']) ? $row['title'] : null,
                                                           'status' => isset($row['status']) ? $row['status'] : null,
                                                           'priority' => isset($row['priority']) ? $row['priority'] : null,
                                                           'dueDate' => isset($row['dueDate']) ? $row['dueDate'] : null
                                                           );
                }

                return $targets;
        }




	private function fetchTargetSubmissionRow($targetCode, $submissionCode, $userCode)
	{
		$stmt = $this->getPDOTarget()->prepare('SELECT targetCode, submissionCode, userCode, contentId, contentsCode, title, description FROM targetSubmissions WHERE targetCode = ? AND submissionCode = ? AND userCode = ? LIMIT 1');
		$stmt->execute(array($targetCode, $submissionCode, $userCode));
		return $stmt->fetch(PDO::FETCH_ASSOC);
	}


	private function upsertTargetSubmission($pdo, $targetCode, $submissionCode, $userCode, $contentId, $contentCode, $title, $description)
	{
		$stmt = $pdo->prepare('INSERT INTO targetSubmissions (targetCode, submissionCode, userCode, contentId, contentsCode, title, description) VALUES(?, ?, ?, ?, ?, ?, ?) ON CONFLICT(targetCode, submissionCode, userCode) DO UPDATE SET contentId = excluded.contentId, contentsCode = excluded.contentsCode, title = excluded.title, description = excluded.description');
		$stmt->execute(array($targetCode, $submissionCode, $userCode, $contentId, $contentCode, $title, $description));
	}


	private function normalizeContentCodes($params)
	{
		if (!is_array($params)) {
			return array();
		}

                $rawCodes = array();
                if (array_key_exists('contentCodes', $params)) {
                        $rawCodes = $params['contentCodes'];
                }

                if (array_key_exists('contentCode', $params) && $params['contentCode'] !== null) {
                        if (is_array($rawCodes) == false || count($rawCodes) === 0) {
                                $rawCodes = array();
                        }
                        $rawCodes[] = $params['contentCode'];
                }

		if ($rawCodes === null) {
			return array();
		}

		if (is_array($rawCodes) == false) {
			$rawCodes = array($rawCodes);
		}

		$codes = array();
		foreach ($rawCodes as $value) {
			$code = trim((string) $value);
			if ($code === '' || in_array($code, $codes, true)) {
				continue;
			}
			$codes[] = $code;
		}

		return $codes;
	}



        private function fetchUserContentsByCodes($userCodes, $contentCodes)
        {
                if (is_array($userCodes) == false) {
                        $userCodes = array($userCodes);
                }

                $userCodes = array_values(array_filter(array_unique(array_map(function ($code) {
                        return trim((string) $code);
                }, $userCodes)), function ($code) {
                        return $code !== '';
                }));

                if (count($userCodes) === 0 || count($contentCodes) === 0) {
                        return array();
                }

                $placeholders = implode(',', array_fill(0, count($contentCodes), '?'));
                $ownerPlaceholders = implode(',', array_fill(0, count($userCodes), '?'));
                $params = array_merge($userCodes, $contentCodes);

                $stmt = $this->getPDOContents()->prepare('SELECT id, contentCode, contentType, fileName, filePath, mimeType, fileSize FROM userContents WHERE userCode IN (' . $ownerPlaceholders . ') AND contentCode IN (' . $placeholders . ')');
                $stmt->execute($params);

		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
		$results = array();
		foreach ($rows as $row) {
			$code = isset($row['contentCode']) ? $row['contentCode'] : null;
			if ($code === null || $code === '') {
				continue;
			}
			$results[$code] = $row;
		}

		return $results;
	}



	private function linkSubmissionContent($pdo, $submissionCode, $contentCode, $contentType, $timestamp)
	{
		$stmt = $pdo->prepare('INSERT INTO submissionContents (submissionCode, contentCode, contentType, createdAt) VALUES(?, ?, ?, ?)');
		$stmt->execute(array($submissionCode, $contentCode, $contentType, $timestamp));
	}
}

?>
