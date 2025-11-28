<?php

class System extends Base
{
        private $defaultSiteTheme = 'classic';
        private $allowedSiteThemes = array('classic', 'light');

        public function __construct($context)
        {
                parent::__construct($context);
        }

        protected function validationCommon()
        {
                $this->requireParams(['type']);
        }

        protected function validationSiteGet()
        {
        }

        protected function validationSiteGetPublic()
        {
        }

        protected function validationSiteThemeGet()
        {
        }

        protected function validationSiteSettingSave()
        {
                $this->requireParams(['key']);
        }

	protected function validationSiteStorageUsageGet()
	{
	}

	protected function validationSiteSoftwareVersionsGet()
	{
	}

        protected function validationSiteContact()
        {
                $this->requireParams(['userName', 'userMail', 'legend']);
        }

        protected function validationContactLogList()
        {
                $allowedSortKeys = array('date', 'name', 'mail', 'legend', 'userId');
                $allowedOrders = array('asc', 'desc');
                $allowedSources = array('all', 'member', 'guest');
                $allowedPeriods = array('7d', '30d', '90d', 'all');

                $sort = isset($this->params['sort']) ? (string) $this->params['sort'] : 'date';
                $order = isset($this->params['order']) ? strtolower((string) $this->params['order']) : 'desc';
                $source = isset($this->params['source']) ? (string) $this->params['source'] : 'all';
                $period = isset($this->params['period']) ? (string) $this->params['period'] : '30d';

                if (array_search($sort, $allowedSortKeys, true) === false) {
                        throw new Exception(__FILE__ . ':' . __LINE__);
                }
                if (array_search($order, $allowedOrders, true) === false) {
                        throw new Exception(__FILE__ . ':' . __LINE__);
                }
                if (array_search($source, $allowedSources, true) === false) {
                        throw new Exception(__FILE__ . ':' . __LINE__);
                }
                if (array_search($period, $allowedPeriods, true) === false) {
                        throw new Exception(__FILE__ . ':' . __LINE__);
                }
        }

        public function procSiteGet()
        {
                $stmt = $this->getPDOCommon()->prepare("SELECT * FROM siteSettings");
                $stmt->execute(array());
                $this->response = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        public function procSiteThemeGet()
        {
                $this->validationSiteThemeGet();
                $theme = $this->getSiteTheme();
                $this->response = array(
                        'theme' => $theme,
                        'options' => $this->allowedSiteThemes,
                );
                $this->status = parent::RESULT_SUCCESS;
        }

        public function procSiteSettingSave()
        {
                $this->validationCommon();
                $this->validationSiteSettingSave();

		$key = trim($this->params['key']);
		if ($key === '') {
			$this->status = parent::RESULT_ERROR;
			$this->errorReason = 'invalid_key';
			return;
		}

                $value = $this->params['value'] ?? '';
                if ($key === 'siteTheme') {
                        $value = $this->normalizeSiteThemeValue($value);
                        if ($value === null) {
                                $this->status = parent::RESULT_ERROR;
                                $this->errorReason = 'invalid_siteTheme';
                                return;
                        }
                } elseif (is_array($value)) {
                        $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                } else {
                        $value = (string) $value;
                }

		$stmt = $this->getPDOCommon()->prepare(
											   "INSERT INTO siteSettings (key, value) VALUES (?, ?) " .
											   "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
											   );
		$stmt->execute(array($key, $value));

                $this->response = array('key' => $key, 'value' => $value);
                $this->status = parent::RESULT_SUCCESS;
        }

        private function getSiteTheme(): string
        {
                $stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
                $stmt->execute(array('siteTheme'));
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $value = $row && isset($row['value']) ? $row['value'] : $this->defaultSiteTheme;
                $normalized = $this->normalizeSiteThemeValue($value);
                if ($normalized === null) {
                        return $this->defaultSiteTheme;
                }
                return $normalized;
        }

        private function normalizeSiteThemeValue($value): ?string
        {
                $normalized = is_string($value) ? trim($value) : (string) $value;
                if ($normalized === '') {
                        return $this->defaultSiteTheme;
                }
                return array_search($normalized, $this->allowedSiteThemes, true) !== false ? $normalized : null;
        }

        public function procSiteStorageUsageGet()
        {
                $this->validationCommon();
                $this->validationSiteStorageUsageGet();

		$pageRaw = $this->getSafeParam('page', '');
		$page = (int) filter_var($pageRaw, FILTER_VALIDATE_INT, array('options' => array('min_range' => 1)));
		if ($page < 1) {
			$page = 1;
		}

		$perPageRaw = $this->getSafeParam('perPage', '');
		$perPage = (int) filter_var($perPageRaw, FILTER_VALIDATE_INT, array('options' => array('min_range' => 1)));
		if ($perPage < 1) {
			$perPage = 50;
		}

		$maxPerPage = 200;
		if ($perPage > $maxPerPage) {
			$perPage = $maxPerPage;
		}

		$userDataPath = $this->dataBasePath . '/userdata';
		$bytes = 0;

		if (is_dir($userDataPath) || is_file($userDataPath)) {
			$arg = escapeshellarg($userDataPath);
			$byteCommand = 'du -sb ' . $arg . ' 2>/dev/null';
			$byteOutput = array();
			$byteExit = 0;
			@exec($byteCommand, $byteOutput, $byteExit);
			if ($byteExit === 0 && count($byteOutput) > 0) {
				$parts = preg_split('/\s+/', trim($byteOutput[0]));
				if ($parts && isset($parts[0]) && is_numeric($parts[0])) {
					$bytes = max(0, (int) $parts[0]);
				}
			}
		}

		$logger = function ($message) {
			$this->writeLog($message);
		};

		if ($bytes <= 0) {
			$bytes = Util::calculateDirectorySize($userDataPath, $logger);
		}

		$userDataUsage = array();
		if (is_dir($userDataPath)) {
			$entries = @scandir($userDataPath);
			if ($entries !== false) {
				foreach ($entries as $entry) {
					if ($entry === '.' || $entry === '..') {
						continue;
					}
					$fullPath = $userDataPath . '/' . $entry;
					$size = Util::calculateDirectorySize($fullPath, $logger);
					$userDataUsage[] = array(
										 'userId' => $entry,
										 'bytes' => $size,
										 'formatted' => Util::formatBytes($size),
										 );
				}
			}
		}

		usort($userDataUsage, function ($a, $b) {
				$aBytes = isset($a['bytes']) ? (int) $a['bytes'] : 0;
				$bBytes = isset($b['bytes']) ? (int) $b['bytes'] : 0;
				if ($aBytes === $bBytes) {
					$aCode = isset($a['userId']) ? (string) $a['userId'] : '';
					$bCode = isset($b['userId']) ? (string) $b['userId'] : '';
					return strcmp($aCode, $bCode);
				}
				return ($bBytes <=> $aBytes);
			});

		$totalUserDatas = count($userDataUsage);
		$offset = ($page - 1) * $perPage;
		if ($offset < 0) {
			$offset = 0;
		}

		$userDatasPage = array();
		if ($perPage > 0) {
			$userDatasPage = array_slice($userDataUsage, $offset, $perPage);
		}

		$totalPages = 0;
		if ($perPage > 0 && $totalUserDatas > 0) {
			$totalPages = (int) ceil($totalUserDatas / $perPage);
		}

		$hasNextPage = $totalPages > 0 && $page < $totalPages;
		$hasPreviousPage = $page > 1 && $totalUserDatas > 0;

		$nextPage = $hasNextPage ? $page + 1 : null;
		if ($nextPage !== null && $totalPages > 0 && $nextPage > $totalPages) {
			$nextPage = null;
		}

		$previousPage = $hasPreviousPage ? $page - 1 : null;
		if ($previousPage !== null && $previousPage < 1) {
			$previousPage = null;
		}

		$this->response = array(
								'totalBytes' => $bytes,
								'totalFormatted' => Util::formatBytes($bytes),
								'userDatas' => $userDatasPage,
								'pagination' => array(
													  'page' => $page,
													  'perPage' => $perPage,
													  'totalCount' => $totalUserDatas,
													  'totalPages' => $totalPages,
													  'hasNextPage' => $hasNextPage ? 1 : 0,
													  'hasPreviousPage' => $hasPreviousPage ? 1 : 0,
													  'nextPage' => $nextPage,
													  'previousPage' => $previousPage,
													  ),
								);
		$this->status = parent::RESULT_SUCCESS;
	}

	public function procSiteSoftwareVersionsGet()
	{
		$this->validationCommon();
		$this->validationSiteSoftwareVersionsGet();

		$softwareSpecs = array(
							   array(
									 'software' => 'FFmpeg',
									 'commands' => array(
														 array(
															   'command' => 'ffmpeg -version',
															   'pattern' => '/^(ffmpeg\s+version\s+[^\n]+)/mi',
															   ),
														 ),
									 ),
							   array(
									 'software' => 'ImageMagick',
									 'commands' => array(
														 array(
															   'command' => 'magick -version',
															   'pattern' => '/^(Version:\s*ImageMagick\s+[^\n]+)/mi',
															   ),
														 array(
															   'command' => 'convert -version',
															   'pattern' => '/^(Version:\s*ImageMagick\s+[^\n]+)/mi',
															   ),
														 ),
									 ),
							   array(
									 'software' => 'Apache',
									 'commands' => array(
														 array(
															   'command' => 'apache2 -v',
															   'pattern' => '/^(Server version:\s*Apache\/[^\n]+)/mi',
															   ),
														 array(
															   'command' => 'httpd -v',
															   'pattern' => '/^(Server version:\s*Apache\/[^\n]+)/mi',
															   ),
														 ),
									 ),
							   array(
									 'software' => 'PHP',
									 'commands' => array(
														 array(
															   'command' => 'php -v',
															   'pattern' => '/^(PHP\s+[^\n]+)/mi',
															   ),
														 ),
									 ),
							   array(
									 'software' => 'SQLite3',
									 'commands' => array(
														 array(
															   'command' => 'sqlite3 --version',
															   'pattern' => '/^(\d+\.\d+\.\d+[^\n]*)/m',
															   ),
														 ),
									 ),
							   );

		$results = array();

		foreach ($softwareSpecs as $spec) {
			$entry = array(
						   'software' => (string) $spec['software'],
						   'version' => '',
						   'details' => '',
						   'command' => '',
						   'success' => false,
						   );

			foreach ($spec['commands'] as $commandSpec) {
				$command = isset($commandSpec['command']) ? (string) $commandSpec['command'] : '';
				if ($command === '') {
					continue;
				}

				$run = Util::runSoftwareVersionCommand($command);
				$outputLines = isset($run['output']) && is_array($run['output']) ? $run['output'] : array();
				$pattern = isset($commandSpec['pattern']) ? $commandSpec['pattern'] : null;

				$entry['command'] = $command;

				$version = Util::extractSoftwareVersion($outputLines, $pattern);
				if ($version !== '') {
					$entry['version'] = $version;
				}

				$details = Util::summarizeSoftwareOutput($outputLines);
				if ($details !== '') {
					$entry['details'] = $details;
				}

				if ((int) $run['exitCode'] === 0 && $entry['version'] !== '') {
					$entry['success'] = true;
					break;
				}
			}

			if ($entry['details'] === '' && $entry['version'] !== '') {
				$entry['details'] = $entry['version'];
			}

			$results[] = $entry;
		}

		$this->response = array('entries' => $results);
		$this->status = parent::RESULT_SUCCESS;
	}

        public function procSiteContact()
        {
                $userName = htmlspecialchars($this->params['userName'], ENT_QUOTES, "UTF-8");
                $userMail = htmlspecialchars($this->params['userMail'], ENT_QUOTES, "UTF-8");
                $legend = htmlspecialchars($this->params['legend'], ENT_QUOTES, "UTF-8");
		
		$stmt = $this->getPDOCommon()->prepare("SELECT * FROM siteSettings");
		$stmt->execute(array());
		$siteInfo = $stmt->fetchAll(PDO::FETCH_ASSOC);

		$userId = NULL;
		
		if ($this->session["userId"]) {
			$userId = $this->session["userId"];
		}
		
		$now = new DateTime('now');	  		
		$date = $now->format('Y-m-d H:i:s');
		
		$stmt = $this->getPDOContact()->prepare("INSERT INTO contactLog (userName, userMail, date, legend, userId) VALUES(?, ?, ?, ?, ?)");
		$stmt->execute(array($userName, $this->encrypt($userMail), $date, $legend, $userId));

		$stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
		$stmt->execute(array("supportMail"));
		$supportMail = json_decode($stmt->fetch(PDO::FETCH_ASSOC)["value"]);

		$to = $supportMail;

		$title = $this->getSiteTitle();
		$subjectMessage = array("title" => $title, "message" => "問い合わせ");
        
		$body = "";
		$body .= "以下の内容で問い合わせを受け付けました\n\n";
		$body .= "名前：" . $userName . "\n";
		$body .= "メールアドレス：" . $userMail . "\n";
		$body .= "内容：" . $legend . "\n";
		$body .= "\n";
		$body .= "\n";    
		$body .= "--\n";
		$body .= $title . "\n";
		$body .= "https://" . $this->getDomain() . "\n";
		
		$stmt = $this->getPDOCommon()->prepare("SELECT value FROM siteSettings WHERE key = ?");
		$stmt->execute(array("notifyMail"));
		$notifyMail = $stmt->fetch(PDO::FETCH_ASSOC)["value"];
		
                foreach( $to as $to_email) {
                        $this->phpMailerSendPostfix($notifyMail, $to_email, $title, $subjectMessage, $body);
                        sleep(1);
                }

                $this->status = parent::RESULT_SUCCESS;
        }

        public function procContactLogList()
        {
                $this->validationCommon();
                $this->validationContactLogList();

                $keyword = isset($this->params['keyword']) ? trim((string) $this->params['keyword']) : '';
                $source = isset($this->params['source']) ? (string) $this->params['source'] : 'all';
                $period = isset($this->params['period']) ? (string) $this->params['period'] : '30d';
                $sortKey = isset($this->params['sort']) ? (string) $this->params['sort'] : 'date';
                $order = isset($this->params['order']) ? strtolower((string) $this->params['order']) : 'desc';
                $page = isset($this->params['page']) ? (int) $this->params['page'] : 1;
                $perPage = isset($this->params['perPage']) ? (int) $this->params['perPage'] : 50;
                $maxPerPage = 200;

                if ($page < 1) {
                        $page = 1;
                }
                if ($perPage < 1) {
                        $perPage = 1;
                }
                if ($perPage > $maxPerPage) {
                        $perPage = $maxPerPage;
                }

                $pdo = $this->getPDOContact();

                $conditions = array();
                $params = array();
                $daysMap = array('7d' => 7, '30d' => 30, '90d' => 90);
                if (isset($daysMap[$period])) {
                        $days = (int) $daysMap[$period];
                        $since = new DateTime("-{$days} days");
                        $conditions[] = 'date >= ?';
                        $params[] = $since->format('Y-m-d H:i:s');
                }

                if ($source === 'member') {
                        $conditions[] = 'userId IS NOT NULL';
                } elseif ($source === 'guest') {
                        $conditions[] = 'userId IS NULL';
                }

                $where = '';
                if (count($conditions) > 0) {
                        $where = ' WHERE ' . implode(' AND ', $conditions);
                }

                $stmt = $pdo->prepare("SELECT rowid as id, userName, userMail, date, legend, userId FROM contactLog" . $where . " ORDER BY date DESC");
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $list = array();
                foreach ($rows as $row) {
                        $mail = isset($row['userMail']) ? $this->decrypt($row['userMail']) : '';
                        $list[] = array(
                                'id' => isset($row['id']) ? (int) $row['id'] : null,
                                'userName' => isset($row['userName']) ? (string) $row['userName'] : '',
                                'userMail' => (string) $mail,
                                'date' => isset($row['date']) ? (string) $row['date'] : '',
                                'legend' => isset($row['legend']) ? (string) $row['legend'] : '',
                                'userId' => isset($row['userId']) ? $row['userId'] : null,
                        );
                }

                if ($keyword !== '') {
                        $lowerKeyword = mb_strtolower($keyword, 'UTF-8');
                        $list = array_filter($list, function ($entry) use ($lowerKeyword) {
                                $haystack = array(
                                        isset($entry['userName']) ? $entry['userName'] : '',
                                        isset($entry['userMail']) ? $entry['userMail'] : '',
                                        isset($entry['legend']) ? $entry['legend'] : '',
                                        isset($entry['userId']) ? (string) $entry['userId'] : ''
                                );
                                $joined = mb_strtolower(implode(' ', $haystack), 'UTF-8');
                                return mb_strpos($joined, $lowerKeyword, 0, 'UTF-8') !== false;
                        });
                        $list = array_values($list);
                }

                $list = $this->sortContactLogs($list, $sortKey, $order);

                $totalCount = count($list);
                $totalPages = (int) ceil($totalCount / $perPage);
                $offset = ($page - 1) * $perPage;
                $entries = array_slice($list, $offset, $perPage);

                $this->response = array(
                        'entries' => $entries,
                        'pagination' => array(
                                'page' => $page,
                                'perPage' => $perPage,
                                'totalCount' => $totalCount,
                                'totalPages' => $totalPages,
                        ),
                        'filters' => array(
                                'keyword' => $keyword,
                                'source' => $source,
                                'period' => $period,
                                'sort' => $sortKey,
                                'order' => $order
                        )
                );
                $this->status = parent::RESULT_SUCCESS;
        }

        private function sortContactLogs($list, $sortKey, $order)
        {
                $orderFactor = ($order === 'asc') ? 1 : -1;
                usort($list, function ($a, $b) use ($sortKey, $orderFactor) {
                        if ($sortKey === 'name') {
                                return $orderFactor * strcmp((string) $a['userName'], (string) $b['userName']);
                        }
                        if ($sortKey === 'mail') {
                                return $orderFactor * strcmp((string) $a['userMail'], (string) $b['userMail']);
                        }
                        if ($sortKey === 'legend') {
                                return $orderFactor * strcmp((string) $a['legend'], (string) $b['legend']);
                        }
                        if ($sortKey === 'userId') {
                                return $orderFactor * strcmp((string) $a['userId'], (string) $b['userId']);
                        }

                        $aTime = isset($a['date']) ? strtotime($a['date']) : 0;
                        $bTime = isset($b['date']) ? strtotime($b['date']) : 0;
                        if ($aTime === $bTime) {
                                return 0;
                        }
                        return ($aTime > $bTime) ? $orderFactor * 1 : $orderFactor * -1;
                });
                return $list;
        }

	private function getPDOContact()
	{
		if (isset($this->pdoContact) == false) {
			// contactはSQLログの対象としない
			$this->pdoContact = $this->getSQLiteConnection($this->dataBasePath . "/db/contact.sqlite");
		}
		return $this->pdoContact;
	}
}

?>
