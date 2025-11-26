<?php
/**
 * Codex – GitHub Webhook helper + latest-code.txt generator.
 *
 * 1. Webhook（type=GitPull）で呼ばれると指定リポジトリを git pull。
 * 2. pull 成功後、リポジトリ内の .js / .css / .html / .py / .sh だけを
 *    まとめた latest-code.txt を生成する。
 *
 * URL 例:
 *   https://example.com/api/?type=GitPull&siteId=mysite
 */

class Codex extends Base
{
	public function __construct($context)
	{
		parent::__construct($context);
	}
	
    // ──────────────────────────  validation: GitPull
    protected function validationGitPull()
    {
        if (!isset($this->params['siteId']))     { throw new Exception(__FILE__ . ':' . __LINE__); }

        foreach (['siteId'] as $k) {
            if (!preg_match('/^[A-Za-z0-9_.-]+$/', $this->params[$k])) {
                throw new Exception(__FILE__ . ':' . __LINE__ . '  illegal chars');
            }
        }
    }

    // ──────────────────────────  validation: SetPermission
    protected function validationSetPermission()
    {
        $this->validationGitPull();
    }

    // ──────────────────────────  proc: GitPull
    public function procGitPull()
    {
        $siteId = htmlspecialchars($this->params['siteId'], ENT_QUOTES, 'UTF-8');
        $branch = $this->params['branch'] ?? '';

        $repoPath = $this->contentsBasePath;
        if (!is_dir($repoPath)) {
            $this->status   = parent::RESULT_ERROR;
            $this->response = ['msg' => 'Repository not found', 'path' => $repoPath];
            return;
        }

        try {
            if ($this->isCodexAutoPullEnabled($siteId) === false) {
                $this->status   = parent::RESULT_ERROR;
                $this->response = ['msg' => 'codex-auto-pull is disabled'];
                return;
            }
        } catch (Exception $e) {
            $this->status   = parent::RESULT_ERROR;
            $this->response = [
                'msg'   => 'Failed to verify codex-auto-pull',
                'error' => $e->getMessage(),
            ];
            return;
        }

        // git pull
        $cmd = 'sudo -u ubuntu git -C ' . escapeshellarg($repoPath) . ' pull';
        if ($branch !== '') {
            $cmd .= ' origin ' . escapeshellarg($branch);
        }
        $cmd .= ' 2>&1';

        exec($cmd, $out, $exitCode);

        $this->response = [
            'exitCode' => $exitCode,
            'output'   => implode("\n", $out),
            'cmd'      => $cmd,
        ];

        // pull 成功なら latest-code.txt 生成
        if ($exitCode === 0) {
            try {
                if ($this->shouldGenerateLatestCode($siteId)) {
                    $this->createLatestCode($repoPath);
                }
            } catch (Exception $e) {
                error_log('[Codex] createLatestCode error: ' . $e->getMessage());
            }
        }

        $this->status = ($exitCode === 0)
            ? parent::RESULT_SUCCESS
            : parent::RESULT_ERROR;
    }

    // ──────────────────────────  proc: SetPermission
    public function procSetPermission()
    {
        $targetPath = $this->contentsBasePath;

        if (!is_dir($targetPath)) {
            $this->status   = parent::RESULT_ERROR;
            $this->response = ['msg' => 'Target path not found', 'path' => $targetPath];
            return;
        }

        $commands = [
            $this->wrapWithSudo('chown -R www-data:www-data ' . escapeshellarg($targetPath)),
            $this->wrapWithSudo('chmod -R 775 ' . escapeshellarg($targetPath)),
        ];

        $results = [];
        $status  = parent::RESULT_SUCCESS;

        foreach ($commands as $cmd) {
            $output   = [];
            $exitCode = 0;
            exec($cmd . ' 2>&1', $output, $exitCode);

            $results[] = [
                'cmd'      => $cmd,
                'exitCode' => $exitCode,
                'output'   => implode("\n", $output),
            ];

            if ($exitCode !== 0) {
                $status = parent::RESULT_ERROR;
            }
        }

        $this->status = $status;
        $this->response = [
            'path'    => $targetPath,
            'results' => $results,
        ];
    }

    /**
     * Wrap a command with sudo when needed.
     */
    protected function wrapWithSudo(string $command): string
    {
        if (function_exists('posix_geteuid') && posix_geteuid() === 0) {
            return $command;
        }

        $sudoPath = trim(shell_exec('command -v sudo 2>/dev/null'));
        if ($sudoPath === '') {
            return $command;
        }

        return $sudoPath . ' -n ' . $command;
    }

    // ──────────────────────────  latest-code.txt 生成
    protected function createLatestCode(string $repoPath): void
    {
        $latestCodePath = $repoPath . '/latest-code.txt';
        if (file_exists($latestCodePath)) {
            unlink($latestCodePath);
        }

        $files = $this->scanRepository($repoPath);

        $fp = fopen($latestCodePath, 'wb');
        if (!$fp) {
            throw new Exception('Cannot open ' . $latestCodePath);
        }

        foreach ($files as $file) {
            $relative = str_replace($repoPath . '/', '', $file);
            fwrite($fp, "=== " . $relative . " ===\n");
            fwrite($fp, file_get_contents($file) . "\n\n");
        }
        fclose($fp);
    }

    // ──────────────────────────  対象ファイル走査
    protected function scanRepository(string $dir): array
    {
        $allowedExt = ['js', 'css', 'html', 'py', 'sh'];
        $results    = [];

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $info) {
            if ($info->isDir()) {
                continue;
            }

            $path = $info->getPathname();

            // .git を除外
            if (strpos($path, '/.git/') !== false) {
                continue;
            }

            // 拡張子フィルタ
            $ext = strtolower($info->getExtension());
            if (!in_array($ext, $allowedExt, true)) {
                continue;
            }

            $results[] = $path;
        }

        return $results;
    }

    protected function isCodexAutoPullEnabled(string $siteId): bool
    {
        $value = $this->getSiteSettingValue($siteId, 'codex-auto-pull');
        return $value === '1';
    }

    protected function shouldGenerateLatestCode(string $siteId): bool
    {
        $value = $this->getSiteSettingValue($siteId, 'latest-code-update');
        return $value === '1';
    }

    protected function getSiteSettingValue(string $siteId, string $key): ?string
    {
        $dbPath = $this->dataBasePath . '/db/common.sqlite';
        if (!is_file($dbPath)) {
            return null;
        }

        static $pdoCache = [];

        if (!array_key_exists($dbPath, $pdoCache)) {
            $pdoCache[$dbPath] = $this->getSQLiteConnection(
                $dbPath,
                [
                    'errmode' => PDO::ERRMODE_EXCEPTION,
                ]
            );
        }

        $pdo = $pdoCache[$dbPath];
        $stmt = $pdo->prepare('SELECT value FROM siteSettings WHERE key = ? LIMIT 1');
        $stmt->execute([$key]);
        $value = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($value === false || !array_key_exists('value', $value)) {
            return null;
        }

        return (string)$value['value'];
    }
}
?>
