<?php
/**
 * Codex – GitHub Webhook helper + latest-code.txt generator.
 *
 * 1. Webhook（type=GitPull）で呼ばれると指定リポジトリを git pull。
 * 2. pull 成功後、リポジトリ内の .js / .css / .html / .py / .sh だけを
 *    まとめた latest-code.txt を生成する。
 *
 * URL 例:
 *   https://example.com/api/?type=GitPull&siteId=mysite&repository=schedule-ui
 */

class Bench extends Base
{
	public function __construct($context)
	{
		parent::__construct($context);
	}
	
    // ──────────────────────────  validation: Default
    protected function validationDefault()
    {
    }

    // ──────────────────────────  proc: Default
    public function procDefault()
    {
        
        $this->status = parent::RESULT_SUCCESS;
    }
}
?>

