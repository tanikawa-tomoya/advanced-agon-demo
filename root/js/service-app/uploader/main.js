(function () {

  'use strict';

  /**
   * UploaderService
   * - 旧 config.js は initConfig() に統合
   * - 旧 general.js は job-*.js へ分割（DOM生成/イベントと送信処理）
   * - header の実装スタイル（main.js + job-*.js / window.Services 名前空間 等）に合わせる
   */
  class UploaderService
  {
    constructor(options)
    {
      this.queue = [];           // { id, file, status, progress, xhr, node, error }
      this._active = 0;
      this.jobs = null;
      this.root = null;
      this.input = null;
      this.idPrefixSerial = 0;
      this.initConfig(options);
    }

    initConfig(options) {
      // 旧 config.js の設定値をここへ統合
      this.DEFAULTS = Object.freeze({
        endpoint: '/upload',      // アップロード先URL
        method: 'POST',           // HTTPメソッド
        paramName: 'file',        // フォーム名
        headers: {},              // 追加ヘッダー
        withCredentials: false,   // CORS資格情報
        extraFields: {},          // 追加で送るFormDataのキー/値
        multiple: true,           // 複数選択
        autoUpload: true,         // 追加後すぐ送信
        maxParallel: 2,           // 同時送信数
        accept: '',               // input accept 属性
        maxFileSize: 0,           // 0なら無制限（バイト）
        idPrefix: 'upload-',
        container: null,          // 生成先コンテナ（未指定は <body>）
        ariaLabel: 'Uploader'
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/uploader/job-dom.js',
        'js/service-app/uploader/job-upload.js'
      ]);

      this.jobs = {
        dom: new window.Services.Uploader.JobDom(this),
        upload: new window.Services.Uploader.JobUpload(this)
      };
      return this;
    }

    /**
     * UI を所定のコンテナに構築
     * @param {Element|string} container
     * @param {Object} opts
     */
    mount(container, opts) {
      var cfg = Object.assign({}, this.config, opts || {});
      this.root = this.jobs.dom.ensureRoot(container || cfg.container || document.body, cfg);
      this.input = this.jobs.dom.getInput(this.root);
      // UIイベントのバインド
      this.jobs.dom.bindUI(this.root, {
        onChooseFiles: () => { if (this.input) this.input.click(); },
        onInputChange: (files) => { this.enqueue(files); },
        onDropFiles: (files) => { this.enqueue(files); },
        onUploadAll: () => { this.startQueued(); },
        onCancelAll: () => { this.cancelAll(); }
      });
      return this.root;
    }

    /**
     * FileList/Array をキューへ積む
     */
    enqueue(fileList) {
      if (!fileList) return [];
      var files = [];
      // FileList | Array | single File に対応
      if (typeof File !== 'undefined' && fileList instanceof File) {
        files = [fileList];
      } else if (fileList && typeof fileList.length === 'number') {
        for (var i = 0; i < fileList.length; i++) files.push(fileList[i]);
      } else {
        return [];
      }

      var added = [];
      for (var j = 0; j < files.length; j++) {
        var f = files[j];
        if (!f) continue;
        if (!this.config.multiple && this.queue.some(function (e) { return e.status !== 'done' && e.status !== 'canceled'; })) {
          // multiple=false の場合、未完了がある時は追加しない
          continue;
        }
        if (this.config.maxFileSize > 0 && f.size > this.config.maxFileSize) {
          // サイズ超過はエントリとして追加しエラー表示
          var oversizeId = this._genId();
          var oversizeEntry = { id: oversizeId, file: f, status: 'error', progress: 0, xhr: null, node: null, error: 'file-too-large' };
          oversizeEntry.node = this.jobs.dom.createItem(oversizeEntry);
          this.jobs.dom.setStatus(oversizeEntry.node, 'error', 'Too large');
          this.jobs.dom.appendItem(this.root, oversizeEntry.node);
          this.queue.push(oversizeEntry);
          continue;
        }
        var id = this._genId();
        var entry = { id: id, file: f, status: 'queued', progress: 0, xhr: null, node: null, error: null };
        entry.node = this.jobs.dom.createItem(entry);
        // 個別の操作：キャンセル等
        this.jobs.dom.bindItem(entry.node, {
          onCancel: () => { this.cancel(entry.id); },
          onRemove: () => { this.remove(entry.id); }
        });
        this.jobs.dom.appendItem(this.root, entry.node);
        this.queue.push(entry);
        added.push(entry);
      }

      if (this.config.autoUpload) this.startQueued();
      return added;
    }

    /**
     * キュー中のファイルを送信開始（同時数は maxParallel）
     */
    startQueued() {
      var cfg = this.config;
      // 空きスロット分だけ開始
      while (this._active < cfg.maxParallel) {
        var next = this.queue.find(function (e) { return e.status === 'queued'; });
        if (!next) break;
        this._startUpload(next);
      }
    }

    _startUpload(entry) {
      var cfg = this.config;
      entry.status = 'uploading';
      this.jobs.dom.setStatus(entry.node, 'uploading');
      this.jobs.dom.updateProgress(entry.node, 0);
      this._active++;

      var self = this;
      var send = this.jobs.upload.send(entry, cfg, function (loaded, total) {
        var pct = total > 0 ? Math.floor((loaded / total) * 100) : 0;
        entry.progress = pct;
        self.jobs.dom.updateProgress(entry.node, pct);
      });

      entry.xhr = send.xhr;

      send.promise.then(function (res) {
        entry.status = 'done';
        entry.progress = 100;
        self.jobs.dom.updateProgress(entry.node, 100);
        self.jobs.dom.setStatus(entry.node, 'done');
      }).catch(function (err) {
        entry.status = (err && err.message === 'aborted') ? 'canceled' : 'error';
        entry.error = err ? err.message : 'error';
        self.jobs.dom.setStatus(entry.node, entry.status, entry.error);
      }).finally(function () {
        entry.xhr = null;
        self._active = Math.max(0, self._active - 1);
        self.startQueued(); // 次を回す
      });
    }

    /**
     * 単一のアップロードをキャンセル
     */
    cancel(target) {
      var entry = this._findEntry(target);
      if (!entry) return false;
      if (entry.xhr && typeof entry.xhr.abort === 'function') {
        try { entry.xhr.abort(); } catch (e) {}
      }
      entry.status = 'canceled';
      this.jobs.dom.setStatus(entry.node, 'canceled');
      return true;
    }

    /**
     * 単一のエントリをリストから除去（DOMも）
     */
    remove(target) {
      var idx = this._findIndex(target);
      if (idx < 0) return false;
      var entry = this.queue[idx];
      if (entry && entry.xhr && typeof entry.xhr.abort === 'function') {
        try { entry.xhr.abort(); } catch (e) {}
      }
      if (entry && entry.node) this.jobs.dom.removeItem(entry.node);
      this.queue.splice(idx, 1);
      return true;
    }

    /**
     * すべてキャンセル
     */
    cancelAll() {
      for (var i = 0; i < this.queue.length; i++) {
        var e = this.queue[i];
        if (e && e.xhr && typeof e.xhr.abort === 'function') {
          try { e.xhr.abort(); } catch (err) {}
        }
        if (e && (e.status === 'queued' || e.status === 'uploading')) {
          e.status = 'canceled';
          this.jobs.dom.setStatus(e.node, 'canceled');
        }
      }
      this._active = 0;
      return true;
    }

    /**
     * ユーティリティ
     */
    _genId() { 
      this.idPrefixSerial = (this.idPrefixSerial + 1) % 1000000;
      return (this.config.idPrefix + Date.now() + '-' + this.idPrefixSerial);
    }
    _findEntry(target) {
      if (!target) return this.queue[this.queue.length - 1];
      if (typeof target === 'string') {
        for (var i = 0; i < this.queue.length; i++) if (this.queue[i].id === target) return this.queue[i];
        return null;
      }
      for (var j = 0; j < this.queue.length; j++) if (this.queue[j] === target || this.queue[j].node === target) return this.queue[j];
      return null;
    }
    _findIndex(target) {
      if (!target) return this.queue.length - 1;
      if (typeof target === 'string') {
        for (var i = 0; i < this.queue.length; i++) if (this.queue[i].id === target) return i;
        return -1;
      }
      for (var j = 0; j < this.queue.length; j++) if (this.queue[j] === target || this.queue[j].node === target) return j;
      return -1;
    }
  }

  window.Services = window.Services || {};
  window.Services.Uploader = UploaderService;

})(window, document);
