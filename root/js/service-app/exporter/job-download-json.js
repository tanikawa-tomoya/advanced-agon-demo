(function () {
  'use strict';

  class JobDownloadJSON
  {
    constructor(service)
    {
      this.service = service;
    }

    download(data, opts)
    {
      var cfg = this.service.config;
      var local = Object.assign({}, cfg.json, opts || {});
      var general = this.service.jobs && this.service.jobs.general ? this.service.jobs.general : new NS.JobGeneral(this.service);

      var space = (typeof local.space === 'number' ? local.space : 2);
      var eol = (typeof local.eol === 'string' ? local.eol : '\n');
      var text;
      try {
        text = JSON.stringify(data, null, space) + eol;
      } catch (e) {
        text = String(data == null ? '' : data) + eol;
      }

      var fileName = this.service.ensureExtension(local.fileName || cfg.fileName, 'json');
      var mime = this.service.TYPE_TO_MIME.json;
      var blob = general.createBlobFromText(text, mime, !!local.bom);
      general.triggerDownload(blob, fileName);
      return true;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Exporter || (Services.Exporter = {});
  NS.JobDownloadJSON = NS.JobDownloadJSON || JobDownloadJSON;         
  
})(window, document);
