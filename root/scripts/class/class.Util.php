<?php

class UrlNormalizationException extends InvalidArgumentException
{
}

class Util
{
    public static function streamFileDownload(string $baseDir, string $fileId, ?string $fileName, ?string &$errorReason = null): bool
    {
        $errorReason = null;

        $baseRealPath = realpath($baseDir);
        if ($baseRealPath === false) {
            $errorReason = 'invalid_file_path';
            return false;
        }

        $filePath = $baseDir . '/' . $fileId;
        $fullPath = realpath($filePath);
        if ($fullPath === false || strpos($fullPath, $baseRealPath) !== 0) {
            $errorReason = 'invalid_file_path';
            return false;
        }

        if (!file_exists($fullPath)) {
            $errorReason = 'notfound';
            return false;
        }

        $fileSize = filesize($fullPath);
        $downloadName = $fileName !== null && $fileName !== '' ? $fileName : basename($fullPath);

        $handle = fopen($fullPath, 'rb');
        if ($handle === false) {
            $errorReason = 'file_open_failed';
            return false;
        }

        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $downloadName . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . $fileSize);

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $chunkSize = 1048576; // 1MB
        while (!feof($handle)) {
            $buffer = fread($handle, $chunkSize);
            if ($buffer === false) {
                fclose($handle);
                $errorReason = 'file_read_failed';
                return false;
            }
            if ($buffer === '') {
                continue;
            }
            echo $buffer;
            flush();
        }

        fclose($handle);

        return true;
    }

    public static function isVideoMimeType(string $mimeType): bool
    {
        $normalizedMimeType = strtolower($mimeType);
        $videoMimeTypes = [
            'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
            'video/x-msvideo', 'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv',
        ];

        return in_array($normalizedMimeType, $videoMimeTypes, true);
    }

    public static function isVideoFile(string $mimeType, string $extension): bool
    {
        if (self::isVideoMimeType($mimeType)) {
            return true;
        }

        $videoExtensions = ['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'];
        return $extension !== '' && in_array(strtolower($extension), $videoExtensions, true);
    }

    public static function sanitizeOriginalFileName(?string $name): string
    {
        $base = trim(basename((string) $name));
        $base = preg_replace("/[\r\n]+/", ' ', $base);
        if ($base === '') {
            return 'uploaded-file';
        }
        if (mb_strlen($base) > 240) {
            $base = mb_substr($base, 0, 240);
        }

        return $base;
    }

    public static function extractStoredFileName(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        $normalized = str_replace('\\', '/', $path);
        $segments = explode('/', $normalized);
        if (empty($segments)) {
            return null;
        }

        $fileName = end($segments);
        if ($fileName === false || $fileName === null || $fileName === '') {
            return null;
        }

        return $fileName;
    }

    public static function cleanupStoredPaths($paths): void
    {
        if ($paths === null) {
            return;
        }

        if (!is_array($paths) && !($paths instanceof \Traversable)) {
            return;
        }

        foreach ($paths as $path) {
            if (is_string($path) && $path !== '' && file_exists($path)) {
                @unlink($path);
            }
        }
    }

    public static function dataServiceGetOwner(PDO $pdo, string $bucket, string $key): ?string
    {
        $stmt = $pdo->prepare('SELECT userId FROM objects WHERE bucket=? AND "key"=?');
        $stmt->execute([$bucket, $key]);

        $owner = $stmt->fetchColumn();
        return $owner === false ? null : (string) $owner;
    }

    public static function dataServiceFetchMeta(PDO $pdo, string $bucket, string $key): ?array
    {
        $stmt = $pdo->prepare('SELECT fileName,mimeType,userId FROM objects WHERE bucket=? AND "key"=?');
        $stmt->execute([$bucket, $key]);

        $meta = $stmt->fetch(PDO::FETCH_ASSOC);
        return $meta === false ? null : $meta;
    }

    public static function normalizeRequiredString($value, $maxLength)
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return false;
        }
        if (mb_strlen($trimmed) > $maxLength) {
            return false;
        }
        return htmlspecialchars($trimmed, ENT_QUOTES, 'UTF-8');
    }

    public static function normalizeOptionalString($value, $maxLength)
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }
        if (mb_strlen($trimmed) > $maxLength) {
            return false;
        }
        return htmlspecialchars($trimmed, ENT_QUOTES, 'UTF-8');
    }

    public static function normalizeOptionalUrl($value, $maxLength)
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value) === false) {
            $value = (string) $value;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        if (mb_strlen($trimmed) > $maxLength) {
            throw new UrlNormalizationException('URL exceeds maximum length.');
        }

        self::assertNoControlCharacters($trimmed, 'URL');
        if (strpos($trimmed, '\\') !== false) {
            throw new UrlNormalizationException('URL contains backslash characters.');
        }

        $parts = parse_url($trimmed);
        if ($parts === false) {
            throw new UrlNormalizationException('Malformed URL.');
        }

        if (isset($parts['host'])) {
            $parts['host'] = self::normalizeHost($parts['host']);
        }

        $hasAuthority = isset($parts['host']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['port']);

        if (isset($parts['path'])) {
            $parts['path'] = self::normalizePath($parts['path'], $hasAuthority);
        }

        if (isset($parts['query'])) {
            self::assertValidEncoding($parts['query'], 'query');
            $decodedQuery = rawurldecode($parts['query']);
            self::assertNoControlCharacters($decodedQuery, 'URL query');
            if (strpos($decodedQuery, '\\') !== false) {
                throw new UrlNormalizationException('URL query contains backslash characters.');
            }
        }

        if (isset($parts['fragment'])) {
            self::assertValidEncoding($parts['fragment'], 'fragment');
            $decodedFragment = rawurldecode($parts['fragment']);
            self::assertNoControlCharacters($decodedFragment, 'URL fragment');
            if (strpos($decodedFragment, '\\') !== false) {
                throw new UrlNormalizationException('URL fragment contains backslash characters.');
            }
        }

        if (isset($parts['user'])) {
            self::assertNoControlCharacters($parts['user'], 'URL userinfo');
        }

        if (isset($parts['pass'])) {
            self::assertNoControlCharacters($parts['pass'], 'URL password');
        }

        return self::buildUrlFromParts($parts);
    }

    private static function assertNoControlCharacters(string $value, string $context): void
    {
        if ($value === '') {
            return;
        }

        if (preg_match('/[\x00-\x1F\x7F]/u', $value)) {
            throw new UrlNormalizationException($context . ' contains control characters.');
        }
    }

    private static function assertValidEncoding(string $value, string $context): void
    {
        if ($value === '') {
            return;
        }

        if (preg_match('/%(?![0-9A-Fa-f]{2})/', $value)) {
            throw new UrlNormalizationException('URL ' . $context . ' contains invalid percent-encoding.');
        }
    }

    private static function normalizeHost(string $host): string
    {
        $trimmedHost = trim($host);
        if ($trimmedHost === '') {
            throw new UrlNormalizationException('URL host is empty.');
        }

        self::assertNoControlCharacters($trimmedHost, 'URL host');
        if (strpos($trimmedHost, '\\') !== false) {
            throw new UrlNormalizationException('URL host contains backslash characters.');
        }

        $asciiHost = $trimmedHost;
        if (function_exists('idn_to_ascii')) {
            $variant = defined('INTL_IDNA_VARIANT_UTS46') ? INTL_IDNA_VARIANT_UTS46 : (defined('INTL_IDNA_VARIANT_2003') ? INTL_IDNA_VARIANT_2003 : null);
            $flags = defined('IDNA_DEFAULT') ? IDNA_DEFAULT : 0;
            if ($variant !== null) {
                $asciiHost = idn_to_ascii($trimmedHost, $flags, $variant);
            } else {
                $asciiHost = idn_to_ascii($trimmedHost, $flags);
            }

            if ($asciiHost === false) {
                throw new UrlNormalizationException('Failed to convert hostname to ASCII.');
            }
        } elseif (preg_match('/[^\x20-\x7E]/u', $trimmedHost)) {
            throw new UrlNormalizationException('Internationalized hostnames are not supported.');
        }

        return strtolower($asciiHost);
    }

    private static function normalizePath(string $path, bool $isHierarchical): string
    {
        self::assertValidEncoding($path, 'path');

        $decodedOnce = rawurldecode($path);
        self::assertNoControlCharacters($decodedOnce, 'URL path');
        if (strpos($decodedOnce, '\\') !== false) {
            throw new UrlNormalizationException('URL path contains backslash characters.');
        }

        if (preg_match('/\.\.(?:\/|\\|$)/', $decodedOnce)) {
            throw new UrlNormalizationException('URL path contains traversal sequences.');
        }

        $decodedTwice = rawurldecode($decodedOnce);
        if ($decodedTwice !== $decodedOnce && preg_match('/\.\.(?:\/|\\|$)/', $decodedTwice)) {
            throw new UrlNormalizationException('URL path contains double-encoded traversal sequences.');
        }

        if ($isHierarchical === false) {
            return $path;
        }

        $segments = explode('/', $path);
        foreach ($segments as &$segment) {
            $decodedSegment = rawurldecode($segment);
            self::assertNoControlCharacters($decodedSegment, 'URL path segment');
            if (strpos($decodedSegment, '\\') !== false) {
                throw new UrlNormalizationException('URL path segment contains backslash characters.');
            }
            $segment = rawurlencode($decodedSegment);
        }
        unset($segment);

        $normalizedPath = implode('/', $segments);
        if ($path !== '' && substr($path, -1) === '/' && substr($normalizedPath, -1) !== '/') {
            $normalizedPath .= '/';
        }

        if ($path !== '' && substr($path, 0, 1) === '/' && substr($normalizedPath, 0, 1) !== '/') {
            $normalizedPath = '/' . $normalizedPath;
        }

        return $normalizedPath;
    }

    private static function buildUrlFromParts(array $parts): string
    {
        $url = '';

        if (isset($parts['scheme']) && $parts['scheme'] !== '') {
            $url .= strtolower($parts['scheme']) . ':';
        }

        $hasAuthority = isset($parts['host']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['port']);
        if ($hasAuthority) {
            $url .= '//';

            if (isset($parts['user']) && $parts['user'] !== '') {
                $url .= $parts['user'];
                if (isset($parts['pass']) && $parts['pass'] !== '') {
                    $url .= ':' . $parts['pass'];
                }
                $url .= '@';
            }

            if (isset($parts['host'])) {
                $url .= $parts['host'];
            }

            if (isset($parts['port'])) {
                $url .= ':' . $parts['port'];
            }
        }

        if (isset($parts['path'])) {
            $url .= $parts['path'];
        }

        if (isset($parts['query']) && $parts['query'] !== '') {
            $url .= '?' . $parts['query'];
        }

        if (isset($parts['fragment']) && $parts['fragment'] !== '') {
            $url .= '#' . $parts['fragment'];
        }

        return $url;
    }

    public static function normalizeOptionalDateTime($value)
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $timestamp = strtotime($trimmed);
        if ($timestamp === false) {
            return false;
        }

        return date('Y-m-d H:i:s', $timestamp);
    }

    public static function normalizeTimestampValue($value)
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);
        if ($trimmed === '' || $trimmed === '0') {
            return null;
        }

        return $trimmed;
    }

    public static function normalizeHexColor($value, $required = false)
    {
        if ($value === null) {
            return $required ? false : null;
        }

        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return $required ? false : null;
        }

        if ($trimmed[0] !== '#') {
            $trimmed = '#' . $trimmed;
        }

        if (preg_match('/^#([0-9a-fA-F]{6})$/', $trimmed) !== 1) {
            return false;
        }

        return strtoupper($trimmed);
    }

    public static function normalizeOptionalColor($value)
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        if ($trimmed[0] !== '#') {
            $trimmed = '#' . $trimmed;
        }

        if (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $trimmed) !== 1) {
            return false;
        }

        return strtoupper($trimmed);
    }

    public static function normalizeDate($value)
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $date = DateTime::createFromFormat('Y-m-d', $trimmed);
        if ($date === false) {
            return false;
        }
        if ($date->format('Y-m-d') !== $trimmed) {
            return false;
        }

        return $trimmed;
    }

    public static function dataServiceHandleUpload(array $file, string $destinationPath): array
    {
        $tmp = $file['tmp_name'] ?? null;
        $mimeType = $file['type'] ?? 'application/octet-stream';
        $size = isset($file['size']) ? (int) $file['size'] : 0;
        $fileName = $file['name'] ?? '';

        if ($tmp === null || $fileName === '') {
            throw new Exception('invalid upload file');
        }

        if (!move_uploaded_file($tmp, $destinationPath)) {
            throw new Exception('file move error');
        }

        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $isVideo = self::isVideoFile((string) $mimeType, $extension);

        return [
            'mimeType' => (string) $mimeType,
            'size' => $size,
            'fileName' => $fileName,
            'isVideo' => $isVideo,
        ];
    }

    public static function dataServiceHandleJsonSave(string $destinationPath, string $jsonData, string $key): array
    {
        if (file_put_contents($destinationPath, $jsonData, LOCK_EX) === false) {
            throw new Exception('file write error');
        }

        return [
            'mimeType' => 'application/json',
            'size' => strlen($jsonData),
            'fileName' => $key . '.json',
            'isVideo' => false,
        ];
    }

    public static function dataServiceUpsertMeta(
        PDO $pdo,
        string $bucket,
        string $key,
        string $userId,
        string $fileName,
        string $mimeType,
        int $size,
        ?string $currentOwner
    ): void {
        if ($currentOwner === null) {
            $stmt = $pdo->prepare(
                'INSERT INTO objects(bucket,"key",userId,fileName,mimeType,size,createdAt) VALUES(?,?,?,?,?,?,datetime("now","localtime"))'
            );
            $stmt->execute([$bucket, $key, $userId, $fileName, $mimeType, $size]);
        } else {
            $stmt = $pdo->prepare(
                'UPDATE objects SET fileName=?,mimeType=?,size=?,createdAt=datetime("now","localtime") WHERE bucket=? AND "key"=?'
            );
            $stmt->execute([$fileName, $mimeType, $size, $bucket, $key]);
        }
    }

    public static function dataServiceList(PDO $pdo, string $bucket, string $userId, int $limit, int $offset): array
    {
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM objects WHERE bucket=? AND userId=?');
        $countStmt->execute([$bucket, $userId]);
        $totalCount = (int) $countStmt->fetchColumn();

        if ($totalCount === 0) {
            return [
                'items' => array(),
                'totalCount' => 0,
            ];
        }

        $stmt = $pdo->prepare(
            'SELECT id,"key",fileName,mimeType,size,createdAt FROM objects WHERE bucket=? AND userId=? ORDER BY createdAt DESC LIMIT ? OFFSET ?'
        );
        $stmt->bindValue(1, $bucket, PDO::PARAM_STR);
        $stmt->bindValue(2, $userId, PDO::PARAM_STR);
        $stmt->bindValue(3, $limit, PDO::PARAM_INT);
        $stmt->bindValue(4, $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'totalCount' => $totalCount,
        ];
    }

    public static function deleteFileIfExists(string $filePath): void
    {
        if (is_file($filePath)) {
            unlink($filePath);
        }
    }

    public static function recursiveRemoveDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $fileInfo) {
            if ($fileInfo->isDir()) {
                rmdir($fileInfo->getRealPath());
            } else {
                unlink($fileInfo->getRealPath());
            }
        }

        rmdir($dir);
    }

    public static function runSoftwareVersionCommand(string $command): array
    {
        $output = array();
        $exitCode = 0;

        @exec($command . ' 2>&1', $output, $exitCode);

        if (!is_array($output)) {
            $output = array();
        }

        $normalized = array();
        foreach ($output as $line) {
            if (is_string($line)) {
                $normalized[] = rtrim($line, "\r\n");
            }
        }

        return array(
            'command' => $command,
            'exitCode' => (int) $exitCode,
            'output' => $normalized,
        );
    }

    public static function extractSoftwareVersion(array $lines, $pattern = null): string
    {
        $patternString = is_string($pattern) ? $pattern : null;

        if ($patternString !== null) {
            $joined = implode("\n", $lines);
            if (@preg_match($patternString, $joined, $matches) && isset($matches[1])) {
                return trim((string) $matches[1]);
            }
        }

        foreach ($lines as $line) {
            $trimmed = trim((string) $line);
            if ($trimmed !== '') {
                return $trimmed;
            }
        }

        return '';
    }

    public static function summarizeSoftwareOutput(array $lines): string
    {
        $sanitized = array();
        foreach ($lines as $line) {
            $trimmed = trim((string) $line);
            if ($trimmed !== '') {
                $sanitized[] = $trimmed;
            }
        }

        if (empty($sanitized)) {
            return '';
        }

        $preview = array_slice($sanitized, 0, 3);
        return implode("\n", $preview);
    }

    public static function formatBytes(int $bytes): string
    {
        if ($bytes <= 0) {
            return '0 B';
        }

        $units = array('B', 'KB', 'MB', 'GB', 'TB', 'PB');
        $value = (float) $bytes;
        $index = 0;

        while ($value >= 1024 && $index < count($units) - 1) {
            $value /= 1024;
            $index++;
        }

        if ($index === 0) {
            return sprintf('%d %s', $bytes, $units[$index]);
        }

        return sprintf('%.1f %s', $value, $units[$index]);
    }

    public static function calculateDirectorySize(string $path, ?callable $logger = null): int
    {
        if (!is_dir($path)) {
            return is_file($path) ? (int) @filesize($path) : 0;
        }

        $total = 0;

        try {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator(
                    $path,
                    \FilesystemIterator::SKIP_DOTS | \FilesystemIterator::CURRENT_AS_FILEINFO
                )
            );

            foreach ($iterator as $fileInfo) {
                if ($fileInfo->isFile()) {
                    $total += (int) $fileInfo->getSize();
                }
            }
        } catch (\Throwable $e) {
            if ($logger !== null) {
                $logger('calculateDirectorySize failed: ' . $e->getMessage());
            }
        }

        return max(0, $total);
    }

        public static function resolveStorageKind($contentType)
        {
                $normalized = strtolower(trim((string) $contentType));

                if ($normalized === 'video' || strpos($normalized, 'video/') === 0) {
                        return 'video';
		}
		if ($normalized === 'image' || strpos($normalized, 'image/') === 0) {
			return 'image';
		}
                if ($normalized === 'audio' || strpos($normalized, 'audio/') === 0) {
                        return 'audio';
                }

                return 'document';
        }
}

?>
