<?php

Base::requireFromShm('class/class.TargetManagementUtil.php');

class TargetManagementReviews extends Base
{
	public function __construct($context)
	{
		parent::__construct($context);
	}
	
	protected function validationTargetReviewList()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetReviewListOwn()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetReviewCreate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['reviewerCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetReviewUpdate()
	{
		if (isset($this->params['reviewCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationTargetReviewDelete()
	{
		if (isset($this->params['reviewCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationReviewDetail()
	{
		if (isset($this->params['reviewCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationReviewVideoCommentCreate()
	{
		if (isset($this->params['reviewCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['sourceType']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['contentCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationReviewVideoCommentUpdate()
	{
		if (isset($this->params['reviewCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['commentId']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	protected function validationReviewVideoCommentDelete()
	{
		if (isset($this->params['reviewCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['commentId']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}

	public function procTargetReviewList()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		list($page, $pageSize) = $this->resolveReviewListPaginationParams();
		$result = $this->fetchTargetReviewsForTarget($targetCode, $page, $pageSize);

		$this->response = array(
								'reviews' => $result['reviews'],
								'pagination' => $result['pagination'],
								);
	}



	public function procTargetReviewListOwn()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
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

		if ($this->userCanAccessTarget($targetRow, $targetCode, $loginUserCode) == false && $this->isSupervisor() == false && $this->isOperator() == false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'permission';
			return;
		}

		list($page, $pageSize) = $this->resolveReviewListPaginationParams();
		$result = $this->fetchTargetReviewsForTarget($targetCode, $page, $pageSize);
		$reviews = $result['reviews'];

		foreach ($reviews as &$review) {
			if (is_array($review)) {
				$review['privateNote'] = null;
			}
		}
		unset($review);

		$this->response = array(
								'reviews' => $reviews,
								'pagination' => $result['pagination'],
								);
	}



	public function procTargetReviewCreate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$reviewerCodeValue = Util::normalizeRequiredString($this->params['reviewerCode'], 32);
		if ($reviewerCodeValue === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$reviewerInfo = $this->getUserInfo($reviewerCodeValue);
		if ($reviewerInfo == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'usernotfound';
			return;
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

		$privateNote = null;
		if (isset($this->params['privateNote'])) {
			$noteValue = Util::normalizeOptionalString($this->params['privateNote'], 2048);
			if ($noteValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$privateNote = $noteValue;
		}

		$reviewedAt = null;
		if (isset($this->params['reviewedAt'])) {
			$reviewedAtValue = Util::normalizeOptionalDateTime($this->params['reviewedAt']);
			if ($reviewedAtValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$reviewedAt = $reviewedAtValue;
		}

                $videoComments = $this->normalizeReviewVideoComments(isset($this->params['videoComments']) ? $this->params['videoComments'] : null);
                if ($videoComments === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $reviewContentMetadata = $this->resolveReviewContentMetadata($reviewerCodeValue);
                if ($reviewContentMetadata === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $reviewCode = $this->generateUniqid();
                $pdo = $this->getPDOTarget();
                $now = new DateTime('now');
                $timestamp = $now->format('Y-m-d H:i:s');

		if ($reviewedAt === null) {
			$reviewedAt = $timestamp;
		}

		try {
			$pdo->beginTransaction();

                        $stmt = $pdo->prepare('INSERT INTO reviews (reviewCode, reviewerCode, reviewedAt, content, privateNote, createdAt, updatedAt, isDeleted) VALUES(?, ?, ?, ?, ?, ?, ?, 0)');
                        $stmt->execute(array($reviewCode, $reviewerCodeValue, $reviewedAt, $content, $privateNote, $timestamp, $timestamp));

                        $stmt = $pdo->prepare('INSERT INTO targetReviews (targetCode, reviewCode, reviewerCode, contentId, contentsCode, title, description) VALUES(?, ?, ?, ?, ?, ?, ?)');
                        $stmt->execute(array(
                                $targetCode,
                                $reviewCode,
                                $reviewerCodeValue,
                                $reviewContentMetadata['contentId'],
                                $reviewContentMetadata['contentsCode'],
                                $reviewContentMetadata['title'],
                                $reviewContentMetadata['description'],
                        ));

                        $hasPrimaryContent = ($reviewContentMetadata['contentId'] !== null) || ($reviewContentMetadata['contentsCode'] !== null && $reviewContentMetadata['contentsCode'] !== '');

                        if (($content === null || $content === '') && count($videoComments) === 0 && $hasPrimaryContent == false) {
                                throw new \RuntimeException('nocontent');
                        }

                        if (count($videoComments) > 0) {
                                $stmt = $pdo->prepare('INSERT INTO reviewVideoComments (reviewCode, sourceType, contentCode, startSeconds, comment, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?)');
                                foreach ($videoComments as $index => $commentEntry) {
                                        $sourceType = 'review';
                                        $contentCode = isset($commentEntry['contentCode']) ? $commentEntry['contentCode'] : sprintf('legacy-%s-%d', $sourceType, $index);
                                        $stmt->execute(array($reviewCode, $sourceType, $contentCode, $commentEntry['startSeconds'], $commentEntry['comment'], $timestamp, $timestamp));
                                }
                        }

			$pdo->commit();

			$payload = $this->fetchReviewPayloadByCode($reviewCode);
			if ($payload != null) {
				$this->response = array('review' => $payload);
			} else {
				$this->response = array('reviewCode' => $reviewCode);
			}
		} catch (\RuntimeException $runtimeError) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$reason = $runtimeError->getMessage();
			$this->status = parent::RESULT_ERROR;
			if ($reason === 'nocontent') {
				$this->errorReason = 'nocontent';
			} else if ($reason === 'invalid_mime' || $reason === 'invalid_comment') {
				$this->errorReason = 'invalid';
			} else {
				$this->errorReason = 'failed';
			}
			return;
		} catch (Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}
	}



	public function procTargetReviewUpdate()
	{
		$reviewCode = htmlspecialchars($this->params['reviewCode'], ENT_QUOTES, "UTF-8");

                $stmt = $this->getPDOTarget()->prepare(
                                                                                           "SELECT tr.targetCode, tr.reviewerCode, tr.contentId, tr.contentsCode, tr.title, tr.description, r.reviewCode, r.content, r.privateNote, r.reviewedAt " .
                                                                                           "FROM reviews r " .
                                                                                           "LEFT JOIN targetReviews tr ON r.reviewCode = tr.reviewCode " .
                                                                                           "WHERE r.reviewCode = ? AND (r.isDeleted IS NULL OR r.isDeleted = 0) " .
                                                                                           "LIMIT 1"
                                                                                           );
		$stmt->execute(array($reviewCode));
		$reviewRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($reviewRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$reviewerCodeValue = $reviewRow['reviewerCode'];
		if ($reviewerCodeValue == null || $reviewerCodeValue === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
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
		} else {
			$content = isset($reviewRow['content']) ? $reviewRow['content'] : null;
		}

		$privateNote = null;
		if (isset($this->params['privateNote'])) {
			$noteValue = Util::normalizeOptionalString($this->params['privateNote'], 2048);
			if ($noteValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$privateNote = $noteValue;
		} else {
			$privateNote = isset($reviewRow['privateNote']) ? $reviewRow['privateNote'] : null;
		}

		$reviewedAt = null;
		if (isset($this->params['reviewedAt'])) {
			$reviewedAtValue = Util::normalizeOptionalDateTime($this->params['reviewedAt']);
			if ($reviewedAtValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$reviewedAt = $reviewedAtValue;
		} else {
			$reviewedAt = isset($reviewRow['reviewedAt']) ? $reviewRow['reviewedAt'] : null;
		}

                $hasVideoCommentsParam = array_key_exists('videoComments', $this->params);
                $videoComments = $this->normalizeReviewVideoComments($hasVideoCommentsParam ? $this->params['videoComments'] : null, $hasVideoCommentsParam == false);
		if ($videoComments === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}
		if ($hasVideoCommentsParam == false) {
			$videoComments = $this->fetchReviewVideoComments($reviewCode);
		}

                $reviewContentMetadata = $this->resolveReviewContentMetadata($reviewerCodeValue, $reviewRow);
                if ($reviewContentMetadata === false) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $pdo = $this->getPDOTarget();
                $now = new DateTime('now');
                $timestamp = $now->format('Y-m-d H:i:s');

                try {
                        $pdo->beginTransaction();

                        $stmt = $pdo->prepare('UPDATE reviews SET content = ?, privateNote = ?, reviewedAt = ?, updatedAt = ? WHERE reviewCode = ?');
                        $stmt->execute(array($content, $privateNote, $reviewedAt, $timestamp, $reviewCode));

                        $stmt = $pdo->prepare('UPDATE targetReviews SET contentId = ?, contentsCode = ?, title = ?, description = ? WHERE reviewCode = ?');
                        $stmt->execute(array($reviewContentMetadata['contentId'], $reviewContentMetadata['contentsCode'], $reviewContentMetadata['title'], $reviewContentMetadata['description'], $reviewCode));

                        $hasPrimaryContent = ($reviewContentMetadata['contentId'] !== null) || ($reviewContentMetadata['contentsCode'] !== null && $reviewContentMetadata['contentsCode'] !== '');

                        if (($content === null || $content === '') && count($videoComments) === 0 && $hasPrimaryContent == false) {
                                throw new \RuntimeException('nocontent');
                        }

                        $stmt = $pdo->prepare('DELETE FROM reviewVideoComments WHERE reviewCode = ?');
			$stmt->execute(array($reviewCode));
			if (count($videoComments) > 0) {
				$stmt = $pdo->prepare('INSERT INTO reviewVideoComments (reviewCode, sourceType, contentCode, startSeconds, comment, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?)');
				foreach ($videoComments as $index => $commentEntry) {
                                        $sourceType = 'review';
                                        $contentCode = isset($commentEntry['contentCode']) ? $commentEntry['contentCode'] : sprintf('legacy-%s-%d', $sourceType, $index);
                                        $stmt->execute(array($reviewCode, $sourceType, $contentCode, $commentEntry['startSeconds'], $commentEntry['comment'], $timestamp, $timestamp));
                                }
                        }

                        $pdo->commit();

			$payload = $this->fetchReviewPayloadByCode($reviewCode);
			if ($payload != null) {
				$this->response = array('review' => $payload);
			} else {
				$this->response = array('reviewCode' => $reviewCode);
			}
		} catch (\RuntimeException $runtimeError) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$reason = $runtimeError->getMessage();
			$this->status = parent::RESULT_ERROR;
			if ($reason === 'nocontent') {
				$this->errorReason = 'nocontent';
			} else if ($reason === 'invalid_mime' || $reason === 'invalid_comment') {
				$this->errorReason = 'invalid';
			} else {
				$this->errorReason = 'failed';
			}
			return;
		} catch (Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}
	}



	public function procTargetReviewDelete()
	{
		$reviewCode = htmlspecialchars($this->params['reviewCode'], ENT_QUOTES, "UTF-8");

		$stmt = $this->getPDOTarget()->prepare(
											   "SELECT r.reviewCode, tr.targetCode " .
											   "FROM reviews r " .
											   "LEFT JOIN targetReviews tr ON r.reviewCode = tr.reviewCode " .
											   "WHERE r.reviewCode = ? AND (r.isDeleted IS NULL OR r.isDeleted = 0) " .
											   "LIMIT 1"
											   );
		$stmt->execute(array($reviewCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($row == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

                $pdo = $this->getPDOTarget();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

                        $stmt = $pdo->prepare('DELETE FROM reviewVideoComments WHERE reviewCode = ?');
                        $stmt->execute(array($reviewCode));

			$stmt = $pdo->prepare('DELETE FROM targetReviews WHERE reviewCode = ?');
			$stmt->execute(array($reviewCode));

			$stmt = $pdo->prepare('UPDATE reviews SET isDeleted = 1, updatedAt = ? WHERE reviewCode = ?');
			$stmt->execute(array($timestamp, $reviewCode));

			$pdo->commit();

			$this->response = array('reviewCode' => $reviewCode);
		} catch (Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}
	}



	public function procReviewDetail()
	{
		$reviewCode = htmlspecialchars($this->params['reviewCode'], ENT_QUOTES, "UTF-8");

		

                $stmt = $this->getPDOTarget()->prepare(
                                                                                           "SELECT r.reviewCode, r.reviewerCode, r.reviewedAt, r.content, r.privateNote, r.createdAt, r.updatedAt, tr.targetCode, tr.contentId, tr.contentsCode, tr.title, tr.description, t.title AS targetTitle, t.title AS targetDisplayName, t.title AS targetDisplayTitle, t.title AS targetLabel, t.title AS targetName, u.displayName AS reviewerDisplayName " .
                                                                                           "FROM reviews r " .
                                                                                           "LEFT JOIN targetReviews tr ON r.reviewCode = tr.reviewCode " .
                                                                                           "LEFT JOIN targets t ON tr.targetCode = t.targetCode " .
                                                                                           "LEFT JOIN common.user u ON r.reviewerCode = u.userCode " .
                                                                                           "WHERE r.reviewCode = ? AND (r.isDeleted IS NULL OR r.isDeleted = 0) " .
                                                                                           "LIMIT 1"
                                                                                           );
		$stmt->execute(array($reviewCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($row == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$isPrivileged = $this->isSupervisor() || $this->isOperator();
		if ($isPrivileged == false) {
			$loginUserCode = $this->getLoginUserCode();
			if ($loginUserCode === null || $loginUserCode === '') {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}

			if ($this->userCanViewReviewDetail($row, $reviewCode, $loginUserCode) == false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'permission';
				return;
			}
		}

                $comments = $this->fetchReviewVideoComments($reviewCode);
                $contentDetail = null;
                if (isset($row['contentsCode']) && $row['contentsCode'] !== '') {
                        $contentDetail = $this->fetchUserContentDetail($row['contentsCode']);
                }
                $review = $this->buildReviewPayload($row, $comments, $contentDetail);

		$this->response = array('review' => $review);
	}



	public function procReviewVideoCommentCreate()
	{
		$reviewCode = htmlspecialchars($this->params['reviewCode'], ENT_QUOTES, "UTF-8");

		$stmt = $this->getPDOTarget()->prepare(
											   "SELECT reviewCode FROM reviews WHERE reviewCode = ? AND (isDeleted IS NULL OR isDeleted = 0) LIMIT 1"
											   );
		$stmt->execute(array($reviewCode));
                $reviewRow = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($reviewRow == null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'notfound';
                        return;
                }

                $sourceType = 'review';
                if (isset($this->params['sourceType'])) {
                        $candidate = strtolower(trim($this->params['sourceType']));
                        if ($candidate !== '' && $candidate !== 'review') {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                }

		$contentCode = isset($this->params['contentCode']) ? trim($this->params['contentCode']) : '';
		if ($contentCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$startSeconds = 0;
		if (isset($this->params['startSeconds'])) {
			$startSeconds = (int)$this->params['startSeconds'];
			if ($startSeconds < 0) {
				$startSeconds = 0;
			}
		}

		$comment = null;
		if (isset($this->params['comment'])) {
			$commentValue = Util::normalizeOptionalString($this->params['comment'], 1024);
			if ($commentValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$comment = $commentValue;
		}

                $pdo = $this->getPDOTarget();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		$stmt = $pdo->prepare('INSERT INTO reviewVideoComments (reviewCode, sourceType, contentCode, startSeconds, comment, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?)');
		$stmt->execute(array($reviewCode, $sourceType, $contentCode, $startSeconds, $comment, $timestamp, $timestamp));

		$commentId = (int)$pdo->lastInsertId();

		$this->response = array(
								'comment' => array(
												   'id' => $commentId,
												   'reviewCode' => $reviewCode,
												   'sourceType' => $sourceType,
												   'contentCode' => $contentCode,
												   'startSeconds' => $startSeconds,
												   'comment' => $comment,
												   'createdAt' => $timestamp,
												   'updatedAt' => $timestamp
												   )
								);
	}



	public function procReviewVideoCommentUpdate()
	{
		$reviewCode = htmlspecialchars($this->params['reviewCode'], ENT_QUOTES, "UTF-8");
		$commentId = (int)$this->params['commentId'];

		if ($commentId <= 0) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$stmt = $this->getPDOTarget()->prepare('SELECT id, sourceType, contentCode, startSeconds, comment FROM reviewVideoComments WHERE id = ? AND reviewCode = ? LIMIT 1');
		$stmt->execute(array($commentId, $reviewCode));
		$commentRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($commentRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

                $sourceType = 'review';
                if (isset($commentRow['sourceType']) && strtolower($commentRow['sourceType']) !== 'review') {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }
                $contentCode = isset($commentRow['contentCode']) ? trim($commentRow['contentCode']) : '';

		if ($contentCode === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

                $startSeconds = isset($this->params['startSeconds']) ? (int)$this->params['startSeconds'] : (int)$commentRow['startSeconds'];
		if ($startSeconds < 0) {
			$startSeconds = 0;
		}

		$comment = isset($commentRow['comment']) ? $commentRow['comment'] : null;
		if (array_key_exists('comment', $this->params)) {
			$commentValue = Util::normalizeOptionalString($this->params['comment'], 1024);
			if ($commentValue === false) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$comment = $commentValue;
		}

		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		$stmt = $this->getPDOTarget()->prepare('UPDATE reviewVideoComments SET startSeconds = ?, comment = ?, updatedAt = ? WHERE id = ? AND reviewCode = ?');
		$stmt->execute(array($startSeconds, $comment, $timestamp, $commentId, $reviewCode));

		$stmt = $this->getPDOTarget()->prepare('SELECT id, sourceType, contentCode, startSeconds, comment, createdAt, updatedAt FROM reviewVideoComments WHERE id = ? AND reviewCode = ? LIMIT 1');
		$stmt->execute(array($commentId, $reviewCode));
		$updatedRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($updatedRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->response = array(
								'comment' => array(
												   'id' => (int)$updatedRow['id'],
												   'reviewCode' => $reviewCode,
                                                                                                   'sourceType' => 'review',
												   'contentCode' => isset($updatedRow['contentCode']) ? $updatedRow['contentCode'] : null,
												   'startSeconds' => isset($updatedRow['startSeconds']) ? (int)$updatedRow['startSeconds'] : 0,
												   'comment' => isset($updatedRow['comment']) ? $updatedRow['comment'] : null,
												   'createdAt' => isset($updatedRow['createdAt']) ? $updatedRow['createdAt'] : null,
												   'updatedAt' => isset($updatedRow['updatedAt']) ? $updatedRow['updatedAt'] : null
												   )
								);
	}



	public function procReviewVideoCommentDelete()
	{
		$reviewCode = htmlspecialchars($this->params['reviewCode'], ENT_QUOTES, "UTF-8");
		$commentId = (int)$this->params['commentId'];

		if ($commentId <= 0) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

		$stmt = $this->getPDOTarget()->prepare('SELECT id FROM reviewVideoComments WHERE id = ? AND reviewCode = ? LIMIT 1');
		$stmt->execute(array($commentId, $reviewCode));
		$commentRow = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($commentRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$stmt = $this->getPDOTarget()->prepare('DELETE FROM reviewVideoComments WHERE id = ? AND reviewCode = ?');
		$stmt->execute(array($commentId, $reviewCode));

		$this->response = array('commentId' => $commentId);
	}



	private function resolveReviewListPaginationParams()
	{
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

		return array($page, $pageSize);
	}



	private function fetchTargetReviewsForTarget($targetCode, $page, $pageSize)
	{
		$pdo = $this->getPDOTarget();

		$countStmt = $pdo->prepare(
								   "SELECT COUNT(*) " .
								   "FROM targetReviews tr " .
								   "JOIN reviews r ON tr.reviewCode = r.reviewCode AND (r.isDeleted IS NULL OR r.isDeleted = 0) " .
								   "WHERE tr.targetCode = ?"
								   );
		$countStmt->execute(array($targetCode));
		$totalItems = (int) $countStmt->fetchColumn();

		$totalPages = 0;
		if ($pageSize > 0) {
			$totalPages = (int) ceil($totalItems / $pageSize);
		}

		if ($totalItems === 0) {
			$page = 1;
		} elseif ($totalPages > 0 && $page > $totalPages) {
			$page = $totalPages;
		}

		$offset = ($page - 1) * $pageSize;
		if ($offset < 0) {
			$offset = 0;
		}

                $stmt = $pdo->prepare(
                                                          "SELECT tr.reviewCode, tr.targetCode, tr.reviewerCode, tr.contentId, tr.contentsCode, tr.title, tr.description, r.reviewedAt, r.content, r.privateNote, r.createdAt, r.updatedAt, u.displayName AS reviewerDisplayName " .
                                                          "FROM targetReviews tr " .
                                                          "JOIN reviews r ON tr.reviewCode = r.reviewCode AND (r.isDeleted IS NULL OR r.isDeleted = 0) " .
                                                          "LEFT JOIN common.user u ON tr.reviewerCode = u.userCode " .
                                                          "WHERE tr.targetCode = ? " .
							  "ORDER BY r.reviewedAt DESC, r.createdAt DESC, tr.id DESC " .
							  "LIMIT ? OFFSET ?"
							  );
		$stmt->bindValue(1, $targetCode, PDO::PARAM_STR);
		$stmt->bindValue(2, (int) $pageSize, PDO::PARAM_INT);
		$stmt->bindValue(3, (int) $offset, PDO::PARAM_INT);
                $stmt->execute();
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $primaryContentCodes = array();
                $primaryContentIds = array();
                foreach ($rows as $row) {
                        if (isset($row['contentsCode']) && $row['contentsCode'] !== '') {
                                $primaryContentCodes[] = $row['contentsCode'];
                        } elseif (isset($row['contentId']) && $row['contentId'] !== null && $row['contentId'] !== '') {
                                $primaryContentIds[] = (int)$row['contentId'];
                        }
                }
                $primaryContentDetails = $this->fetchUserContentDetailsByCodes(array_values(array_unique($primaryContentCodes)));
                $primaryContentDetailsById = $this->fetchUserContentDetailsByIds(array_values(array_unique($primaryContentIds)));

                $reviews = array();
                foreach ($rows as $row) {
                        $comments = $this->fetchReviewVideoComments($row['reviewCode']);
                        $contentDetail = null;
                        if (isset($row['contentsCode']) && $row['contentsCode'] !== '' && array_key_exists($row['contentsCode'], $primaryContentDetails)) {
                                $contentDetail = $primaryContentDetails[$row['contentsCode']];
                        } else {
                                $contentId = isset($row['contentId']) ? (int)$row['contentId'] : null;
                                if ($contentId !== null && array_key_exists($contentId, $primaryContentDetailsById)) {
                                        $contentDetail = $primaryContentDetailsById[$contentId];
                                }
                        }
                        $reviews[] = $this->buildReviewPayload($row, $comments, $contentDetail);
                }

		$rangeStart = 0;
		$rangeEnd = 0;
		if ($totalItems > 0) {
			$rangeStart = $offset + 1;
			if ($rangeStart > $totalItems) {
				$rangeStart = $totalItems;
			}
			if ($rangeStart < 1) {
				$rangeStart = 1;
			}
			$rangeEnd = $offset + $pageSize;
			if ($rangeEnd > $totalItems) {
				$rangeEnd = $totalItems;
			}
			if ($rangeEnd < $rangeStart) {
				$rangeEnd = $rangeStart;
			}
		}

		$hasNext = false;
		$nextPage = null;
		if ($totalPages > 0 && $page < $totalPages) {
			$hasNext = true;
			$nextPage = $page + 1;
		}

		$hasPrevious = false;
		$previousPage = null;
		if ($page > 1) {
			$hasPrevious = true;
			$previousPage = $page - 1;
		}

		$pagination = array(
							'page' => $page,
							'pageSize' => $pageSize,
							'totalItems' => $totalItems,
							'totalPages' => $totalPages,
							'range' => array(
											 'start' => $rangeStart,
											 'end' => $rangeEnd,
											 ),
							'hasNext' => $hasNext,
							'hasPrevious' => $hasPrevious,
							'nextPage' => $nextPage,
							'previousPage' => $previousPage,
							);

		return array(
					 'reviews' => $reviews,
					 'pagination' => $pagination,
					 );
	}



	private function userCanViewReviewDetail($reviewRow, $reviewCode, $userCode)
	{
		if ($reviewRow == null || $reviewCode === null || $reviewCode === '' || $userCode === null || $userCode === '') {
			return false;
		}

		if (isset($reviewRow['reviewerCode']) && $reviewRow['reviewerCode'] === $userCode) {
			return true;
		}

                $targetCode = isset($reviewRow['targetCode']) ? trim($reviewRow['targetCode']) : '';
                if ($targetCode !== '') {
                        $targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
                        if ($targetRow != null && $this->userCanAccessTarget($targetRow, $targetCode, $userCode)) {
                                return true;
                        }
                }

                return false;
        }



        private function fetchReviewVideoComments($reviewCode)
        {
                $stmt = $this->getPDOTarget()->prepare('SELECT id, sourceType, contentCode, startSeconds, comment, createdAt, updatedAt FROM reviewVideoComments WHERE reviewCode = ? ORDER BY startSeconds ASC, id ASC');
		$stmt->execute(array($reviewCode));
		$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $comments = array();
                foreach ($rows as $row) {
                        $comments[] = array(
                                'id' => isset($row['id']) ? (int)$row['id'] : null,
                                'sourceType' => 'review',
                                'contentCode' => isset($row['contentCode']) ? $row['contentCode'] : null,
                                'startSeconds' => isset($row['startSeconds']) ? (int)$row['startSeconds'] : 0,
                                'comment' => isset($row['comment']) ? $row['comment'] : null,
                                'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
                                'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null
								);
		}

		return $comments;
	}



        private function fetchUserContentDetailsByCodes($contentCodes)
        {
                if (is_array($contentCodes) == false || count($contentCodes) === 0) {
                        return array();
                }

                $placeholders = implode(',', array_fill(0, count($contentCodes), '?'));
                $stmt = $this->getPDOContents()->prepare('SELECT id, contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, createdAt, updatedAt FROM userContents WHERE contentCode IN (' . $placeholders . ')');
                $stmt->execute($contentCodes);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $details = array();
                foreach ($rows as $row) {
                        $normalized = $this->normalizeUserContentRow($row);
                        if ($normalized !== null && isset($normalized['contentCode'])) {
                                $details[$normalized['contentCode']] = $normalized;
                        }
                }

                return $details;
        }



        private function fetchUserContentDetailsByIds($contentIds)
        {
                if (is_array($contentIds) == false || count($contentIds) === 0) {
                        return array();
                }

                $placeholders = implode(',', array_fill(0, count($contentIds), '?'));
                $stmt = $this->getPDOContents()->prepare('SELECT id, contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, createdAt, updatedAt FROM userContents WHERE id IN (' . $placeholders . ')');
                $stmt->execute(array_map('intval', $contentIds));
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $details = array();
                foreach ($rows as $row) {
                        $normalized = $this->normalizeUserContentRow($row);
                        if ($normalized !== null && isset($normalized['id'])) {
                                $details[$normalized['id']] = $normalized;
                        }
                }

                return $details;
        }



        private function fetchUserContentDetail($contentCode, $expectedUserCode = null)
        {
                if ($contentCode === null || $contentCode === '') {
                        return null;
                }

                $stmt = $this->getPDOContents()->prepare('SELECT id, contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, createdAt, updatedAt FROM userContents WHERE contentCode = ? LIMIT 1');
                $stmt->execute(array($contentCode));
                $row = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($row === false || $row === null) {
                        return null;
                }

                if ($expectedUserCode !== null && $expectedUserCode !== '' && isset($row['userCode']) && $row['userCode'] !== $expectedUserCode) {
                        return null;
                }

                return $this->normalizeUserContentRow($row);
        }



        private function fetchUserContentDetailById($contentId, $expectedUserCode = null)
        {
                if ($contentId === null) {
                        return null;
                }

                $stmt = $this->getPDOContents()->prepare('SELECT id, contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, createdAt, updatedAt FROM userContents WHERE id = ? LIMIT 1');
                $stmt->execute(array($contentId));
                $row = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($row === false || $row === null) {
                        return null;
                }

                if ($expectedUserCode !== null && $expectedUserCode !== '' && isset($row['userCode']) && $row['userCode'] !== $expectedUserCode) {
                        return null;
                }

                return $this->normalizeUserContentRow($row);
        }



        private function normalizeUserContentRow($row)
        {
                if ($row === null || $row === false) {
                        return null;
                }

                $row['id'] = array_key_exists('id', $row) && $row['id'] !== null ? (int)$row['id'] : null;
                $row['fileSize'] = array_key_exists('fileSize', $row) && $row['fileSize'] !== null ? (int)$row['fileSize'] : null;
                $row['duration'] = array_key_exists('duration', $row) && $row['duration'] !== null ? (float)$row['duration'] : null;
                $row['bitrate'] = array_key_exists('bitrate', $row) && $row['bitrate'] !== null ? (int)$row['bitrate'] : null;
                $row['width'] = array_key_exists('width', $row) && $row['width'] !== null ? (int)$row['width'] : null;
                $row['height'] = array_key_exists('height', $row) && $row['height'] !== null ? (int)$row['height'] : null;

                return $row;
        }



        private function resolveReviewContentMetadata($reviewerCode, $existingRow = array())
        {
                $contentId = isset($existingRow['contentId']) && $existingRow['contentId'] !== '' ? (int)$existingRow['contentId'] : null;
                $contentsCode = array_key_exists('contentsCode', $existingRow) ? $existingRow['contentsCode'] : null;
                $title = array_key_exists('title', $existingRow) ? $existingRow['title'] : null;
                $description = array_key_exists('description', $existingRow) ? $existingRow['description'] : null;
                $loginUserCode = $this->getLoginUserCode();

                $hasParam = false;

                $contentCodeParam = null;
                if (array_key_exists('contentCode', $this->params)) {
                        $contentCodeValue = Util::normalizeOptionalString($this->params['contentCode'], 32);
                        if ($contentCodeValue === false) {
                                return false;
                        }
                        $contentCodeParam = $contentCodeValue;
                        $hasParam = true;
                }

                if (array_key_exists('contentId', $this->params)) {
                        $contentIdValue = (int)$this->params['contentId'];
                        $contentId = $contentIdValue > 0 ? $contentIdValue : null;
                        $hasParam = true;
                }

                if (array_key_exists('contentsCode', $this->params)) {
                        $contentsCodeValue = Util::normalizeOptionalString($this->params['contentsCode'], 32);
                        if ($contentsCodeValue === false) {
                                return false;
                        }
                        $contentsCode = $contentsCodeValue;
                        $hasParam = true;
                } elseif ($contentCodeParam !== null && $contentCodeParam !== '') {
                        $contentsCode = $contentCodeParam;
                }

                if (array_key_exists('title', $this->params)) {
                        $titleValue = Util::normalizeOptionalString($this->params['title'], 256);
                        if ($titleValue === false) {
                                return false;
                        }
                        $title = $titleValue;
                        $hasParam = true;
                }

                if (array_key_exists('description', $this->params)) {
                        $descriptionValue = Util::normalizeOptionalString($this->params['description'], 4000);
                        if ($descriptionValue === false) {
                                return false;
                        }
                        $description = $descriptionValue;
                        $hasParam = true;
                }

                $contentDetail = null;

                if ($contentsCode !== null && $contentsCode !== '') {
                        $contentDetail = $this->fetchUserContentDetail($contentsCode, $reviewerCode);
                        if ($contentDetail === null && $loginUserCode !== null && $loginUserCode !== '' && $loginUserCode !== $reviewerCode) {
                                $contentDetail = $this->fetchUserContentDetail($contentsCode, $loginUserCode);
                        }
                        if ($contentDetail === null) {
                                $contentDetail = $this->fetchUserContentDetail($contentsCode);
                        }
                        if ($contentDetail === null) {
                                return false;
                        }
                        $contentId = array_key_exists('id', $contentDetail) ? $contentDetail['id'] : $contentId;
                        if ($title === null && isset($contentDetail['fileName']) && $contentDetail['fileName'] !== '') {
                                $title = $contentDetail['fileName'];
                        }
                } elseif ($contentId !== null) {
                        $contentDetail = $this->fetchUserContentDetailById($contentId, $reviewerCode);
                        if ($contentDetail === null && $loginUserCode !== null && $loginUserCode !== '' && $loginUserCode !== $reviewerCode) {
                                $contentDetail = $this->fetchUserContentDetailById($contentId, $loginUserCode);
                        }
                        if ($contentDetail === null) {
                                $contentDetail = $this->fetchUserContentDetailById($contentId);
                        }
                        if ($contentDetail === null) {
                                return false;
                        }
                        $contentsCode = array_key_exists('contentCode', $contentDetail) ? $contentDetail['contentCode'] : $contentsCode;
                        if ($title === null && isset($contentDetail['fileName']) && $contentDetail['fileName'] !== '') {
                                $title = $contentDetail['fileName'];
                        }
                } elseif ($hasParam == false) {
                        return array(
                                'contentId' => $contentId,
                                'contentsCode' => $contentsCode,
                                'title' => $title,
                                'description' => $description,
                                'contentDetail' => null,
                        );
                }

                return array(
                                         'contentId' => $contentId,
                                         'contentsCode' => $contentsCode,
                                         'title' => $title,
                                         'description' => $description,
                                         'contentDetail' => $contentDetail,
                                         );
        }



        private function buildReviewPayload($row, $videoComments, $contentDetail)
        {
                return array(
                                         'reviewCode' => $row['reviewCode'],
                                         'targetCode' => isset($row['targetCode']) ? $row['targetCode'] : null,
                                         'targetTitle' => array_key_exists('targetTitle', $row) ? $row['targetTitle'] : null,
                                         'targetDisplayName' => array_key_exists('targetDisplayName', $row) ? $row['targetDisplayName'] : null,
                                         'targetDisplayTitle' => array_key_exists('targetDisplayTitle', $row) ? $row['targetDisplayTitle'] : null,
                                         'targetLabel' => array_key_exists('targetLabel', $row) ? $row['targetLabel'] : null,
                                         'targetName' => array_key_exists('targetName', $row) ? $row['targetName'] : null,
                                         'reviewerCode' => $row['reviewerCode'],
                                         'reviewerDisplayName' => array_key_exists('reviewerDisplayName', $row) ? $row['reviewerDisplayName'] : null,
                                         'reviewedAt' => $row['reviewedAt'],
                                         'content' => isset($row['content']) ? $row['content'] : null,
                                         'privateNote' => isset($row['privateNote']) ? $row['privateNote'] : null,
                                         'contentId' => isset($row['contentId']) && $row['contentId'] !== '' ? (int)$row['contentId'] : null,
                                         'contentsCode' => array_key_exists('contentsCode', $row) ? $row['contentsCode'] : null,
                                         'title' => array_key_exists('title', $row) ? $row['title'] : null,
                                         'description' => array_key_exists('description', $row) ? $row['description'] : null,
                                         'createdAt' => $row['createdAt'],
                                         'updatedAt' => $row['updatedAt'],
                                         'videoComments' => $videoComments,
                                         'contents' => $contentDetail
                                         );
        }



	private function fetchReviewPayloadByCode($reviewCode)
	{
		

                $stmt = $this->getPDOTarget()->prepare(
                                                                                           "SELECT r.reviewCode, r.reviewerCode, r.reviewedAt, r.content, r.privateNote, r.createdAt, r.updatedAt, tr.targetCode, tr.contentId, tr.contentsCode, tr.title, tr.description, t.title AS targetTitle, t.title AS targetDisplayName, t.title AS targetDisplayTitle, t.title AS targetLabel, t.title AS targetName, u.displayName AS reviewerDisplayName " .
                                                                                           "FROM reviews r " .
                                                                                           "LEFT JOIN targetReviews tr ON r.reviewCode = tr.reviewCode " .
                                                                                           "LEFT JOIN targets t ON tr.targetCode = t.targetCode " .
                                                                                           "LEFT JOIN common.user u ON r.reviewerCode = u.userCode " .
                                                                                           "WHERE r.reviewCode = ? AND (r.isDeleted IS NULL OR r.isDeleted = 0) " .
                                                                                           "LIMIT 1"
                                                                                           );
		$stmt->execute(array($reviewCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);

		if ($row == null) {
			return null;
		}

                $comments = $this->fetchReviewVideoComments($reviewCode);

                $contentDetail = null;
                if (isset($row['contentsCode']) && $row['contentsCode'] !== '') {
                        $contentDetail = $this->fetchUserContentDetail($row['contentsCode']);
                } else {
                        $contentId = isset($row['contentId']) && $row['contentId'] !== '' ? (int)$row['contentId'] : null;
                        if ($contentId !== null) {
                                $contentDetail = $this->fetchUserContentDetailById($contentId);
                        }
                }

                return $this->buildReviewPayload($row, $comments, $contentDetail);
        }



        private function normalizeReviewVideoComments($value, $allowNull = false)
        {
                if ($value === null) {
			return $allowNull ? null : array();
		}

		if (is_string($value)) {
			$trimmed = trim($value);
			if ($trimmed === '') {
				return array();
			}
			$decoded = json_decode($trimmed, true);
			if ($decoded === null) {
				if (strtolower($trimmed) === 'null') {
					return $allowNull ? null : array();
				}
				return false;
			}
			$value = $decoded;
		}

		if (is_array($value) == false) {
			return false;
		}

                $comments = array();
                foreach ($value as $entry) {
                        if (!is_array($entry)) {
                                continue;
                        }
			$startSeconds = isset($entry['startSeconds']) ? (int)$entry['startSeconds'] : null;
			if ($startSeconds === null || $startSeconds < 0) {
				$startSeconds = 0;
                        }
                        $comment = null;
                        if (isset($entry['comment'])) {
                                $commentValue = Util::normalizeOptionalString($entry['comment'], 1024);
				if ($commentValue === false) {
					return false;
				}
                                $comment = $commentValue;
                        }
                        $sourceType = 'review';
                        if (isset($entry['sourceType'])) {
                                $candidate = strtolower(trim($entry['sourceType']));
                                if ($candidate !== '' && $candidate !== 'review') {
                                        return false;
                                }
                        }
			$contentCodeRaw = isset($entry['contentCode']) ? trim($entry['contentCode']) : '';
			if ($contentCodeRaw === '') {
				if ($allowNull) {
					continue;
				}
				return false;
			}
			$contentCode = $contentCodeRaw;
			$comments[] = array(
                                'sourceType' => $sourceType,
                                'contentCode' => $contentCode,
                                'startSeconds' => $startSeconds,
                                'comment' => $comment
								);
		}

		return $comments;
	}



}

?>
