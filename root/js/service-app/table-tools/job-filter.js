(function () {
  'use strict';

  class JobFilter
  {
    constructor(service)
    {
      this.service = service;
    }

    filterRows(table, query, cfg)
    {
      var tbody = table.tBodies && table.tBodies[0] ? table.tBodies[0] : table.querySelector('tbody');
      if (!tbody) return { visible: 0, total: 0 };
      var rows = Array.prototype.slice.call(tbody.rows || []);
      var q = query || '';
      var total = rows.length;
      var visible = 0;

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var txt = row.textContent || '';
        var hay = txt;
        if (cfg && cfg.trimQuery) q = (q + '').trim();
        if (cfg && cfg.caseInsensitive) {
          hay = hay.toLowerCase();
        }
        var ok = (q === '') ? true : (hay.indexOf(q) !== -1);
        row.style.display = ok ? '' : 'none';
        if (ok) visible++;
      }
      return { visible: visible, total: total };
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.TableTools || (Services.TableTools = {});
  NS.JobFilter = NS.JobFilter || JobFilter;    

})(window, document);
