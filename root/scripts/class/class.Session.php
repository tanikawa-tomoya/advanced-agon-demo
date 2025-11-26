<?php

class Session extends Base
{
	public function __construct($context)
	{
		parent::__construct($context);
	}
	
	protected function validationLogin()
	{
		$this->requireParams(['p', 'userCode', 'check']);
	}

	protected function validationLogout()
	{
	}

	protected function validationHello()
	{
	}

	public function procLogin()
	{
		$pass = $this->getSafeParam('p');
		$rawUserIdentifier = $this->params['userCode'] ?? null;
		$userCode = $this->getSafeParam('userCode');
		$check = $this->getSafeParam('check');

		$userMail = null;
		if (isset($this->params['userMail'])) {
			$safeMail = $this->getSafeParam('userMail');
			if ($safeMail !== '') {
				$userMail = $safeMail;
			}
		}

		if ($userCode === '') {
			$userCode = null;
		}

		if ($userMail === null && $userCode !== null && $rawUserIdentifier !== null && strpos((string) $rawUserIdentifier, '@') !== false) {
			$userMail = $userCode;
			$userCode = null;
		}

		if ($userMail === null && $userCode === null) {
			$this->status = parent::RESULT_ERROR;
			return;
		}

                if ($this->isValidLoginCheck($check) == false) {
                        $this->status = parent::RESULT_ERROR;
                        return;
                }

		// セッション管理
		$userInfo = $this->fetchLoginUser($this->getPDOCommon(), $userCode, $userMail, $pass);

		if ($userInfo == NULL) {
			$this->status = parent::RESULT_ERROR;
			return;
		}
	  	  
		$this->session["userId"] = $userInfo["id"];
		unset($this->session["isOperator"]);
		unset($this->session["isSupervisor"]);
		if ($userInfo["isSupervisor"] == 1) {
			$this->session["isSupervisor"] = true;
			$this->session["isOperator"] = true;
		} else if ($userInfo["isOperator"] == 1) {
			$this->session["isOperator"] = true;
		}
		$this->session["userCode"] = $userInfo["userCode"];

		$claims = array(
			'userId'       => (int) $userInfo['id'],
			'isSupervisor' => (int) $userInfo['isSupervisor'] === 1 ? 1 : 0,
			'isOperator'   => (int) $userInfo['isOperator'] === 1 ? 1 : 0,
							);
		$token = $this->issueJwt($claims);

		$jwtPayload = null;
		try {
			$verified = $this->verifyJwt($token);
			if (is_array($verified)) {
				$jwtPayload = $verified;
			}
		} catch (Throwable $throwable) {
			$jwtPayload = null;
		}

		$effectivePayload = is_array($jwtPayload) && !empty($jwtPayload) ? $jwtPayload : $claims;
		$this->setAuthPayload($effectivePayload);
		$this->syncSessionWithAuthPayload($effectivePayload, true);
		$this->setAuthTokenCookie($token, self::AUTH_TOKEN_TTL);

		if (!empty($this->session['isSupervisor'])) {
			$this->ensureCycleProcRunning();
		}

		$this->response = array(
							"userCode"     => $userInfo["userCode"],
							"displayName" => $userInfo["displayName"],
							"mail"        => $this->decrypt($userInfo["mail"]),
								"isSupervisor" => (int) $userInfo["isSupervisor"],
								"isOperator"   => (int) $userInfo["isOperator"],
								"token"        => $token,
								"userId"       => (int) $userInfo["id"],
								);
	}

	public function procLogout()
	{
		$this->clearSession();
		$this->authPayload = null;
		$this->response = array("status" => "OK");
	}

        public function procHello()
        {
        }

        /**
         * Login 時の確認用かなチェックを行う
         */
        protected function isValidLoginCheck($input, $minLength = 6)
        {
                return $this->isHiraganaWithMinLength($input, $minLength);
        }

        protected function isHiraganaWithMinLength($input, $minLength)
        {
                return preg_match('/^[\p{Hiragana}]{' . $minLength . ',}$/u', $input) === 1;
        }

        protected function clearSession ()
        {
                if (session_status() === PHP_SESSION_ACTIVE) {
                        @session_regenerate_id(true);
                }

		$_SESSION = [];

		$headersAvailable = !headers_sent();

		if ($headersAvailable && ini_get("session.use_cookies")) {
			$params = session_get_cookie_params();
			$cookieOptions = [
							  'expires'  => time() - 42000,
							  'secure'   => isset($params['secure']) ? (bool) $params['secure'] : $this->isSecureRequest(),
							  'httponly' => isset($params['httponly']) ? (bool) $params['httponly'] : true,
							  'samesite' => isset($params['samesite']) && $params['samesite'] ? $params['samesite'] : 'Lax',
							  ];

			if (array_key_exists('path', $params)) {
				$cookieOptions['path'] = $params['path'];
			} else {
				$cookieOptions['path'] = '/';
			}

			if (!empty($params['domain'])) {
				$cookieOptions['domain'] = $params['domain'];
			}

			setcookie(session_name(), '', $cookieOptions);
		}

		if (session_name() !== '') {
			unset($_COOKIE[session_name()]);
		}

		$this->clearAuthTokenCookie();

		if (session_status() === PHP_SESSION_ACTIVE) {
			session_destroy();
		} else {
			@session_start();
			if (session_status() === PHP_SESSION_ACTIVE) {
				session_destroy();
			}
		}
	}

        protected function ensureCycleProcRunning()
        {
                        $lockPath = $this->getContentsBasePath() . '/scripts/cycleProc.lock';
                        $scriptPath = $this->getContentsBasePath() . '/scripts/cycleProc.php';
                        $scheme = $this->isSecureRequest() ? 'https://' : 'http://';
                        $baseUrl = $scheme . $this->getDomain();

                        if ($this->isCycleProcRunning($scriptPath, $baseUrl)) {
                                return;
                        }

                        $this->resetCycleProcLock($lockPath);
                        $this->startCycleProc($scriptPath, $baseUrl);
        }

        protected function isCycleProcRunning($scriptPath, $baseUrl)
        {
                        $command = sprintf(
                                "ps ax -o command= | grep -F %s | grep -F %s | grep -v grep",
                                escapeshellarg($scriptPath),
                                escapeshellarg($baseUrl)
                        );

                        $output = array();
                        $exitCode = null;
                        @exec($command, $output, $exitCode);

                        return is_array($output) && !empty($output);
        }

        protected function resetCycleProcLock($lockPath)
        {
                        if (!is_file($lockPath)) {
                                return;
                        }

                        if (@unlink($lockPath)) {
                                self::writeLog('cycleProc lock removed: path=' . $lockPath, 'cycleProc');
                        }
        }

        protected function startCycleProc($scriptPath, $baseUrl)
        {
                        if (!is_file($scriptPath)) {
                                self::writeLog('startCycleProc aborted: cycleProc.php is not file path=' . $scriptPath, 'cycleProc');
                                return;
                        }
                        if (!is_executable($scriptPath)) {
                                self::writeLog('startCycleProc aborted: cycleProc.php is not executable', 'cycleProc');
                                return;
                        }

                        $command = sprintf("%s %s %s > /dev/null 2>&1 &",
   escapeshellarg($scriptPath),
   escapeshellarg(self::getSiteId()),
   escapeshellarg($baseUrl)
   );

                        $output = array();
                        $exitCode = null;
                        @exec($command, $output, $exitCode);

                        self::writeLog('startCycleProc executed: command=' . $command . ' exitCode=' . (is_numeric($exitCode) ? $exitCode : 'unknown'), 'cycleProc');
        }

	protected function fetchLoginUser($pdo, $userCode, $userMail, $password)
	{
		$password = trim((string) $password);
                if ($password === '') {
                        return null;
                }

                $stmt = null;
                if ($userMail !== null && $userMail !== '') {
                        $stmt = $pdo->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND mail = ?");
                        $stmt->execute(array($this->encrypt($userMail)));
                } else if ($userCode !== null && $userCode !== '') {
                        $stmt = $pdo->prepare("SELECT * FROM user WHERE isDeleted IS NULL AND userCode = ?");
                        $stmt->execute(array($userCode));
                } else {
                        return null;
                }

                $userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$userInfo) {
                        return null;
                }

                $hash = isset($userInfo['hash']) ? trim((string) $userInfo['hash']) : '';
                if ($hash !== '') {
                        return $this->getHash($password) === $hash ? $userInfo : null;
                }

                $autoPassword = isset($userInfo['autoPassword']) ? (string) $userInfo['autoPassword'] : '';
                if ($autoPassword === '') {
                        return null;
                }

                return $autoPassword === $password ? $userInfo : null;
        }
}

?>
