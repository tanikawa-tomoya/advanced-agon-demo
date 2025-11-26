(function () {

  'use strict';

  class TooltipService
  {
    constructor(options)
    {
      this.jobs = null;
      this.layer = null;
      this.targets = new Map(); // Map<HTMLElement, state>
      this.initConfig(options);
    }

    initConfig(options)
    {
      // 旧 config.js の内容をこちらに統合
      this.DEFAULTS = Object.freeze({
        placement: 'top',          // 'top' | 'bottom' | 'left' | 'right'
        offset: 8,                 // ターゲットからのオフセット(px)
        showDelay: 120,            // 表示までの遅延(ms)
        hideDelay: 80,             // 非表示までの遅延(ms)
        duration: 0,               // 自動クローズ(ms)。0 <= 無効
        trigger: 'hover focus',    // 'hover', 'focus', 'click' の組み合わせ（スペース区切り）
        container: null,           // 表示レイヤを配置するコンテナ。未指定は <body>
        allowHTML: false,          // true の場合は HTML 許可（必要なら sanitize 関数で整形）
        sanitize: null,            // (html) => html のサニタイズ関数。未指定なら無加工
        ariaRole: 'tooltip',       // aria-role
        idPrefix: 'tooltip-',
        zIndex: 10000
      });
      this.VALID_PLACEMENTS = Object.freeze(['top', 'bottom', 'left', 'right']);
      this.TYPE_TO_CLASS = Object.freeze({
        'default': 'is-default',
        'info': 'is-info',
        'success': 'is-success',
        'warning': 'is-warning',
        'error': 'is-error'
      });
      this.CSS = Object.freeze({
        LAYER: 'c-tooltip-layer',
        BASE: 'c-tooltip',
        CONTENT: 'c-tooltip__content',
        ARROW: 'c-tooltip__arrow',
        PLACEMENT_PREFIX: 'c-tooltip--'
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/tooltip/job-layer.js',
        'js/service-app/tooltip/job-tooltip.js',
        'js/service-app/tooltip/job-position.js',
        'js/service-app/tooltip/job-aria.js'
      ]);

      this.jobs = {
        layer: new window.Services.Tooltip.JobLayer(this),
        tooltip: new window.Services.Tooltip.JobTooltip(this),
        position: new window.Services.Tooltip.JobPosition(this),
        aria: new window.Services.Tooltip.JobAria(this)
      };
      // レイヤ確保
      this.layer = this.jobs.layer.ensureLayer(this.config.container || document.body, this.config.zIndex);
      return this;
    }

    // target: Element or selector
    attach(target, opts) {
      var el = this.jobs.layer.resolveElement(target);
      if (!el) return null;
      var cfg = Object.assign({}, this.config, opts || {});
      var state = this.targets.get(el);
      if (!state) {
        state = { timers: {}, node: null, visible: false, cfg: cfg, handlers: {} };
        this.targets.set(el, state);
      } else {
        state.cfg = cfg;
      }

      var triggers = String(cfg.trigger || '').split(/\s+/).filter(Boolean);
      var needHover = triggers.indexOf('hover') >= 0;
      var needFocus = triggers.indexOf('focus') >= 0;
      var needClick = triggers.indexOf('click') >= 0;

      var self = this;

      // 既存のハンドラがあれば解除
      this._unbind(el, state);

      // hover
      if (needHover) {
        state.handlers.mouseenter = function () { self._scheduleShow(el, state); };
        state.handlers.mouseleave = function () { self._scheduleHide(el, state); };
        el.addEventListener('mouseenter', state.handlers.mouseenter, true);
        el.addEventListener('mouseleave', state.handlers.mouseleave, true);
      }
      // focus
      if (needFocus) {
        state.handlers.focusin = function () { self._scheduleShow(el, state); };
        state.handlers.focusout = function () { self._scheduleHide(el, state); };
        el.addEventListener('focusin', state.handlers.focusin, true);
        el.addEventListener('focusout', state.handlers.focusout, true);
      }
      // click（トグル）
      if (needClick) {
        state.handlers.click = function (ev) {
          ev && ev.preventDefault && ev.preventDefault();
          if (state.visible) self.hide(el);
          else self.show(el, state.cfg);
        };
        el.addEventListener('click', state.handlers.click, true);
      }

      return el;
    }

    detach(target) {
      var el = this.jobs.layer.resolveElement(target);
      var state = el && this.targets.get(el);
      if (!state) return false;
      this._clearTimers(state);
      this.hide(el);
      this._unbind(el, state);
      this.targets.delete(el);
      return true;
    }

    show(target, opts) {
      var el = this.jobs.layer.resolveElement(target);
      if (!el) return null;
      var state = this.targets.get(el) || { timers: {}, node: null, visible: false, cfg: Object.assign({}, this.config, opts || {}), handlers: {} };
      state.cfg = Object.assign({}, state.cfg || this.config, opts || {});

      // 既存ノードがあれば一旦削除
      if (state.node) {
        this.jobs.aria.removeDescribedby(el, state.node.id);
        this.jobs.tooltip.removeTooltip(state.node);
        state.node = null;
      }

      // 内容
      var content = (typeof state.cfg.content !== 'undefined') ? state.cfg.content : (el.getAttribute('data-tooltip') || '');
      var placement = (this.VALID_PLACEMENTS.indexOf(String(state.cfg.placement)) >= 0) ? String(state.cfg.placement) : this.DEFAULTS.placement;
      var id = state.cfg.id || (this.config.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));

      // ツールチップ作成
      var node = this.jobs.tooltip.createTooltip({
        id: id,
        role: this.config.ariaRole,
        typeClass: this.TYPE_TO_CLASS[String(state.cfg.type)] || this.TYPE_TO_CLASS['default'],
        css: this.CSS,
        allowHTML: !!state.cfg.allowHTML,
        sanitize: state.cfg.sanitize,
        content: content,
        placement: placement
      });

      this.layer.appendChild(node);
      // 位置計算
      this.jobs.position.place(node, el, placement, Number(state.cfg.offset || this.DEFAULTS.offset));
      // aria-describedby
      this.jobs.aria.addDescribedby(el, id);

      state.node = node;
      state.visible = true;

      // 自動クローズ
      var dur = Number(state.cfg.duration);
      if (dur > 0) {
        this._setTimer(state, 'auto', function () {
          // duration 経過後に閉じる
          // hideDelay を尊重して hide() に委譲
          // note: target への参照が必要
          }, dur);
        // auto close は hideDelay で包むため、ここでは直接閉じない
        // 実際のクローズは scheduleHide を使う
        var self = this;
        this._setTimer(state, 'autoHide', function () { self._scheduleHide(el, state); }, dur);
      }

      // 状態保存
      this.targets.set(el, state);
      return node;
    }

    hide(target) {
      var el = this.jobs.layer.resolveElement(target);
      var state = el && this.targets.get(el);
      if (!state || !state.node) return false;

      this.jobs.aria.removeDescribedby(el, state.node.id);
      this.jobs.tooltip.removeTooltip(state.node);
      state.node = null;
      state.visible = false;
      return true;
    }

    update(target, updates) {
      var el = this.jobs.layer.resolveElement(target);
      var state = el && this.targets.get(el);
      if (!state || !state.node) return false;
      if (updates && Object.prototype.hasOwnProperty.call(updates, 'type')) {
        updates.typeClass = this.TYPE_TO_CLASS[String(updates.type)] || this.TYPE_TO_CLASS['default'];
      }
      if (updates && Object.prototype.hasOwnProperty.call(updates, 'placement')) {
        if (this.VALID_PLACEMENTS.indexOf(String(updates.placement)) < 0) delete updates.placement;
      }
      this.jobs.tooltip.updateTooltip(state.node, updates || {}, this.CSS);
      // 位置更新
      var placement = updates && updates.placement ? updates.placement : (state.node.getAttribute('data-placement') || this.DEFAULTS.placement);
      this.jobs.position.place(state.node, el, placement, Number(state.cfg.offset || this.DEFAULTS.offset));
      return true;
    }

    _scheduleShow(el, state) {
      var self = this;
      this._clearTimer(state, 'hide');
      this._setTimer(state, 'show', function () { self.show(el, state.cfg); }, Number(state.cfg.showDelay || this.DEFAULTS.showDelay));
    }

    _scheduleHide(el, state) {
      var self = this;
      this._clearTimer(state, 'show');
      this._setTimer(state, 'hide', function () { self.hide(el); }, Number(state.cfg.hideDelay || this.DEFAULTS.hideDelay));
    }

    _setTimer(state, key, fn, ms) {
      this._clearTimer(state, key);
      state.timers[key] = w.setTimeout(fn, ms);
    }

    _clearTimer(state, key) {
      if (state.timers && state.timers[key]) {
        w.clearTimeout(state.timers[key]);
        delete state.timers[key];
      }
    }

    _clearTimers(state) {
      if (!state || !state.timers) return;
      for (var k in state.timers) {
        if (Object.prototype.hasOwnProperty.call(state.timers, k)) {
          this._clearTimer(state, k);
        }
      }
    }

    _unbind(el, state) {
      if (!el || !state || !state.handlers) return;
      if (state.handlers.mouseenter) el.removeEventListener('mouseenter', state.handlers.mouseenter, true);
      if (state.handlers.mouseleave) el.removeEventListener('mouseleave', state.handlers.mouseleave, true);
      if (state.handlers.focusin) el.removeEventListener('focusin', state.handlers.focusin, true);
      if (state.handlers.focusout) el.removeEventListener('focusout', state.handlers.focusout, true);
      if (state.handlers.click) el.removeEventListener('click', state.handlers.click, true);
      state.handlers = {};
    }
  }

  window.Services = window.Services || {};
  window.Services.Tooltip = TooltipService;

})(window, document);
