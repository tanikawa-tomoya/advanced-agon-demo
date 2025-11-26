(function () {
  'use strict';

  class JobDownloadText
  {
    constructor(service)
    {
      this.service = service;
    }

    download(text, opts)
    {
      var cfg = this.service.config;
      var local = Object.assign({}, cfg.text, opts || {});
      var general = this.service.jobs && this.service.jobs.general ? this.service.jobs.general : new NS.JobGeneral(this.service);

      var eol = (typeof local.eol === 'string' ? local.eol : '\n');
      var str = String(text == null ? '' : text);
      if (!str.endsWith(eol)) str += eol;

      var fileName = this.service.ensureExtension(local.fileName || cfg.fileName, 'txt');
      var mime = this.service.TYPE_TO_MIME.txt;
      var blob = general.createBlobFromText(str, mime, !!local.bom);
      general.triggerDownload(blob, fileName);
      return true;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Exporter || (Services.Exporter = {});
  NS.JobDownloadText = NS.JobDownloadText || JobDownloadText; 

})(window, document);
