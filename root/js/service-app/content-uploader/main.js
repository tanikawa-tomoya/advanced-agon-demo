(function () {

  'use strict';

  class ContentUploader
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
      this.buttonService = options && options.buttonService ? options.buttonService : null;
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
        buttonService: null,
        onQueueChange: null,
        onStart: null,
        onComplete: null,
        text: {
          dropMessage: 'ファイルをドラッグ＆ドロップ\nまたは「ファイルを選択」で追加',
          selectButton: 'ファイルを選択',
          startButton: 'アップロードを開始',
          startButtonInProgress: 'アップロード中…',
          emptyQueue: 'ファイルを選択するとここに表示されます。',
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
      this.buttonService = source.buttonService || this.buttonService;
    }

    async boot(options)
    {
      if (options && typeof options === 'object') {
        this.initConfig(Object.assign({}, this.options || {}, options));
      }
      await window.Utils.loadScriptsSync([
        '/js/service-app/content-uploader/job-dom.js',
        '/js/service-app/content-uploader/job-upload.js'
      ]);
      this.jobs = {
        dom: new window.Services.ContentUploader.JobDom(this),
        upload: new window.Services.ContentUploader.JobUpload(this)
      };
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
  window.Services.ContentUploader = ContentUploader;
  window.Services.contentUploader = ContentUploader;

})();
