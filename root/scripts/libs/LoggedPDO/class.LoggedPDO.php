<?php

class LoggedPDOStatement extends PDOStatement
{
    private $externalInstance; // 外部インスタンスを保持（必要に応じて使う）
    
    protected function __construct($externalInstance = null) {
        $this->externalInstance = $externalInstance;
    }

    public function execute($params = null) {
        // INSERT, UPDATE, DELETE の場合のみログを記録
        if (preg_match('/^\s*(INSERT|UPDATE|DELETE)\b/i', $this->queryString)) {
            $completedQuery = $this->buildCompleteQuery($this->queryString, $params);
            $this->externalInstance->writeLog($completedQuery, "sql");

            // 外部インスタンスの利用例（必要に応じて）
            if ($this->externalInstance && method_exists($this->externalInstance, 'logAdditionalInfo')) {
                $this->externalInstance->logAdditionalInfo("Query executed: " . $completedQuery);
            }
        }
        return parent::execute($params);
    }

    private function buildCompleteQuery($query, ?array $params) {
        if (is_array($params)) {
            foreach ($params as $value) {
                $escapedValue = $this->escapeValue($value);
                $query = preg_replace('/\?/', $escapedValue, $query, 1);
            }
        }
        return $query;
    }

    private function escapeValue($value) {
        if (is_null($value)) {
            return 'NULL';
        } elseif (is_string($value)) {
            return "'" . str_replace("'", "''", $value) . "'";
        } elseif (is_bool($value)) {
            return $value ? '1' : '0';
        }
        return $value; // 数値などそのまま返す
    }
}

?>
