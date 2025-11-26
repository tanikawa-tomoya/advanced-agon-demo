(function () {

  'use strict';

  class JobSort
  {
    constructor(service)
    {
      this.service = service;
    }

    nextDirection(current)
    {
      if (current === 'asc') return 'desc';
      if (current === 'desc') return null; // 解除
      return 'asc';
    }

    sortByColumn(table, colIndex, dir, CLASSNAMES)
    {
      var tbody = table.tBodies && table.tBodies[0] ? table.tBodies[0] : table.querySelector('tbody');
      if (!tbody) return;
      var rows = Array.prototype.slice.call(tbody.rows || []);
      if (!rows.length) return;

      if (!dir) {
        // ソート解除: インジケータのみ外す（元順序復元は扱わない）
        return;
      }

      var cmps = rows.map(function (tr, i) {
        var cell = tr.cells[colIndex];
        var txt = cell ? (cell.getAttribute('data-sort') || cell.textContent || '') : '';
        var num = parseFloat(String(txt).replace(/\s/g, ''));
        var isNum = !isNaN(num) && isFinite(num) && String(txt).trim() !== '';
        return { tr: tr, idx: i, key: isNum ? num : String(txt).toLowerCase(), isNum: isNum };
      });

      cmps.sort(function (a, b) {
        var va = a.key, vb = b.key;
        if (a.isNum && b.isNum) {
          return dir === 'asc' ? (va - vb) : (vb - va);
        }
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return a.idx - b.idx; // 安定化
      });

      // 並べ替え
      for (var i = 0; i < cmps.length; i++) {
        tbody.appendChild(cmps[i].tr);
      }
    }

    updateSortIndicators(headers, colIndex, dir, CLASSNAMES)
    {
      this.clearSortIndicators(headers, CLASSNAMES);
      if (dir && headers[colIndex]) {
        if (dir === 'asc') headers[colIndex].classList.add(CLASSNAMES.sortAsc);
        if (dir === 'desc') headers[colIndex].classList.add(CLASSNAMES.sortDesc);
      }
    }

    clearSortIndicators(headers, CLASSNAMES)
    {
      for (var i = 0; i < headers.length; i++) {
        headers[i].classList.remove(CLASSNAMES.sortAsc);
        headers[i].classList.remove(CLASSNAMES.sortDesc);
      }
    }
  }
  
  var Services = window.Services = window.Services || {};
  var NS = Services.TableTools || (Services.TableTools = {});
  NS.JobSort = NS.JobSort || JobSort;      
  
})(window, document);
