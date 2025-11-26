(function () {

  'use strict';

  class JobVisibility
  {
    constructor(service)
    {
      this.service = service;
    }

    setColumnVisibility(table, colIndex, visible, CLASSNAMES)
    {
      var display = visible ? '' : 'none';

      // thead
      var ths = table.tHead ? (table.tHead.rows[0] ? table.tHead.rows[0].cells : []) : (table.querySelector('thead tr') || {}).cells || [];
      if (ths && ths[colIndex]) {
        ths[colIndex].style.display = display;
        if (!visible) ths[colIndex].classList.add(CLASSNAMES.colHidden);
        else ths[colIndex].classList.remove(CLASSNAMES.colHidden);
      }

      // tbody
      var tbodies = table.tBodies && table.tBodies.length ? Array.prototype.slice.call(table.tBodies) : [table.querySelector('tbody')];
      for (var t = 0; t < tbodies.length; t++) {
        var rows = (tbodies[t] && tbodies[t].rows) ? Array.prototype.slice.call(tbodies[t].rows) : [];
        for (var r = 0; r < rows.length; r++) {
          var cell = rows[r].cells[colIndex];
          if (cell) cell.style.display = display;
        }
      }

      // tfoot
      var tfoot = table.tFoot || table.querySelector('tfoot');
      if (tfoot && tfoot.rows && tfoot.rows[0]) {
        var tds = tfoot.rows[0].cells;
        if (tds && tds[colIndex]) tds[colIndex].style.display = display;
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.TableTools || (Services.TableTools = {});
  NS.JobVisibility = NS.JobVisibility || JobVisibility;        

})(window, document);
