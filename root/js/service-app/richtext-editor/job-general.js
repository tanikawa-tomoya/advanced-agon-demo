(function () {

  'use strict';

  class JobGeneral
  {
    constructor(service)
    {
      this.service = service;
    }

    resolveContainer(ref)
    {
      if (!ref) return document.body;
      if (typeof ref === 'string') {
        var el = document.querySelector(ref);
        if (!el) { throw new Error('richtext-editor: target not found: ' + ref); }
        return el;
      }
      if (ref && (ref.nodeType === 1 || ref.nodeType === 9)) return ref;
      throw new Error('richtext-editor: invalid target');
    }

    createToolbar(buttons, i18n, buttonToClass)
    {
      var tb = document.createElement('div');
      tb.className = 'c-rte__toolbar';
      tb.setAttribute('role', 'toolbar');

      for (var i = 0; i < buttons.length; i++) {
        var key = buttons[i];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'c-rte__btn ' + (buttonToClass[key] || '');
        btn.setAttribute('data-cmd', key);
        btn.setAttribute('aria-label', i18n[key] || key);
        btn.textContent = i18n[key] || key;
        tb.appendChild(btn);
      }
      return tb;
    }

    createEditor(cfg)
    {
      var ed = document.createElement('div');
      ed.className = cfg.editorClass;
      ed.setAttribute('contenteditable', cfg.readOnly ? 'false' : 'true');
      ed.setAttribute('role', 'textbox');
      ed.setAttribute('aria-multiline', 'true');
      if (cfg.placeholder) ed.setAttribute('data-placeholder', String(cfg.placeholder));
      return ed;
    }

    createRoot(container, cfg, buttonToClass)
    {
      var root = document.createElement('div');
      root.className = cfg.rootClass;
      var toolbar = this.createToolbar(cfg.buttons, cfg.i18n, buttonToClass);
      var editor = this.createEditor(cfg);
      if (cfg.toolbarPosition === 'bottom') {
        root.appendChild(editor);
        root.appendChild(toolbar);
      } else {
        root.appendChild(toolbar);
        root.appendChild(editor);
      }
      container.appendChild(root);
      return { root: root, toolbar: toolbar, editor: editor };
    }

    insertPlainText(editor, text)
    {
      editor.focus();
      try {
        document.execCommand('insertText', false, text);
      } catch (e) {
        editor.appendChild(document.createTextNode(text));
      }
    }

    focus(editor) {
      try { editor.focus(); } catch (e) {}
    }

    setReadOnly(editor, flag) {
      editor.setAttribute('contenteditable', flag ? 'false' : 'true');
    }

    execCommand(editor, cmd, value, cfg) {
      editor.focus();
      if (cmd === 'link' || cmd === 'createLink') {
        var url = value != null ? String(value) : w.prompt((cfg && cfg.i18n && cfg.i18n.openLinkPrompt) || 'Enter URL:');
        if (!url) return;
        if (!this.isSafeURL(url, (cfg && cfg.SANITIZE && cfg.SANITIZE.SAFE_PROTOCOLS))) {
          throw new Error('richtext-editor: unsafe URL');
        }
        document.execCommand('createLink', false, url);
        return;
      }
      var map = {
        bold: 'bold',
        italic: 'italic',
        underline: 'underline',
        ul: 'insertUnorderedList',
        ol: 'insertOrderedList',
        undo: 'undo',
        redo: 'redo',
        removeFormat: 'removeFormat',
        pre: 'formatBlock'
      };
      var actual = map[cmd] || cmd;
      document.execCommand(actual, false, actual === 'formatBlock' ? (value || 'pre') : value);
    }

    isSafeURL(url, safeProtocols) {
      try {
        var u = new URL(url, w.location.origin);
        var p = (u.protocol || '').toLowerCase();
        if (safeProtocols && typeof safeProtocols === 'object') return !!safeProtocols[p];
        return (p === 'http:' || p === 'https:' || p === 'mailto:' || p === 'tel:');
      } catch (e) {
        // relative allowed: /path or #hash
        return /^(\/|#)/.test(url);
      }
    }

    sanitizeHTML(html, rules) {
      var tmp = document.createElement('div');
      tmp.innerHTML = String(html || '');

      if (rules && rules.STRIP_COMMENTS) {
        var walker = document.createTreeWalker(tmp, NodeFilter.SHOW_COMMENT, null);
        var toRemove = [];
        while (walker.nextNode()) toRemove.push(walker.currentNode);
        for (var i = 0; i < toRemove.length; i++) {
          var n = toRemove[i];
          if (n && n.parentNode) n.parentNode.removeChild(n);
        }
      }

      var self = this;
      (function scrub(node) {
        var children = Array.prototype.slice.call(node.childNodes || []);
        for (var i = 0; i < children.length; i++) {
          var n = children[i];
          if (n.nodeType === 1) {
            var tag = n.tagName.toLowerCase();
            if (!rules || !rules.ALLOW_TAGS || !rules.ALLOW_TAGS[tag]) {
              n.parentNode && n.parentNode.replaceChild(document.createTextNode(n.textContent || ''), n);
              continue;
            }
            var allow = (rules.ALLOW_ATTR && rules.ALLOW_ATTR[tag]) || {};
            var attrs = Array.prototype.slice.call(n.attributes || []);
            for (var j = 0; j < attrs.length; j++) {
              var a = attrs[j];
              var name = a.name.toLowerCase();
              if (name.indexOf('on') === 0 || !allow[name]) {
                n.removeAttribute(a.name);
                continue;
              }
              if (tag === 'a' && name === 'href') {
                try {
                  var u = new URL(a.value, w.location.origin);
                  if (!(rules.SAFE_PROTOCOLS && rules.SAFE_PROTOCOLS[u.protocol])) {
                    n.removeAttribute('href');
                  }
                } catch (er) {
                  if (!/^(\/|#)/.test(a.value)) {
                    n.removeAttribute('href');
                  }
                }
              }
              if (tag === 'a' && name === 'target') {
                n.setAttribute('rel', 'noopener noreferrer');
              }
            }
            if (rules && rules.DROP_STYLES) {
              n.removeAttribute('style');
            }
            if (tag === 'script' || tag === 'style' || tag === 'noscript') {
              n.parentNode && n.parentNode.removeChild(n);
              continue;
            }
            scrub(n);
          } else if (n.nodeType !== 3) {
            n.parentNode && n.parentNode.replaceChild(document.createTextNode(n.textContent || ''), n);
          }
        }
      })(tmp);

      return tmp.innerHTML;
    }

    bindEvents(root, editor, toolbar, cfg) {
      var self = this;

      function onClick(ev) {
        var target = ev.target;
        if (!target || !target.getAttribute) return;
        var cmd = target.getAttribute('data-cmd');
        if (!cmd) return;
        try {
          if (cmd === 'link') {
            self.execCommand(editor, 'createLink', null, cfg);
          } else if (cmd === 'pre') {
            self.execCommand(editor, 'formatBlock', 'pre', cfg);
          } else {
            self.execCommand(editor, cmd, null, cfg);
          }
        } catch (e) {}
      }

      function onPaste(ev) {
        var cb = ev.clipboardData;
        if (!cb) return;
        if (cfg && cfg.pastePlainText) {
          ev.preventDefault();
          var text = cb.getData('text/plain');
          self.insertPlainText(editor, text || '');
        } else {
          var html = cb.getData('text/html');
          if (html) {
            ev.preventDefault();
            var safe = self.sanitizeHTML(html, cfg.SANITIZE || {});
            document.execCommand('insertHTML', false, safe);
          }
        }
      }

      toolbar.addEventListener('click', onClick, true);
      editor.addEventListener('paste', onPaste, true);

      return function off() {
        try { toolbar.removeEventListener('click', onClick, true); } catch (e) {}
        try { editor.removeEventListener('paste', onPaste, true); } catch (e) {}
      };
    }

    teardown(root) {
      if (root && root.parentNode) root.parentNode.removeChild(root);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.RichtextEditor || (Services.RichtextEditor = {});
  NS.JobGeneral = NS.JobGeneral || JobGeneral;  

})(window, document);
