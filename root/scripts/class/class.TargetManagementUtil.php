<?php

class TargetManagementUtil
{
	//
	// Reference
	//
        public static function fetchTargetReferenceMaterials($targetCode, $userCode, $pdoTarget, $pdoContents, $siteId)
        {
                if ($targetCode === null || $targetCode === '') {
                        return array();
                }

		$stmt = $pdoTarget->prepare(
									'SELECT m.*, u.displayName AS ownerDisplayName FROM targetReferenceMaterials m '
									. 'LEFT JOIN common.user u ON m.ownerUserCode = u.userCode '
                                                                        . 'WHERE m.targetCode = ? AND (m.isDeleted IS NULL OR m.isDeleted = 0) '
                                                                        . 'ORDER BY m.displayOrder ASC, m.updatedAt DESC, m.createdAt DESC, m.id DESC'
                                                                        );
                $stmt->execute(array($targetCode));
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                return TargetManagementUtil::buildReferenceMaterialCollection($rows, $userCode, $pdoTarget, $pdoContents, $siteId);
        }

        public static function buildReferenceMaterialCollection($rows, $userCode, $pdoTarget, $pdoContents, $siteId)
        {
                if (!is_array($rows) || count($rows) === 0) {
                        return array();
                }

		$materialCodes = array();
		foreach ($rows as $row) {
			if ($row == null) {
				continue;
			}
			$code = isset($row['materialCode']) ? $row['materialCode'] : null;
			if ($code === null || $code === '') {
				continue;
			}
			if (in_array($code, $materialCodes, true) == false) {
				$materialCodes[] = $code;
			}
		}

                $contentMap = TargetManagementUtil::fetchReferenceContentsForMaterials($materialCodes, $userCode, $pdoTarget, $pdoContents);
                $materials = array();

		foreach ($rows as $row) {
			if ($row == null) {
				continue;
			}
			$code = isset($row['materialCode']) ? $row['materialCode'] : null;
                        if ($code === null || $code === '') {
                                continue;
                        }
                        $contentRow = array_key_exists($code, $contentMap) ? $contentMap[$code] : null;
                        $materials[] = TargetManagementUtil::buildReferenceMaterialPayload($row, $siteId, $contentRow);
                }

                return $materials;
        }

        public static function fetchReferenceContentsForMaterials($materialCodes, $clipUserCode, $pdoTarget, $pdoContents)
        {
                $map = array();

		if (!is_array($materialCodes) || count($materialCodes) === 0) {
			return $map;
		}

		$codes = array();
		foreach ($materialCodes as $code) {
			if ($code === null || $code === '') {
				continue;
			}
			if (in_array($code, $codes, true) == false) {
				$codes[] = $code;
			}
		}

		if (count($codes) === 0) {
			return $map;
		}

		$placeholders = implode(', ', array_fill(0, count($codes), '?'));

                $stmt = $pdoTarget->prepare(
                                                                        'SELECT materialCode, contentCode, contentType, createdAt '
                                                                        . 'FROM targetReferenceMaterialContents '
                                                                        . 'WHERE materialCode IN (' . $placeholders . ') ORDER BY id ASC'
                                                                        );
                if ($stmt === false) {
                        return $map;
                }
                $stmt->execute($codes);
                $contentRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if ($clipUserCode === null) {
                        $clipUserCode = '';
                }

                $contentCodes = array();
                foreach ($contentRows as $row) {
                        if ($row == null || !isset($row['contentCode'])) {
                                continue;
                        }
                        $code = trim($row['contentCode']);
                        if ($code === '') {
                                continue;
                        }
                        if (in_array($code, $contentCodes, true) == false) {
                                $contentCodes[] = $code;
                        }
                }

                $contentDetails = array();
                if ($pdoContents !== null && count($contentCodes) > 0) {
                        $contentPlaceholders = implode(', ', array_fill(0, count($contentCodes), '?'));
                        $contentStmt = $pdoContents->prepare(
                                                                                                'SELECT ucp.contentCode, ucp.contentType, ucp.fileName, ucp.filePath, ucp.mimeType, '
                                                                                                . 'ucp.fileSize, ucp.userCode, '
                                                                                                . 'ucp.bitrate, '
                                                                                                . 'ccb.clipTimes AS clipTimesJson, ccb.updatedAt AS clipUpdatedAt '
                                                                                                . 'FROM userContents ucp '
                                                                                                . 'LEFT JOIN userContentClipBookmarks ccb ON ccb.contentCode = ucp.contentCode AND ccb.userCode = ? '
                                                                                                . 'WHERE ucp.contentCode IN (' . $contentPlaceholders . ')'
                                                                                                );
                        if ($contentStmt !== false) {
                                $params = array_merge(array($clipUserCode), $contentCodes);
                                $contentStmt->execute($params);

                                while ($contentRow = $contentStmt->fetch(PDO::FETCH_ASSOC)) {
                                        $contentCode = isset($contentRow['contentCode']) ? trim($contentRow['contentCode']) : '';
                                        if ($contentCode === '') {
                                                continue;
                                        }
                                        if (array_key_exists($contentCode, $contentDetails) == false) {
                                                $contentDetails[$contentCode] = $contentRow;
                                        }
                                }
                        }
                }

                foreach ($contentRows as $row) {
                        $materialCode = isset($row['materialCode']) ? $row['materialCode'] : null;
                        if ($materialCode === null || $materialCode === '') {
                                continue;
                        }
                        if (array_key_exists($materialCode, $map)) {
                                continue;
                        }

                        $contentCode = isset($row['contentCode']) ? trim($row['contentCode']) : '';
                        if ($contentCode !== '' && array_key_exists($contentCode, $contentDetails)) {
                                $map[$materialCode] = array_merge($row, $contentDetails[$contentCode]);
                        } else {
                                $map[$materialCode] = $row;
                        }
                }

                return $map;
        }

        public static function buildReferenceMaterialPayload($row, $siteId, $contentRow = null)
        {
                if ($row == null) {
                        return null;
                }

		$materialCode = isset($row['materialCode']) ? $row['materialCode'] : null;
		if ($materialCode === null || $materialCode === '') {
			return null;
		}

                $category = isset($row['category']) ? $row['category'] : null;
                $startDate = isset($row['startDate']) ? trim((string) $row['startDate']) : null;
                $endDate = isset($row['endDate']) ? trim((string) $row['endDate']) : null;
                $linkUrl = isset($row['linkUrl']) ? trim($row['linkUrl']) : '';
                $downloadUrl = isset($row['downloadUrl']) ? trim($row['downloadUrl']) : '';
                $fileName = isset($row['fileName']) ? $row['fileName'] : null;
                $fileSize = isset($row['fileSize']) ? $row['fileSize'] : null;
                $bitrate = null;
                $contentCode = isset($row['contentCode']) ? $row['contentCode'] : null;
                $contentType = null;
                $filePath = null;
                $mimeType = null;
                $storageFileName = null;

		if ($contentRow != null) {
			if (isset($contentRow['contentCode']) && $contentRow['contentCode'] !== '') {
				$contentCode = $contentRow['contentCode'];
                        }
                        if (isset($contentRow['contentType']) && $contentRow['contentType'] !== '') {
                                $contentType = $contentRow['contentType'];
                        }
                        if (($category === null || $category === '' || $category === 'other') && $contentType !== null) {
                                $category = TargetManagementUtil::mapContentTypeToCategory($contentType);
                        }
                        if (($fileName === null || $fileName === '') && isset($contentRow['fileName'])) {
                                $fileName = $contentRow['fileName'];
                        }
                        if ($fileSize === null && isset($contentRow['fileSize'])) {
                                $fileSize = $contentRow['fileSize'];
                        }
                        if (isset($contentRow['bitrate'])) {
                                $bitrate = $contentRow['bitrate'];
                        }
                        $filePath = isset($contentRow['filePath']) ? $contentRow['filePath'] : null;
                        $mimeType = isset($contentRow['mimeType']) ? $contentRow['mimeType'] : null;
                        $storageFileName = Util::extractStoredFileName($filePath);
                }

		if ($linkUrl === null) {
			$linkUrl = '';
		}

		if ($downloadUrl === null || $downloadUrl === '') {
			$downloadUrl = $linkUrl;
		}

                if ($fileSize !== null) {
                        $fileSize = (int)$fileSize;
                }

                if ($bitrate !== null) {
                        $bitrate = (int)$bitrate;
                }

                $previewImage = isset($row['previewImage']) ? $row['previewImage'] : null;
                $siteId = isset($siteId) ? trim($siteId) : '';
                $normalizedCategory = strtolower((string) $category);
                $isVideoContent = ($normalizedCategory === 'video');
		if ($isVideoContent === false) {
			$normalizedContentType = strtolower((string) $contentType);
			if ($normalizedContentType === 'video' || strpos($normalizedContentType, 'video/') === 0) {
				$isVideoContent = true;
			}
		}
		if ($isVideoContent === false) {
			$extensionSource = $storageFileName !== null ? $storageFileName : $fileName;
			$extension = strtolower((string) pathinfo((string) $extensionSource, PATHINFO_EXTENSION));
			if (Util::isVideoFile((string) $mimeType, $extension)) {
				$isVideoContent = true;
			}
		}
		$clipTimesPayload = array();
		$clipTimesUpdatedAt = null;
		$clipSource = null;
		if ($contentRow != null && isset($contentRow['clipTimesJson']) && $contentRow['clipTimesJson'] !== null) {
			$clipSource = $contentRow;
		} elseif ($row != null && isset($row['clipTimesJson']) && $row['clipTimesJson'] !== null) {
			$clipSource = $row;
		}

		if ($clipSource != null) {
			$rawClips = isset($clipSource['clipTimesJson']) ? $clipSource['clipTimesJson'] : null;
			if ($rawClips !== null && $rawClips !== '') {
				$normalizedClips = $this->normalizeClipTimeList($rawClips);
				if (is_array($normalizedClips) && !empty($normalizedClips)) {
					$clipTimesPayload = array_map(static function ($value) {
							return round((float) $value, 3);
						}, $normalizedClips);
				}
			}
			if (isset($clipSource['clipUpdatedAt']) && $clipSource['clipUpdatedAt'] !== null && $clipSource['clipUpdatedAt'] !== '') {
				$clipTimesUpdatedAt = trim((string) $clipSource['clipUpdatedAt']);
			} elseif (isset($clipSource['updatedAt']) && $clipSource['updatedAt'] !== null && $clipSource['updatedAt'] !== '') {
				$clipTimesUpdatedAt = trim((string) $clipSource['updatedAt']);
			}
		}

		return array(
					 'materialCode' => $materialCode,
					 'targetCode' => isset($row['targetCode']) ? $row['targetCode'] : null,
					 'title' => isset($row['title']) ? $row['title'] : null,
                                         'description' => isset($row['description']) ? $row['description'] : null,
                                         'startDate' => $startDate,
                                         'endDate' => $endDate,
                                         'category' => $category,
                                         'linkUrl' => $linkUrl,
                                         'downloadUrl' => $downloadUrl,
					 'previewImage' => $previewImage,
                                         'fileName' => $fileName,
                                         'fileSize' => $fileSize,
                                         'bitrate' => $bitrate,
                                         'ownerUserCode' => isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null,
                                         'ownerDisplayName' => isset($row['ownerDisplayName']) ? $row['ownerDisplayName'] : (isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null),
                                         'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
                                         'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
					 'uploadedAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
					 'contentCode' => $contentCode,
					 'contentType' => $contentType,
					 'filePath' => $filePath,
					 'mimeType' => $mimeType,
					 'clipTimes' => $clipTimesPayload,
					 'clipCount' => count($clipTimesPayload),
                                         'clipTimesUpdatedAt' => $clipTimesUpdatedAt
                                         );
        }
        // Reference

        //
        // Product
        //
        public static function fetchTargetProductMaterials($targetCode, $userCode, $pdoTarget, $pdoContents, $siteId)
        {
                if ($targetCode === null || $targetCode === '') {
                        return array();
                }

                $stmt = $pdoTarget->prepare(
                                                                        'SELECT m.*, u.displayName AS ownerDisplayName FROM targetProductMaterials m '
                                                                        . 'LEFT JOIN common.user u ON m.ownerUserCode = u.userCode '
                                                                        . 'WHERE m.targetCode = ? AND (m.isDeleted IS NULL OR m.isDeleted = 0) '
                                                                        . 'ORDER BY m.displayOrder ASC, m.updatedAt DESC, m.createdAt DESC, m.id DESC'
                                                                        );
                $stmt->execute(array($targetCode));
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                return TargetManagementUtil::buildProductMaterialCollection($rows, $userCode, $pdoTarget, $pdoContents, $siteId);
        }

        public static function buildProductMaterialCollection($rows, $userCode, $pdoTarget, $pdoContents, $siteId)
        {
                if (!is_array($rows) || count($rows) === 0) {
                        return array();
                }

                $materialCodes = array();
                foreach ($rows as $row) {
                        if ($row == null) {
                                continue;
                        }
                        $code = isset($row['materialCode']) ? $row['materialCode'] : null;
                        if ($code === null || $code === '') {
                                continue;
                        }
                        if (in_array($code, $materialCodes, true) == false) {
                                $materialCodes[] = $code;
                        }
                }

                $contentMap = TargetManagementUtil::fetchProductContentsForMaterials($materialCodes, $userCode, $pdoTarget, $pdoContents);
                $materials = array();

                foreach ($rows as $row) {
                        if ($row == null) {
                                continue;
                        }
                        $code = isset($row['materialCode']) ? $row['materialCode'] : null;
                        if ($code === null || $code === '') {
                                continue;
                        }
                        $contentRow = array_key_exists($code, $contentMap) ? $contentMap[$code] : null;
                        $materials[] = TargetManagementUtil::buildProductMaterialPayload($row, $siteId, $contentRow);
                }

                return $materials;
        }

        public static function fetchProductContentsForMaterials($materialCodes, $clipUserCode, $pdoTarget, $pdoContents)
        {
                $map = array();

                if (!is_array($materialCodes) || count($materialCodes) === 0) {
                        return $map;
                }

                $codes = array();
                foreach ($materialCodes as $code) {
                        if ($code === null || $code === '') {
                                continue;
                        }
                        if (in_array($code, $codes, true) == false) {
                                $codes[] = $code;
                        }
                }

                if (count($codes) === 0) {
                        return $map;
                }

                $placeholders = implode(', ', array_fill(0, count($codes), '?'));

                $stmt = $pdoTarget->prepare(
                                                                        'SELECT materialCode, contentCode, contentType, createdAt '
                                                                        . 'FROM targetProductMaterialContents '
                                                                        . 'WHERE materialCode IN (' . $placeholders . ') ORDER BY id ASC'
                                                                        );
                if ($stmt === false) {
                        return $map;
                }
                $stmt->execute($codes);
                $contentRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if ($clipUserCode === null) {
                        $clipUserCode = '';
                }

                $contentCodes = array();
                foreach ($contentRows as $row) {
                        if ($row == null || !isset($row['contentCode'])) {
                                continue;
                        }
                        $code = trim($row['contentCode']);
                        if ($code === '') {
                                continue;
                        }
                        if (in_array($code, $contentCodes, true) == false) {
                                $contentCodes[] = $code;
                        }
                }

                $contentDetails = array();
                if ($pdoContents !== null && count($contentCodes) > 0) {
                        $contentPlaceholders = implode(', ', array_fill(0, count($contentCodes), '?'));
                        $contentStmt = $pdoContents->prepare(
                                                                                                'SELECT ucp.contentCode, ucp.contentType, ucp.fileName, ucp.filePath, ucp.mimeType, '
                                                                                                . 'ucp.fileSize, ucp.userCode, '
                                                                                                . 'ucp.bitrate, '
                                                                                                . 'ccb.clipTimes AS clipTimesJson, ccb.updatedAt AS clipUpdatedAt '
                                                                                                . 'FROM userContents ucp '
                                                                                                . 'LEFT JOIN userContentClipBookmarks ccb ON ccb.contentCode = ucp.contentCode AND ccb.userCode = ? '
                                                                                                . 'WHERE ucp.contentCode IN (' . $contentPlaceholders . ')'
                                                                                                );
                        if ($contentStmt !== false) {
                                $params = array_merge(array($clipUserCode), $contentCodes);
                                $contentStmt->execute($params);

                                while ($contentRow = $contentStmt->fetch(PDO::FETCH_ASSOC)) {
                                        $contentCode = isset($contentRow['contentCode']) ? trim($contentRow['contentCode']) : '';
                                        if ($contentCode === '') {
                                                continue;
                                        }
                                        if (array_key_exists($contentCode, $contentDetails) == false) {
                                                $contentDetails[$contentCode] = $contentRow;
                                        }
                                }
                        }
                }

                foreach ($contentRows as $row) {
                        $materialCode = isset($row['materialCode']) ? $row['materialCode'] : null;
                        if ($materialCode === null || $materialCode === '') {
                                continue;
                        }
                        if (array_key_exists($materialCode, $map)) {
                                continue;
                        }

                        $contentCode = isset($row['contentCode']) ? trim($row['contentCode']) : '';
                        if ($contentCode !== '' && array_key_exists($contentCode, $contentDetails)) {
                                $map[$materialCode] = array_merge($row, $contentDetails[$contentCode]);
                        } else {
                                $map[$materialCode] = $row;
                        }
                }

                return $map;
        }

        public static function buildProductMaterialPayload($row, $siteId, $contentRow = null)
        {
                if ($row == null) {
                        return null;
                }

                $materialCode = isset($row['materialCode']) ? $row['materialCode'] : null;
                if ($materialCode === null || $materialCode === '') {
                        return null;
                }

                $category = isset($row['category']) ? $row['category'] : null;
                $startDate = isset($row['startDate']) ? trim((string) $row['startDate']) : null;
                $endDate = isset($row['endDate']) ? trim((string) $row['endDate']) : null;
                $linkUrl = isset($row['linkUrl']) ? trim($row['linkUrl']) : '';
                $downloadUrl = isset($row['downloadUrl']) ? trim($row['downloadUrl']) : '';
                $fileName = isset($row['fileName']) ? $row['fileName'] : null;
                $fileSize = isset($row['fileSize']) ? $row['fileSize'] : null;
                $bitrate = null;
                $contentCode = isset($row['contentCode']) ? $row['contentCode'] : null;
                $contentType = null;
                $filePath = null;
                $mimeType = null;
                $storageFileName = null;

                if ($contentRow != null) {
                        if (isset($contentRow['contentCode']) && $contentRow['contentCode'] !== '') {
                                $contentCode = $contentRow['contentCode'];
                        }
                        if (isset($contentRow['contentType']) && $contentRow['contentType'] !== '') {
                                $contentType = $contentRow['contentType'];
                        }
                        if (($category === null || $category === '' || $category === 'other') && $contentType !== null) {
                                $category = TargetManagementUtil::mapContentTypeToCategory($contentType);
                        }
                        if (($fileName === null || $fileName === '') && isset($contentRow['fileName'])) {
                                $fileName = $contentRow['fileName'];
                        }
                        if ($fileSize === null && isset($contentRow['fileSize'])) {
                                $fileSize = $contentRow['fileSize'];
                        }
                        if (isset($contentRow['bitrate'])) {
                                $bitrate = $contentRow['bitrate'];
                        }
                        $filePath = isset($contentRow['filePath']) ? $contentRow['filePath'] : null;
                        $mimeType = isset($contentRow['mimeType']) ? $contentRow['mimeType'] : null;
                        $storageFileName = Util::extractStoredFileName($filePath);
                }

                if ($linkUrl === null) {
                        $linkUrl = '';
                }

                if ($downloadUrl === null || $downloadUrl === '') {
                        $downloadUrl = $linkUrl;
                }

                if ($fileSize !== null) {
                        $fileSize = (int)$fileSize;
                }

                if ($bitrate !== null) {
                        $bitrate = (int)$bitrate;
                }

                $previewImage = isset($row['previewImage']) ? $row['previewImage'] : null;
                $siteId = isset($siteId) ? trim($siteId) : '';
                $normalizedCategory = strtolower((string) $category);
                $isVideoContent = ($normalizedCategory === 'video');
                if ($isVideoContent === false) {
                        $normalizedContentType = strtolower((string) $contentType);
                        if ($normalizedContentType === 'video' || strpos($normalizedContentType, 'video/') === 0) {
                                $isVideoContent = true;
                        }
                }
                if ($isVideoContent === false) {
                        $extensionSource = $storageFileName !== null ? $storageFileName : $fileName;
                        $extension = strtolower((string) pathinfo((string) $extensionSource, PATHINFO_EXTENSION));
                        if (Util::isVideoFile((string) $mimeType, $extension)) {
                                $isVideoContent = true;
                        }
                }
                $clipTimesPayload = array();
                $clipTimesUpdatedAt = null;
                $clipSource = null;
                if ($contentRow != null && isset($contentRow['clipTimesJson']) && $contentRow['clipTimesJson'] !== null) {
                        $clipSource = $contentRow;
                } elseif ($row != null && isset($row['clipTimesJson']) && $row['clipTimesJson'] !== null) {
                        $clipSource = $row;
                }

                if ($clipSource != null) {
                        $rawClips = isset($clipSource['clipTimesJson']) ? $clipSource['clipTimesJson'] : null;
                        if ($rawClips !== null && $rawClips !== '') {
                                $normalizedClips = $this->normalizeClipTimeList($rawClips);
                                if (is_array($normalizedClips) && !empty($normalizedClips)) {
                                        $clipTimesPayload = array_map(static function ($value) {
                                                        return round((float) $value, 3);
                                                }, $normalizedClips);
                                }
                        }
                        if (isset($clipSource['clipUpdatedAt']) && $clipSource['clipUpdatedAt'] !== null && $clipSource['clipUpdatedAt'] !== '') {
                                $clipTimesUpdatedAt = trim((string) $clipSource['clipUpdatedAt']);
                        } elseif (isset($clipSource['updatedAt']) && $clipSource['updatedAt'] !== null && $clipSource['updatedAt'] !== '') {
                                $clipTimesUpdatedAt = trim((string) $clipSource['updatedAt']);
                        }
                }

                return array(
                                         'materialCode' => $materialCode,
                                         'targetCode' => isset($row['targetCode']) ? $row['targetCode'] : null,
                                         'title' => isset($row['title']) ? $row['title'] : null,
                                         'description' => isset($row['description']) ? $row['description'] : null,
                                         'startDate' => $startDate,
                                         'endDate' => $endDate,
                                         'category' => $category,
                                         'linkUrl' => $linkUrl,
                                         'downloadUrl' => $downloadUrl,
                                         'previewImage' => $previewImage,
                                         'fileName' => $fileName,
                                         'fileSize' => $fileSize,
                                         'bitrate' => $bitrate,
                                         'ownerUserCode' => isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null,
                                         'ownerDisplayName' => isset($row['ownerDisplayName']) ? $row['ownerDisplayName'] : (isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null),
                                         'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
                                         'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
                                         'uploadedAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
                                         'contentCode' => $contentCode,
                                         'contentType' => $contentType,
                                         'filePath' => $filePath,
                                         'mimeType' => $mimeType,
                                         'clipTimes' => $clipTimesPayload,
                                         'clipCount' => count($clipTimesPayload),
                                         'clipTimesUpdatedAt' => $clipTimesUpdatedAt
                                         );
        }

        //
        // Schedule
        //
        public static function fetchTargetScheduleMaterials($targetCode, $userCode, $pdoTarget, $pdoContents, $siteId)
        {
                if ($targetCode === null || $targetCode === '') {
                        return array();
                }

		$stmt = $pdoTarget->prepare(
									'SELECT m.*, u.displayName AS ownerDisplayName FROM targetScheduleMaterials m '
									. 'LEFT JOIN common.user u ON m.ownerUserCode = u.userCode '
                                                                        . 'WHERE m.targetCode = ? AND (m.isDeleted IS NULL OR m.isDeleted = 0) '
                                                                        . 'ORDER BY m.displayOrder ASC, m.updatedAt DESC, m.createdAt DESC, m.id DESC'
                                                                        );
                $stmt->execute(array($targetCode));
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                return TargetManagementUtil::buildScheduleMaterialCollection($rows, $userCode, $pdoTarget, $pdoContents, $siteId);
        }

        public static function buildScheduleMaterialCollection($rows, $userCode, $pdoTarget, $pdoContents, $siteId)
        {
                if (!is_array($rows) || count($rows) === 0) {
                        return array();
                }

		$materialCodes = array();
		foreach ($rows as $row) {
			if ($row == null) {
				continue;
			}
			$code = isset($row['materialCode']) ? $row['materialCode'] : null;
			if ($code === null || $code === '') {
				continue;
			}
			if (in_array($code, $materialCodes, true) == false) {
				$materialCodes[] = $code;
			}
		}

                $contentMap = TargetManagementUtil::fetchScheduleContentsForMaterials($materialCodes, $userCode, $pdoTarget, $pdoContents);
                $materials = array();

		foreach ($rows as $row) {
			if ($row == null) {
				continue;
			}
			$code = isset($row['materialCode']) ? $row['materialCode'] : null;
                        if ($code === null || $code === '') {
                                continue;
                        }
                        $contentRow = array_key_exists($code, $contentMap) ? $contentMap[$code] : null;
                        $materials[] = TargetManagementUtil::buildScheduleMaterialPayload($row, $siteId, $contentRow);
                }

                return $materials;
        }

        public static function fetchScheduleContentsForMaterials($materialCodes, $clipUserCode, $pdoTarget, $pdoContents)
        {
                $map = array();

		if (!is_array($materialCodes) || count($materialCodes) === 0) {
			return $map;
		}

		$codes = array();
		foreach ($materialCodes as $code) {
			if ($code === null || $code === '') {
				continue;
			}
			if (in_array($code, $codes, true) == false) {
				$codes[] = $code;
			}
		}

		if (count($codes) === 0) {
			return $map;
		}

		$placeholders = implode(', ', array_fill(0, count($codes), '?'));

                $stmt = $pdoTarget->prepare(
                                                                        'SELECT materialCode, contentCode, contentType, createdAt '
                                                                        . 'FROM targetScheduleMaterialContents '
                                                                        . 'WHERE materialCode IN (' . $placeholders . ') ORDER BY id ASC'
                                                                        );
                if ($stmt === false) {
                        return $map;
                }
                $stmt->execute($codes);
                $contentRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if ($clipUserCode === null) {
                        $clipUserCode = '';
                }

                $contentCodes = array();
                foreach ($contentRows as $row) {
                        if ($row == null || !isset($row['contentCode'])) {
                                continue;
                        }
                        $code = trim($row['contentCode']);
                        if ($code === '') {
                                continue;
                        }
                        if (in_array($code, $contentCodes, true) == false) {
                                $contentCodes[] = $code;
                        }
                }

                $contentDetails = array();
                if ($pdoContents !== null && count($contentCodes) > 0) {
                        $contentPlaceholders = implode(', ', array_fill(0, count($contentCodes), '?'));
                        $contentStmt = $pdoContents->prepare(
                                                                                                'SELECT ucp.contentCode, ucp.contentType, ucp.fileName, ucp.filePath, ucp.mimeType, '
                                                                                                . 'ucp.fileSize, ucp.userCode, '
                                                                                                . 'ucp.bitrate, '
                                                                                                . 'ccb.clipTimes AS clipTimesJson, ccb.updatedAt AS clipUpdatedAt '
                                                                                                . 'FROM userContents ucp '
                                                                                                . 'LEFT JOIN userContentClipBookmarks ccb ON ccb.contentCode = ucp.contentCode AND ccb.userCode = ? '
                                                                                                . 'WHERE ucp.contentCode IN (' . $contentPlaceholders . ')'
                                                                                                );
                        if ($contentStmt !== false) {
                                $params = array_merge(array($clipUserCode), $contentCodes);
                                $contentStmt->execute($params);

                                while ($contentRow = $contentStmt->fetch(PDO::FETCH_ASSOC)) {
                                        $contentCode = isset($contentRow['contentCode']) ? trim($contentRow['contentCode']) : '';
                                        if ($contentCode === '') {
                                                continue;
                                        }
                                        if (array_key_exists($contentCode, $contentDetails) == false) {
                                                $contentDetails[$contentCode] = $contentRow;
                                        }
                                }
                        }
                }

                foreach ($contentRows as $row) {
                        $materialCode = isset($row['materialCode']) ? $row['materialCode'] : null;
                        if ($materialCode === null || $materialCode === '') {
                                continue;
                        }
                        if (array_key_exists($materialCode, $map)) {
                                continue;
                        }

                        $contentCode = isset($row['contentCode']) ? trim($row['contentCode']) : '';
                        if ($contentCode !== '' && array_key_exists($contentCode, $contentDetails)) {
                                $map[$materialCode] = array_merge($row, $contentDetails[$contentCode]);
                        } else {
                                $map[$materialCode] = $row;
                        }
                }

                return $map;
        }

        public static function buildScheduleMaterialPayload($row, $siteId, $contentRow = null)
        {
                if ($row == null) {
                        return null;
                }

		$materialCode = isset($row['materialCode']) ? $row['materialCode'] : null;
		if ($materialCode === null || $materialCode === '') {
			return null;
		}

                $category = isset($row['category']) ? $row['category'] : null;
                $startDate = isset($row['startDate']) ? trim((string) $row['startDate']) : null;
                $endDate = isset($row['endDate']) ? trim((string) $row['endDate']) : null;
                $linkUrl = isset($row['linkUrl']) ? trim($row['linkUrl']) : '';
                $downloadUrl = isset($row['downloadUrl']) ? trim($row['downloadUrl']) : '';
                $fileName = isset($row['fileName']) ? $row['fileName'] : null;
                $fileSize = isset($row['fileSize']) ? $row['fileSize'] : null;
                $bitrate = null;
                $contentCode = isset($row['contentCode']) ? $row['contentCode'] : null;
                $contentType = null;
                $filePath = null;
                $mimeType = null;
                $storageFileName = null;

		if ($contentRow != null) {
			if (isset($contentRow['contentCode']) && $contentRow['contentCode'] !== '') {
				$contentCode = $contentRow['contentCode'];
                        }
                        if (isset($contentRow['contentType']) && $contentRow['contentType'] !== '') {
                                $contentType = $contentRow['contentType'];
                        }
                        if (($category === null || $category === '' || $category === 'other') && $contentType !== null) {
                                $category = TargetManagementUtil::mapContentTypeToCategory($contentType);
                        }
                        if (($fileName === null || $fileName === '') && isset($contentRow['fileName'])) {
                                $fileName = $contentRow['fileName'];
                        }
                        if ($fileSize === null && isset($contentRow['fileSize'])) {
                                $fileSize = $contentRow['fileSize'];
                        }
                        if (isset($contentRow['bitrate'])) {
                                $bitrate = $contentRow['bitrate'];
                        }
                        $filePath = isset($contentRow['filePath']) ? $contentRow['filePath'] : null;
                        $mimeType = isset($contentRow['mimeType']) ? $contentRow['mimeType'] : null;
                        $storageFileName = Util::extractStoredFileName($filePath);
                }

		if ($linkUrl === null) {
			$linkUrl = '';
		}

		if ($downloadUrl === null || $downloadUrl === '') {
			$downloadUrl = $linkUrl;
		}

                if ($fileSize !== null) {
                        $fileSize = (int)$fileSize;
                }

                if ($bitrate !== null) {
                        $bitrate = (int)$bitrate;
                }

                $previewImage = isset($row['previewImage']) ? $row['previewImage'] : null;
                $siteId = isset($siteId) ? trim($siteId) : '';
                $normalizedCategory = strtolower((string) $category);
                $isVideoContent = ($normalizedCategory === 'video');
		if ($isVideoContent === false) {
			$normalizedContentType = strtolower((string) $contentType);
			if ($normalizedContentType === 'video' || strpos($normalizedContentType, 'video/') === 0) {
				$isVideoContent = true;
			}
		}
		if ($isVideoContent === false) {
			$extensionSource = $storageFileName !== null ? $storageFileName : $fileName;
			$extension = strtolower((string) pathinfo((string) $extensionSource, PATHINFO_EXTENSION));
			if (Util::isVideoFile((string) $mimeType, $extension)) {
				$isVideoContent = true;
			}
		}
		$clipTimesPayload = array();
		$clipTimesUpdatedAt = null;
		$clipSource = null;
		if ($contentRow != null && isset($contentRow['clipTimesJson']) && $contentRow['clipTimesJson'] !== null) {
			$clipSource = $contentRow;
		} elseif ($row != null && isset($row['clipTimesJson']) && $row['clipTimesJson'] !== null) {
			$clipSource = $row;
		}

		if ($clipSource != null) {
			$rawClips = isset($clipSource['clipTimesJson']) ? $clipSource['clipTimesJson'] : null;
			if ($rawClips !== null && $rawClips !== '') {
				$normalizedClips = $this->normalizeClipTimeList($rawClips);
				if (is_array($normalizedClips) && !empty($normalizedClips)) {
					$clipTimesPayload = array_map(static function ($value) {
							return round((float) $value, 3);
						}, $normalizedClips);
				}
			}
			if (isset($clipSource['clipUpdatedAt']) && $clipSource['clipUpdatedAt'] !== null && $clipSource['clipUpdatedAt'] !== '') {
				$clipTimesUpdatedAt = trim((string) $clipSource['clipUpdatedAt']);
			} elseif (isset($clipSource['updatedAt']) && $clipSource['updatedAt'] !== null && $clipSource['updatedAt'] !== '') {
				$clipTimesUpdatedAt = trim((string) $clipSource['updatedAt']);
			}
		}

		return array(
					 'materialCode' => $materialCode,
                                         'targetCode' => isset($row['targetCode']) ? $row['targetCode'] : null,
                                         'title' => isset($row['title']) ? $row['title'] : null,
                                         'description' => isset($row['description']) ? $row['description'] : null,
                                         'startDate' => $startDate,
                                         'endDate' => $endDate,
                                         'category' => $category,
                                         'linkUrl' => $linkUrl,
					 'downloadUrl' => $downloadUrl,
					 'previewImage' => $previewImage,
                                         'fileName' => $fileName,
                                         'fileSize' => $fileSize,
                                         'bitrate' => $bitrate,
                                         'ownerUserCode' => isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null,
                                         'ownerDisplayName' => isset($row['ownerDisplayName']) ? $row['ownerDisplayName'] : (isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null),
                                         'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
                                         'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
					 'uploadedAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
					 'contentCode' => $contentCode,
					 'contentType' => $contentType,
					 'filePath' => $filePath,
					 'mimeType' => $mimeType,
					 'clipTimes' => $clipTimesPayload,
					 'clipCount' => count($clipTimesPayload),
                                         'clipTimesUpdatedAt' => $clipTimesUpdatedAt
                                         );
        }
	// Schedule				

        private static function mapContentTypeToCategory($contentType)
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
	
	public static function fetchTargetChatData($targetCode, $viewerUserCode = null, array $options = array(), array $dependencies = array())
	{
                $pdo = isset($dependencies['pdo']) ? $dependencies['pdo'] : null;
                $participantBuilder = isset($dependencies['buildParticipant']) ? $dependencies['buildParticipant'] : null;
                $attachmentBuilder = isset($dependencies['buildAttachment']) ? $dependencies['buildAttachment'] : null;

                $result = array(
						'threads' => array(),
						'participants' => array(),
						'pagination' => array(
											  'threads' => array(
																 'limit' => 0,
																 'offset' => 0,
																 'returnedCount' => 0,
																 'hasMore' => 0,
																 'nextCursor' => null,
																 'requestedThreadCodes' => array(),
																 ),
											  'messages' => array(
																  'limit' => 0,
																  'offset' => 0,
																  'returnedCount' => 0,
																  'hasMore' => 0,
																  'nextCursor' => null,
																  'threadStates' => array(),
																  ),
											  ),
						);

                $hasValidDependencies = $pdo instanceof PDO
                                && is_callable($participantBuilder)
                                && is_callable($attachmentBuilder);

		if ($hasValidDependencies === false) {
			return $result;
		}

		$viewerUserCode = is_string($viewerUserCode) ? trim((string)$viewerUserCode) : '';

		if ($targetCode === null || $targetCode === '') {
			return $result;
		}
		$threadsLimit = 20;
		if (isset($options['threadsLimit'])) {
			$threadsLimitCandidate = (int) filter_var($options['threadsLimit'], FILTER_VALIDATE_INT, array('options' => array('min_range' => 1)));
			if ($threadsLimitCandidate >= 1) {
				$threadsLimit = $threadsLimitCandidate;
			}
		}
		$threadsMaxLimit = 50;
		if ($threadsLimit > $threadsMaxLimit) {
			$threadsLimit = $threadsMaxLimit;
		}

		$threadsOffset = 0;
		if (isset($options['threadsOffset'])) {
			$threadsOffsetCandidate = (int) filter_var($options['threadsOffset'], FILTER_VALIDATE_INT, array('options' => array('min_range' => 0)));
			if ($threadsOffsetCandidate >= 0) {
				$threadsOffset = $threadsOffsetCandidate;
			}
		}

		$requestedThreadCodes = array();
		if (isset($options['threadCodes']) && is_array($options['threadCodes'])) {
			foreach ($options['threadCodes'] as $value) {
				if ($value === null) {
					continue;
				}
				$code = trim((string)$value);
				if ($code === '') {
					continue;
				}
				$requestedThreadCodes[$code] = true;
			}
		}

		$messagesLimit = 50;
		if (isset($options['messagesLimit'])) {
			$messagesLimitCandidate = (int) filter_var($options['messagesLimit'], FILTER_VALIDATE_INT, array('options' => array('min_range' => 1)));
			if ($messagesLimitCandidate >= 1) {
				$messagesLimit = $messagesLimitCandidate;
			}
		}
		$messagesMaxLimit = 200;
		if ($messagesLimit > $messagesMaxLimit) {
			$messagesLimit = $messagesMaxLimit;
		}

		$messagesOffset = 0;
		if (isset($options['messagesOffset'])) {
			$messagesOffsetCandidate = (int) filter_var($options['messagesOffset'], FILTER_VALIDATE_INT, array('options' => array('min_range' => 0)));
			if ($messagesOffsetCandidate >= 0) {
				$messagesOffset = $messagesOffsetCandidate;
			}
		}

		$messageOffsetMap = array();
		if (isset($options['messageOffsets']) && is_array($options['messageOffsets'])) {
			foreach ($options['messageOffsets'] as $threadKey => $offsetValue) {
				if ($offsetValue === null) {
					continue;
				}
				$normalizedThreadKey = is_string($threadKey) ? trim($threadKey) : '';
				if ($normalizedThreadKey === '') {
					continue;
				}
				$normalizedOffset = (int) filter_var($offsetValue, FILTER_VALIDATE_INT, array('options' => array('min_range' => 0)));
				if ($normalizedOffset < 0) {
					$normalizedOffset = 0;
				}
				$messageOffsetMap[$normalizedThreadKey] = $normalizedOffset;
			}
		}

                $threads = array();
		$threadCodes = array();
		$threadsHasMore = false;

		if (count($requestedThreadCodes) > 0) {
			$requestedCodes = array_keys($requestedThreadCodes);
			$placeholders = implode(', ', array_fill(0, count($requestedCodes), '?'));
			$threadStmt = $pdo->prepare(
										'SELECT id, threadCode, threadType, title, description, createdByUserCode, createdAt, updatedAt, lastMessageAt, lastMessageSnippet, lastMessageSenderCode '
										. 'FROM targetChatThreads '
										. 'WHERE targetCode = ? AND (isArchived IS NULL OR isArchived = 0) '
										. 'AND threadCode IN (' . $placeholders . ') '
										. 'ORDER BY '
										. 'CASE WHEN lastMessageAt IS NULL THEN 1 ELSE 0 END ASC, lastMessageAt DESC, updatedAt DESC, id DESC'
										);
			$threadParams = array_merge(array($targetCode), $requestedCodes);
			$threadStmt->execute($threadParams);
			$rows = $threadStmt->fetchAll(PDO::FETCH_ASSOC);
		} else {
			$internalThreadsLimit = $threadsLimit + 1;
			if ($internalThreadsLimit > $threadsMaxLimit + 1) {
				$internalThreadsLimit = $threadsMaxLimit + 1;
			}

			$threadStmt = $pdo->prepare(
										'SELECT id, threadCode, threadType, title, description, createdByUserCode, createdAt, updatedAt, lastMessageAt, lastMessageSnippet, lastMessageSenderCode '
										. 'FROM targetChatThreads '
										. 'WHERE targetCode = ? AND (isArchived IS NULL OR isArchived = 0) '
										. 'ORDER BY '
										. 'CASE WHEN lastMessageAt IS NULL THEN 1 ELSE 0 END ASC, lastMessageAt DESC, updatedAt DESC, id DESC '
										. 'LIMIT ? OFFSET ?'
										);
			$threadStmt->bindValue(1, $targetCode, PDO::PARAM_STR);
			$threadStmt->bindValue(2, $internalThreadsLimit, PDO::PARAM_INT);
			$threadStmt->bindValue(3, $threadsOffset, PDO::PARAM_INT);
			$threadStmt->execute();
			$rows = $threadStmt->fetchAll(PDO::FETCH_ASSOC);

			if (count($rows) > $threadsLimit) {
				$threadsHasMore = true;
				$rows = array_slice($rows, 0, $threadsLimit);
			}
		}

		foreach ($rows as $row) {
			$code = isset($row['threadCode']) ? trim((string)$row['threadCode']) : '';
			if ($code === '') {
				continue;
			}
			$threadCodes[] = $code;
			$threads[$code] = array(
									'threadCode' => $code,
									'targetCode' => $targetCode,
									'type' => isset($row['threadType']) ? $row['threadType'] : null,
									'threadType' => isset($row['threadType']) ? $row['threadType'] : null,
									'title' => isset($row['title']) ? $row['title'] : null,
									'description' => isset($row['description']) ? $row['description'] : null,
									'createdByUserCode' => isset($row['createdByUserCode']) ? $row['createdByUserCode'] : null,
									'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
									'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
									'lastMessageAt' => isset($row['lastMessageAt']) ? $row['lastMessageAt'] : null,
									'lastMessageSnippet' => isset($row['lastMessageSnippet']) ? $row['lastMessageSnippet'] : null,
									'lastMessageSenderCode' => isset($row['lastMessageSenderCode']) ? $row['lastMessageSenderCode'] : null,
									'participants' => array(),
									'messages' => array(),
									'unreadCount' => 0,
									'unread' => 0,
									);
		}

		if (count($threadCodes) === 0) {
			$result['pagination']['threads'] = array(
													 'limit' => $threadsLimit,
													 'offset' => $threadsOffset,
													 'returnedCount' => 0,
													 'hasMore' => 0,
													 'nextCursor' => null,
													 'requestedThreadCodes' => array_keys($requestedThreadCodes),
													 );
			$result['pagination']['messages'] = array(
													  'limit' => $messagesLimit,
													  'offset' => $messagesOffset,
													  'returnedCount' => 0,
													  'hasMore' => 0,
													  'nextCursor' => null,
													  'threadStates' => array(),
													  );
			return $result;
		}

		$participantMap = array();
		$threadPlaceholders = implode(', ', array_fill(0, count($threadCodes), '?'));
                $memberStmt = $pdo->prepare(
                                                                        'SELECT id, threadCode, userCode, joinedAt, notificationsMuted '
                                                                        . 'FROM targetChatThreadMembers '
                                                                        . 'WHERE threadCode IN (' . $threadPlaceholders . ') '
                                                                        . 'ORDER BY threadCode ASC, joinedAt ASC, id ASC'
                                                                        );
		$memberStmt->execute($threadCodes);

		while ($memberRow = $memberStmt->fetch(PDO::FETCH_ASSOC)) {
			$threadCode = isset($memberRow['threadCode']) ? trim((string)$memberRow['threadCode']) : '';
			$userCode = isset($memberRow['userCode']) ? trim((string)$memberRow['userCode']) : '';
			if ($threadCode === '' || $userCode === '' || isset($threads[$threadCode]) == false) {
				continue;
			}

                        $participant = call_user_func($participantBuilder, $userCode, null);
			if ($participant === null) {
				continue;
			}

			if (isset($memberRow['joinedAt'])) {
				$participant['joinedAt'] = $memberRow['joinedAt'];
			}
			if (isset($memberRow['notificationsMuted'])) {
				$participant['notificationsMuted'] = (int)$memberRow['notificationsMuted'];
			}

			$threads[$threadCode]['participants'][] = $participant;

			if (isset($participant['userCode']) && $participant['userCode'] !== '') {
				if (array_key_exists($participant['userCode'], $participantMap) == false) {
					$participantMap[$participant['userCode']] = $participant;
				}
			}
		}

		$messageCodes = array();
		$messageIndex = array();
		$messagePaginationStates = array();

		$internalMessagesLimit = $messagesLimit + 1;
		if ($internalMessagesLimit > $messagesMaxLimit + 1) {
			$internalMessagesLimit = $messagesMaxLimit + 1;
		}

                $messageStmt = $pdo->prepare(
                                                                         'SELECT id, messageCode, threadCode, senderUserCode, content, sentAt, deliveredAt, readAt, createdAt, updatedAt, replyToMessageCode, metadata '
                                                                         . 'FROM targetChatMessages '
                                                                         . 'WHERE threadCode = ? AND (isDeleted IS NULL OR isDeleted = 0) '
                                                                         . 'ORDER BY '
                                                                         . 'CASE WHEN COALESCE(sentAt, createdAt, updatedAt) IS NULL THEN 1 ELSE 0 END ASC, '
                                                                         . 'COALESCE(sentAt, createdAt, updatedAt) DESC, '
                                                                         . 'id DESC '
                                                                         . 'LIMIT ? OFFSET ?'
                                                                         );

		foreach ($threadCodes as $threadCode) {
			$threadOffset = $messagesOffset;
			if (isset($messageOffsetMap[$threadCode])) {
				$threadOffset = $messageOffsetMap[$threadCode];
			}

			$messageStmt->bindValue(1, $threadCode, PDO::PARAM_STR);
			$messageStmt->bindValue(2, $internalMessagesLimit, PDO::PARAM_INT);
			$messageStmt->bindValue(3, $threadOffset, PDO::PARAM_INT);
			$messageStmt->execute();

			$rows = $messageStmt->fetchAll(PDO::FETCH_ASSOC);
			$messageStmt->closeCursor();

			$hasMoreMessages = false;
			if (count($rows) > $messagesLimit) {
				$hasMoreMessages = true;
				$rows = array_slice($rows, 0, $messagesLimit);
			}

			$rows = array_reverse($rows);
			$threadMessages = array();

			foreach ($rows as $messageRow) {
				$messageCode = isset($messageRow['messageCode']) ? trim((string)$messageRow['messageCode']) : '';
				if ($messageCode === '') {
					continue;
				}

                                $message = array(
                                                                 'messageCode' => $messageCode,
                                                                 'threadCode' => $threadCode,
                                                                 'senderUserCode' => isset($messageRow['senderUserCode']) ? $messageRow['senderUserCode'] : null,
                                                                 'content' => isset($messageRow['content']) ? $messageRow['content'] : null,
                                                                 'sentAt' => isset($messageRow['sentAt']) ? $messageRow['sentAt'] : null,
								 'deliveredAt' => isset($messageRow['deliveredAt']) ? $messageRow['deliveredAt'] : null,
								 'readAt' => isset($messageRow['readAt']) ? $messageRow['readAt'] : null,
								 'createdAt' => isset($messageRow['createdAt']) ? $messageRow['createdAt'] : null,
								 'updatedAt' => isset($messageRow['updatedAt']) ? $messageRow['updatedAt'] : null,
                                                                 'replyToMessageCode' => isset($messageRow['replyToMessageCode']) ? $messageRow['replyToMessageCode'] : null,
								 'metadata' => isset($messageRow['metadata']) ? $messageRow['metadata'] : null,
								 'attachments' => array(),
								 );

				$threadMessages[] = $message;
				$messageIndex[$messageCode] = array($threadCode, count($threadMessages) - 1);
				$messageCodes[] = $messageCode;
			}

			$threads[$threadCode]['messages'] = $threadMessages;
			$messagePaginationStates[$threadCode] = array(
														  'limit' => $messagesLimit,
														  'offset' => $threadOffset,
														  'returnedCount' => count($threadMessages),
														  'hasMore' => $hasMoreMessages ? 1 : 0,
														  'nextCursor' => $hasMoreMessages ? $threadOffset + $messagesLimit : null,
														  );
		}

		if (count($messageCodes) > 0) {
			$attachmentPlaceholders = implode(', ', array_fill(0, count($messageCodes), '?'));
			$attachmentStmt = $pdo->prepare(
											'SELECT id, attachmentCode, messageCode, contentCode, contentType, fileName, mimeType, fileSize, downloadUrl, createdAt, updatedAt '
											. 'FROM targetChatMessageAttachments '
											. 'WHERE messageCode IN (' . $attachmentPlaceholders . ') '
											. 'ORDER BY messageCode ASC, id ASC'
											);
			$attachmentStmt->execute($messageCodes);

			while ($attachmentRow = $attachmentStmt->fetch(PDO::FETCH_ASSOC)) {
				$messageCode = isset($attachmentRow['messageCode']) ? trim((string)$attachmentRow['messageCode']) : '';
				if ($messageCode === '' || isset($messageIndex[$messageCode]) == false) {
					continue;
				}

                            $attachment = call_user_func($attachmentBuilder, $attachmentRow);
				if ($attachment === null) {
					continue;
				}

				$threadPosition = $messageIndex[$messageCode];
				if (is_array($threadPosition) && count($threadPosition) === 2) {
					$threadKey = $threadPosition[0];
					$messageOffset = $threadPosition[1];
					if (isset($threads[$threadKey]) && isset($threads[$threadKey]['messages'][$messageOffset])) {
						$threads[$threadKey]['messages'][$messageOffset]['attachments'][] = $attachment;
					}
				}
			}
		}

		if ($viewerUserCode !== '' && count($messageCodes) > 0) {
			$readPlaceholders = implode(', ', array_fill(0, count($messageCodes), '?'));
			$readStmt = $pdo->prepare(
									  'SELECT messageCode '
									  . 'FROM targetChatMessageReads '
									  . 'WHERE userCode = ? AND messageCode IN (' . $readPlaceholders . ')'
									  );

			$readParams = array_merge(array($viewerUserCode), $messageCodes);
			$readStmt->execute($readParams);

			$readMessageCodes = array();
			while ($readRow = $readStmt->fetch(PDO::FETCH_ASSOC)) {
				$messageCode = isset($readRow['messageCode']) ? trim((string)$readRow['messageCode']) : '';
				if ($messageCode === '') {
					continue;
				}
				$readMessageCodes[$messageCode] = true;
			}

			foreach ($messageIndex as $messageCode => $threadPosition) {
				if (isset($readMessageCodes[$messageCode])) {
					continue;
				}
				if (!is_array($threadPosition) || count($threadPosition) !== 2) {
					continue;
				}
				$threadKey = $threadPosition[0];
				if (isset($threads[$threadKey]) == false) {
					continue;
				}
				$threads[$threadKey]['unreadCount']++;
				$threads[$threadKey]['unread'] = $threads[$threadKey]['unreadCount'];
			}

			$unreadPlaceholders = implode(', ', array_fill(0, count($threadCodes), '?'));
			$unreadStmt = $pdo->prepare(
										'SELECT m.threadCode, COUNT(*) AS unreadCount '
										. 'FROM targetChatMessages m '
										. 'LEFT JOIN targetChatMessageReads r ON m.messageCode = r.messageCode AND r.userCode = ? '
										. 'WHERE m.threadCode IN (' . $unreadPlaceholders . ') '
										. 'AND (m.isDeleted IS NULL OR m.isDeleted = 0) '
										. 'AND (m.senderUserCode IS NULL OR LOWER(m.senderUserCode) != LOWER(?)) '
										. 'AND r.messageCode IS NULL '
										. 'GROUP BY m.threadCode'
										);
			$unreadParams = array_merge(array($viewerUserCode, $viewerUserCode), $threadCodes);
			$unreadStmt->execute($unreadParams);

			while ($unreadRow = $unreadStmt->fetch(PDO::FETCH_ASSOC)) {
				$threadCode = isset($unreadRow['threadCode']) ? trim((string)$unreadRow['threadCode']) : '';
				if ($threadCode === '' || isset($threads[$threadCode]) == false) {
					continue;
				}
				$unreadCount = isset($unreadRow['unreadCount']) ? (int)$unreadRow['unreadCount'] : 0;
				if ($unreadCount < 0) {
					$unreadCount = 0;
				}
				$threads[$threadCode]['unreadCount'] = $unreadCount;
				$threads[$threadCode]['unread'] = $unreadCount;
			}
		}

		$result['threads'] = array_values($threads);
		$result['participants'] = array_values($participantMap);

		$totalMessagesReturned = 0;
		$overallMessagesHasMore = false;
		foreach ($messagePaginationStates as $threadCode => $state) {
			$totalMessagesReturned += isset($state['returnedCount']) ? (int)$state['returnedCount'] : 0;
			if (isset($state['hasMore']) && (int)$state['hasMore'] === 1) {
				$overallMessagesHasMore = true;
			}
		}

		$result['pagination'] = array(
									  'threads' => array(
														 'limit' => $threadsLimit,
														 'offset' => $threadsOffset,
														 'returnedCount' => count($threads),
														 'hasMore' => $threadsHasMore ? 1 : 0,
														 'nextCursor' => $threadsHasMore ? $threadsOffset + $threadsLimit : null,
														 'requestedThreadCodes' => array_keys($requestedThreadCodes),
														 ),
									  'messages' => array(
														  'limit' => $messagesLimit,
														  'offset' => $messagesOffset,
														  'returnedCount' => $totalMessagesReturned,
														  'hasMore' => $overallMessagesHasMore ? 1 : 0,
														  'nextCursor' => $overallMessagesHasMore ? $messagesOffset + $messagesLimit : null,
														  'threadStates' => $messagePaginationStates,
														  ),
									  );

		return $result;
	}

	public static function fetchTargetBbsData($targetCode, $viewerUserCode, $options, $dependencies)
		{
		$result = array('threads' => array(), 'participants' => array(), 'pagination' => array());
		
		if ($targetCode === null || $targetCode === '') {
		return $result;
		}
		
		$pdo = $dependencies['pdo'];
		$buildParticipant = isset($dependencies['buildParticipant']) ? $dependencies['buildParticipant'] : null;
		$buildAttachment = isset($dependencies['buildAttachment']) ? $dependencies['buildAttachment'] : null;
		
		$threadsLimit = isset($options['threadsLimit']) ? (int)$options['threadsLimit'] : 20;
		$threadsOffset = isset($options['threadsOffset']) ? (int)$options['threadsOffset'] : 0;
		$messagesLimit = isset($options['messagesLimit']) ? (int)$options['messagesLimit'] : 50;
		$messagesOffset = isset($options['messagesOffset']) ? (int)$options['messagesOffset'] : 0;
		$messageOffsets = isset($options['messageOffsets']) && is_array($options['messageOffsets']) ? $options['messageOffsets'] : array();
		$threadCodesFilter = isset($options['threadCodes']) && is_array($options['threadCodes']) ? $options['threadCodes'] : array();
		
		$threads = array();
		$threadCodes = array();
		
		$threadSql = 'SELECT threadCode, targetCode, threadType, title, description, createdByUserCode, createdAt, updatedAt, lastMessageAt, lastMessageSnippet, lastMessageSenderCode '
		. 'FROM targetBbsThreads WHERE targetCode = ? AND (isArchived IS NULL OR isArchived = 0)';
		$threadParams = array($targetCode);
		
		if (count($threadCodesFilter) > 0) {
		$placeholders = implode(', ', array_fill(0, count($threadCodesFilter), '?'));
		$threadSql .= ' AND threadCode IN (' . $placeholders . ')';
		foreach ($threadCodesFilter as $code) {
		$threadParams[] = $code;
		}
		}
		
		$threadSql .= ' ORDER BY COALESCE(lastMessageAt, updatedAt, createdAt) DESC, id DESC';
		if (count($threadCodesFilter) === 0) {
		$threadSql .= ' LIMIT ? OFFSET ?';
		$threadParams[] = $threadsLimit;
		$threadParams[] = $threadsOffset;
		}
		
		$threadStmt = $pdo->prepare($threadSql);
		$threadStmt->execute($threadParams);
		
		while ($row = $threadStmt->fetch(PDO::FETCH_ASSOC)) {
		$threadCode = isset($row['threadCode']) ? $row['threadCode'] : null;
		if ($threadCode === null || $threadCode === '') {
		continue;
		}
		$threads[$threadCode] = $row;
		$threadCodes[] = $threadCode;
		}
		
		if (count($threads) === 0) {
		return $result;
		}
		
		$membersByThread = array();
		$memberSql = 'SELECT threadCode, userCode, joinedAt FROM targetBbsThreadMembers WHERE threadCode IN (' . implode(', ', array_fill(0, count($threadCodes), '?')) . ') ORDER BY joinedAt ASC, id ASC';
		$memberStmt = $pdo->prepare($memberSql);
		$memberStmt->execute($threadCodes);
		while ($memberRow = $memberStmt->fetch(PDO::FETCH_ASSOC)) {
		$threadCode = isset($memberRow['threadCode']) ? $memberRow['threadCode'] : null;
		$userCode = isset($memberRow['userCode']) ? $memberRow['userCode'] : null;
		if ($threadCode === null || $threadCode === '' || $userCode === null || $userCode === '') {
		continue;
		}
		if (array_key_exists($threadCode, $membersByThread) == false) {
		$membersByThread[$threadCode] = array();
		}
		if (in_array($userCode, $membersByThread[$threadCode], true) == false) {
		$membersByThread[$threadCode][] = $userCode;
		}
		}
		
		$threadMessages = array();
		$allMessageCodes = array();
		foreach ($threadCodes as $threadCode) {
		$offset = $messagesOffset;
		if (array_key_exists($threadCode, $messageOffsets)) {
		$candidateOffset = (int)$messageOffsets[$threadCode];
		if ($candidateOffset >= 0) {
		$offset = $candidateOffset;
		}
		}
		
		$messageStmt = $pdo->prepare('SELECT messageCode, threadCode, senderUserCode, content, sentAt, createdAt, updatedAt, replyToMessageCode FROM targetBbsMessages WHERE threadCode = ? AND (isDeleted IS NULL OR isDeleted = 0) ORDER BY COALESCE(sentAt, createdAt, updatedAt) ASC, id ASC LIMIT ? OFFSET ?');
		$messageStmt->execute(array($threadCode, $messagesLimit, $offset));
		while ($messageRow = $messageStmt->fetch(PDO::FETCH_ASSOC)) {
		$messageCode = isset($messageRow['messageCode']) ? $messageRow['messageCode'] : null;
		if ($messageCode === null || $messageCode === '') {
		continue;
		}
		if (array_key_exists($threadCode, $threadMessages) == false) {
		$threadMessages[$threadCode] = array();
		}
		$threadMessages[$threadCode][] = $messageRow;
		$allMessageCodes[] = $messageCode;
		}
		}
		
		$attachmentsByMessage = array();
		if (count($allMessageCodes) > 0) {
		$attachmentSql = 'SELECT * FROM targetBbsMessageAttachments WHERE messageCode IN (' . implode(', ', array_fill(0, count($allMessageCodes), '?')) . ')';
		$attachmentStmt = $pdo->prepare($attachmentSql);
		$attachmentStmt->execute($allMessageCodes);
		while ($attachmentRow = $attachmentStmt->fetch(PDO::FETCH_ASSOC)) {
		$messageCode = isset($attachmentRow['messageCode']) ? $attachmentRow['messageCode'] : null;
		if ($messageCode === null || $messageCode === '') {
		continue;
		}
		if (array_key_exists($messageCode, $attachmentsByMessage) == false) {
		$attachmentsByMessage[$messageCode] = array();
		}
		$attachmentsByMessage[$messageCode][] = $attachmentRow;
		}
		}
		
		$participantMap = array();
		$buildParticipantPayload = function($userCode) use (&$participantMap, $buildParticipant) {
		if ($userCode === null || $userCode === '') {
		return null;
		}
		$normalized = trim((string)$userCode);
		if ($normalized === '') {
		return null;
		}
		if (array_key_exists($normalized, $participantMap)) {
		return $participantMap[$normalized];
		}
		$payload = null;
		if (is_callable($buildParticipant)) {
		$payload = call_user_func($buildParticipant, $normalized, null);
		}
		if ($payload === null) {
		$payload = array('userCode' => $normalized, 'displayName' => $normalized);
		}
		$participantMap[$normalized] = $payload;
		return $payload;
		};
		
		$threadsPayload = array();
		foreach ($threads as $threadCode => $threadRow) {
		$threadParticipantCodes = array();
		if (array_key_exists($threadCode, $membersByThread)) {
		$threadParticipantCodes = $membersByThread[$threadCode];
		}
		if (isset($threadRow['createdByUserCode']) && $threadRow['createdByUserCode'] !== '') {
		$threadParticipantCodes[] = $threadRow['createdByUserCode'];
		}
		
		$messagesPayload = array();
		if (array_key_exists($threadCode, $threadMessages)) {
		foreach ($threadMessages[$threadCode] as $messageRow) {
		$senderUserCode = isset($messageRow['senderUserCode']) ? $messageRow['senderUserCode'] : null;
		if ($senderUserCode !== null && $senderUserCode !== '') {
		$threadParticipantCodes[] = $senderUserCode;
		}
		
		$messageCode = isset($messageRow['messageCode']) ? $messageRow['messageCode'] : null;
		$attachments = array();
		if ($messageCode !== null && array_key_exists($messageCode, $attachmentsByMessage)) {
		foreach ($attachmentsByMessage[$messageCode] as $attachmentRow) {
		$builtAttachment = null;
		if (is_callable($buildAttachment)) {
		$builtAttachment = call_user_func($buildAttachment, $attachmentRow);
		}
		if ($builtAttachment === null) {
		$builtAttachment = $attachmentRow;
		}
		$attachments[] = $builtAttachment;
		}
		}
		
		$messagesPayload[] = array(
		'messageCode' => $messageCode,
		'threadCode' => isset($messageRow['threadCode']) ? $messageRow['threadCode'] : null,
		'senderUserCode' => $senderUserCode,
		'content' => isset($messageRow['content']) ? $messageRow['content'] : null,
		'sentAt' => isset($messageRow['sentAt']) ? $messageRow['sentAt'] : (isset($messageRow['createdAt']) ? $messageRow['createdAt'] : null),
		'createdAt' => isset($messageRow['createdAt']) ? $messageRow['createdAt'] : null,
		'updatedAt' => isset($messageRow['updatedAt']) ? $messageRow['updatedAt'] : null,
'replyToMessageCode' => isset($messageRow['replyToMessageCode']) ? $messageRow['replyToMessageCode'] : null,
		'attachments' => $attachments,
		);
		}
		}
		
		$participantPayloads = array();
		foreach ($threadParticipantCodes as $code) {
		$payload = $buildParticipantPayload($code);
		if ($payload !== null) {
		$participantPayloads[] = $payload;
		}
		}
		
		$lastActivityAt = null;
		if (count($messagesPayload) > 0) {
		$lastMessage = $messagesPayload[count($messagesPayload) - 1];
		$lastActivityAt = isset($lastMessage['sentAt']) ? $lastMessage['sentAt'] : (isset($lastMessage['createdAt']) ? $lastMessage['createdAt'] : null);
		} else if (isset($threadRow['lastMessageAt']) && $threadRow['lastMessageAt'] !== null) {
		$lastActivityAt = $threadRow['lastMessageAt'];
		} else {
		$lastActivityAt = isset($threadRow['updatedAt']) ? $threadRow['updatedAt'] : (isset($threadRow['createdAt']) ? $threadRow['createdAt'] : null);
		}
		
		$threadsPayload[] = array(
		'threadCode' => $threadCode,
		'threadType' => isset($threadRow['threadType']) ? $threadRow['threadType'] : null,
		'title' => isset($threadRow['title']) ? $threadRow['title'] : null,
		'description' => isset($threadRow['description']) ? $threadRow['description'] : null,
		'createdByUserCode' => isset($threadRow['createdByUserCode']) ? $threadRow['createdByUserCode'] : null,
		'lastMessageSnippet' => isset($threadRow['lastMessageSnippet']) ? $threadRow['lastMessageSnippet'] : null,
		'lastMessageSenderCode' => isset($threadRow['lastMessageSenderCode']) ? $threadRow['lastMessageSenderCode'] : null,
		'createdAt' => isset($threadRow['createdAt']) ? $threadRow['createdAt'] : null,
		'updatedAt' => isset($threadRow['updatedAt']) ? $threadRow['updatedAt'] : null,
		'lastActivityAt' => $lastActivityAt,
		'messages' => $messagesPayload,
		'participants' => $participantPayloads,
		'unreadCount' => 0,
		);
		}
		
		$participantsPayload = array_values($participantMap);
		$viewerPayload = null;
		if ($viewerUserCode !== null && $viewerUserCode !== '') {
		$viewerPayload = $buildParticipantPayload($viewerUserCode);
		}
		
		$result['threads'] = $threadsPayload;
		$result['participants'] = $participantsPayload;
		$result['pagination'] = array(
		'threadsLimit' => $threadsLimit,
		'threadsOffset' => $threadsOffset,
		'messagesLimit' => $messagesLimit,
		'messagesOffset' => $messagesOffset,
		);
		if ($viewerPayload !== null) {
		$result['viewer'] = $viewerPayload;
		}
		
		return $result;
		}
		
	public static function fetchActiveTargetByCode($targetCode, $loginUserCode, $pdoTarget, $userInfo, $pdoCommon)
	{
		$stmt = $pdoTarget->prepare('SELECT * FROM targets WHERE targetCode = ? AND (isDeleted IS NULL OR isDeleted = 0) LIMIT 1');
		$stmt->execute(array($targetCode));
		$row = $stmt->fetch(PDO::FETCH_ASSOC);
		if ($row == false) {
			return null;
		}

		if (!empty($_SESSION['isSupervisor'])) {
			return $row;			
		}

		if ($loginUserCode === null || $loginUserCode === '') {
			return null;
		}

		if (isset($row['createdByUserCode']) && $row['createdByUserCode'] === $loginUserCode) {
			return $row;
		}

		if (isset($row['assignedUserCode']) && $row['assignedUserCode'] === $loginUserCode) {
			return $row;
		}

		if (TargetManagementUtil::isTargetAssignedToUser($targetCode, $loginUserCode, $pdoTarget)) {
			return $row;
		}

                return null;
        }

	public static function isTargetAssignedToUser($targetCode, $userCode, $pdoTarget)
	{
		if ($targetCode === null || $targetCode === '' || $userCode === null || $userCode === '') {
			return false;
		}

		$stmt = $pdoTarget->prepare('SELECT 1 FROM targetAssignedUsers WHERE targetCode = ? AND userCode = ? LIMIT 1');
		$stmt->execute(array($targetCode, $userCode));

		return $stmt->fetchColumn() !== false;
	}
}

?>
