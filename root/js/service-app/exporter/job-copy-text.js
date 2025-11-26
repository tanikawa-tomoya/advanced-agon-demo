(function () {
  'use strict';

  class JobCopyText
  {
    constructor(service)
    {
      this.service = service;
    }
    
    copy(text)
    {
      var general = this.service.jobs && this.service.jobs.general ? this.service.jobs.general : new NS.JobGeneral(this.service);
      return general.copyText(String(text == null ? '' : text));
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Exporter || (Services.Exporter = {});
  NS.JobCopyText = NS.JobCopyText || JobCopyText;         

})(window, document);
