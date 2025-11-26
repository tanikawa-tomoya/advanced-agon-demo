(function () {

  'use strict';

  class RichtextEditorService
  {
    constructor(options)
    {
      this.options = options || {};
      this.initConfig();
      this.config = Object.assign({}, this.DEFAULTS, this.options);

      this.jobs = null;
      this._mounted = false;
      this._root = null;
      this._editor = null;
      this._toolbar = null;
      this._off = null;
    }

    initConfig()
    {
      this.DEFAULTS = Object.freeze({
        toolbarPosition: 'top', // 'top' | 'bottom'
        buttons: Object.freeze(['bold','italic','underline','link','ul','ol','undo','redo','removeFormat','pre']),
        placeholder: '',
        readOnly: false,
        pastePlainText: true,
        editorClass: 'c-rte__editor',
        toolbarClass: 'c-rte__toolbar',
        rootClass: 'c-rte',
        i18n: Object.freeze({
          bold: 'Bold', italic: 'Italic', underline: 'Underline',
          link: 'Link', ul: 'Bulleted List', ol: 'Numbered List',
          undo: 'Undo', redo: 'Redo', removeFormat: 'Clear formatting',
          pre: 'Code block', openLinkPrompt: 'Enter URL (http/https/mailto/tel):'
        }),
        SANITIZE: Object.freeze({
          ALLOW_TAGS: Object.freeze({
            'a': true, 'b': true, 'strong': true, 'i': true, 'em': true, 'u': true, 'span': true, 'br': true, 'code': true,
            'p': true, 'div': true, 'pre': true, 'blockquote': true,
            'ul': true, 'ol': true, 'li': true,
            'h1': true, 'h2': true, 'h3': true
          }),
          ALLOW_ATTR: Object.freeze({
            'a': Object.freeze({ 'href': true, 'target': true, 'rel': true }),
            'span': Object.freeze({ 'style': false }),
            'div': Object.freeze({}),
            'p': Object.freeze({}),
            'pre': Object.freeze({}),
            'code': Object.freeze({})
          }),
          DROP_STYLES: true,
          STRIP_COMMENTS: true,
          SAFE_PROTOCOLS: Object.freeze({ 'http:': true, 'https:': true, 'mailto:': true, 'tel': true })
        })
      });
      this.BUTTON_TO_CLASS = Object.freeze({
        bold: 'c-rte-btn--bold',
        italic: 'c-rte-btn--italic',
        underline: 'c-rte-btn--underline',
        link: 'c-rte-btn--link',
        ul: 'c-rte-btn--ul',
        ol: 'c-rte-btn--ol',
        undo: 'c-rte-btn--undo',
        redo: 'c-rte-btn--redo',
        removeFormat: 'c-rte-btn--remove',
        pre: 'c-rte-btn--pre'
      });
    }

    async boot() {
      
      await window.Utils.loadScriptsSync([
        'js/service-app/richtext-editor/job-general.js'
      ]);
      
      this.jobs = {
        general: new window.ServicesRichtextEditor.JobGeneral(this)
      };
      return this;
    }

    // マウント（ターゲットにエディタを構築）
    mount(target, options) {
      if (this._mounted) { throw new Error('richtext-editor: already mounted'); }
      var cfg = Object.assign({}, this.DEFAULTS, this.options || {}, options || {});
      this.config = cfg;

      var container = this.jobs.general.resolveContainer(target);
      var built = this.jobs.general.createRoot(container, cfg, this.BUTTON_TO_CLASS);
      this._root = built.root;
      this._toolbar = built.toolbar;
      this._editor = built.editor;
      this._mounted = true;

      // イベントバインド
      this._off = this.jobs.general.bindEvents(this._root, this._editor, this._toolbar, cfg);
      return this._root;
    }

    getHTML(opts) {
      this._ensureMounted();
      var raw = this._editor.innerHTML || '';
      if (opts && opts.raw === true) return raw;
      return this.jobs.general.sanitizeHTML(raw, this.config.SANITIZE);
    }

    setHTML(html) {
      this._ensureMounted();
      var safe = this.jobs.general.sanitizeHTML(String(html || ''), this.config.SANITIZE);
      this._editor.innerHTML = safe;
      return this._editor;
    }

    insertText(text) {
      this._ensureMounted();
      this.jobs.general.insertPlainText(this._editor, String(text || ''));
      return this._editor;
    }

    exec(command, value) {
      this._ensureMounted();
      this.jobs.general.execCommand(this._editor, String(command), value, this.config);
      return this._editor;
    }
    bold() { return this.exec('bold'); }
    italic() { return this.exec('italic'); }
    underline() { return this.exec('underline'); }
    bullet() { return this.exec('ul'); }
    number() { return this.exec('ol'); }
    clearFormat() { return this.exec('removeFormat'); }
    codeBlock() { return this.exec('pre', 'pre'); }

    focus() {
      this._ensureMounted();
      this.jobs.general.focus(this._editor);
      return this._editor;
    }

    setReadOnly(flag) {
      this._ensureMounted();
      this.jobs.general.setReadOnly(this._editor, !!flag);
      return this._editor;
    }

    destroy() {
      if (!this._mounted) return;
      try {
        if (typeof this._off === 'function') this._off();
      } finally {
        this.jobs.general.teardown(this._root);
        this._root = this._editor = this._toolbar = null;
        this._off = null;
        this._mounted = false;
      }
    }

    _ensureMounted() {
      if (!this._mounted || !this._editor) {
        throw new Error('richtext-editor: not mounted');
      }
    }
  }

  window.Services = window.Services || {};
  window.Services.RechtextEditor = RechtextEditorService;

})(window, document);
