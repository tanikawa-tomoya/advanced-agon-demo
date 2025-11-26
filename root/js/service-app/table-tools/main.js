(function () {

  'use strict';

  class TableToolsService
  {
    constructor(options)
    {
      this.instances = [];
      this.jobs = null;
      this.initConfig(options);
    }

    initConfig(options)
    {
      this.DEFAULTS = Object.freeze({
        toolbarPosition: 'top',         // 'top' | 'bottom'
        enableSearch: true,
        enableColumnToggle: true,
        enableSort: true,
        searchPlaceholder: 'Search…',
        clearLabel: 'Clear',
        statusTemplate: function (visible, total) {
          return 'Showing ' + String(visible) + ' / ' + String(total);
        },
        caseInsensitive: true,
        trimQuery: true,
        // CSS class names
        CLASSNAMES: {
          root: 'c-table-tools',
          toolbar: 'c-table-tools__toolbar',
          search: 'c-table-tools__search',
          searchInput: 'c-table-tools__search-input',
          searchClear: 'c-table-tools__search-clear',
          columns: 'c-table-tools__columns',
          status: 'c-table-tools__status',
          sortAsc: 'is-sort-asc',
          sortDesc: 'is-sort-desc',
          colHidden: 'is-hidden'
        }
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot() {

      await window.Utils.loadScriptsSync([
        'js/service-app/table-toolsjob-build.js',
        'js/service-app/table-toolsjob-filter.js',
        'js/service-app/table-toolsjob-sort.js',
        'js/service-app/table-toolsjob-visibility.js'
      ]);

      this.jobs = {
        build: new window.Services.TableTools.JobBuild(this),
        filter: new window.Services.TableTools.JobFilter(this),
        sort: new window.Services.TableTools.JobSort(this),
        visibility: new window.Services.TableTools.JobVisibility(this)
      };
      return this;
    }

    // 公開API
    attach(tableOrSelector, opts) {
      var table = this._resolveTable(tableOrSelector);
      if (!table) return null;
      if (table.__tt) return table.__tt; // すでにアタッチ済み

      var cfg = Object.assign({}, this.config, opts || {});
      var headers = this.jobs.build.getHeaders(table);
      var state = {
        table: table,
        cfg: cfg,
        headers: headers,
        query: '',
        sort: { index: null, dir: null },
        visibleCols: headers.map(function () { return true; }), // 全列表示
        ui: null,
        handlers: []
      };

      // UI 構築
      state.ui = this.jobs.build.buildToolbar(table, cfg, headers);

      // 列トグルUI
      if (cfg.enableColumnToggle) {
        var toggles = this.jobs.build.buildColumnToggles(state.ui.columns, headers, state.visibleCols, cfg.CLASSNAMES);
        // 変更イベント
        for (var i = 0; i < toggles.length; i++) {
          (function (self, idx, el) {
            var onChange = function () {
              var visible = !!el.checked;
              self.toggleColumn(table, idx, visible);
            };
            el.addEventListener('change', onChange, true);
            state.handlers.push({ el: el, type: 'change', fn: onChange, cap: true });
          })(this, i, toggles[i]);
        }
      }

      // 検索
      if (cfg.enableSearch && state.ui.searchInput) {
        var onInput = (function (self) {
          return function (ev) {
            var val = ev && ev.target ? ev.target.value : '';
            self.setSearch(table, val);
          };
        })(this);
        state.ui.searchInput.addEventListener('input', onInput, true);
        state.handlers.push({ el: state.ui.searchInput, type: 'input', fn: onInput, cap: true });

        if (state.ui.searchClear) {
          var onClear = (function (self) {
            return function (ev) {
              ev && ev.preventDefault && ev.preventDefault();
              self.setSearch(table, '');
              if (state.ui.searchInput) state.ui.searchInput.value = '';
            };
          })(this);
          state.ui.searchClear.addEventListener('click', onClear, true);
          state.handlers.push({ el: state.ui.searchClear, type: 'click', fn: onClear, cap: true });
        }
      }

      // ソート
      if (cfg.enableSort) {
        for (var h = 0; h < headers.length; h++) {
          (function (self, idx, th) {
            var onClick = function (ev) {
              ev && ev.preventDefault && ev.preventDefault();
              self.sort(table, idx); // 次の方向にサイクル
            };
            th.style.cursor = 'pointer';
            th.addEventListener('click', onClick, true);
            state.handlers.push({ el: th, type: 'click', fn: onClick, cap: true });
          })(this, h, headers[h]);
        }
      }

      // 初期ステータス更新
      this.refresh(table);

      // 登録
      table.__tt = state;
      this.instances.push(state);
      return state;
    }

    detach(tableOrSelector) {
      var table = this._resolveTable(tableOrSelector);
      if (!table || !table.__tt) return false;
      var state = table.__tt;

      // ハンドラ解除
      for (var i = 0; i < state.handlers.length; i++) {
        var h = state.handlers[i];
        if (h && h.el && h.fn) {
          h.el.removeEventListener(h.type, h.fn, h.cap);
        }
      }

      // ツールバー削除
      this.jobs.build.removeToolbar(state.ui);

      // ヘッダーのソートクラス除去
      this.jobs.sort.clearSortIndicators(state.headers, state.cfg.CLASSNAMES);

      // 全列表示に戻す
      for (var c = 0; c < state.visibleCols.length; c++) {
        this.jobs.visibility.setColumnVisibility(state.table, c, true, state.cfg.CLASSNAMES);
      }

      // 状態削除
      delete table.__tt;
      var idx = this.instances.indexOf(state);
      if (idx >= 0) this.instances.splice(idx, 1);
      return true;
    }

    setSearch(tableOrSelector, query) {
      var state = this._getState(tableOrSelector);
      if (!state) return false;
      var q = query == null ? '' : String(query);
      if (state.cfg.trimQuery) q = q.trim();
      if (state.cfg.caseInsensitive) q = q.toLowerCase();
      state.query = q;
      // フィルタ適用
      var res = this.jobs.filter.filterRows(state.table, state.query, state.cfg);
      // ステータス更新
      if (state.ui && state.ui.status) {
        this.jobs.build.updateStatus(state.ui.status, res.visible, res.total, state.cfg);
      }
      return true;
    }

    sort(tableOrSelector, colIndex, dir) {
      var state = this._getState(tableOrSelector);
      if (!state) return false;
      var nextDir = dir || this.jobs.sort.nextDirection(state.sort.dir);
      state.sort.index = colIndex;
      state.sort.dir = nextDir;
      // 並び替え
      this.jobs.sort.sortByColumn(state.table, colIndex, nextDir, state.cfg.CLASSNAMES);
      // インジケータ
      this.jobs.sort.updateSortIndicators(state.headers, colIndex, nextDir, state.cfg.CLASSNAMES);
      return true;
    }

    toggleColumn(tableOrSelector, colIndex, visible) {
      var state = this._getState(tableOrSelector);
      if (!state) return false;
      state.visibleCols[colIndex] = !!visible;
      this.jobs.visibility.setColumnVisibility(state.table, colIndex, !!visible, state.cfg.CLASSNAMES);
      // 再計算（フィルタ/ステータス）
      this.refresh(state.table);
      return true;
    }

    refresh(tableOrSelector) {
      var state = this._getState(tableOrSelector);
      if (!state) return false;
      // 現在の検索を適用
      this.setSearch(state.table, state.query);
      // 現在のソートを適用（dir が null の場合はインジケータのみクリア）
      if (state.sort && state.sort.index != null) {
        this.jobs.sort.sortByColumn(state.table, state.sort.index, state.sort.dir, state.cfg.CLASSNAMES);
        this.jobs.sort.updateSortIndicators(state.headers, state.sort.index, state.sort.dir, state.cfg.CLASSNAMES);
      } else {
        this.jobs.sort.clearSortIndicators(state.headers, state.cfg.CLASSNAMES);
      }
      return true;
    }

    // 内部ユーティリティ
    _resolveTable(ref) {
      if (!ref) return null;
      if (ref.nodeType === 1 && ref.tagName && ref.tagName.toLowerCase() === 'table') return ref;
      if (typeof ref === 'string') {
        var el = document.querySelector(ref);
        if (el && el.tagName && el.tagName.toLowerCase() === 'table') return el;
        return null;
      }
      return null;
    }

    _getState(tableOrSelector) {
      var table = this._resolveTable(tableOrSelector) || (tableOrSelector && tableOrSelector.table) || tableOrSelector;
      if (!table) return null;
      return table.__tt || null;
    }
  }

  window.Services = window.Services || {};
  window.Services.TableTools = TableToolsService;  

})(window, document);
