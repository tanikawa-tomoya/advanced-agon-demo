(function () {
  'use strict';

  class ExporterService
  {
    constructor(options) {
      this.jobs = null;
      this.config = null;
      this.initConfig(options);
    }

    initConfig(options) {
      // 旧 config.js の内容を main.js に統合
      var DEFAULTS = {
        fileName: 'export',
        csv: { delimiter: ',', quote: '"', bom: true, eol: '\n', header: true },
        tsv: { delimiter: '\t', quote: '"', bom: false, eol: '\n', header: true },
        json: { space: 2, bom: false, eol: '\n' },
        text: { bom: false, eol: '\n' },
        idPrefix: 'export-'
      };
      var TYPE_TO_MIME = {
        csv: 'text/csv;charset=utf-8',
        tsv: 'text/tab-separated-values;charset=utf-8',
        json: 'application/json;charset=utf-8',
        txt: 'text/plain;charset=utf-8'
      };
      var EXTENSION_MAP = {
        csv: '.csv',
        tsv: '.tsv',
        json: '.json',
        txt: '.txt'
      };
      this.DEFAULTS = Object.freeze(DEFAULTS);
      this.TYPE_TO_MIME = Object.freeze(TYPE_TO_MIME);
      this.EXTENSION_MAP = Object.freeze(EXTENSION_MAP);
      this.config = Object.assign({}, DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/exporter/job-general.js',
        'js/service-app/exporter/job-download-csv.js',
        'js/service-app/exporter/job-download-tsv.js',
        'js/service-app/exporter/job-download-json.js',
        'js/service-app/exporter/job-download-text.js',
        'js/service-app/exporter/job-copy-text.js'
      ]);
      
      this.jobs = {
        general: new window.Services.Exporter.JobGeneral(this),
        csv: new window.Services.Exporter.JobDownloadCSV(this),
        tsv: new window.Services.Exporter.JobDownloadTSV(this),
        json: new window.Services.Exporter.JobDownloadJSON(this),
        text: new window.Services.Exporter.JobDownloadText(this),
        copy: new window.Services.Exporter.JobCopyText(this)
      };
      return this;
    }

    // 公開API（旧 main.js と等価な役割）
    downloadCSV(data, opts)  { return this.jobs.csv.download(data, opts || {}); }
    downloadTSV(data, opts)  { return this.jobs.tsv.download(data, opts || {}); }
    downloadJSON(data, opts) { return this.jobs.json.download(data, opts || {}); }
    downloadText(text, opts) { return this.jobs.text.download(text, opts || {}); }
    copyText(text)           { return this.jobs.copy.copy(text); }

    // ユーティリティのプロキシ（必要な場合に使用）
    ensureExtension(name, extKey) {
      var ext = this.EXTENSION_MAP[extKey] || '';
      if (!name) return (this.config.fileName || 'export') + ext;
      name = String(name);
      return name.toLowerCase().endsWith(ext) ? name : (name + ext);
    }
  }

  window.Services = window.Services || {};
  window.Services.Exporter = ExporterService; 

})(window, document);
