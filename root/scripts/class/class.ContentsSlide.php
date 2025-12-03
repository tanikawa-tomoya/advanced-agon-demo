<?php

class ContentsSlide extends Base
{
        private $validatedTitle;
        private $validatedDescription;
        private $validatedSlides;
        private $validatedSlideCode;
        private $validatedIsPublished;
        private $titleProvided;
        private $descriptionProvided;
        private $slidesProvided;
        private $publishFlagProvided;

        public function __construct($context, bool $skipValidation = false)
        {
                $this->validatedTitle = null;
                $this->validatedDescription = null;
                $this->validatedSlides = array();
                $this->validatedSlideCode = null;
                $this->validatedIsPublished = null;
                $this->titleProvided = false;
                $this->descriptionProvided = false;
                $this->slidesProvided = false;
                $this->publishFlagProvided = false;
                parent::__construct($context, $skipValidation);
        }

        protected function validationCommon()
        {
                $this->requireParams(array('type'));
        }

        protected function validationSlideList()
        {
                if (isset($this->params['slideCode'])) {
                        $this->validatedSlideCode = $this->normalizeSlideCode($this->params['slideCode']);
                        if ($this->validatedSlideCode === null) {
                                throw new Exception(__FILE__ . ":" . __LINE__);
                        }
                } else {
                        $this->validatedSlideCode = null;
                }
        }

        protected function validationSlideCreate()
        {
                $this->titleProvided = true;
                $this->descriptionProvided = true;
                $this->slidesProvided = true;
                $this->publishFlagProvided = true;

                $this->validatedTitle = $this->normalizeTitleParam($this->params['title'] ?? null);
                $this->validatedDescription = $this->normalizeDescriptionParam($this->params['description'] ?? null);
                $this->validatedSlides = $this->normalizeSlidesParam($this->params['slides'] ?? array());
                $this->validatedIsPublished = $this->normalizeBooleanParam($this->params['isPublished'] ?? null, false);
        }

        protected function validationSlideUpdate()
        {
                $this->requireParams(array('slideCode'));
                $this->validatedSlideCode = $this->normalizeSlideCode($this->params['slideCode']);
                if ($this->validatedSlideCode === null) {
                        throw new Exception(__FILE__ . ":" . __LINE__);
                }

                if (array_key_exists('title', $this->params)) {
                        $this->titleProvided = true;
                        $this->validatedTitle = $this->normalizeTitleParam($this->params['title']);
                }

                if (array_key_exists('description', $this->params)) {
                        $this->descriptionProvided = true;
                        $this->validatedDescription = $this->normalizeDescriptionParam($this->params['description']);
                }

                if (array_key_exists('slides', $this->params)) {
                        $this->slidesProvided = true;
                        $this->validatedSlides = $this->normalizeSlidesParam($this->params['slides']);
                }

                if (array_key_exists('isPublished', $this->params)) {
                        $this->publishFlagProvided = true;
                        $this->validatedIsPublished = $this->normalizeBooleanParam($this->params['isPublished'], null);
                }
        }

        protected function validationSlideDelete()
        {
                $this->requireParams(array('slideCode'));
                $this->validatedSlideCode = $this->normalizeSlideCode($this->params['slideCode']);
                if ($this->validatedSlideCode === null) {
                        throw new Exception(__FILE__ . ":" . __LINE__);
                }
        }

        public function procSlideList()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $pdo = $this->getPDOSlide();

                $params = array();
                $query = 'SELECT slideCode, title, description, ownerUserCode, isPublished, createdAt, updatedAt FROM slides WHERE isDeleted = 0';
                if ($this->validatedSlideCode !== null) {
                        $query .= ' AND slideCode = ?';
                        $params[] = $this->validatedSlideCode;
                }
                $query .= ' ORDER BY createdAt DESC, id DESC';

                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if (count($rows) === 0) {
                        $this->response = array('slides' => array());
                        return;
                }

                $codes = array();
                foreach ($rows as $row) {
                        if (isset($row['slideCode'])) {
                                $codes[] = $row['slideCode'];
                        }
                }

                $slidesByCode = $this->fetchSlidesBySlideCodes($pdo, $codes);

                $payloads = array();
                foreach ($rows as $row) {
                        $code = isset($row['slideCode']) ? $row['slideCode'] : null;
                        $slides = isset($slidesByCode[$code]) ? $slidesByCode[$code] : array();
                        $payloads[] = array(
                                'slideCode' => $code,
                                'title' => isset($row['title']) ? $row['title'] : null,
                                'description' => isset($row['description']) ? $row['description'] : null,
                                'ownerUserCode' => isset($row['ownerUserCode']) ? $row['ownerUserCode'] : null,
                                'isPublished' => isset($row['isPublished']) ? (int) $row['isPublished'] : 0,
                                'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
                                'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
                                'slides' => $slides,
                        );
                }

                $this->response = array('slides' => $payloads);
        }

        public function procSlideCreate()
        {
                $ownerUserCode = $this->getLoginUserCode();
                if ($ownerUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $pdo = null;
                try {
                        $contentCodes = array();
                        foreach ($this->validatedSlides as $slide) {
                                if (isset($slide['contentCode'])) {
                                        $contentCodes[] = $slide['contentCode'];
                                }
                        }
                        $this->writeLog(
                                'procSlideCreate invoked owner=' . $ownerUserCode . ' title=' . $this->validatedTitle
                                . ' slides=' . count($this->validatedSlides)
                                . ' contentCodes=' . json_encode($contentCodes),
                                'slide'
                        );

                        $this->assertContentAvailability($this->validatedSlides, $ownerUserCode);

                        $pdo = $this->getPDOSlide();
                        $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
                        $slideCode = $this->generateUniqid();

                        $pdo->beginTransaction();

                        $stmt = $pdo->prepare(
                                'INSERT INTO slides (slideCode, title, description, ownerUserCode, isPublished, createdAt, updatedAt, isDeleted) VALUES (:code, :title, :description, :ownerUserCode, :isPublished, :createdAt, :updatedAt, 0)'
                        );
                        $stmt->execute(array(
                                ':code' => $slideCode,
                                ':title' => $this->validatedTitle,
                                ':description' => $this->validatedDescription,
                                ':ownerUserCode' => $ownerUserCode,
                                ':isPublished' => $this->validatedIsPublished ? 1 : 0,
                                ':createdAt' => $now,
                                ':updatedAt' => $now,
                        ));

                        $slides = $this->persistSlides($pdo, $slideCode, $this->validatedSlides, $now);

                        $pdo->commit();

                        $this->response = array(
                                'slide' => array(
                                        'slideCode' => $slideCode,
                                        'title' => $this->validatedTitle,
                                        'description' => $this->validatedDescription,
                                        'ownerUserCode' => $ownerUserCode,
                                        'isPublished' => $this->validatedIsPublished ? 1 : 0,
                                        'createdAt' => $now,
                                        'updatedAt' => $now,
                                        'slides' => $slides,
                                ),
                        );
                } catch (Exception $exception) {
                        if (isset($pdo) && $pdo->inTransaction()) {
                                $pdo->rollBack();
                        }
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database_error';
                        $this->response = array(
                                'message' => 'スライドショーの作成に失敗しました。',
                                'details' => $exception->getMessage(),
                        );
                        $this->writeLog('procSlideCreate failed: ' . $exception->getMessage(), 'slide');
                }
        }

        public function procSlideUpdate()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $pdo = null;
                try {
                        $pdo = $this->getPDOSlide();
                        $stmt = $pdo->prepare('SELECT id, slideCode, title, description, ownerUserCode, isPublished, createdAt, updatedAt FROM slides WHERE slideCode = :code AND isDeleted = 0 LIMIT 1');
                        $stmt->execute(array(':code' => $this->validatedSlideCode));
                        $current = $stmt->fetch(PDO::FETCH_ASSOC);

                        if ($current === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'not_found';
                                $this->response = array('message' => '指定されたスライドショーが見つかりません。');
                                return;
                        }

                        $ownerUserCode = isset($current['ownerUserCode']) ? $current['ownerUserCode'] : '';
                        if ($this->isSupervisor() == false && $this->isOperator() == false && $ownerUserCode !== $loginUserCode) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'permission';
                                return;
                        }

                        if ($this->slidesProvided) {
                                $this->assertContentAvailability($this->validatedSlides, $ownerUserCode);
                        }

                        $title = $this->titleProvided ? $this->validatedTitle : (isset($current['title']) ? $current['title'] : null);
                        $description = $this->descriptionProvided ? $this->validatedDescription : (isset($current['description']) ? $current['description'] : null);

                        if ($this->publishFlagProvided) {
                                $isPublished = $this->validatedIsPublished ? 1 : 0;
                        } else {
                                $isPublished = isset($current['isPublished']) ? (int) $current['isPublished'] : 0;
                        }

                        $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

                        $pdo->beginTransaction();
                        $updateStmt = $pdo->prepare('UPDATE slides SET title = :title, description = :description, isPublished = :isPublished, updatedAt = :updatedAt WHERE slideCode = :code AND isDeleted = 0');
                        $updateStmt->execute(array(
                                ':title' => $title,
                                ':description' => $description,
                                ':isPublished' => $isPublished,
                                ':updatedAt' => $now,
                                ':code' => $this->validatedSlideCode,
                        ));

                        if ($this->slidesProvided) {
                                $slides = $this->replaceSlides($pdo, $this->validatedSlideCode, $this->validatedSlides, $now);
                        } else {
                                $existingSlides = $this->fetchSlidesBySlideCodes($pdo, array($this->validatedSlideCode));
                                $slides = isset($existingSlides[$this->validatedSlideCode]) ? $existingSlides[$this->validatedSlideCode] : array();
                        }

                        $pdo->commit();

                        $this->response = array(
                                'slide' => array(
                                        'slideCode' => $this->validatedSlideCode,
                                        'title' => $title,
                                        'description' => $description,
                                        'ownerUserCode' => $ownerUserCode,
                                        'isPublished' => $isPublished,
                                        'createdAt' => isset($current['createdAt']) ? $current['createdAt'] : null,
                                        'updatedAt' => $now,
                                        'slides' => $slides,
                                ),
                        );
                } catch (Exception $exception) {
                        if (isset($pdo) && $pdo->inTransaction()) {
                                $pdo->rollBack();
                        }
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database_error';
                        $this->response = array(
                                'message' => 'スライドショーの更新に失敗しました。',
                                'details' => $exception->getMessage(),
                        );
                }
        }

        public function procSlideDelete()
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                        return;
                }

                $pdo = null;
                try {
                        $pdo = $this->getPDOSlide();
                        $stmt = $pdo->prepare('SELECT slideCode, ownerUserCode FROM slides WHERE slideCode = :code AND isDeleted = 0 LIMIT 1');
                        $stmt->execute(array(':code' => $this->validatedSlideCode));
                        $current = $stmt->fetch(PDO::FETCH_ASSOC);

                        if ($current === false) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'not_found';
                                $this->response = array('message' => '指定されたスライドショーが見つかりません。');
                                return;
                        }

                        $ownerUserCode = isset($current['ownerUserCode']) ? $current['ownerUserCode'] : '';
                        if ($this->isSupervisor() == false && $this->isOperator() == false && $ownerUserCode !== $loginUserCode) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'permission';
                                return;
                        }

                        $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

                        $pdo->beginTransaction();

                        $deleteSlides = $pdo->prepare('UPDATE slideSlides SET isDeleted = 1, updatedAt = :updatedAt WHERE slideCode = :code AND isDeleted = 0');
                        $deleteSlides->execute(array(':updatedAt' => $now, ':code' => $this->validatedSlideCode));

                        $deleteSlide = $pdo->prepare('UPDATE slides SET isDeleted = 1, updatedAt = :updatedAt WHERE slideCode = :code AND isDeleted = 0');
                        $deleteSlide->execute(array(':updatedAt' => $now, ':code' => $this->validatedSlideCode));

                        $pdo->commit();

                        $this->response = array('slideCode' => $this->validatedSlideCode);
                } catch (Exception $exception) {
                        if (isset($pdo) && $pdo->inTransaction()) {
                                $pdo->rollBack();
                        }
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'database_error';
                        $this->response = array(
                                'message' => 'スライドショーの削除に失敗しました。',
                                'details' => $exception->getMessage(),
                        );
                }
        }

        private function normalizeTitleParam($value)
        {
                $normalized = Util::normalizeRequiredString($value, 256);
                if ($normalized === false) {
                        throw new Exception(__FILE__ . ":" . __LINE__);
                }

                return $normalized;
        }

        private function normalizeDescriptionParam($value)
        {
                $normalized = Util::normalizeOptionalString($value, 1024);
                if ($normalized === false) {
                        throw new Exception(__FILE__ . ":" . __LINE__);
                }

                return $normalized;
        }

        private function normalizeSlidesParam($rawSlides)
        {
                if ($rawSlides === null) {
                        return array();
                }

                if (is_string($rawSlides)) {
                        $decoded = json_decode($rawSlides, true);
                        if (is_array($decoded) == false) {
                                throw new Exception(__FILE__ . ":" . __LINE__);
                        }
                        $rawSlides = $decoded;
                } elseif (is_array($rawSlides) == false) {
                        throw new Exception(__FILE__ . ":" . __LINE__);
                }

                $normalized = array();
                $fallbackOrder = 0;
                foreach ($rawSlides as $slide) {
                        if (is_array($slide) == false) {
                                throw new Exception(__FILE__ . ":" . __LINE__);
                        }

                        if (isset($slide['contentCode']) == false) {
                                throw new Exception(__FILE__ . ":" . __LINE__);
                        }

                        $contentCode = $this->normalizeContentCode($slide['contentCode']);
                        $caption = null;
                        if (array_key_exists('caption', $slide)) {
                                $caption = Util::normalizeOptionalString($slide['caption'], 512);
                                if ($caption === false) {
                                        throw new Exception(__FILE__ . ":" . __LINE__);
                                }
                        }

                        $orderValue = $fallbackOrder;
                        if (array_key_exists('displayOrder', $slide)) {
                                $orderValue = $this->normalizeDisplayOrder($slide['displayOrder'], $fallbackOrder);
                        }

                        $duration = null;
                        if (array_key_exists('durationSeconds', $slide)) {
                                $duration = $this->normalizeDuration($slide['durationSeconds']);
                        }

                        $normalized[] = array(
                                'contentCode' => $contentCode,
                                'caption' => $caption,
                                'displayOrder' => $orderValue,
                                'durationSeconds' => $duration,
                        );
                        $fallbackOrder++;
                }

                return $normalized;
        }

        private function normalizeSlideCode($value)
        {
                $code = trim((string) $value);
                if ($code === '') {
                        return null;
                }

                if (preg_match('/^[A-Za-z0-9_-]{4,64}$/', $code) !== 1) {
                        return null;
                }

                return $code;
        }

        private function normalizeContentCode($value)
        {
                $code = trim((string) $value);
                if ($code === '') {
                        throw new Exception(__FILE__ . ":" . __LINE__);
                }

                if (preg_match('/^[A-Za-z0-9_-]{4,64}$/', $code) !== 1) {
                        throw new Exception(__FILE__ . ":" . __LINE__);
                }

                return $code;
        }

        private function normalizeDisplayOrder($value, $default)
        {
                if (is_int($value)) {
                        $order = $value;
                } elseif (is_numeric($value)) {
                        $order = (int) $value;
                } else {
                        $order = $default;
                }

                if ($order < 0) {
                        $order = $default;
                }

                return $order;
        }

        private function normalizeDuration($value)
        {
                if ($value === null || $value === '') {
                        return null;
                }

                if (is_int($value)) {
                        $duration = $value;
                } elseif (is_numeric($value)) {
                        $duration = (int) $value;
                } else {
                        throw new Exception(__FILE__ . ":" . __LINE__);
                }

                if ($duration < 0) {
                        $duration = 0;
                }

                return $duration;
        }

        private function normalizeBooleanParam($value, $default)
        {
                if ($value === null) {
                        return $default;
                }

                if (is_bool($value)) {
                        return $value;
                }

                if (is_int($value)) {
                        return $value !== 0;
                }

                $trimmed = trim((string) $value);
                if ($trimmed === '') {
                        return $default;
                }

                $normalized = strtolower($trimmed);
                if (in_array($normalized, array('1', 'true', 'yes', 'on'), true)) {
                        return true;
                }
                if (in_array($normalized, array('0', 'false', 'no', 'off'), true)) {
                        return false;
                }

                return $default;
        }

        private function fetchSlidesBySlideCodes(PDO $pdo, array $codes)
        {
                $map = array();
                if (count($codes) === 0) {
                        return $map;
                }

                $placeholders = implode(',', array_fill(0, count($codes), '?'));
                $stmt = $pdo->prepare('SELECT slideSlideCode, slideCode, contentCode, caption, displayOrder, durationSeconds, createdAt, updatedAt FROM slideSlides WHERE isDeleted = 0 AND slideCode IN (' . $placeholders . ') ORDER BY displayOrder ASC, id ASC');
                $stmt->execute($codes);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($rows as $row) {
                        $slideCode = isset($row['slideCode']) ? $row['slideCode'] : null;
                        if ($slideCode === null) {
                                continue;
                        }

                        if (isset($map[$slideCode]) == false) {
                                $map[$slideCode] = array();
                        }

                        $map[$slideCode][] = array(
                                'slideSlideCode' => isset($row['slideSlideCode']) ? $row['slideSlideCode'] : null,
                                'slideCode' => isset($row['slideSlideCode']) ? $row['slideSlideCode'] : null,
                                'parentSlideCode' => $slideCode,
                                'contentCode' => isset($row['contentCode']) ? $row['contentCode'] : null,
                                'caption' => isset($row['caption']) ? $row['caption'] : null,
                                'displayOrder' => isset($row['displayOrder']) ? (int) $row['displayOrder'] : 0,
                                'durationSeconds' => isset($row['durationSeconds']) ? (int) $row['durationSeconds'] : null,
                                'createdAt' => isset($row['createdAt']) ? $row['createdAt'] : null,
                                'updatedAt' => isset($row['updatedAt']) ? $row['updatedAt'] : null,
                        );
                }

                return $map;
        }

        private function persistSlides(PDO $pdo, $parentSlideCode, array $slides, $timestamp)
        {
                $payloads = array();
                if (count($slides) === 0) {
                        return $payloads;
                }

                $stmt = $pdo->prepare('INSERT INTO slideSlides (slideSlideCode, slideCode, contentCode, caption, displayOrder, durationSeconds, createdAt, updatedAt, isDeleted) VALUES (:slideSlideCode, :slideCode, :contentCode, :caption, :displayOrder, :durationSeconds, :createdAt, :updatedAt, 0)');

                foreach ($slides as $slide) {
                        $slideSlideCode = $this->generateUniqid();

                        $stmt->execute(array(
                                ':slideSlideCode' => $slideSlideCode,
                                ':slideCode' => $parentSlideCode,
                                ':contentCode' => $slide['contentCode'],
                                ':caption' => $slide['caption'],
                                ':displayOrder' => $slide['displayOrder'],
                                ':durationSeconds' => $slide['durationSeconds'],
                                ':createdAt' => $timestamp,
                                ':updatedAt' => $timestamp,
                        ));

                        $payloads[] = array(
                                'slideSlideCode' => $slideSlideCode,
                                'slideCode' => $slideSlideCode,
                                'parentSlideCode' => $parentSlideCode,
                                'contentCode' => $slide['contentCode'],
                                'caption' => $slide['caption'],
                                'displayOrder' => $slide['displayOrder'],
                                'durationSeconds' => $slide['durationSeconds'],
                                'createdAt' => $timestamp,
                                'updatedAt' => $timestamp,
                        );
                }

                return $payloads;
        }

        private function replaceSlides(PDO $pdo, $slideCode, array $slides, $timestamp)
        {
                $deleteStmt = $pdo->prepare('UPDATE slideSlides SET isDeleted = 1, updatedAt = :updatedAt WHERE slideCode = :code AND isDeleted = 0');
                $deleteStmt->execute(array(':updatedAt' => $timestamp, ':code' => $slideCode));

                return $this->persistSlides($pdo, $slideCode, $slides, $timestamp);
        }

        private function assertContentAvailability(array $slides, ?string $ownerUserCode = null)
        {
                if (count($slides) === 0) {
                        return;
                }

                $contentCodes = array();
                foreach ($slides as $slide) {
                        if (isset($slide['contentCode'])) {
                                $contentCodes[] = $slide['contentCode'];
                        }
                }

                if (count($contentCodes) === 0) {
                        return;
                }

                $uniqueCodes = array_values(array_unique($contentCodes));
                $placeholders = implode(',', array_fill(0, count($uniqueCodes), '?'));
                $pdo = $this->getPDOContents();

                self::writeLog(
                        'assertContentAvailability checking owner=' . $ownerUserCode
                        . ' requested=' . json_encode($uniqueCodes),
                        'slide'
                );

                $stmt = $pdo->prepare('SELECT contentCode FROM userContents WHERE contentCode IN (' . $placeholders . ')');
                $stmt->execute($uniqueCodes);
                $existing = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

                if (is_array($existing) == false) {
                        throw new Exception(__FILE__ . ":" . __LINE__);
                }

                $missing = array_diff($uniqueCodes, $existing);
                $accessible = array();

                if (count($missing) > 0 && $ownerUserCode !== null) {
                        $accessStmt = $pdo->prepare(
                                'SELECT contentsCode FROM userContentsAccess WHERE userCode = ? AND contentsCode IN (' . $placeholders . ')'
                        );
                        $accessStmt->execute(array_merge(array($ownerUserCode), $uniqueCodes));
                        $accessible = $accessStmt->fetchAll(PDO::FETCH_COLUMN, 0);

                        if (is_array($accessible) == false) {
                                throw new Exception(__FILE__ . ":" . __LINE__);
                        }

                        $missing = array_diff($missing, $accessible);
                }
                if (count($missing) > 0) {
                        self::writeLog(
                                'assertContentAvailability missing content references: ' . json_encode(array_values($missing))
                                . ' owner=' . $ownerUserCode
                                . ' requested=' . json_encode($uniqueCodes)
                                . ' existing=' . json_encode(array_values($existing))
                                . ' accessible=' . json_encode(array_values($accessible)),
                                'slide'
                        );
                        throw new Exception(__FILE__ . ":" . __LINE__ . ': missing content references');
                }
        }
}

