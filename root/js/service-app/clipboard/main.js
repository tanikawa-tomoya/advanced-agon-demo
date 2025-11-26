(function () {
  'use strict';

  class ClipboardService
  {
    constructor(config) {
      this.config = {};
      this.jobs = null;
      this._handlers = new Set();
      this.initConfig(config);
    }

    /**
     * 旧 config.js の設定をここで初期化・マージする
     */
    initConfig(overrides)
    {
      var DEFAULTS = {
        preferNavigator: true,          // navigator.clipboard を優先
        fallbackCopy: true,             // execCommand('copy') によるフォールバック
        readEnabled: true,              // readText を許可（Navigator API が前提）
        eventNames: {                   // 成功/失敗のイベント名
          copySuccess: 'clipboard:copy:success',
          copyError:   'clipboard:copy:error'
        }
      };
      var src = (overrides && typeof overrides === 'object') ? overrides : {};
      // シンプルな浅いマージ
      this.config = {
        preferNavigator: ('preferNavigator' in src) ? !!src.preferNavigator : DEFAULTS.preferNavigator,
        fallbackCopy: ('fallbackCopy' in src) ? !!src.fallbackCopy : DEFAULTS.fallbackCopy,
        readEnabled: ('readEnabled' in src) ? !!src.readEnabled : DEFAULTS.readEnabled,
        eventNames: (src.eventNames && typeof src.eventNames === 'object')
          ? {
              copySuccess: src.eventNames.copySuccess || DEFAULTS.eventNames.copySuccess,
              copyError: src.eventNames.copyError || DEFAULTS.eventNames.copyError
            }
          : DEFAULTS.eventNames
      };
    }

    /**
     * header / loading-overlay と同様に同期ロード（存在時のみ）
     */
    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/clipboard/job-api.js',
        'js/service-app/clipboard/job-bind.js'
      ]);

      this.jobs = {
        api:  new window.Services.Clipboard.JobAPI(this),
        bind: new window.Services.Clipboard.JobBind(this)
      };
      return this;
    }

    canUse() {
      return !!(w.navigator && w.navigator.clipboard);
    }

    write(text) {
      return this.jobs.api.writeText(text);
    }

    read() {
      return this.jobs.api.readText();
    }

    /**
     * target: Element | NodeList | Array<Element> | selector string
     * getText: string | () => string | () => Promise<string>
     */
    attachCopyOnClick(target, getText) {
      var self = this;
      var disposers = this.jobs.bind.bindCopyOnClick(target, function () {
        try {
          return (typeof getText === 'function') ? getText() : getText;
        } catch (e) {
          return '';
        }
      }, function onSuccess(text, el) {
        // 成功イベント
        try {
          var ev = new CustomEvent(self.config.eventNames.copySuccess, { detail: { text: text, target: el } });
          el.dispatchEvent(ev);
        } catch (_) {}
      }, function onError(err, el) {
        // 失敗イベント
        try {
          var ev2 = new CustomEvent(self.config.eventNames.copyError, { detail: { error: err, target: el } });
          el.dispatchEvent(ev2);
        } catch (_) {}
      });

      // 複数の disposer をまとめて管理
      disposers.forEach(function (off) { self._handlers.add(off); });

      // 呼び出し側でも個別解除できるようにハンドルを返す
      return {
        offAll: function () {
          disposers.forEach(function (off) { try { off(); } catch(_) {} });
          disposers.length = 0;
        }
      };
    }

    dispose() {
      // 登録済みのイベントハンドラをすべて解除
      this._handlers.forEach(function (off) { try { off(); } catch (_) {} });
      this._handlers.clear();
    }
  }

  window.Services = window.Services || {};
  window.Services.ClipboardService = ClipboardService;

})(window, document);
