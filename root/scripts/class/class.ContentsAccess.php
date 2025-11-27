<?php

class ContentsAccess extends Base
{
        public function __construct($context, bool $skipValidation = false)
        {
                parent::__construct($context, $skipValidation);
        }

        protected function validationCommon()
        {
                $this->requireParams(['type']);
        }

        protected function validationAccessList()
        {
                // no-op
        }

        protected function validationAccessCreate()
        {
                $this->requireParams(['userCode', 'contentsCode']);
        }

        protected function validationAccessUpdate()
        {
                $this->requireParams(['userCode', 'contentsCode']);
        }

        protected function validationAccessDelete()
        {
                $this->requireParams(['userCode', 'contentsCode']);
        }

        private function normalizeNullableDateParam(string $key): ?string
        {
                if (array_key_exists($key, $this->params) === false) {
                        return null;
                }

                $value = trim((string) $this->params[$key]);
                if ($value === '') {
                        return null;
                }

                return $value;
        }

        private function ensureLoginUser(): ?string
        {
                $loginUserCode = $this->getLoginUserCode();
                if ($loginUserCode === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'login_required';
                }

                return $loginUserCode;
        }

        private function fetchAccessRecord(string $userCode, string $contentsCode): ?array
        {
                $stmt = $this->getPDOContents()->prepare('SELECT userCode, contentsCode, startDate, endDate, createdAt, updatedAt FROM userContentsAccess WHERE userCode = ? AND contentsCode = ?');
                $stmt->execute(array($userCode, $contentsCode));
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row === false) {
                        return null;
                }

                return $row;
        }

        public function procAccessCreate()
        {
                if ($this->ensureLoginUser() === null) {
                        return;
                }

                $userCode = trim((string) $this->params['userCode']);
                $contentsCode = trim((string) $this->params['contentsCode']);
                $startDate = $this->normalizeNullableDateParam('startDate');
                $endDate = $this->normalizeNullableDateParam('endDate');

                $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

                $stmt = $this->getPDOContents()->prepare('INSERT INTO userContentsAccess (userCode, contentsCode, startDate, endDate, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?) ON CONFLICT(userCode, contentsCode) DO UPDATE SET startDate=excluded.startDate, endDate=excluded.endDate, updatedAt=excluded.updatedAt');
                $stmt->execute(array($userCode, $contentsCode, $startDate, $endDate, $now, $now));

                $this->response = $this->fetchAccessRecord($userCode, $contentsCode);
        }

        public function procAccessUpdate()
        {
                if ($this->ensureLoginUser() === null) {
                        return;
                }

                $userCode = trim((string) $this->params['userCode']);
                $contentsCode = trim((string) $this->params['contentsCode']);
                $existing = $this->fetchAccessRecord($userCode, $contentsCode);
                if ($existing === null) {
                        $this->status = parent::RESULT_ERROR;
                        $this->errorReason = 'not_found';
                        return;
                }

                $startDate = $this->normalizeNullableDateParam('startDate');
                $endDate = $this->normalizeNullableDateParam('endDate');
                $now = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

                $stmt = $this->getPDOContents()->prepare('UPDATE userContentsAccess SET startDate = ?, endDate = ?, updatedAt = ? WHERE userCode = ? AND contentsCode = ?');
                $stmt->execute(array($startDate, $endDate, $now, $userCode, $contentsCode));

                $this->response = $this->fetchAccessRecord($userCode, $contentsCode);
        }

        public function procAccessList()
        {
                if ($this->ensureLoginUser() === null) {
                        return;
                }

                $conditions = array();
                $values = array();

                if (isset($this->params['userCode']) && trim((string) $this->params['userCode']) !== '') {
                        $conditions[] = 'userCode = ?';
                        $values[] = trim((string) $this->params['userCode']);
                }

                if (isset($this->params['contentsCode']) && trim((string) $this->params['contentsCode']) !== '') {
                        $conditions[] = 'contentsCode = ?';
                        $values[] = trim((string) $this->params['contentsCode']);
                }

                $sql = 'SELECT userCode, contentsCode, startDate, endDate, createdAt, updatedAt FROM userContentsAccess';
                if (count($conditions) > 0) {
                        $sql .= ' WHERE ' . implode(' AND ', $conditions);
                }
                $sql .= ' ORDER BY userCode, contentsCode';

                $stmt = $this->getPDOContents()->prepare($sql);
                $stmt->execute($values);

                $this->response = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        public function procAccessDelete()
        {
                if ($this->ensureLoginUser() === null) {
                        return;
                }

                $userCode = trim((string) $this->params['userCode']);
                $contentsCode = trim((string) $this->params['contentsCode']);

                $stmt = $this->getPDOContents()->prepare('DELETE FROM userContentsAccess WHERE userCode = ? AND contentsCode = ?');
                $stmt->execute(array($userCode, $contentsCode));

                $this->response = array('deleted' => ($stmt->rowCount() > 0));
        }
}
?>
