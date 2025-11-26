(function () {

  'use strict';

  class JobBuild
  {
    constructor(service)
    {
      this.service = service;
    }

    getHeaders(table)
    {
      var thead = table.querySelector('thead');
      var row = thead ? thead.querySelector('tr') : null;
      var headers = row ? Array.prototype.slice.call(row.children) : Array.prototype.slice.call((table.rows[0] || {}).cells || []);
      return headers || [];
    }

    buildToolbar(table, cfg, headers)
    {
      var C = cfg.CLASSNAMES;
      var wrapper = document.createElement('div');
      wrapper.className = C.root;

      var toolbar = document.createElement('div');
      toolbar.className = C.toolbar;

      var searchWrap = document.createElement('div');
      searchWrap.className = C.search;

      var searchInput = null;
      var searchClear = null;
      if (cfg.enableSearch) {
        searchInput = document.createElement('input');
        searchInput.setAttribute('type', 'search');
        searchInput.setAttribute('placeholder', String(cfg.searchPlaceholder || 'Search…'));
        searchInput.className = C.searchInput;

        searchClear = document.createElement('button');
        searchClear.setAttribute('type', 'button');
        searchClear.className = C.searchClear;
        searchClear.textContent = String(cfg.clearLabel || 'Clear');
        searchWrap.appendChild(searchInput);
        searchWrap.appendChild(searchClear);
      }

      var columns = document.createElement('div');
      columns.className = C.columns;

      var status = document.createElement('div');
      status.className = C.status;

      // 組み立て
      toolbar.appendChild(searchWrap);
      toolbar.appendChild(columns);
      toolbar.appendChild(status);
      wrapper.appendChild(toolbar);

      // DOM へ挿入
      if (cfg.toolbarPosition === 'bottom') {
        if (table.nextSibling) {
          table.parentNode.insertBefore(wrapper, table.nextSibling);
        } else {
          table.parentNode.appendChild(wrapper);
        }
      } else {
        table.parentNode.insertBefore(wrapper, table);
      }

      return {
        root: wrapper,
        toolbar: toolbar,
        searchInput: searchInput,
        searchClear: searchClear,
        columns: columns,
        status: status
      };
    }

    buildColumnToggles(container, headers, visibleArr, CLASSNAMES) {
      // 各列のトグルチェックボックスを生成
      var toggles = [];
      for (var i = 0; i < headers.length; i++) {
        var th = headers[i];
        var labelText = th ? (th.getAttribute('data-label') || th.textContent || ('Col ' + (i + 1))) : ('Col ' + (i + 1));

        var label = document.createElement('label');
        var cb = document.createElement('input');
        cb.setAttribute('type', 'checkbox');
        cb.setAttribute('data-col-index', String(i));
        cb.checked = !!visibleArr[i];
        label.appendChild(cb);

        var span = document.createElement('span');
        span.textContent = labelText.trim();
        label.appendChild(span);

        container.appendChild(label);
        toggles.push(cb);
      }
      return toggles;
    }

    updateStatus(statusEl, visibleCount, totalCount, cfg) {
      if (!statusEl) return;
      var tpl = (cfg && cfg.statusTemplate) ? cfg.statusTemplate : function (v, t) { return 'Showing ' + v + ' / ' + t; };
      statusEl.textContent = String(tpl(visibleCount, totalCount));
    }

    removeToolbar(ui) {
      if (!ui || !ui.root) return;
      if (ui.root.parentNode) ui.root.parentNode.removeChild(ui.root);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.TableTools || (Services.TableTools = {});
  NS.JobBuild = NS.JobBuild || JobBuild;  

})(window, document);
