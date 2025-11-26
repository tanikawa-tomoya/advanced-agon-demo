(function () {

  'use strict';

  class JobUpload
  {
    constructor(service)
    {
      this.service = service;
    }

    addFiles(files)
    {
      if (!files || !files.length) return;
      var list = Array.isArray(files) ? files : Array.prototype.slice.call(files);
      var queue = this.service.state.queue;
      var allowMultiple = !this.service || !this.service.config || this.service.config.multiple !== false;

      if (!allowMultiple)
      {
        var firstFile = null;
        for (var i = 0; i < list.length; i++)
        {
          if (!list[i]) continue;
          firstFile = list[i];
          break;
        }
        if (!firstFile)
        {
          return;
        }
        queue.length = 0;
        list = [firstFile];
      }
      for (var i = 0; i < list.length; i++) {
        var file = list[i];
        if (!file) continue;
        queue.push({
          id: this.generateId(),
          file: file,
          name: file.name || 'ファイル',
          size: typeof file.size === 'number' ? file.size : 0,
          total: typeof file.size === 'number' ? file.size : 0,
          uploaded: 0,
          status: 'pending',
          errorMessage: ''
        });
      }
      this.service.jobs.dom.renderQueue(queue, this.service.state.isUploading, this.service.config);
      this.service.emitQueueChange('add');
    }

    removeFile(id)
    {
      if (!id) return;
      var queue = this.service.state.queue || [];
      for (var i = 0; i < queue.length; i++) {
        var item = queue[i];
        if (!item || item.id !== id) continue;
        if (this.service.state.isUploading && item.status === 'uploading') {
          return;
        }
        queue.splice(i, 1);
        break;
      }
      this.service.jobs.dom.renderQueue(queue, this.service.state.isUploading, this.service.config);
      this.service.emitQueueChange('remove');
    }

    async startUpload()
    {
      var state = this.service.state;
      var queue = state.queue || [];
      if (!queue.length || state.isUploading) {
        return null;
      }
      if (!this.service.config || typeof this.service.config.uploadFile !== 'function') {
        throw new Error('uploadFile is required');
      }
      state.isUploading = true;
      this.service.emitQueueChange('start');
      this.service.jobs.dom.renderQueue(queue, state.isUploading, this.service.config);
      await Promise.resolve(this.service.emitUploadStart(queue));
      var uploadedCount = 0;
      var uploadResults = [];
      var completePayload = null;
      try {
        for (var i = 0; i < queue.length; i++) {
          var item = queue[i];
          if (!item || item.status === 'done') {
            continue;
          }
          item.status = 'uploading';
          item.uploaded = 0;
          item.errorMessage = '';
          this.service.jobs.dom.updateQueueItem(item);
          try {
            var result = await this.service.config.uploadFile(item.file, {
              onProgress: this.createProgressHandler(item)
            });
            item.status = 'done';
            item.total = item.total || item.size;
            item.uploaded = item.total;
            uploadedCount += 1;
            uploadResults.push({ id: item.id, result: result || null });
          } catch (err) {
            item.status = 'error';
            item.errorMessage = (err && err.message) ? err.message : (this.service.config.text && this.service.config.text.error) || '';
          }
          this.service.jobs.dom.updateQueueItem(item);
          this.service.emitQueueChange('progress');
        }
      } finally {
        state.isUploading = false;
        this.service.emitQueueChange('complete');
        completePayload = { uploadedCount: uploadedCount, results: uploadResults };
        await Promise.resolve(this.service.emitUploadComplete(completePayload));
        if (this.service.config.autoCleanup) {
          this.cleanupQueue();
        }
        this.service.jobs.dom.renderQueue(state.queue, state.isUploading, this.service.config);
        this.service.emitQueueChange('cleanup');
      }
      return completePayload;
    }

    cleanupQueue()
    {
      var queue = this.service.state.queue || [];
      var nextQueue = [];
      for (var i = 0; i < queue.length; i++) {
        var item = queue[i];
        if (!item) continue;
        if (item.status === 'done') {
          continue;
        }
        nextQueue.push(item);
      }
      this.service.state.queue = nextQueue;
    }

    createProgressHandler(item)
    {
      var self = this;
      return function (info) {
        if (!info || !item) return;
        item.uploaded = typeof info.loaded === 'number' ? info.loaded : item.uploaded;
        item.total = typeof info.total === 'number' ? info.total : item.total || item.size;
        self.service.jobs.dom.updateQueueItem(item);
        self.service.emitQueueChange('progress');
      };
    }

    generateId()
    {
      this.service.state.queueSeed += 1;
      return 'upload-' + Date.now() + '-' + this.service.state.queueSeed;
    }
  }

  window.Services = window.Services || {};
  window.Services.ContentUploader = window.Services.ContentUploader || {};
  window.Services.ContentUploader.JobUpload = JobUpload;

})();
