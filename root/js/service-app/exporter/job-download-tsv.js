(function () {
  'use strict';

  class JobDownloadTSV
  {
    constructor(service)
    {
      this.service = service;
    }

    download(data, opts)
    {
      var cfg = this.service.config;
      var local = Object.assign({}, cfg.tsv, opts || {});
      var general = this.service.jobs && this.service.jobs.general ? this.service.jobs.general : new NS.JobGeneral(this.service);

      var text = general.toSeparatedValues(
        data,
        local.columns || null,
        '\t',
        local.quote != null ? local.quote : '"',
        !!local.header,
        local.eol || '\n'
      );

      var fileName = this.service.ensureExtension(local.fileName || cfg.fileName, 'tsv');
      var mime = this.service.TYPE_TO_MIME.tsv;
      var blob = general.createBlobFromText(text, mime, !!local.bom);
      general.triggerDownload(blob, fileName);
      return true;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Exporter || (Services.Exporter = {});
  NS.JobDownloadTSV = NS.JobDownloadTSV || JobDownloadTSV;  

})(window, document);
