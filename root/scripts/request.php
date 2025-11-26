<?php

require_once __DIR__ . '/class/class.Base.php';

if (!function_exists('random_bytes') && !function_exists('openssl_random_pseudo_bytes')) {
    $requestTypeForLog = $_REQUEST['requestType'] ?? '(missing requestType)';
    if (!is_string($requestTypeForLog) || $requestTypeForLog === '') {
        $requestTypeForLog = '(missing requestType)';
    }

    $logMessage = '[request] Aborting: no CSPRNG available. requestType=' . $requestTypeForLog;
    if (class_exists('Base') && method_exists('Base', 'writeLog')) {
        Base::writeLog($logMessage, 'fatal');
    } else {
        error_log($logMessage);
    }

    if (!headers_sent()) {
        http_response_code(500);
    }

    throw new RuntimeException('CSPRNG functions unavailable. Aborting request.');
}

// --- Large payload guard --------------------------------------------------
// Some API endpoints accept very large uploads (potentially several GB).
// When the request body exceeds PHP's upload/post limit the request payload
// is discarded before this script is executed, which results in a 500 error
// downstream.  We attempt to relax the relevant limits as early as possible
// so the upload can be processed.  The settings used here favour safety over
// strict optimisation and can be tuned if needed in the future.
if (function_exists('ini_set')) {
    $incomingRequestType = $_REQUEST['requestType'] ?? null;
    if (is_string($incomingRequestType)) {
        $incomingRequestType = trim($incomingRequestType);
        if ($incomingRequestType === '') {
            $incomingRequestType = null;
        }
    } else {
        $incomingRequestType = null;
    }

    if ($incomingRequestType !== null && Base::isLargeUploadRequestType($incomingRequestType)) {
        foreach (Base::getLargeUploadSettings() as $option => $value) {
            if ($value === null || $value === '') {
                continue;
            }

            @ini_set($option, (string) $value);
        }
    }
}

Base::requireFromShm('class/class.APIControl.php');
Base::requireFromShm('class/class.Util.php');

function streamVideoFile(string $filePath, ?string $forcedMime = null): void
{
    if (!is_file($filePath) || !is_readable($filePath)) {
        http_response_code(404);
        exit;
    }

    @session_write_close();
    @ini_set('zlib.output_compression', 'Off');
    if (function_exists('apache_setenv')) {
        @apache_setenv('no-gzip', '1');
    }
    @set_time_limit(0);
    while (ob_get_level() > 0) {
        @ob_end_clean();
    }

    $size = filesize($filePath);
    $start = 0;
    $end = $size - 1;

    if ($forcedMime) {
        $mime = $forcedMime;
    } else {
        $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : false;
        $mime = $finfo ? finfo_file($finfo, $filePath) : null;
        if ($finfo) {
            finfo_close($finfo);
        }
        if (!$mime) {
            $mime = 'application/octet-stream';
        }
    }

    $lastModified = gmdate('D, d M Y H:i:s', filemtime($filePath)) . ' GMT';
    $etag = '"' . md5($filePath . '|' . $size . '|' . $lastModified) . '"';

    header('Content-Type: ' . $mime);
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=31536000, immutable');
    header('Last-Modified: ' . $lastModified);
    header('ETag: ' . $etag);
    header('Content-Disposition: inline; filename="' . basename($filePath) . '"');

    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
        http_response_code(304);
        exit;
    }

    if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && trim($_SERVER['HTTP_IF_MODIFIED_SINCE']) === $lastModified) {
        http_response_code(304);
        exit;
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (strcasecmp($method, 'HEAD') === 0) {
        header('Content-Length: ' . $size);
        exit;
    }

    $range = $_SERVER['HTTP_RANGE'] ?? null;
    if ($range && preg_match('/bytes=(\d*)-(\d*)/i', $range, $matches)) {
        if ($matches[1] !== '') {
            $start = max(0, (int) $matches[1]);
        }
        if ($matches[2] !== '') {
            if ($matches[1] === '' && $matches[2] !== '') {
                $suffix = (int) $matches[2];
                $start = max(0, $size - $suffix);
                $end = $size - 1;
            } else {
                $end = min($size - 1, (int) $matches[2]);
            }
        }

        if ($start > $end || $start >= $size) {
            http_response_code(416);
            header('Content-Range: bytes */' . $size);
            exit;
        }

        $length = $end - $start + 1;
        http_response_code(206);
        header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
        header('Content-Length: ' . $length);
    } else {
        $length = $size;
        header('Content-Length: ' . $length);
    }

    $handle = fopen($filePath, 'rb');
    if ($handle === false) {
        http_response_code(500);
        exit;
    }

    if ($start > 0) {
        fseek($handle, $start);
    }

    $chunkSize = 1024 * 1024;
    $sent = 0;
    while (!feof($handle) && $sent < $length) {
        $readLength = min($chunkSize, $length - $sent);
        $buffer = fread($handle, $readLength);
        if ($buffer === false) {
            break;
        }
        echo $buffer;
        $sent += strlen($buffer);
        @ob_flush();
        flush();
        if (connection_aborted()) {
            break;
        }
    }

    fclose($handle);
    exit;
}

if (!isset($_REQUEST['requestType'])) {
    http_response_code(400);
    echo json_encode([
        'status'   => 'error',
        'response' => 'missing requestType',
    ]);
    return;
}

$rawRequestType = $_REQUEST['requestType'];
if (!is_string($rawRequestType)) {
    http_response_code(400);
    echo json_encode([
        'status'   => 'error',
        'response' => 'invalid requestType',
    ]);
    return;
}

$rawRequestType = trim($rawRequestType);
if ($rawRequestType === '') {
    http_response_code(400);
    echo json_encode([
        'status'   => 'error',
        'response' => 'invalid requestType',
    ]);
    return;
}

if (strpos($rawRequestType, '..') !== false || strpbrk($rawRequestType, '/\\') !== false) {
    http_response_code(400);
    echo json_encode([
        'status'   => 'error',
        'response' => 'invalid requestType',
    ]);
    return;
}

if (!preg_match('/^[A-Za-z0-9_]+$/', $rawRequestType)) {
    http_response_code(400);
    echo json_encode([
        'status'   => 'error',
        'response' => 'invalid requestType',
    ]);
    return;
}

$requestType = htmlspecialchars($rawRequestType, ENT_QUOTES, "UTF-8");

if (session_status() !== PHP_SESSION_ACTIVE) {
	session_start();
 }

$context = array('params' => $_REQUEST, 'session' => &$_SESSION, 'files' => $_FILES, 'debugMode' => false, 'errorReporting' => E_ALL);

if (file_exists('class/class.' . $requestType . '.php') == false) {
        $inst = new Base($context, true);
        $inst->response = 'no file.';
        echo $inst->getResultJson();
        return;
}

Base::requireFromShm('class/class.' . $requestType . '.php');

if (class_exists($requestType) == false) {
        $inst = new Base($context, true);
        $inst->response = 'no class.';
        echo $inst->getResultJson();
        return;
}

if (true) {
        try {
                $apiControl = new APIControl($context);
        } catch (Throwable $exception) {
                http_response_code(403);
                $inst = new Base($context, true);
                $inst->status = Base::RESULT_ERROR;
                $inst->errorReason = 'token';
                $inst->response = 'invalid token';
                finish($inst);
                return;
        }
        $procType = htmlspecialchars($_REQUEST['type'], ENT_QUOTES, "UTF-8");
        if ($apiControl->canAccess($requestType, $procType) == false) {
                $inst = new Base($context, true);
                $inst->status = Base::RESULT_ERROR;
                $inst->response = "permission";
                echo $inst->getResultJson();
                return;
        }
}

try {
	$inst = null;
	$inst = new $requestType($context);
	if ($inst->status != Base::RESULT_SUCCESS) {
		finish($inst);
		return;
	}
	$inst->procStart();
	if ($inst->status == Base::RESULT_EXCEPTION) {
		$inst->redirectErrorPage();
		return;
	}
} catch (Exception $e) {
	$message = $e->getMessage();
	$inst = null;
}

if ($inst == null) {
        $inst = new Base($context, true);
        $inst->status = Base::RESULT_ERROR;
        $inst->response = $message;
        echo $inst->getResultJson();
        return;
}

if (isset($inst->noOutput) == false) {
  finish($inst);
}

function finish($inst)
{
        $emitNoStoreHeaders = function (array $existingHeaders = []) {
                if (headers_sent()) {
                        return;
                }

                $hasCacheControl = false;
                foreach ($existingHeaders as $headerLine) {
                        if (stripos($headerLine, 'cache-control:') === 0) {
                                $hasCacheControl = true;
                                break;
                        }
                }

                if ($hasCacheControl) {
                        return;
                }

                header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
                header('Pragma: no-cache');
                header('Expires: 0');
        };

        if (count($inst->header) > 0) {
                $emitNoStoreHeaders($inst->header);
                foreach ($inst->header as $header) {
                        header($header);
                }
                if ($inst->output != null) {
                        echo $inst->output;
                        flush();
                }
                return;
        }

        $emitNoStoreHeaders();

        if (isset($inst->debug) && $inst->debug != null) {
                echo $inst->debug;
        }
        if ($inst->output != null) {
                echo $inst->output;
	} else if ($inst->userMessage != null) {
		echo $inst->userMessage;
	} else {
		echo $inst->getResultJson();
	}
	
	return;
}

?>
