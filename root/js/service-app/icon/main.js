(function () {

  'use strict';

  class IconService
  {
    constructor(options)
    {
      this.jobs = null;
      this.initConfig(options);
    }

    initConfig(options)
    {
      // 旧 config.js の内容をここへ集約（デフォルトとアクション定義）
      this.DEFAULTS = Object.freeze({
        baseClass: 'c-icon-btn',     // ボタン全体のベースクラス
        iconClass: 'c-icon',         // <svg> 要素のクラス
        srOnlyClass: 'u-sr-only',    // SRテキスト用クラス
        tagName: 'button',           // 生成タグ: button | a | span
        typeAttr: 'button',          // <button type="button">
        tooltip: true,               // title属性によりネイティブツールチップを使う
        tooltipPosition: 'top',      // 将来的な拡張用（基本はtitleのみ）
        tooltipOffset: 8,
        useSprite: true,             // <use href="#symbolId"> を使う（falseなら inline svg）
        zIndex: null
      });
      // よく使うアクションのサンプル定義（旧configの ACTIONS を移行）
      this.ACTIONS = Object.freeze({
        'delete': Object.freeze({ defaultLabel: '削除',  className: 'c-icon-btn--delete',  iconId: 'icon-trash',   svg: null }),
        'edit':   Object.freeze({ defaultLabel: '編集',  className: 'c-icon-btn--edit',    iconId: 'icon-edit',    svg: null }),
        'view':   Object.freeze({ defaultLabel: '表示',  className: 'c-icon-btn--view',    iconId: 'icon-eye',     svg: null }),
        'download': Object.freeze({ defaultLabel: 'DL', className: 'c-icon-btn--download', iconId: 'icon-download',svg: null })
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/icon/job-attributes.js',
        'js/service-app/icon/job-icon.js',
        'js/service-app/icon/job-tooltip.js'
      ]);
      
      this.jobs = {
        attributes: new window.Serviecs.Icon.JobAttributes(this),
        icon: new window.Serviecs.Icon.JobIcon(this),
        tooltip: new window.Serviecs.Icon.JobTooltip(this)
      };
      return this;
    }

    /**
     * アクションタイプに基づいてアイコンボタンを生成
     * @param {string|object} type  - 'delete' 等 or オプションオブジェクト
     * @param {object} [opts]       - 追加オプション
     * @returns {HTMLElement}
     */
    createActionButton(type, opts) {
      var cfg = this.config;
      var options = {};
      var actionKey = null;

      if (typeof type === 'string') {
        actionKey = type;
        options = Object.assign({}, opts || {});
      } else {
        options = Object.assign({}, type || {});
        actionKey = options.type || null;
      }

      var action = (actionKey && this.ACTIONS[actionKey]) || null;
      var label = options.label || (action && action.defaultLabel) || '';
      var iconId = (options.iconId != null) ? options.iconId : (action && action.iconId);
      var svg = (options.svg != null) ? options.svg : (action && action.svg);
      var className = [cfg.baseClass, (action && action.className)].filter(Boolean).join(' ');

      var elTag = (options.tagName || cfg.tagName || 'button').toLowerCase();
      var el = document.createElement(elTag);
      el.className = className;
      if (elTag === 'button') {
        el.setAttribute('type', options.typeAttr || cfg.typeAttr || 'button');
      }
      if (cfg.zIndex != null) {
        el.style.zIndex = String(cfg.zIndex);
      }

      // アイコン要素
      var iconEl = this.jobs.icon.createIconElement({
        iconClass: cfg.iconClass,
        useSprite: (options.useSprite != null ? !!options.useSprite : !!cfg.useSprite),
        iconId: iconId,
        svg: svg,
        title: (options.iconTitle || label || '')
      });
      el.appendChild(iconEl);

      // SRテキスト（視覚非表示）
      if (label) {
        var sr = this.jobs.attributes.createSrText(label, cfg.srOnlyClass);
        el.appendChild(sr);
        // ネイティブツールチップ（title）
        if (cfg.tooltip && (options.tooltip !== false)) {
          el.setAttribute('title', String(label));
        }
        // アクセシビリティ
        el.setAttribute('aria-label', String(label));
      }

      // 任意の属性・data-*・クラス追加
      if (options.attributes) this.jobs.attributes.applyAttributes(el, options.attributes);
      if (options.dataset) this.jobs.attributes.applyDataset(el, options.dataset);
      if (options.className) {
        var extra = this.jobs.attributes.normalizeClassList(options.className);
        for (var i = 0; i < extra.length; i++) el.classList.add(extra[i]);
      }

      // ハンドラ（click 等）
      if (typeof options.onClick === 'function') {
        el.addEventListener('click', function (ev) { options.onClick.call(el, ev); }, true);
      }

      return el;
    }

    createDeleteButton(options) {
      return this.createActionButton('delete', options);
    }

    /**
     * 既存ボタンのアイコン／ラベル差し替え
     * @param {HTMLElement} target
     * @param {string|object} next
     * @returns {boolean}
     */
    replace(target, next) {
      if (!target) return false;
      var options = (typeof next === 'string') ? { type: next } : (next || {});
      var actionKey = options.type || null;
      var action = (actionKey && this.ACTIONS[actionKey]) || null;

      // クラス差し替え
      var cfg = this.config;
      var base = cfg.baseClass;
      var classes = Array.prototype.slice.call(target.classList || []);
      for (var i = 0; i < classes.length; i++) {
        if (classes[i].indexOf(base + '--') === 0) target.classList.remove(classes[i]);
      }
      if (action && action.className) target.classList.add(action.className);

      // アイコン差し替え
      var iconId = (options.iconId != null) ? options.iconId : (action && action.iconId);
      var svg = (options.svg != null) ? options.svg : (action && action.svg);
      var iconEl = this.jobs.icon.createIconElement({
        iconClass: cfg.iconClass,
        useSprite: (options.useSprite != null ? !!options.useSprite : !!cfg.useSprite),
        iconId: iconId, svg: svg, title: options.iconTitle || ''
      });
      this.jobs.icon.replaceIcon(target, iconEl);

      // ラベル更新
      var label = options.label || (action && action.defaultLabel) || '';
      var sr = target.querySelector('.' + cfg.srOnlyClass);
      if (sr) sr.textContent = String(label);
      if (label) {
        target.setAttribute('title', String(label));
        target.setAttribute('aria-label', String(label));
      }

      return true;
    }
  }

  window.Services = window.Services || {};
  window.Services.Icon = IconService;
  

})(window, document);
