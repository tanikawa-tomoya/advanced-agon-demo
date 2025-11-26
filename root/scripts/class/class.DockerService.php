<?php

class DockerService extends Base
{
    /* ===================================  Const / property  */
    const MAX_WEIGHT  = 16;
    const RESULT_BUSY = 'busy';

    private PDO $pdoDocker;

	public function __construct($context)
	{
		parent::__construct($context);
	}	

    /* ============================================================
       Validation
       ============================================================ */
    protected function validationExec(): void
    {
        if (empty($this->params['serviceId']) ||
            !preg_match('/^[0-9]+$/', $this->params['serviceId'])) {
            throw new Exception('serviceId illegal');
        }
        $svc = $this->getServiceById((int) $this->params['serviceId']);
        if (!$svc) {
            throw new Exception('service not found');
        }

        /* --- service-specific required params ------------------ */
        switch ($svc['serviceCode']) {
		case 'stable-diffusion-docker':
			if (empty($this->params['prompt'])) {
				throw new Exception('prompt required');
			}
			break;

		case 'bolt-docker':
			$need = ['d', 'P', 'L', 'D', 'K'];
			foreach ($need as $n) {
				if (!isset($this->params[$n])) {
					throw new Exception("$n is required");
				}
			}
			break;

		case 'nut-docker':                                   // ★ NEW
			$need = ['d', 'S', 'T', 'C'];
			foreach ($need as $n) {
				if (!isset($this->params[$n])) {
					throw new Exception("$n is required");
				}
			}
			break;
        }
    }

    protected function validationCancel(): void
    {
        if (empty($this->params['queueId']) ||
            !preg_match('/^[0-9]+$/', $this->params['queueId'])) {
            throw new Exception('queueId illegal');
        }
    }

    protected function validationStatus(): void
    {
        $hasQ = isset($this->params['queueId']) && $this->params['queueId'] !== '';
        $hasS = isset($this->params['serviceId']) && $this->params['serviceId'] !== '';

        if (!$hasQ && !$hasS) {
            throw new Exception('queueId or serviceId required');
        }
        if ($hasQ && !preg_match('/^[0-9]+$/', $this->params['queueId'])) {
            throw new Exception('queueId illegal');
        }
        if (!$hasQ && !preg_match('/^[0-9]+$/', $this->params['serviceId'])) {
            throw new Exception('serviceId illegal');
        }
        if (empty($this->session['userId'])) {
            throw new Exception('login required');
        }
    }

    /* ============================================================
       Proc ? Exec
       ============================================================ */
    public function procExec(): void
    {
        $svcId  = (int) $this->params['serviceId'];
        $svc    = $this->getServiceById($svcId);
        $weight = (int) $svc['weight'];

        if ($this->getRunningWeight() + $weight > self::MAX_WEIGHT) {
            $this->status   = self::RESULT_BUSY;
            $this->response = ['msg' => 'Server busy'];
            return;
        }

        $uuid = bin2hex(random_bytes(8));

        /* ---- queue insert ---- */
        $sql = 'INSERT INTO queue (userId, serviceId, pid, startDate, status,
                                   errorReason, params, uuid, progress)
                VALUES (:u,:s,0,:d,"running","",:p,:uuid,0)';
        $this->getPDODocker()->prepare($sql)->execute([
													   ':u'    => isset($this->params['userId'])
													   ? (int) $this->params['userId'] : 0,
													   ':s'    => $svcId,
													   ':d'    => date('Y-m-d H:i:s'),
													   ':p'    => json_encode($this->params,
																			  JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
													   ':uuid' => $uuid
													   ]);
        $qid = (int) $this->getPDODocker()->lastInsertId();

        try {
            switch ($svc['serviceCode']) {
			case 'stable-diffusion-docker':
				$this->execStableDiffusionDocker($qid, $uuid, $this->params);
				break;
			case 'bolt-docker':
				$this->execBoltDocker($qid, $uuid, $this->params);
				break;
			case 'nut-docker':                 // ★ NEW
				$this->execNutDocker($qid, $uuid, $this->params);
				break;
			default:
				throw new Exception('Dispatcher not implemented');
            }
            $this->status   = parent::RESULT_SUCCESS;
            $this->response = ['queueId' => $qid, 'status' => 'running'];
        } catch (Throwable $e) {
            $this->updateQueueError($qid, $e->getMessage());
            $this->status   = parent::RESULT_ERROR;
            $this->response = ['queueId' => $qid, 'error' => $e->getMessage()];
        }
    }

    /* ============================================================
       Proc ? Cancel
       ============================================================ */
    public function procCancel(): void
    {
        $qid = (int) $this->params['queueId'];
        $row = $this->getPDODocker()
			->query("SELECT * FROM queue WHERE id={$qid}")
			->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $this->status   = parent::RESULT_ERROR;
            $this->response = ['msg' => 'queueId not found'];
            return;
        }
        if ($row['status'] !== 'running') {
            $this->status   = parent::RESULT_SUCCESS;
            $this->response = ['msg' => 'already finished',
                               'state' => $row['status']];
            return;
        }

        $pgid = (int) $row['pid'];
        $this->execCommand('sudo kill -TERM -- -' . $pgid);
        sleep(3);
        if (file_exists("/proc/{$row['pid']}")) {
            $this->execCommand('sudo kill -KILL -- -' . $pgid);
        }

        $p = json_decode($row['params'], true);
        @unlink($p['local'] ?? '');
        @unlink($p['progressFile'] ?? '');

        $this->getPDODocker()->prepare(
									   'UPDATE queue SET status="cancel", endDate=:e, progress=0 WHERE id=:id'
									   )->execute([':e' => date('Y-m-d H:i:s'), ':id' => $qid]);

        $this->status   = parent::RESULT_SUCCESS;
        $this->response = ['msg' => 'canceled'];
    }

    /* ============================================================
       Proc ? Status
       ============================================================ */
    public function procStatus(): void
    {
        $uid = (int) $this->session['userId'];
        $qid = isset($this->params['queueId']) ? (int) $this->params['queueId'] : 0;

        if ($qid) {
            $row = $this->getPDODocker()
                ->query("SELECT * FROM queue WHERE id={$qid} AND userId={$uid}")
                ->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                $this->status   = parent::RESULT_ERROR;
                $this->response = ['msg' => 'queueId not found or no permission'];
                return;
            }
            $row = $this->refreshRowProgress($row);
            $this->status   = parent::RESULT_SUCCESS;
            $this->response = $row;
            return;
        }

        $sid = (int) $this->params['serviceId'];
        $sql = "SELECT * FROM queue
                WHERE userId={$uid} AND serviceId={$sid}
                ORDER BY id DESC";
        $stmt = $this->getPDODocker()->query($sql);
        $list = [];
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $list[] = $this->refreshRowProgress($r);
        }
        $this->status   = parent::RESULT_SUCCESS;
        $this->response = $list;
    }

    /* ============================================================
       Helper ? progress refresh
       ============================================================ */
    private function refreshRowProgress(array $row): array
		{
			if ($row['status'] === 'running' && $row['pid']) {
				$p   = json_decode($row['params'], true);
				$pf  = $p['progressFile'] ?? '';
				$pct = (file_exists($pf) ? (int) file_get_contents($pf) : 0);

				if ($pct !== (int) $row['progress']) {
					$this->getPDODocker()->prepare(
												   'UPDATE queue SET progress=:pr WHERE id=:id'
												   )->execute([':pr' => $pct, ':id' => $row['id']]);
					$row['progress'] = $pct;
				}

				if (!file_exists("/proc/{$row['pid']}")) {
					$this->finalizeOutput($row);
					$this->updateQueueSuccess($row['id']);
					$row['status']   = 'success';
					$row['endDate']  = date('Y-m-d H:i:s');
					$row['progress'] = 100;
				}
			}
			return $row;
		}

    /* ============================================================
       EXEC ? Stable Diffusion
       ============================================================ */
    private function execStableDiffusionDocker(int $qid, string $uuid, array $p): void
    {
        $root      = '/usr/local/src/docker/stable-diffusion-docker';
        $localOut  = "{$root}/outputs/{$uuid}.png";
        $localProg = "{$root}/progress/{$uuid}.txt";

        if (!is_dir(dirname($localProg))) {
            mkdir(dirname($localProg), 0775, true);
        }

        $cmdArr = [
				   'cd', escapeshellarg($root), '&&',
				   'setsid',
				   'bash', '-c',
				   escapeshellarg(
								  './run.sh'
								  . ' --prompt '   . escapeshellarg($p['prompt'])
								  . ' --output '   . escapeshellarg("outputs/{$uuid}.png")
								  . ' --progress ' . escapeshellarg("progress/{$uuid}.txt")
								  . (empty($p['seed'])   ? '' : ' --seed '   . escapeshellarg($p['seed']))
								  . (empty($p['width'])  ? '' : ' --width '  . escapeshellarg($p['width']))
								  . (empty($p['height']) ? '' : ' --height ' . escapeshellarg($p['height']))
								  . (empty($p['steps'])  ? '' : ' --steps '  . escapeshellarg($p['steps']))
								  )
				   ];
        $cmdLine = implode(' ', $cmdArr) . ' >/dev/null 2>&1 & echo $!';
        $pid     = (int) ($this->execCommand($cmdLine)[0] ?? 0);
        if (!$pid) {
            throw new Exception('PID acquire failed');
        }

        $params = json_encode(
							  $p + ['local' => $localOut, 'progressFile' => $localProg, 'pid' => $pid],
							  JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
							  );
        $this->getPDODocker()->prepare(
									   'UPDATE queue SET pid=:pid, params=:pr WHERE id=:id'
									   )->execute([':pid' => $pid, ':pr' => $params, ':id' => $qid]);
    }

	/* ============================================================
	   EXEC ? Bolt (generate-bolt.sh)  ← ★ TL 対応
	   ============================================================ */
	private function execBoltDocker(int $qid, string $uuid, array $p): void
	{
		/* generate-bolt.sh へ渡す引数を組み立て */
		$args = [
				 '--d', $p['d'],
				 '--P', $p['P'],
				 '--L', $p['L'],
				 '--D', $p['D'],
				 '--K', $p['K'],
				 ];

		/* TL が指定されていれば追加（任意）*/
		if (isset($p['TL']) && $p['TL'] !== '') {
			$args[] = '--TL';
			$args[] = $p['TL'];
		}

		/* 共通ロジックに委譲 */
		$this->execBlenderJob(
							  $qid,
							  $uuid,
							  $p,
							  './generate-bolt.sh',   // スクリプト名
							  $args                   // 全引数リスト
							  );
	}

    /* ============================================================
       EXEC ? Nut  (generate-nut.sh)  ★ NEW
       ============================================================ */
    private function execNutDocker(int $qid, string $uuid, array $p): void
    {
        $this->execBlenderJob(
							  $qid, $uuid, $p,
							  './generate-nut.sh',
							  [
							   '--d', $p['d'],
							   '--S', $p['S'],
							   '--T', $p['T'],
							   '--C', $p['C']
							   ]
							  );
    }

    /**
     * 共通の Blender コンテナ呼び出しロジック
     * @param array $extraArgs  generate-bolt / generate-nut に渡す
     */
    private function execBlenderJob(
									int    $qid,
									string $uuid,
									array  $p,
									string $script,
									array  $extraArgs
									): void
    {
        $root      = '/usr/local/src/docker/blender';
        $outDir    = "{$root}/output";
        $localOut  = "{$outDir}/{$uuid}.stl";
        $localProg = "{$outDir}/{$uuid}.progress";   // optional

        if (!is_dir($outDir)) {
            mkdir($outDir, 0775, true);
        }

        /* build command */
        $cmdPieces = array_merge(
								 ['cd', escapeshellarg($root), '&&', 'setsid', 'bash', '-c'],
								 [escapeshellarg(
												 $script
												 . ' --generate'
												 . ' ' . implode(' ', array_map(
																				fn($v) => escapeshellarg($v),
																				$extraArgs
																				))
												 . ' --out_format stl'
												 . ' --output ' . escapeshellarg("output/{$uuid}.stl")
												 )]
								 );
        $cmdLine = implode(' ', $cmdPieces) . ' >/dev/null 2>&1 & echo $!';
        $pid     = (int) ($this->execCommand($cmdLine)[0] ?? 0);

		$this->writeLog($cmdLine);
		
        if (!$pid) {
            throw new Exception('PID acquire failed');
        }

        $params = json_encode(
							  $p + ['local' => $localOut, 'progressFile' => $localProg, 'pid' => $pid],
							  JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
							  );
        $this->getPDODocker()->prepare(
									   'UPDATE queue SET pid=:pid, params=:pr WHERE id=:id'
									   )->execute([':pid' => $pid, ':pr' => $params, ':id' => $qid]);
    }

    /* ============================================================
       finalizeOutput ? move to public dir
       ============================================================ */
    private function finalizeOutput(array $row): void
    {
        $service = $this->getServiceById($row['serviceId']);
        $p       = json_decode($row['params'], true);
        $src     = $p['local'] ?? null;
        if (!$src || !file_exists($src)) {
            return;
        }

        switch ($service['serviceCode']) {
		case 'stable-diffusion-docker':
			$siteDir = $this->contentsBasePath . "/codex/stable-diffusion-ui/out";
			break;

            /* bolt & nut は同じ公開ディレクトリへまとめる */
		case 'bolt-docker':
		case 'nut-docker':
			$siteDir = $this->contentsBasePath . "/codex/bolt-nut/out";
			break;

		default:
			return;
        }

        if (!is_dir($siteDir)) {
            mkdir($siteDir, 0775, true);
        }
        $ext  = pathinfo($src, PATHINFO_EXTENSION);
        $dest = "{$siteDir}/{$row['uuid']}.{$ext}";

        rename($src, $dest);
        chown($dest, 'www-data');
        chgrp($dest, 'www-data');
        chmod($dest, 0775);
    }

    /* ============================================================
       DB helpers
       ============================================================ */
    private function getPDODocker(): PDO
		{
			if (!isset($this->pdoDocker)) {
				$this->pdoDocker = $this->getSQLiteConnection(
															  $this->dataBasePath . '/db/dockerService.sqlite',
															  [
															   'errmode' => PDO::ERRMODE_EXCEPTION,
															   ]
															  );
			}
			return $this->pdoDocker;
		}

    private function getServiceById(int $id): ?array
    {
        $st = $this->getPDODocker()->prepare('SELECT * FROM service WHERE id=?');
        $st->execute([$id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function getRunningWeight(): int
    {
        return (int) $this->getPDODocker()
            ->query('SELECT COALESCE(SUM(s.weight),0)
                     FROM queue q
                     JOIN service s ON q.serviceId=s.id
                     WHERE q.status="running"')
            ->fetchColumn();
    }

    private function updateQueueSuccess(int $id): void
    {
        $this->getPDODocker()->prepare(
									   'UPDATE queue SET status="success", progress=100, endDate=:e WHERE id=:id'
									   )->execute([':e' => date('Y-m-d H:i:s'), ':id' => $id]);
    }

    private function updateQueueError(int $id, string $msg): void
    {
        $this->getPDODocker()->prepare(
									   'UPDATE queue SET status="error", endDate=:e, errorReason=:r WHERE id=:id'
									   )->execute([
												   ':e'  => date('Y-m-d H:i:s'),
												   ':r'  => mb_substr($msg, 0, 128),
												   ':id' => $id
												   ]);
    }
}
?>
