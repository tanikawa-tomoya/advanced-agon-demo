(function () {
  'use strict';

  class MapViewerService
  {
    constructor(options)
    {
      this.jobs = null;
      this.state = { open: false, parts: null, id: null };
      this.initConfig(options);
    }

    initConfig(options)
    {
      // 旧 config.js の移行先: デフォルト設定やクラス名、プロバイダ設定をここで統合
      this.DEFAULTS = Object.freeze({
        provider: 'google',    // 'google' | 'osm'
        center: { lat: 35.681236, lon: 139.767125 }, // 東京駅あたり
        zoom: 14,
        query: '',             // 任意の検索語（中心座標指定がない場合に利用）
        title: '',
        subtitle: '',
        address: '',
        linkText: 'Open in Maps',
        linkTarget: '_blank',
        lockScroll: true,
        dismissOnBackdrop: true,
        dismissOnEsc: true,
        ariaLabel: 'Map Viewer',
        idPrefix: 'mapviewer-',
        zIndex: 10000,
        size: { width: '80vw', height: '70vh' } // ダイアログサイズ
      });
      this.CLASSNAMES = Object.freeze({
        root: 'c-mapv-root',
        backdrop: 'c-mapv-backdrop',
        dialog: 'c-mapv-dialog',
        header: 'c-mapv-header',
        title: 'c-mapv-title',
        subtitle: 'c-mapv-subtitle',
        address: 'c-mapv-address',
        body: 'c-mapv-body',
        iframe: 'c-mapv-iframe',
        link: 'c-mapv-link',
        close: 'c-mapv-close'
      });
      this.PROVIDERS = Object.freeze({
        google: { name: 'google' },
        osm: { name: 'osm' }
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/map-viewer/job-dialog.js',
        'js/service-app/map-viewer/job-content.js',
        'js/service-app/map-viewer/job-scroll.js'
      ]);
      
      this.jobs = {
        dialog: new window.Services.MapViewer.JobDialog(this),
        content: new window.Services.MapViewer.JobContent(this),
        scroll: new window.Services.MapViewer.JobScroll(this)
      };
      return this;
    }

    isOpen() { return !!this.state.open; }

    open(opts) {
      var cfg = Object.assign({}, this.config, opts || {});
      // すでに開いている場合は update
      if (this.isOpen()) {
        this.update(cfg);
        return this.state.parts && this.state.parts.root;
      }

      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));
      var parts = this.jobs.dialog.build({
        id: id,
        ariaLabel: cfg.ariaLabel,
        zIndex: cfg.zIndex,
        size: cfg.size,
        dismissOnBackdrop: cfg.dismissOnBackdrop,
        dismissOnEsc: cfg.dismissOnEsc
      });

      // コンテンツ適用
      this.jobs.content.apply(parts, cfg);

      // マウント
      this.jobs.dialog.mount(parts);

      // スクロールロック
      if (cfg.lockScroll) this.jobs.scroll.lock();

      // 相互作用
      var self = this;
      this.jobs.dialog.bindInteractions(parts, {
        onRequestClose: function () { self.close(); }
      });

      this.state.open = true;
      this.state.parts = parts;
      this.state.id = id;
      return parts.root;
    }

    update(updates) {
      if (!this.isOpen()) return false;
      var cfg = Object.assign({}, this.config, updates || {});
      this.jobs.content.apply(this.state.parts, cfg);
      return true;
    }

    close() {
      if (!this.isOpen()) return false;
      this.jobs.dialog.unmount(this.state.parts);
      this.jobs.scroll.unlockAll ? this.jobs.scroll.unlockAll() : this.jobs.scroll.unlock();
      this.state.open = false;
      this.state.parts = null;
      this.state.id = null;
      return true;
    }

    dispose() { return this.close(); }
  }

  window.Services = window.Services || {};
  window.Services.MapViewer = MapViewerService;

})(window, document);
