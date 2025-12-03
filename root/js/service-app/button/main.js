// js/service-app/button/main.js
(function () {
  'use strict';

  function hasOwn(obj, key)
  {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function pickField(item, keys)
  {
    if (!item || typeof item !== 'object') { return ''; }
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (!key) { continue; }
      const value = item[key];
      if (value === undefined || value === null) { continue; }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) { return trimmed; }
        continue;
      }
      if (typeof value === 'number') {
        if (!Number.isNaN(value)) { return String(value); }
        continue;
      }
      if (typeof value === 'object') {
        if (value && typeof value.name === 'string') {
          const name = value.name.trim();
          if (name) { return name; }
        }
        if (value && typeof value.label === 'string') {
          const label = value.label.trim();
          if (label) { return label; }
        }
      }
      return String(value);
    }
    return '';
  }

  function normalizeStatusKey(value, config)
  {
    if (value === null || value === undefined) { return ''; }
    const normalized = String(value).trim();
    if (!normalized) { return ''; }
    const lowered = normalized.toLowerCase();
    if (lowered === 'draft') { return ''; }
    if (lowered === 'review') { return 'active'; }
    const variants = config && config.STATUS_VARIANTS;
    if (variants) {
      if (hasOwn(variants, lowered)) { return lowered; }
      if (hasOwn(variants, normalized)) { return normalized; }
    }
    if (lowered === 'active' || lowered === 'completed' || lowered === 'cancelled') {
      return lowered;
    }
    return normalized;
  }

  function mapStatusLabelToKey(label, config)
  {
    const normalized = String(label || '').trim();
    if (!normalized) { return ''; }
    const map = config && config.LABEL_TO_KEY;
    if (map && hasOwn(map, normalized)) {
      return map[normalized];
    }
    return '';
  }

  function resolveStatusPresentationFromConfig(item, config)
  {
    const label = pickField(item, ['statusLabel', 'statusText']);
    const rawStatus = pickField(item, ['status', 'state', 'progress']);
    const keySource = rawStatus || label;
    let statusKey = normalizeStatusKey(keySource, config);
    const labels = (config && config.STATUS_LABELS) || {};
    const variants = (config && config.STATUS_VARIANTS) || {};
    let knownStatus = hasOwn(labels, statusKey);
    if (!knownStatus && label) {
      const mapped = mapStatusLabelToKey(label, config);
      if (mapped || mapped === '') {
        statusKey = mapped;
        knownStatus = hasOwn(labels, statusKey);
      }
    }
    let text = '';
    if (knownStatus) {
      text = labels[statusKey];
    } else {
      text = label || '';
    }
    if (!text) {
      if (rawStatus) {
        text = rawStatus;
      } else if (statusKey) {
        text = statusKey;
      }
    }
    const defaults = (config && config.DEFAULTS) || {};
    if (!text) { text = defaults.fallbackText || '-'; }
    const variant = knownStatus ? (variants[statusKey] || null) : null;
    return {
      text,
      statusKey,
      variant,
      raw: rawStatus || '',
      label: label || ''
    };
  }

  function resolveStatusOptions(config, options)
  {
    const defaults = (config && config.DEFAULTS) || {};
    return Object.assign({}, defaults, options || {});
  }

  function createStatusButtonElement(presentation, config, options)
  {
    const opts = resolveStatusOptions(config, options);
    const tag = (opts.elementTag || 'button').toLowerCase();
    const element = document.createElement(tag === 'button' ? 'button' : tag);
    if (tag === 'button') {
      element.type = opts.type || 'button';
    }
    const baseClass = opts.baseClass || 'target-status';
    element.className = baseClass;
    const variant = presentation && presentation.variant;
    if (variant) {
      let prefixes = [];
      if (Array.isArray(opts.variantPrefix)) {
        prefixes = opts.variantPrefix.filter((p) => typeof p === 'string' && p);
      } else if (typeof opts.variantPrefix === 'string' && opts.variantPrefix) {
        prefixes = [opts.variantPrefix];
      }
      if (!prefixes.length) {
        prefixes = ['target-status--'];
      }
      for (let i = 0; i < prefixes.length; i += 1) {
        element.className += ' ' + prefixes[i] + variant;
      }
    }
    const attrName = opts.attributeName || 'data-status-key';
    if (presentation && typeof presentation.statusKey === 'string') {
      element.setAttribute(attrName, presentation.statusKey);
    }
    const text = presentation && presentation.text ? presentation.text : (opts.fallbackText || '-');
    element.textContent = text;
    return element;
  }

  function normalizeActionType(type, aliases)
  {
    if (type === null || type === undefined) {
      return '';
    }
    const normalized = String(type).trim().toLowerCase();
    if (!normalized) {
      return '';
    }
    if (aliases && hasOwn(aliases, normalized)) {
      return aliases[normalized];
    }
    return normalized;
  }

  function toArray(value)
  {
    if (Array.isArray(value)) {
      const out = [];
      for (let i = 0; i < value.length; i += 1) {
        const item = value[i];
        if (typeof item === 'string' && item.trim()) {
          out.push(item.trim());
        }
      }
      return out;
    }
    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }
    return [];
  }

  function mergeAttributeSources()
  {
    const merged = {};
    let hasAny = false;
    for (let i = 0; i < arguments.length; i += 1) {
      const source = arguments[i];
      if (!source || typeof source !== 'object') {
        continue;
      }
      const keys = Object.keys(source);
      for (let j = 0; j < keys.length; j += 1) {
        const key = keys[j];
        if (!hasOwn(source, key)) {
          continue;
        }
        const value = source[key];
        if (value === undefined || value === null) {
          continue;
        }
        merged[key] = value;
        hasAny = true;
      }
    }
    return hasAny ? merged : {};
  }

  function clamp01(value)
  {
    const num = Number(value);
    if (Number.isNaN(num)) { return null; }
    if (num < 0) { return 0; }
    if (num > 1) { return 1; }
    return num;
  }

  function hexToRgbTuple(value)
  {
    if (!value || typeof value !== 'string') { return null; }
    const hex = value.trim().replace(/^#/, '');
    if (hex.length === 3) {
      const r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
      const g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      const b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) { return null; }
      return [r, g, b];
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) { return null; }
      return [r, g, b];
    }
    return null;
  }

  function rgbStringToTuple(value)
  {
    if (!value || typeof value !== 'string') { return null; }
    const cleaned = value.replace(/rgb(a)?\(|\)/gi, '').trim();
    const parts = cleaned.split(',').slice(0, 3).map(function (part)
    {
      return parseInt(part, 10);
    });
    if (parts.length !== 3 || parts.some(function (n) { return Number.isNaN(n); })) {
      return null;
    }
    return parts;
  }

  function colorWithOpacity(color, opacity)
  {
    const alpha = clamp01(opacity);
    if (alpha === null || alpha === 1) {
      return (typeof color === 'string' && color.trim()) ? color.trim() : '';
    }
    const trimmed = (typeof color === 'string') ? color.trim() : '';
    const hexTuple = hexToRgbTuple(trimmed);
    if (hexTuple) {
      return 'rgba(' + hexTuple[0] + ',' + hexTuple[1] + ',' + hexTuple[2] + ',' + alpha + ')';
    }
    const rgbTuple = rgbStringToTuple(trimmed);
    if (rgbTuple) {
      return 'rgba(' + rgbTuple[0] + ',' + rgbTuple[1] + ',' + rgbTuple[2] + ',' + alpha + ')';
    }
    if (trimmed.indexOf('rgba(') === 0) {
      return trimmed;
    }
    if (trimmed.indexOf('rgb(') === 0) {
      return trimmed.replace(/rgb\(/i, 'rgba(').replace(/\)$/, ',' + alpha + ')');
    }
    return trimmed;
  }

  function normalizeBorderWidth(value)
  {
    if (value === null || value === undefined) { return ''; }
    if (typeof value === 'number' && !Number.isNaN(value)) { return value + 'px'; }
    const text = String(value).trim();
    if (!text) { return ''; }
    if (/^[0-9]+(\.[0-9]+)?$/.test(text)) { return text + 'px'; }
    return text;
  }

  function extractTextFromHtml(html, doc)
  {
    const hostDoc = doc || document;
    if (!hostDoc || typeof hostDoc.createElement !== 'function') { return ''; }
    const container = hostDoc.createElement('div');
    container.innerHTML = html;
    return container.textContent ? container.textContent.trim() : '';
  }

  function applyCurlRibbonStyles(element, options)
  {
    const background = colorWithOpacity(options.backgroundColor || '#c13d36', options.backgroundOpacity);
    const borderColor = (options.borderColor !== undefined && options.borderColor !== null)
      ? String(options.borderColor)
      : '';
    const borderWidth = normalizeBorderWidth(options.borderWidth);
    if (background) {
      element.style.setProperty('--curl-ribbon-bg-color', background);
    }
    if (borderColor) {
      element.style.setProperty('--curl-ribbon-border-color', borderColor);
    }
    if (borderWidth) {
      element.style.setProperty('--curl-ribbon-border-width', borderWidth);
    }
  }

  function toDataAttributeName(key)
  {
    return 'data-' + String(key).replace(/([A-Z])/g, function (match)
    {
      return '-' + match.toLowerCase();
    });
  }

  function applyDatasetAttributes(element, dataset)
  {
    if (!element || !dataset) {
      return;
    }
    const keys = Object.keys(dataset);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (!hasOwn(dataset, key)) {
        continue;
      }
      const value = dataset[key];
      if (value === undefined || value === null) {
        continue;
      }
      element.setAttribute(toDataAttributeName(key), String(value));
    }
  }

  function applyVariantClasses(element, prefixes, variant)
  {
    if (!element || !variant) {
      return;
    }
    const list = toArray(prefixes);
    if (!list.length) {
      return;
    }
    let className = element.className || '';
    for (let i = 0; i < list.length; i += 1) {
      const prefix = list[i];
      const classValue = prefix + variant;
      if (!classValue) {
        continue;
      }
      className = className ? (className + ' ' + classValue) : classValue;
    }
    element.className = className;
  }

  function appendIconMarkup(element, html, doc)
  {
    if (!element || !html) {
      return;
    }
    const hostDoc = (doc && typeof doc.createElement === 'function') ? doc : document;
    const wrapper = hostDoc.createElement('div');
    wrapper.innerHTML = html;
    while (wrapper.firstChild) {
      element.appendChild(wrapper.firstChild);
    }
  }

  const STATUS_VARIANTS = Object.freeze({
    '': 'draft',
    draft: 'draft',
    active: 'active',
    review: 'active',
    completed: 'completed',
    cancelled: 'cancelled'
  });

  const STATUS_LABELS = Object.freeze({
    '': '非公開',
    draft: '非公開',
    active: '公開',
    review: '公開',
    completed: '完了',
    cancelled: 'キャンセル'
  });

  const LABEL_TO_KEY = Object.freeze({
    '公開': 'active',
    '完了': 'completed',
    'キャンセル': 'cancelled',
    'キャンセル済み': 'cancelled',
    '非公開': ''
  });

  const DEFAULTS = Object.freeze({
    elementTag: 'button',
    baseClass: 'target-detail__badge target-status',
    variantPrefix: Object.freeze(['target-detail__badge--status-', 'target-status--']),
    attributeName: 'data-status-key',
    fallbackText: '-',
    type: 'button'
  });

  const ACTION_BUTTON_DEFAULTS = Object.freeze({
    elementTag: 'button',
    baseClass: 'table-action-button',
    variantPrefix: Object.freeze(['table-action-button--']),
    type: 'button',
    fallbackLabel: '',
    attributes: Object.freeze({}),
    srLabelClass: '',
    iconClass: '',
    iconAriaHidden: true
  });

  const ACTION_BUTTON_ALIASES = Object.freeze({
    run: 'execute',
    'round-popup/preview': 'preview',
    'round-popup/edit': 'edit',
    'round-popup/delete': 'delete',
    'round-popup/up': 'up',
    'round-popup/down': 'down'
  });

  const EYE_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2.5 12s3.25-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.25 5.5-9.5 5.5S2.5 12 2.5 12z"></path>',
    '<circle cx="12" cy="12" r="2.75" fill="none" stroke="currentColor" stroke-width="1.5"></circle>',
    '<circle cx="12" cy="12" r="1.25" fill="currentColor"></circle>',
    '</svg>'
  ].join('');

  const LINK_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M9.5 14.5 6.5 17.5a3 3 0 0 1-4.24-4.24l3-3"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M14.5 9.5l3-3a3 3 0 0 1 4.24 4.24l-3 3"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m8.75 15.25 6.5-6.5"></path>',
    '</svg>'
  ].join('');

  const OPEN_LINK_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M13.5 5.5h5v5"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m13.75 10.25 4.75-4.75"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M11 7H6.75A1.75 1.75 0 0 0 5 8.75v8.5A1.75 1.75 0 0 0 6.75 19h8.5A1.75 1.75 0 0 0 17 17.25V13"></path>',
    '</svg>'
  ].join('');

  const STATISTICS_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M4.75 18.75h14.5"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M7.25 18.25v-4.5"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 18.25v-8.5"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M16.75 18.25v-6"></path>',
    '</svg>'
  ].join('');

  const ACTION_BUTTON_ICON_FALLBACKS = Object.freeze({
    detail: EYE_ICON_HTML,
    preview: EYE_ICON_HTML,
    statistics: STATISTICS_ICON_HTML,
    usage: LINK_ICON_HTML,
    'open-link': OPEN_LINK_ICON_HTML,
    edit: [
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
      '  d="M4 20h3.5L19 8.5a2.12 2.12 0 0 0 0-3L18.5 5a2.12 2.12 0 0 0-3 0L6.5 14.5 4 20z"></path>',
      '<path fill="currentColor" d="m14.75 6.25 3 3 .88-.88a1 1 0 0 0 0-1.42L17.05 4.3a1 1 0 0 0-1.41 0z"></path>',
      '</svg>'
    ].join(''),
    delete: [
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
      '  d="M4.5 6.75h15M9.5 4.5h5a1 1 0 0 1 1 1v1.25H8.5V5.5a1 1 0 0 1 1-1zm9 2.25v12A1.5 1.5 0 0 1 17 20.5H7a1.5 1.5 0 0 1-1.5-1.5v-12m4 4v6m3-6v6"></path>',
      '</svg>'
    ].join(''),
    remove: [
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
      '<circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle>',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M8.25 12h7.5"></path>',
      '</svg>'
    ].join(''),
    'mail-check': [
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
      '  d="M3.75 6.5A1.75 1.75 0 0 1 5.5 4.75h8.75a1.75 1.75 0 0 1 1.75 1.75v3.25L10 12.75 3.75 9.75z"></path>',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
      '  d="M3.75 9.25V17.5A1.75 1.75 0 0 0 5.5 19.25h8.75"></path>',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m13 6 3.25 2.5"></path>',
      '<circle cx="17.75" cy="16.25" r="4" fill="none" stroke="currentColor" stroke-width="1.5"></circle>',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m16.1 16.25 1.3 1.3 2.15-2.6"></path>',
      '</svg>'
    ].join('')
  });

  function getButtonNamespace()
  {
    const services = window.Services = window.Services || {};
    return services.Button || (services.Button = {});
  }

  function buildActionButtonTypes(ns)
  {
    const registry = {};
    const jobs = ns.ActionButtonDesignJobs || ns.ActionButtonTypeJobs || [];
    for (let i = 0; i < jobs.length; i += 1) {
      const JobClass = jobs[i];
      const job = new JobClass();
      const definitions = job.getDefinitions();
      for (let j = 0; j < definitions.length; j += 1) {
        const definition = definitions[j];
        registry[definition.key] = definition.config;
      }
    }
    return Object.freeze(registry);
  }

  let cachedButtonConfig = null;

  function getButtonConfig(ns)
  {
    if (cachedButtonConfig) {
      return cachedButtonConfig;
    }
    const namespace = ns || getButtonNamespace();
    const actionButtonTypes = namespace.ActionButtonTypes || buildActionButtonTypes(namespace);
    namespace.ActionButtonTypes = actionButtonTypes;
    if (!namespace.getActionButtonTypes) {
      namespace.getActionButtonTypes = function ()
      {
        return buildActionButtonTypes(namespace);
      };
    }
    cachedButtonConfig = Object.freeze({
      STATUS_VARIANTS,
      STATUS_LABELS,
      LABEL_TO_KEY,
      DEFAULTS,
      ACTION_BUTTON_DEFAULTS,
      ACTION_BUTTON_TYPES: actionButtonTypes,
      ACTION_BUTTON_ALIASES
    });
    return cachedButtonConfig;
  }

  let actionTooltipElement = null;
  let actionTooltipShowFrame = null;
  let actionTooltipWindowBound = false;
  let actionTooltipDocBound = null;

  function findActionButtonTarget(target, doc)
  {
    const hostDoc = doc || document;
    let node = target;
    while (node && node !== hostDoc && node !== hostDoc.documentElement) {
      if (node.nodeType === 1) {
        const className = typeof node.className === 'string' ? node.className : '';
        if (className && className.indexOf('table-action-button') !== -1) {
          return node;
        }
      }
      node = node.parentNode;
    }
    if (node && node.nodeType === 1) {
      const className = typeof node.className === 'string' ? node.className : '';
      if (className && className.indexOf('table-action-button') !== -1) {
        return node;
      }
    }
    return null;
  }

  function ensureActionTooltipElement(doc)
  {
    const hostDoc = doc || document;
    if (!hostDoc || !hostDoc.body) {
      return null;
    }
    if (!actionTooltipElement) {
      actionTooltipElement = hostDoc.createElement('div');
      actionTooltipElement.className = 'table-action-tooltip';
      actionTooltipElement.setAttribute('role', 'tooltip');
      actionTooltipElement.setAttribute('aria-hidden', 'true');
      hostDoc.body.appendChild(actionTooltipElement);
    }
    if (!actionTooltipWindowBound && typeof window !== 'undefined') {
      const hide = function () { hideActionTooltip(); };
      window.addEventListener('scroll', hide, true);
      window.addEventListener('resize', hide);
      window.addEventListener('blur', hide);
      actionTooltipWindowBound = true;
    }
    return actionTooltipElement;
  }

  function positionActionTooltip(target)
  {
    if (!actionTooltipElement || !target) {
      return;
    }
    const rect = target.getBoundingClientRect();
    const offset = 12;
    const left = rect.left + rect.width / 2;
    const top = rect.top - offset;
    actionTooltipElement.style.left = left + 'px';
    actionTooltipElement.style.top = top + 'px';
  }

  function showActionTooltip(target, doc)
  {
    if (!target || typeof document === 'undefined') {
      return;
    }
    const label = (target.dataset && target.dataset.hoverLabel)
      ? target.dataset.hoverLabel
      : target.getAttribute('data-hover-label');
    if (!label) {
      return;
    }
    const tooltip = ensureActionTooltipElement(doc);
    if (!tooltip) {
      return;
    }
    tooltip.textContent = label;
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
    positionActionTooltip(target);
    if (actionTooltipShowFrame) {
      cancelAnimationFrame(actionTooltipShowFrame);
    }
    actionTooltipShowFrame = requestAnimationFrame(function ()
    {
      tooltip.classList.add('is-visible');
      actionTooltipShowFrame = null;
    });
  }

  function hideActionTooltip()
  {
    if (!actionTooltipElement) {
      return;
    }
    if (actionTooltipShowFrame) {
      cancelAnimationFrame(actionTooltipShowFrame);
      actionTooltipShowFrame = null;
    }
    actionTooltipElement.classList.remove('is-visible');
    actionTooltipElement.setAttribute('aria-hidden', 'true');
  }

  function bindActionTooltipListeners(doc)
  {
    const hostDoc = doc || document;
    if (!hostDoc || typeof hostDoc.addEventListener !== 'function') {
      return;
    }
    if (actionTooltipDocBound === hostDoc) {
      return;
    }
    actionTooltipDocBound = hostDoc;
    const showHandler = function (event)
    {
      const button = findActionButtonTarget(event.target, hostDoc);
      if (button) {
        showActionTooltip(button, hostDoc);
      }
    };
    const hideHandler = function (event)
    {
      const button = findActionButtonTarget(event.target, hostDoc);
      if (!button) {
        return;
      }
      if (event.type === 'mouseout') {
        const related = event.relatedTarget;
        if (related && findActionButtonTarget(related, hostDoc) === button) {
          return;
        }
      }
      hideActionTooltip();
    };
    hostDoc.addEventListener('mouseover', showHandler, true);
    hostDoc.addEventListener('focusin', showHandler, true);
    hostDoc.addEventListener('mouseout', hideHandler, true);
    hostDoc.addEventListener('focusout', hideHandler, true);
    hostDoc.addEventListener('touchstart', function ()
    {
      hideActionTooltip();
    }, { passive: true });
  }

  class ButtonService
  {
    constructor(options)
    {
      this.options = options || {};
      this.config = {};
      this._CFG = null;
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        { src: '/js/service-app/button/job-action-design-round-popup.js' },
        { src: '/js/service-app/button/job-action-design-banner.js' },
        { src: '/js/service-app/button/job-action-design-translucent-rounded.js' },
        { src: '/js/service-app/button/job-action-design-pill-button.js' },
        { src: '/js/service-app/button/job-action-design-expandable-icon-button.js' },
        { src: '/js/service-app/button/job-action-design-curl-ribbon.js' }
      ]);

      const jobs = getButtonNamespace();
      this._CFG = getButtonConfig(jobs);
      this.config = Object.assign({}, this._CFG.DEFAULTS, this.options || {});
      bindActionTooltipListeners(document);
    }

    resolveStatusPresentation(item)
    {
      if (this._CFG) {
        return resolveStatusPresentationFromConfig(item, this._CFG);
      }
      const fallbackText = (this.config && this.config.fallbackText) ? this.config.fallbackText : '-';
      return {
        text: fallbackText,
        statusKey: '',
        variant: null,
        raw: '',
        label: ''
      };
    }

    createStatusButton(presentation, options)
    {
      if (this._CFG) {
        return createStatusButtonElement(presentation, this._CFG, options || {});
      }
      const opts = Object.assign({}, this.config, options || {});
      const tagName = (opts.elementTag || 'button').toLowerCase();
      const el = document.createElement(tagName === 'button' ? 'button' : tagName);
      if (tagName === 'button') {
        el.type = opts.type || 'button';
      }
      el.className = opts.baseClass || 'target-status';
      const variant = presentation && presentation.variant;
      if (variant) {
        let prefixes = [];
        if (Array.isArray(opts.variantPrefix)) {
          prefixes = opts.variantPrefix.filter((p) => typeof p === 'string' && p);
        } else if (typeof opts.variantPrefix === 'string' && opts.variantPrefix) {
          prefixes = [opts.variantPrefix];
        }
        if (!prefixes.length) {
          prefixes = ['target-status--'];
        }
        for (let i = 0; i < prefixes.length; i += 1) {
          el.className += ' ' + prefixes[i] + variant;
        }
      }
      if (presentation && typeof presentation.statusKey === 'string') {
        el.setAttribute(opts.attributeName || 'data-status-key', presentation.statusKey);
      }
      const text = presentation && presentation.text ? presentation.text : (opts.fallbackText || '-');
      el.textContent = text;
      return el;
    }

    createStatusButtonFromItem(item, options)
    {
      const presentation = this.resolveStatusPresentation(item);
      return this.createStatusButton(presentation, options);
    }

    createStatusBadge(presentation, options)
    {
      return this.createStatusButton(presentation, options);
    }

    createStatusBadgeFromItem(item, options)
    {
      return this.createStatusButtonFromItem(item, options);
    }

    createActionButton(buttonType, options)
    {
      const opts = options ? Object.assign({}, options) : {};
      if (opts.attributes && typeof opts.attributes === 'object') {
        opts.attributes = Object.assign({}, opts.attributes);
      }
      return this._createActionButtonElement(buttonType, opts);
    }

    createExecuteButton(options)
    {
      return this.createActionButton('execute', options || {});
    }

    createDeleteButton(options)
    {
      return this.createActionButton('delete', options || {});
    }

    _createActionButtonElement(buttonType, options)
    {
      const cfg = this._CFG || {};
      const aliases = cfg.ACTION_BUTTON_ALIASES || {};
      const defaults = cfg.ACTION_BUTTON_DEFAULTS || {};
      const typeMap = cfg.ACTION_BUTTON_TYPES || {};
      const normalizedType = normalizeActionType(buttonType, aliases);
      if (!normalizedType || !hasOwn(typeMap, normalizedType)) {
        throw new Error('Unknown expandable icon type: ' + buttonType);
      }
      const typeConfig = typeMap[normalizedType];
      const baseOptions = Object.assign({}, defaults, typeConfig);
      const finalOptions = Object.assign({}, baseOptions, options || {});
      const attributes = mergeAttributeSources(defaults.attributes, typeConfig.attributes, options && options.attributes);
      const dataset = mergeAttributeSources(defaults.dataset, typeConfig.dataset, options && options.dataset);
      const tagName = (finalOptions.elementTag || 'button').toLowerCase();
      const element = document.createElement(tagName === 'button' ? 'button' : tagName);
      if (tagName === 'button') {
        element.type = finalOptions.type || 'button';
      }
      if (typeof finalOptions.baseClass === 'string' && finalOptions.baseClass.trim()) {
        element.className = finalOptions.baseClass.trim();
      }
      const variant = finalOptions.variant || normalizedType;
      applyVariantClasses(element, finalOptions.variantPrefix, variant);
      const attrKeys = attributes ? Object.keys(attributes) : [];
      for (let i = 0; i < attrKeys.length; i += 1) {
        const attrKey = attrKeys[i];
        const value = attributes[attrKey];
        if (value === undefined || value === null) {
          continue;
        }
        element.setAttribute(attrKey, String(value));
      }
      applyDatasetAttributes(element, dataset);
      if (finalOptions.disabled) {
        element.disabled = true;
        element.setAttribute('aria-disabled', 'true');
      } else {
        element.disabled = false;
        element.removeAttribute('aria-disabled');
      }
      const ariaLabel = (typeof finalOptions.ariaLabel === 'string') ? finalOptions.ariaLabel.trim() : '';
      if (ariaLabel) {
        element.setAttribute('aria-label', ariaLabel);
      } else if (element.hasAttribute('aria-label')) {
        element.removeAttribute('aria-label');
      }
      const label = finalOptions.label;
      const fallbackLabel = finalOptions.fallbackLabel;
      let text = '';
      if (label !== undefined && label !== null) {
        text = String(label);
      } else if (fallbackLabel !== undefined && fallbackLabel !== null) {
        text = String(fallbackLabel);
      }
      const providedTitle = finalOptions.title;
      const title = (providedTitle !== undefined && providedTitle !== null) ? String(providedTitle) : '';
      if (title) {
        element.setAttribute('title', title);
      } else if (!element.hasAttribute('title') && text) {
        element.setAttribute('title', text);
      } else if (!title && !text && element.hasAttribute('title')) {
        element.removeAttribute('title');
      }
      const hoverLabel = (finalOptions.hoverLabel !== undefined && finalOptions.hoverLabel !== null)
        ? String(finalOptions.hoverLabel)
        : '';
      if (hoverLabel) {
        element.setAttribute('data-hover-label', hoverLabel);
      } else if (!element.hasAttribute('data-hover-label') && text) {
        element.setAttribute('data-hover-label', text);
      } else if (!hoverLabel && !text && element.hasAttribute('data-hover-label')) {
        element.removeAttribute('data-hover-label');
      }
      const labelHtml = (finalOptions.labelHtml !== undefined && finalOptions.labelHtml !== null)
        ? String(finalOptions.labelHtml)
        : '';
      let iconHtml = (finalOptions.iconHtml !== undefined && finalOptions.iconHtml !== null)
        ? String(finalOptions.iconHtml)
        : '';
      if (!iconHtml && ACTION_BUTTON_ICON_FALLBACKS && ACTION_BUTTON_ICON_FALLBACKS[normalizedType]) {
        iconHtml = ACTION_BUTTON_ICON_FALLBACKS[normalizedType];
      }
      const iconChar = (finalOptions.iconChar !== undefined && finalOptions.iconChar !== null)
        ? String(finalOptions.iconChar)
        : '';
      const iconClass = (finalOptions.iconClass !== undefined && finalOptions.iconClass !== null)
        ? String(finalOptions.iconClass)
        : '';
      let iconAriaHidden = finalOptions.iconAriaHidden;
      if (iconAriaHidden === undefined || iconAriaHidden === null) {
        iconAriaHidden = baseOptions.iconAriaHidden;
      }
      const srLabelOverride = (finalOptions.srLabel !== undefined && finalOptions.srLabel !== null)
        ? String(finalOptions.srLabel)
        : '';
      let srLabelClass = '';
      if (finalOptions.srLabelClass !== undefined && finalOptions.srLabelClass !== null) {
        srLabelClass = String(finalOptions.srLabelClass);
      } else if (baseOptions.srLabelClass) {
        srLabelClass = String(baseOptions.srLabelClass);
      }
      let srLabel = srLabelOverride;
      if (!srLabel) {
        srLabel = labelHtml ? (extractTextFromHtml(labelHtml, document) || text) : text;
      }
      if (finalOptions.designKey === 'curl-ribbon') {
        applyCurlRibbonStyles(element, finalOptions);
      }
      element.textContent = '';
      if (iconHtml) {
        appendIconMarkup(element, iconHtml, document);
      } else if (iconChar) {
        const iconSpan = document.createElement('span');
        if (iconClass) {
          iconSpan.className = iconClass;
        }
        if (iconAriaHidden !== false) {
          iconSpan.setAttribute('aria-hidden', 'true');
        }
        iconSpan.textContent = iconChar;
        element.appendChild(iconSpan);
      }
      if (labelHtml) {
        element.insertAdjacentHTML('beforeend', labelHtml);
        if (srLabel) {
          const srSpan = document.createElement('span');
          srSpan.className = srLabelClass ? srLabelClass : 'visually-hidden';
          srSpan.textContent = srLabel;
          element.appendChild(srSpan);
        }
      } else if (srLabel) {
        if (srLabelClass) {
          const srSpan = document.createElement('span');
          srSpan.className = srLabelClass;
          srSpan.textContent = srLabel;
          element.appendChild(srSpan);
        } else {
          element.appendChild(document.createTextNode(srLabel));
        }
      } else if (!iconHtml && !iconChar && text) {
        element.appendChild(document.createTextNode(text));
      }
      return element;
    }
  }

  window.Services = window.Services || {};
  window.Services.Button = window.Services.Button || {};
  window.Services.Button.ButtonService = ButtonService;

  if (!window.Services.button) {
    window.Services.button = ButtonService;
  }
})(window, document);
