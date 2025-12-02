(function () {

  'use strict';

  class PwaUploader
  {
    constructor(options)
    {
      this.options = options || {};
      this.state = {
        queue: [],
        isUploading: false,
        queueSeed: 0
      };
      this.root = null;
      this.jobs = null;
      this.initConfig(options);
    }

    initConfig(options)
    {
      var defaults = {
        container: null,
        multiple: true,
        accept: '',
        uploadFile: null,
        autoCleanup: true,
        startMode: 'button',
        manifestHref: '/manifest.webmanifest',
        serviceWorkerPath: '/service-worker.js',
        serviceWorkerScope: '/',
        enableServiceWorker: true,
        onQueueChange: null,
        onStart: null,
        onComplete: null,
        stylesheetHref: '/css/pwa-uploader.css',
        text: {
          title: 'ファイルをアップロード',
          subtitle: 'ドラッグ＆ドロップ、またはボタンから追加',
          dropMessage: 'ここにファイルをドロップしてください',
          selectButton: 'ファイルを選択',
          startButton: 'アップロードを開始',
          startButtonInProgress: 'アップロード中…',
          emptyQueue: '追加したファイルがここに表示されます。',
          pending: 'アップロード待機中',
          uploading: 'アップロード中…',
          done: 'アップロードが完了しました',
          error: 'エラーが発生しました'
        }
      };
      var source = options && typeof options === 'object' ? options : {};
      var mergedText = Object.assign({}, defaults.text, source.text || {});
      var startMode = typeof source.startMode === 'string' ? source.startMode.toLowerCase() : defaults.startMode;
      if (startMode !== 'external') {
        startMode = 'button';
      }
      this.config = Object.assign({}, defaults, source, { text: mergedText, startMode: startMode });
    }

    ensureStylesheet(source)
    {
      if (document.querySelector('link[data-pwa-uploader-style="1"]')) return;

      var candidates = [];
      if (Array.isArray(source)) {
        for (var i = 0; i < source.length; i++) {
          var href = source[i];
          if (typeof href === 'string' && href.trim().length > 0) {
            candidates.push(href.trim());
          }
        }
      } else if (typeof source === 'string' && source.trim().length > 0) {
        candidates.push(source.trim());
      }
      candidates.push('/css/pwa-uploader.css');

      var unique = [];
      for (var j = 0; j < candidates.length; j++) {
        if (unique.indexOf(candidates[j]) === -1) unique.push(candidates[j]);
      }

      (function tryNext(i) {
        if (i >= unique.length) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = unique[i];
        link.setAttribute('data-pwa-uploader-style', '1');
        link.onerror = function () {
          link.remove();
          tryNext(i + 1);
        };
        document.head.appendChild(link);
      })(0);
    }

    async boot(options)
    {
      if (options && typeof options === 'object') {
        this.initConfig(Object.assign({}, this.options || {}, options));
      }
      this.ensureStylesheet(this.config.stylesheetHref);
      await window.Utils.loadScriptsSync([
        'js/service-app/pwa-uploader/job-dom.js',
        'js/service-app/pwa-uploader/job-upload.js',
        'js/service-app/pwa-uploader/job-pwa.js'
      ]);
      this.jobs = {
        dom: new window.Services.PwaUploader.JobDom(this),
        upload: new window.Services.PwaUploader.JobUpload(this),
        pwa: new window.Services.PwaUploader.JobPwa(this)
      };
      this.jobs.pwa.prepare(this.config);
      return this;
    }

    mount(container, options)
    {
      if (options && typeof options === 'object') {
        this.initConfig(Object.assign({}, this.config || {}, options));
      }
      this.root = this.jobs.dom.render(container || this.config.container, this.config);
      this.jobs.dom.bindUI(this.root, {
        onOpenFileDialog: this.openFileDialog.bind(this),
        onChoose: this.handleChooseFiles.bind(this),
        onDrop: this.handleDropFiles.bind(this),
        onStart: this.startUpload.bind(this),
        onRemove: this.removeFromQueue.bind(this)
      });
      this.jobs.dom.renderQueue(this.state.queue, this.state.isUploading, this.config);
      this.emitQueueChange('mount');
      return this.root;
    }

    openFileDialog()
    {
      this.jobs.dom.openInput(this.root);
    }

    handleChooseFiles(files)
    {
      this.jobs.upload.addFiles(files);
    }

    handleDropFiles(files)
    {
      this.jobs.upload.addFiles(files);
    }

    removeFromQueue(id)
    {
      this.jobs.upload.removeFile(id);
    }

    startUpload()
    {
      return this.jobs.upload.startUpload();
    }

    cloneQueue(queue)
    {
      var list = Array.isArray(queue) ? queue : (this.state && this.state.queue) || [];
      var snapshot = [];
      for (var i = 0; i < list.length; i += 1) {
        var item = list[i];
        if (!item) continue;
        snapshot.push({
          id: item.id,
          name: item.name,
          size: typeof item.size === 'number' ? item.size : 0,
          total: typeof item.total === 'number' ? item.total : (typeof item.size === 'number' ? item.size : 0),
          uploaded: typeof item.uploaded === 'number' ? item.uploaded : 0,
          status: item.status || 'pending',
          errorMessage: item.errorMessage || ''
        });
      }
      return snapshot;
    }

    emitQueueChange(reason)
    {
      if (!this.config || typeof this.config.onQueueChange !== 'function') {
        return;
      }
      this.config.onQueueChange(this.cloneQueue(this.state.queue), {
        reason: reason || '',
        isUploading: !!(this.state && this.state.isUploading)
      });
    }

    emitUploadStart(queue)
    {
      if (!this.config || typeof this.config.onStart !== 'function') {
        return null;
      }
      return this.config.onStart(this.cloneQueue(queue));
    }

    emitUploadComplete(info)
    {
      if (!this.config || typeof this.config.onComplete !== 'function') {
        return null;
      }
      var payload = Object.assign({ queue: this.cloneQueue(this.state.queue) }, info || {});
      return this.config.onComplete(payload);
    }
  }

  window.Services = window.Services || {};
  window.Services.PwaUploader = PwaUploader;

})();
