#!/usr/bin/env php
<?php

declare(strict_types=1);

require_once __DIR__ . '/class/class.Base.php';

class CycleProc
{
    private const LOCK_PATH = __DIR__ . '/cycleProc.lock';
    private const INTERVAL_SECONDS = 5;

    /** @var resource|null */
    private $lockHandle;
    private $siteId;
    private $baseUrl;
    private $requestUrl;

    public function __construct(string $siteId, string $baseUrl)
    {
        $this->siteId = $siteId;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->requestUrl = $this->baseUrl . '/scripts/request.php';

		$this->writeLog("__construct() completed.");
    }

    public function run(): void
    {
		$this->writeLog("run() started.");
		
        if ($this->siteId === '') {
            $this->writeLog('Valid siteId argument is required.');
            return;
        }

        if ($this->baseUrl === '' || !$this->isValidUrl($this->baseUrl)) {
            $this->writeLog('Valid URL argument is required.');
            return;
        }

        if (!$this->acquireLock()) {
            return;
        }

        $this->writeLog('cycleProc started.');

        while (true) {
            try {
                $this->runQueueCycle();
            } catch (Throwable $exception) {
            }

            sleep(self::INTERVAL_SECONDS);
        }
    }

    private function acquireLock(): bool
    {
        $this->lockHandle = fopen(self::LOCK_PATH, 'c+');
        if ($this->lockHandle === false) {
            $this->writeLog('Failed to open lock file for cycleProc');
            return false;
        }

        if (!flock($this->lockHandle, LOCK_EX | LOCK_NB)) {
            $this->writeLog('cycleProc is already running');
            fclose($this->lockHandle);
            $this->lockHandle = null;
            return false;
        }

        fwrite($this->lockHandle, (string) getmypid());
        fflush($this->lockHandle);

        return true;
    }

    private function runQueueCycle(): void
    {
        $payload = http_build_query(
            array(
                'requestType' => 'Queue',
                'type' => 'RunNextJob',
                'token' => Base::API_TOKEN,
            ),
            '',
            '&',
            PHP_QUERY_RFC3986
        );

        $context = stream_context_create(
            array(
                'http' => array(
                    'method' => 'POST',
                    'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                    'content' => $payload,
                    'timeout' => 30,
                ),
            )
        );

        $responseBody = @file_get_contents($this->requestUrl, false, $context);
        if ($responseBody === false) {
            $error = error_get_last();
            $message = isset($error['message']) ? (string) $error['message'] : 'unknown error';
            return;
        }

        $decoded = json_decode($responseBody, true);
        if (!is_array($decoded)) {
            return;
        }
    }

    private function isValidUrl(string $url): bool
    {
        $parsedUrl = parse_url($url);

        return is_array($parsedUrl) && isset($parsedUrl['scheme'], $parsedUrl['host']);
    }

    private function writeLog($message): void
    {
        Base::writeLog($message, 'cycleProc', Base::BASE_PATH . '/' . $this->siteId . '/data');
    }
}

$siteId = $argv[1] ?? null;
$baseUrl = $argv[2] ?? null;

if (!is_string($siteId) || $siteId === '' || !is_string($baseUrl) || $baseUrl === '') {
    fwrite(STDERR, "Usage: php cycleProc.php <siteId> <url>\n");
    exit(1);
}

$cycleProc = new CycleProc($siteId, $baseUrl);
$cycleProc->run();

?>
