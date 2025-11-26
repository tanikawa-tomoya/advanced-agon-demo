(function () {

  'use strict';

  class AvatarCreatorService
  {
    constructor(options)
    {
      this.jobs = null;
      this.overlay = null;
      this.state = { open: false };
      this.initConfig(options);
    }

    initConfig(options)
    {
      // 旧 config.js の内容をこのデフォルトに統合（必要に応じて環境に合わせて上書き）
      this.DEFAULTS = Object.freeze({
        width: 256,            // 出力キャンバスの幅
        height: 256,           // 出力キャンバスの高さ
        shape: 'circle',       // circle | square | rounded
        radius: 24,            // shape=rounded の角丸半径
        minScale: 0.5,         // 最小ズーム倍率
        maxScale: 4.0,         // 最大ズーム倍率
        initialScale: 1.0,     // 初期ズーム倍率
        bgColor: '#FFFFFF',    // 背景色（透明にしたい場合は null にする）
        dismissOnBackdrop: true,
        dismissOnEsc: true,
        ariaLabel: 'Avatar creator',
        zIndex: 10010,
        idPrefix: 'avatarcreator-',
        container: null,       // 表示先（未指定は <body>）
        downloadFilename: 'avatar.png' // 保存ボタン押下時のデフォルトファイル名
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/avatar-creator/job-overlay.js',
        'js/service-app/avatar-creator/job-editor.js',
        'js/service-app/avatar-creator/job-events.js'
      ]);
      
      this.jobs = {
        overlay: new window.Services.AvatarCreator.JobOverlay(this),
        editor: new window.Services.AvatarCreator.JobEditor(this),
        events: new window.Services.AvatarCreator.JobEvents(this)
      };
      return self || this;
    }

    open(opts, handlers) {
      if (this.state.open) return this.overlay;
      var cfg = Object.assign({}, this.config, opts || {});

      // オーバーレイ生成
      var overlay = this.jobs.overlay.createOverlay({
        id: cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000)),
        ariaLabel: cfg.ariaLabel,
        zIndex: cfg.zIndex
      });
      var container = this.jobs.overlay.resolveContainer(cfg.container || document.body);
      container.appendChild(overlay);
      this.overlay = overlay;
      this.state.open = true;

      // キャンバス/UI 初期化
      this.jobs.editor.attach(overlay, {
        width: cfg.width,
        height: cfg.height,
        shape: cfg.shape,
        radius: cfg.radius,
        bgColor: cfg.bgColor,
        minScale: cfg.minScale,
        maxScale: cfg.maxScale,
        initialScale: cfg.initialScale
      });

      // 相互作用（Esc/Backdrop/各種ボタン・入力）
      this.jobs.overlay.bindInteractions(overlay, {
        dismissOnBackdrop: !!cfg.dismissOnBackdrop,
        dismissOnEsc: !!cfg.dismissOnEsc,
        onRequestClose: () => {
          if (handlers && typeof handlers.onCancel === 'function') handlers.onCancel();
          this.close();
        }
      });

      this.jobs.events.bind(overlay, {
        onChooseFile: (file) => { return this.jobs.editor.loadFile(file); },
        onZoom: (scale) => { this.jobs.editor.setScale(scale); },
        onSave: () => {
          return this.jobs.editor.exportPNG().then((blob) => {
            // ダウンロード or コールバック
            if (handlers && typeof handlers.onComplete === 'function') {
              handlers.onComplete(blob);
            } else if (cfg.downloadFilename) {
              var url = w.URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = cfg.downloadFilename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              w.URL.revokeObjectURL(url);
            }
            this.close();
          });
        },
        onCancel: () => {
          if (handlers && typeof handlers.onCancel === 'function') handlers.onCancel();
          this.close();
        }
      }, {
        minScale: cfg.minScale,
        maxScale: cfg.maxScale,
        initialScale: cfg.initialScale
      });

      return overlay;
    }

    close() {
      if (!this.state.open) return;
      if (this.overlay) {
        this.jobs.overlay.removeOverlay(this.overlay);
        this.overlay = null;
      }
      this.state.open = false;
    }

    // 直接 API 経由で画像を設定したい場合
    setImageFromFile(file) {
      if (!this.jobs || !this.jobs.editor) return Promise.reject(new Error('Not booted or editor not ready'));
      return this.jobs.editor.loadFile(file);
    }

    setScale(scale) {
      if (!this.jobs || !this.jobs.editor) return;
      this.jobs.editor.setScale(scale);
    }

    exportPNG() {
      if (!this.jobs || !this.jobs.editor) return Promise.reject(new Error('Not booted or editor not ready'));
      return this.jobs.editor.exportPNG();
    }
  }

  window.Services = window.Services || {};
  window.Services.AvatarCreator = AvatorCreatorService;

})(window, document);
