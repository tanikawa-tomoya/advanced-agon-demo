(function () {

  'use strict';

  /**
   * JobUpload: XHR によるファイル送信
   */
  class JobUpload
  {
    constructor(service)
    {
      this.service = service;
    }

    /**
     * @param {Object} entry - { id, file, ... }
     * @param {Object} cfg   - service.config
     * @param {Function} onProgress - (loaded, total) => void
     * @returns {{xhr: XMLHttpRequest, promise: Promise}}
     */
    send(entry, cfg, onProgress)
    {
      var xhr = new XMLHttpRequest();
      var url = String(cfg.endpoint || '/upload');
      var method = String(cfg.method || 'POST').toUpperCase();

      xhr.open(method, url, true);
      if (cfg.withCredentials) xhr.withCredentials = true;

      // 追加ヘッダー
      if (cfg.headers) {
        for (var k in cfg.headers) {
          if (Object.prototype.hasOwnProperty.call(cfg.headers, k)) {
            try { xhr.setRequestHeader(k, String(cfg.headers[k])); } catch (e) {}
          }
        }
      }

      var form = new FormData();
      var fieldName = String(cfg.paramName || 'file');
      form.append(fieldName, entry.file, entry.file && entry.file.name ? entry.file.name : 'file');
      // 追加フィールド
      if (cfg.extraFields) {
        for (var fk in cfg.extraFields) {
          if (Object.prototype.hasOwnProperty.call(cfg.extraFields, fk)) {
            form.append(fk, cfg.extraFields[fk]);
          }
        }
      }

      xhr.upload.onprogress = function (ev) {
        if (!ev) return;
        var loaded = ev.loaded || 0;
        var total = ev.total || 0;
        if (typeof onProgress === 'function') onProgress(loaded, total);
      };

      var promise = new Promise(function (resolve, reject) {
        xhr.onload = function () {
          var status = xhr.status;
          if (status >= 200 && status < 300) {
            resolve({ status: status, responseText: xhr.responseText, responseType: xhr.responseType });
          } else {
            reject(new Error('http-' + status));
          }
        };
        xhr.onerror = function () { reject(new Error('network-error')); };
        xhr.onabort = function () { reject(new Error('aborted')); };
      });

      xhr.send(form);
      return { xhr: xhr, promise: promise };
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Uploader || (Services.Uploader = {});
  NS.JobUpload = NS.JobUpload || JobUpload;  

})(window, document);
