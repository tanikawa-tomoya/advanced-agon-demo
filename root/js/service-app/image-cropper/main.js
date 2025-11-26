(function () {

  'use strict';

  class ImageCropperService
  {
    constructor(options)
    {
      this.sessions = [];
      this.jobs = null;
      this.initConfig(options);
    }

    initConfig(options)
    {
      this.DEFAULTS = Object.freeze({
        overlayOpacity: 0.5,     // オーバーレイの不透明度（0〜1）
        guides: true,            // ガイド線（ルール・三分割）表示
        handles: true,           // 8方向のリサイズハンドル表示
        aspectRatio: null,       // アスペクト比固定（例: 1, 16/9, '1:1', '16:9'）。nullなら自由比率
        minWidth: 24,            // 最小選択幅（px、表示サイズ基準）
        minHeight: 24,           // 最小選択高（px、表示サイズ基準）
        keyboard: true,          // 矢印キーで微調整（Enter=確定, Esc=キャンセル）
        confirmText: 'Crop',
        cancelText: 'Cancel',
        container: null,         // 表示先（未指定ならbody上にposition:fixedで重ねる）
        idPrefix: 'imgcrop-',
        zIndex: 10000,
        // 初期選択（null=自動）。{ x, y, width, height }（表示サイズ基準）。
        initialSelection: null
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/image-cropper/job-ui.js',
        'js/service-app/image-cropper/job-cropper.js'
      ]);

      this.jobs = {
        ui: new window.Services.ImageCropper.JobUI(this),
        cropper: new window.Services.ImageCropper.JobCropper(this)
      };
      return this;
    }

    // target: <img>要素 or セレクタ文字列
    open(target, opts) {
      var img = this._resolveImage(target);
      if (!img) { return null; }
      var cfg = Object.assign({}, this.config, opts || {});

      // オーバーレイとUIを構築
      var root = this.jobs.ui.createOverlay(img, cfg, {
        onConfirm: (session) => this._finalizeConfirm(session),
        onCancel:  (session) => this._finalizeCancel(session),
        onChange:  (session, rect) => {
          // セッションの rect を更新（必要に応じて利用側で監視）
          if (session) { session.rect = rect; }
          if (cfg && typeof cfg.onChange === 'function') cfg.onChange(rect);
        }
      });

      if (!root) return null;

      // セッション作成
      var session = {
        id: cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000)),
        img: img,
        root: root,
        cfg: cfg,
        rect: null
      };
      root.__ic.session = session;

      // 初期矩形の設定とイベントバインド
      this.jobs.cropper.mount(root, session);

      this.sessions.push(session);
      return root;
    }

    // 現在の選択矩形（表示サイズ基準の px）を取得
    getSelection(target) {
      var session = this._findSession(target);
      if (!session) return null;
      return this.jobs.cropper.getSelection(session.root);
    }

    // 選択矩形を設定（表示サイズ基準の px）
    setSelection(target, rect) {
      var session = this._findSession(target);
      if (!session) return false;
      this.jobs.cropper.setSelection(session.root, rect);
      return true;
    }

    // 選択範囲のキャンバスを生成して返す
    extractCanvas(target, options) {
      var session = this._findSession(target);
      if (!session) return null;
      return this.jobs.cropper.extractCanvas(session.root, options || {});
    }

    // 閉じる（キャンセル扱い）
    close(target) {
      var session = this._findSession(target);
      if (!session) return false;
      this._teardownSession(session, /*isConfirm*/ false);
      return true;
    }

    // 内部: confirm/cancel の確定処理
    _finalizeConfirm(session) {
      var cfg = session && session.cfg || {};
      var result = {
        rect: this.jobs.cropper.getSelection(session.root),
        canvas: this.jobs.cropper.extractCanvas(session.root, {})
      };
      if (cfg && typeof cfg.onConfirm === 'function') {
        try { cfg.onConfirm(result); } catch (e) {}
      }
      this._teardownSession(session, /*isConfirm*/ true);
    }

    _finalizeCancel(session) {
      var cfg = session && session.cfg || {};
      if (cfg && typeof cfg.onCancel === 'function') {
        try { cfg.onCancel(); } catch (e) {}
      }
      this._teardownSession(session, /*isConfirm*/ false);
    }

    _teardownSession(session, isConfirm) {
      if (!session) return;
      this.jobs.cropper.unmount(session.root);
      this.jobs.ui.removeOverlay(session.root);
      var idx = this.sessions.findIndex(function (s) { return s === session; });
      if (idx >= 0) this.sessions.splice(idx, 1);
    }

    _resolveImage(target) {
      if (!target) return null;
      var img = null;
      if (typeof target === 'string') {
        img = document.querySelector(target);
      } else if (target && target.nodeType === 1) {
        img = target;
      }
      if (!img || img.tagName !== 'IMG') return null;
      return img;
    }

    _findSession(target) {
      if (!this.sessions.length) return null;
      if (!target) return this.sessions[this.sessions.length - 1];
      if (typeof target === 'string') {
        var byId = this.sessions.find(function (s) { return s.id === target; });
        if (byId) return byId;
      }
      // target が root 要素 or img 要素
      for (var i = this.sessions.length - 1; i >= 0; i--) {
        var s = this.sessions[i];
        if (target === s.root || target === s.img) return s;
        if (target && target.nodeType === 1 && (target === s.root || target.contains(s.root))) return s;
      }
      return null;
    }
  }
  
  window.Services = window.Services || {};
  window.Services.ImageCropper = ImageCropperService;  

})(window, document);
