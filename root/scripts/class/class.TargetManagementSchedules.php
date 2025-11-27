<?php

Base::requireFromShm('class/class.TargetManagementUtil.php');

class TargetManagementSchedules extends Base
{
	public function __construct($context)
	{
		parent::__construct($context);
	}
	
	private function getContentDefaultPage()
	{
		return 1;
	}

	private function getContentDefaultPerPage()
	{
		return 50;
	}

	private function getContentMaxPerPage()
	{
		return 100;
	}


	private function normalizePositiveIntParam($rawValue, $defaultValue, $minValue = 1, $maxValue = null)
	{
		$normalizedDefault = (int) $defaultValue;
		if ($normalizedDefault < $minValue) {
			$normalizedDefault = $minValue;
		}

		$value = $normalizedDefault;
		if ($rawValue !== null && $rawValue !== '') {
			$filtered = filter_var(
								   $rawValue,
								   FILTER_VALIDATE_INT,
								   array('options' => array('min_range' => $minValue))
								   );
			if ($filtered !== false && $filtered !== null) {
				$value = (int) $filtered;
			}
		}

		if ($value < $minValue) {
			$value = $minValue;
		}

		if ($maxValue !== null && $maxValue !== '' && $value > $maxValue) {
			$value = (int) $maxValue;
		}

		return (int) $value;
	}


	protected function validationTargetScheduleList()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetScheduleContentList()
	{
	}



	protected function validationTargetScheduleCreate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	protected function validationTargetScheduleUpdate()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['materialCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}


	protected function validationTargetScheduleDelete()
	{
		if (isset($this->params['targetCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
		if (isset($this->params['materialCode']) == false) { throw new Exception(__FILE__ . ":" . __LINE__); }
	}



	public function procTargetScheduleList()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		
                $materials = TargetManagementUtil::fetchTargetScheduleMaterials($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getPDOContents(), $this->siteId);
                $this->response = array('materials' => $materials);
        }



	public function procTargetScheduleCreate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$titleValue = Util::normalizeRequiredString($this->params['title'], 256);
		if ($titleValue === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
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

                $startDate = null;
                if (isset($this->params['startDate'])) {
                        $startDateCandidate = Util::normalizeDate($this->params['startDate']);
                        if ($startDateCandidate === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $startDate = $startDateCandidate;
                }

                $endDate = null;
                if (isset($this->params['endDate'])) {
                        $endDateCandidate = Util::normalizeDate($this->params['endDate']);
                        if ($endDateCandidate === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $endDate = $endDateCandidate;
                }

                if ($startDate !== null && $endDate !== null && strcmp($startDate, $endDate) > 0) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $category = null;
                if (isset($this->params['category'])) {
                        $category = trim((string) $this->params['category']);
                        if ($category === '') {
                                $category = null;
                        }
                }

		$linkUrl = null;
		if (isset($this->params['linkUrl'])) {
			try {
				$linkValue = Util::normalizeOptionalUrl($this->params['linkUrl'], 512);
			} catch (UrlNormalizationException $exception) {
				$rawLink = (string)$this->params['linkUrl'];
				$sanitizedLink = str_replace(array("\r", "\n"), ' ', $rawLink);
				if (function_exists('mb_substr')) {
					$sanitizedLink = mb_substr($sanitizedLink, 0, 512);
				} else {
					$sanitizedLink = substr($sanitizedLink, 0, 512);
				}
				Base::writeLog(sprintf('[TargetManagementSchedules] URL normalization failed (target:%s link:%s reason:%s)', $targetCode, $sanitizedLink, $exception->getMessage()), 'target-management');
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$linkUrl = $linkValue;
		}

                $ownerCode = $this->getLoginUserCode();
                if (($this->isSupervisor() || $this->isOperator()) && array_key_exists('ownerUserCode', $this->params)) {
                        $ownerUserCodeValue = Util::normalizeOptionalString($this->params['ownerUserCode'], 64);
                        if ($ownerUserCodeValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        if ($ownerUserCodeValue !== null && $ownerUserCodeValue !== '') {
                                $ownerCode = $ownerUserCodeValue;
                        }
                }

                $contentEntry = null;
                if (isset($this->params['contentCode'])) {
                        $rawContentCode = trim($this->params['contentCode']);
                        if ($rawContentCode !== '') {
				if (preg_match('/^[A-Za-z0-9]+$/', $rawContentCode) == false) {
					$this->status = parent::RESULT_ERROR;
					$this->errorReason = 'invalid';
					return;
				}

				
				$contentEntry = $this->fetchContentEntryRow($rawContentCode);
				if ($contentEntry == null) {
					$this->status = parent::RESULT_ERROR;
					$this->errorReason = 'notfound';
					return;
				}

				$entryOwner = isset($contentEntry['userCode']) ? $contentEntry['userCode'] : null;
				if ($entryOwner !== null && $entryOwner !== '' && $ownerCode !== null && $ownerCode !== '' && $entryOwner !== $ownerCode) {
					$this->status = parent::RESULT_ERROR;
					$this->errorReason = 'forbidden';
					return;
				}
			}
		}

		if (($linkUrl === null || $linkUrl === '') && $contentEntry === null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'nocontent';
			return;
		}

		$contentType = null;
		$contentCode = null;
		$fileName = null;
		$fileSize = null;
		if ($contentEntry !== null) {
			$contentCode = $contentEntry['contentCode'];
			if ($category === null) {
				$contentType = isset($contentEntry['contentType']) ? $contentEntry['contentType'] : null;
				$category = $this->mapContentTypeToCategory($contentType);
			}
			if ($fileName === null && isset($contentEntry['fileName'])) {
				$fileName = $contentEntry['fileName'];
			}
			if ($fileSize === null && isset($contentEntry['fileSize'])) {
				$fileSize = (int)$contentEntry['fileSize'];
			}
			if ($contentType === null && isset($contentEntry['contentType'])) {
				$contentType = $contentEntry['contentType'];
			}
		}

                $now = new DateTime('now');
                $timestamp = $now->format('Y-m-d H:i:s');
                $materialCode = $this->generateUniqid();


                // Schedule material records themselves live in the target database,
                // so inserts/updates must go through the target connection.
                $pdo = $this->getPDOTarget();

		try {
			$pdo->beginTransaction();

                        $stmt = $pdo->prepare(
                                                                  'INSERT INTO targetScheduleMaterials (materialCode, targetCode, contentCode, title, description, startDate, endDate, category, linkUrl, downloadUrl, fileName, fileSize, ownerUserCode, createdAt, updatedAt, displayOrder, isDeleted) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)'
                                                                  );
                        $stmt->execute(array(
                                                                 $materialCode,
                                                                 $targetCode,
                                                                 $contentCode,
                                                                 $titleValue,
                                                                 $description,
                                                                 $startDate,
                                                                 $endDate,
                                                                 $category,
                                                                 $linkUrl,
                                                                 null,
                                                                 $fileName,
                                                                 $fileSize,
								 $ownerCode,
								 $timestamp,
								 $timestamp
								 ));

			if ($contentEntry != null) {
				$stmt = $pdo->prepare(
									  'INSERT INTO targetScheduleMaterialContents (materialCode, contentCode, contentType, createdAt) VALUES(?, ?, ?, ?)'
									  );
				$stmt->execute(array(
									 $materialCode,
									 $contentEntry['contentCode'],
									 isset($contentEntry['contentType']) ? $contentEntry['contentType'] : null,
									 $timestamp
									 ));
			}

			$pdo->commit();

			$material = $this->fetchScheduleMaterialByCode($materialCode);
			$this->response = array('material' => $material);
		} catch (Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			throw $error;
		}
	}




	public function procTargetScheduleUpdate()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$materialCode = htmlspecialchars($this->params['materialCode'], ENT_QUOTES, "UTF-8");

		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$material = $this->fetchScheduleMaterialByCode($materialCode);
		if ($material == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$materialTargetCode = isset($material['targetCode']) ? trim($material['targetCode']) : '';
		if ($materialTargetCode !== '' && $materialTargetCode !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$titleValue = Util::normalizeRequiredString(isset($this->params['title']) ? $this->params['title'] : (isset($material['title']) ? $material['title'] : ''), 256);
		if ($titleValue === false) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid';
			return;
		}

                $description = null;
                if (array_key_exists('description', $this->params)) {
                        $descriptionValue = Util::normalizeOptionalString($this->params['description'], 2048);
                        if ($descriptionValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $description = $descriptionValue;
                } else if (isset($material['description'])) {
                        $description = $material['description'];
                }

                $startDate = null;
                if (array_key_exists('startDate', $this->params)) {
                        $startDateValue = Util::normalizeDate($this->params['startDate']);
                        if ($startDateValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $startDate = $startDateValue;
                } else if (isset($material['startDate'])) {
                        $startDate = $material['startDate'];
                }

                $endDate = null;
                if (array_key_exists('endDate', $this->params)) {
                        $endDateValue = Util::normalizeDate($this->params['endDate']);
                        if ($endDateValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        $endDate = $endDateValue;
                } else if (isset($material['endDate'])) {
                        $endDate = $material['endDate'];
                }

                if ($startDate !== null && $endDate !== null && strcmp($startDate, $endDate) > 0) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'invalid';
                        return;
                }

                $category = null;
                if (array_key_exists('category', $this->params)) {
                        $category = trim((string) $this->params['category']);
                        if ($category === '') {
                                $category = null;
			}
		} else if (isset($material['category'])) {
			$category = $material['category'];
		}

		$linkUrl = null;
		if (array_key_exists('linkUrl', $this->params)) {
			try {
				$linkValue = Util::normalizeOptionalUrl($this->params['linkUrl'], 512);
			} catch (UrlNormalizationException $exception) {
				$rawLink = (string)$this->params['linkUrl'];
				$sanitizedLink = str_replace(array("\r", "\n"), ' ', $rawLink);
				if (function_exists('mb_substr')) {
					$sanitizedLink = mb_substr($sanitizedLink, 0, 512);
				} else {
					$sanitizedLink = substr($sanitizedLink, 0, 512);
				}
				Base::writeLog(sprintf('[TargetManagementSchedules] URL normalization failed (target:%s link:%s reason:%s)', $targetCode, $sanitizedLink, $exception->getMessage()), 'target-management');
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$linkUrl = $linkValue;
		} else if (isset($material['linkUrl'])) {
			$linkUrl = trim((string) $material['linkUrl']);
		}

                $ownerCode = $this->getLoginUserCode();
                if (($this->isSupervisor() || $this->isOperator()) && array_key_exists('ownerUserCode', $this->params)) {
                        $ownerUserCodeValue = Util::normalizeOptionalString($this->params['ownerUserCode'], 64);
                        if ($ownerUserCodeValue === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid';
                                return;
                        }
                        if ($ownerUserCodeValue !== null && $ownerUserCodeValue !== '') {
                                $ownerCode = $ownerUserCodeValue;
                        }
                }
                if (($ownerCode === null || $ownerCode === '') && isset($material['ownerUserCode'])) {
                        $ownerCode = $material['ownerUserCode'];
                }

		$contentEntry = null;
		if (isset($this->params['contentCode'])) {
			$rawContentCode = trim($this->params['contentCode']);
			if ($rawContentCode !== '') {
				if (preg_match('/^[A-Za-z0-9]+$/', $rawContentCode) == false) {
					$this->status = parent::RESULT_ERROR;
					$this->errorReason = 'invalid';
					return;
				}


				$contentEntry = $this->fetchContentEntryRow($rawContentCode);
				if ($contentEntry == null) {
					$this->status = parent::RESULT_ERROR;
					$this->errorReason = 'notfound';
					return;
				}

				$entryOwner = isset($contentEntry['userCode']) ? $contentEntry['userCode'] : null;
				if ($entryOwner !== null && $entryOwner !== '' && $ownerCode !== null && $ownerCode !== '' && $entryOwner !== $ownerCode) {
					$this->status = parent::RESULT_ERROR;
					$this->errorReason = 'forbidden';
					return;
				}
			}
		}

		$contentCode = isset($material['contentCode']) ? $material['contentCode'] : null;
		$contentType = isset($material['contentType']) ? $material['contentType'] : null;
		$fileName = isset($material['fileName']) ? $material['fileName'] : null;
		$fileSize = isset($material['fileSize']) ? (int)$material['fileSize'] : null;
		$downloadUrl = isset($material['downloadUrl']) ? $material['downloadUrl'] : null;

		if ($contentEntry !== null) {
			$contentCode = $contentEntry['contentCode'];
			if ($category === null) {
				$contentType = isset($contentEntry['contentType']) ? $contentEntry['contentType'] : null;
				$category = $this->mapContentTypeToCategory($contentType);
			}
			if (isset($contentEntry['fileName'])) {
				$fileName = $contentEntry['fileName'];
			}
			if (isset($contentEntry['fileSize'])) {
				$fileSize = (int)$contentEntry['fileSize'];
			}
			if ($contentType === null && isset($contentEntry['contentType'])) {
				$contentType = $contentEntry['contentType'];
			}
		}

		if (($linkUrl === null || $linkUrl === '') && ($contentCode === null || $contentCode === '')) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'nocontent';
			return;
		}

		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		$pdo = $this->getPDOTarget();
                try {
                        $pdo->beginTransaction();

                        $stmt = $pdo->prepare('UPDATE targetScheduleMaterials SET contentCode = ?, title = ?, description = ?, startDate = ?, endDate = ?, category = ?, linkUrl = ?, downloadUrl = ?, fileName = ?, fileSize = ?, ownerUserCode = ?, updatedAt = ? WHERE materialCode = ? AND targetCode = ?');
                        $stmt->execute(array(
                                $contentCode,
                                $titleValue,
                                $description,
                                $startDate,
                                $endDate,
                                $category,
                                $linkUrl,
                                $downloadUrl,
				$fileName,
				$fileSize,
				$ownerCode,
				$timestamp,
				$materialCode,
				$targetCode
			));

			$stmt = $pdo->prepare('DELETE FROM targetScheduleMaterialContents WHERE materialCode = ?');
			$stmt->execute(array($materialCode));

			if ($contentCode !== null && $contentCode !== '') {
				$stmt = $pdo->prepare('INSERT INTO targetScheduleMaterialContents (materialCode, contentCode, contentType, createdAt) VALUES(?, ?, ?, ?)');
				$stmt->execute(array(
					$materialCode,
					$contentCode,
					$contentType,
					$timestamp
				));
			}

			$pdo->commit();
		} catch (Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			throw $error;
		}

		$updatedMaterial = $this->fetchScheduleMaterialByCode($materialCode);
		if ($updatedMaterial == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$this->response = array('material' => $updatedMaterial);
	}


	public function procTargetScheduleContentList()
	{
		$pageRaw = $this->getSafeParam('page', '');
		$perPageRaw = $this->getSafeParam('perPage', '');

		$page = $this->normalizePositiveIntParam(
												 $pageRaw,
												 $this->getContentDefaultPage(),
												 1,
												 null
												 );

		$perPage = $this->normalizePositiveIntParam(
													$perPageRaw,
													$this->getContentDefaultPerPage(),
													1,
													$this->getContentMaxPerPage()
													);

		$offset = ($page - 1) * $perPage;
		if ($offset < 0) {
			$offset = 0;
		}

		$pagination = array(
							'page' => $page,
							'perPage' => $perPage,
							'totalItems' => 0,
							'totalPages' => 0,
							'hasMore' => false,
							);

		$ownerCode = $this->getLoginUserCode();
		if ($ownerCode === null || $ownerCode === '') {
			$this->response = array('contents' => array(), 'pagination' => $pagination);
			return;
		}

		$keyword = '';
		$keywordPattern = null;
		if (isset($this->params['keyword'])) {
			$rawKeyword = trim($this->params['keyword']);
			if (mb_strlen($rawKeyword) > 256) {
				$this->status = parent::RESULT_ERROR;
				$this->errorReason = 'invalid';
				return;
			}
			$keyword = $rawKeyword;
			if ($keyword !== '') {
				if (function_exists('mb_strtolower')) {
					$keywordLower = mb_strtolower($keyword, 'UTF-8');
				} else {
					$keywordLower = strtolower($keyword);
				}
				$keywordPattern = '%' . $keywordLower . '%';
			}
		}

                $categoryFilter = '';
                $contentTypeFilter = null;
                if (isset($this->params['category'])) {
                        $candidate = trim((string) $this->params['category']);
                        if ($candidate !== '') {
                                $categoryFilter = $candidate;
                                $contentTypeFilter = $this->mapCategoryToContentType($categoryFilter);
                        }
                }


                // user-generated contents live in the contents DB. Use that connection to
                // allow content picker queries to see newly uploaded files.
                $pdo = $this->getPDOContents();

		$whereClauses = array('(ucp.userCode = ?)');
		$whereParams = array($ownerCode);

		$filterClauses = array();
		$filterParams = array();
		if ($contentTypeFilter !== null && $contentTypeFilter !== '') {
			$filterClauses[] = 'ucp.contentType = ?';
			$filterParams[] = $contentTypeFilter;
		}
		if ($keywordPattern !== null) {
			$filterClauses[] = '('
				. 'LOWER(ucp.fileName) LIKE ?'
				. ' OR LOWER(ucp.contentCode) LIKE ?'
				. ' OR LOWER(COALESCE(u.displayName, \'\')) LIKE ?'
				. ')';
			$filterParams[] = $keywordPattern;
			$filterParams[] = $keywordPattern;
			$filterParams[] = $keywordPattern;
		}

		$whereSql = '(' . implode(' OR ', $whereClauses) . ')';
		if (count($filterClauses) > 0) {
			$whereSql .= ' AND ' . implode(' AND ', $filterClauses);
		}

                $baseSql =
                        ' FROM userContents ucp '
                        . 'LEFT JOIN userContentClipBookmarks ccb ON ccb.contentCode = ucp.contentCode AND ccb.userCode = ? '
                        . 'LEFT JOIN common.user u ON ucp.userCode = u.userCode '
                        . 'WHERE ' . $whereSql;

		$countSql = 'SELECT COUNT(*) AS recordCount' . $baseSql;
		$countParams = array_merge(array($ownerCode), $whereParams, $filterParams);
		$countStmt = $pdo->prepare($countSql);
		$countStmt->execute($countParams);
		$countRow = $countStmt->fetch(PDO::FETCH_ASSOC);
		$totalItems = 0;
		if ($countRow != null && isset($countRow['recordCount'])) {
			$totalItems = (int) $countRow['recordCount'];
			if ($totalItems < 0) {
				$totalItems = 0;
			}
		}

		$selectSql =
			' SELECT ucp.contentCode, ucp.userCode, ucp.contentType, ucp.fileName, ucp.filePath, ucp.mimeType, '
			. 'ucp.fileSize, ucp.createdAt, ucp.updatedAt, u.displayName AS ownerDisplayName, '
			. 'ccb.clipTimes AS clipTimesJson, ccb.updatedAt AS clipUpdatedAt'
			. $baseSql
			. ' ORDER BY COALESCE(ucp.updatedAt, ucp.createdAt) DESC, ucp.contentCode ASC'
			. ' LIMIT ? OFFSET ?';

		$selectParams = array_merge($countParams, array($perPage, $offset));
		$stmt = $pdo->prepare($selectSql);
		$stmt->execute($selectParams);

		$materials = array();
		$seenCodes = array();
		while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
			if ($row == null) {
				continue;
			}
			$codeKey = isset($row['contentCode']) ? trim((string) $row['contentCode']) : '';
			if ($codeKey !== '' && array_key_exists($codeKey, $seenCodes)) {
				continue;
			}
			$payload = $this->buildContentMaterialPayload($row);
			if ($payload == null) {
				continue;
			}
			if ($categoryFilter !== '' && isset($payload['category']) && $payload['category'] !== $categoryFilter) {
				continue;
			}
			if ($keyword !== '') {
				$searchTargets = array(
									   isset($payload['title']) ? $payload['title'] : '',
									   isset($payload['fileName']) ? $payload['fileName'] : '',
									   isset($payload['ownerDisplayName']) ? $payload['ownerDisplayName'] : '',
									   isset($payload['contentCode']) ? $payload['contentCode'] : '',
									   );
				$matched = false;
				foreach ($searchTargets as $target) {
					if ($target === null || $target === '') {
						continue;
					}
					if (mb_stripos($target, $keyword) !== false) {
						$matched = true;
						break;
					}
				}
				if ($matched === false) {
					continue;
				}
			}
			$materials[] = $payload;
			if ($codeKey !== '') {
				$seenCodes[$codeKey] = true;
			}
		}

		usort($materials, function ($a, $b) {
				$aTime = isset($a['updatedAt']) && $a['updatedAt'] !== '' ? $a['updatedAt'] : (isset($a['uploadedAt']) ? $a['uploadedAt'] : null);
				$bTime = isset($b['updatedAt']) && $b['updatedAt'] !== '' ? $b['updatedAt'] : (isset($b['uploadedAt']) ? $b['uploadedAt'] : null);
				$aValue = $aTime !== null ? strtotime($aTime) : 0;
				$bValue = $bTime !== null ? strtotime($bTime) : 0;
				if ($aValue === $bValue) {
					$aCode = isset($a['contentCode']) ? $a['contentCode'] : '';
					$bCode = isset($b['contentCode']) ? $b['contentCode'] : '';
					return strcmp($aCode, $bCode);
				}
				return $aValue < $bValue ? 1 : -1;
			});

		$totalPages = $perPage > 0 ? (int) ceil($totalItems / $perPage) : 0;
		if ($totalItems === 0) {
			$totalPages = 0;
		}
		$hasMore = ($page * $perPage) < $totalItems;
		$pagination['totalItems'] = $totalItems;
		$pagination['totalPages'] = $totalPages;
		$pagination['hasMore'] = $hasMore;

		$this->response = array('contents' => $materials, 'pagination' => $pagination);
	}



	public function procTargetScheduleDelete()
	{
		$targetCode = htmlspecialchars($this->params['targetCode'], ENT_QUOTES, "UTF-8");
		$materialCode = htmlspecialchars($this->params['materialCode'], ENT_QUOTES, "UTF-8");

		$targetRow = TargetManagementUtil::fetchActiveTargetByCode($targetCode, $this->getLoginUserCode(), $this->getPDOTarget(), $this->getUserInfo($this->getLoginUserCode()), $this->getPDOCommon());
		if ($targetRow == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		
		$material = $this->fetchScheduleMaterialByCode($materialCode);
		if ($material == null) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$materialTargetCode = isset($material['targetCode']) ? trim($material['targetCode']) : '';
		if ($materialTargetCode !== '' && $materialTargetCode !== $targetCode) {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'notfound';
			return;
		}

		$pdo = $this->getPDOTarget();
		$now = new DateTime('now');
		$timestamp = $now->format('Y-m-d H:i:s');

		try {
			$pdo->beginTransaction();

			$stmt = $pdo->prepare('UPDATE targetScheduleMaterials SET isDeleted = 1, updatedAt = ? WHERE materialCode = ? AND targetCode = ?');
			$stmt->execute(array($timestamp, $materialCode, $targetCode));

			$stmt = $pdo->prepare('DELETE FROM targetScheduleMaterialContents WHERE materialCode = ?');
			$stmt->execute(array($materialCode));

			$pdo->commit();
		} catch (\Exception $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'failed';
			return;
		}

		$this->response = array('materialCode' => $materialCode);
	}

	private function fetchScheduleMaterialByCode($materialCode)
	{
		if ($materialCode === null || $materialCode === '') {
			return null;
		}

		$stmt = $this->getPDOTarget()->prepare(
											   'SELECT m.*, u.displayName AS ownerDisplayName FROM targetScheduleMaterials m '
											   . 'LEFT JOIN common.user u ON m.ownerUserCode = u.userCode '
											   . 'WHERE m.materialCode = ? AND (m.isDeleted IS NULL OR m.isDeleted = 0) LIMIT 1'
											   );
		$stmt->execute(array($materialCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row == null) {
			return null;
		}

                $materials = TargetManagementUtil::buildScheduleMaterialCollection(array($row), $this->getLoginUserCode(), $this->getPDOTarget(), $this->getPDOContents(), $this->siteId);
		if (count($materials) > 0) {
			return $materials[0];
		}

		return null;
	}

	private function fetchContentEntryRow($contentCode)
	{
		if ($contentCode === null || $contentCode === '') {
			return null;
		}

		$clipUserCode = $this->getLoginUserCode();
		if ($clipUserCode === null) {
			$clipUserCode = '';
		}

                $stmt = $this->getPDOContents()->prepare(
                                                                                            'SELECT ucp.contentCode, ucp.userCode, ucp.contentType, ucp.fileName, ucp.filePath, ucp.mimeType, '
                                                                                            . 'ucp.fileSize, ucp.createdAt, ucp.updatedAt, u.displayName AS ownerDisplayName, '
                                                                                            . 'ccb.clipTimes AS clipTimesJson, ccb.updatedAt AS clipUpdatedAt '
                                                                                           . 'FROM userContents ucp '
                                                                                           . 'LEFT JOIN userContentClipBookmarks ccb ON ccb.contentCode = ucp.contentCode AND ccb.userCode = ? '
                                                                                           . 'LEFT JOIN common.user u ON ucp.userCode = u.userCode '
                                                                                           . 'WHERE ucp.contentCode = ? LIMIT 1'
                                                                                           );
		if ($stmt === false) {
			return null;
		}
		$stmt->execute(array($clipUserCode, $contentCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row == null) {
			return null;
		}
		return $row;
	}



	private function buildContentMaterialPayload($row)
	{
		if ($row == null) {
			return null;
		}

		$contentCode = isset($row['contentCode']) ? trim($row['contentCode']) : '';
		if ($contentCode === '') {
			return null;
		}

		$materialRow = array(
							 'materialCode' => $contentCode,
							 'targetCode' => null,
							 'contentCode' => $contentCode,
							 'title' => isset($row['fileName']) ? $row['fileName'] : $contentCode,
							 'description' => null,
							 'category' => isset($row['contentType']) ? $this->mapContentTypeToCategory($row['contentType']) : null,
							 'linkUrl' => null,
							 'downloadUrl' => null,
							 'fileName' => isset($row['fileName']) ? $row['fileName'] : null,
							 'fileSize' => isset($row['fileSize']) ? $row['fileSize'] : null,
							 'ownerUserCode' => isset($row['userCode']) ? $row['userCode'] : null,
							 'ownerDisplayName' => isset($row['ownerDisplayName']) ? $row['ownerDisplayName'] : null,
							 'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
							 'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
							 'clipTimesJson' => isset($row['clipTimesJson']) ? $row['clipTimesJson'] : null,
							 'clipUpdatedAt' => isset($row['clipUpdatedAt']) ? $row['clipUpdatedAt'] : null,
							 );

		$contentRow = array(
							'contentCode' => $contentCode,
							'contentType' => isset($row['contentType']) ? $row['contentType'] : null,
							'fileName' => isset($row['fileName']) ? $row['fileName'] : null,
							'filePath' => isset($row['filePath']) ? $row['filePath'] : null,
							'mimeType' => isset($row['mimeType']) ? $row['mimeType'] : null,
							'fileSize' => isset($row['fileSize']) ? $row['fileSize'] : null,
							'clipTimesJson' => isset($row['clipTimesJson']) ? $row['clipTimesJson'] : null,
							'clipUpdatedAt' => isset($row['clipUpdatedAt']) ? $row['clipUpdatedAt'] : null,
							);

                $payload = TargetManagementUtil::buildScheduleMaterialPayload($materialRow, $this->siteId, $contentRow);
		if ($payload != null) {
			$payload['source'] = 'contents';
		}
		return $payload;
	}







	private function mapCategoryToContentType($category)
	{
		switch ($category) {
		case 'video':
			return 'video';
		case 'image':
			return 'image';
		case 'audio':
			return 'audio';
		default:
			return 'file';
		}
	}



	private function mapContentTypeToCategory($contentType)
	{
		switch ($contentType) {
		case 'video':
			return 'video';
		case 'image':
			return 'image';
		case 'audio':
			return 'audio';
		default:
			return 'document';
		}
	}
}

?>
