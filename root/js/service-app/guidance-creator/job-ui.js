(function () {
  
  'use strict';

  /**
   * UI の構築／イベントバインド／データの入出力を担うジョブ
   */
  class JobUI
  {
    constructor(service)
    {
      this.service = service;
    }

    /**
     * テンプレート文字列からルート要素を構築し、イベントをバインドして返す
     * handlers: { onSubmit, onCancel, onRequestClose }
     */
    buildFromTemplate(html, handlers, opts) {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = String(html || '');
      var root = wrapper.firstElementChild;
      if (!root) {
        // フォールバック（テンプレート未取得時）
        root = document.createElement('div');
        root.className = 'c-guidance-creator';
        root.innerHTML = [
          '<div class="c-guidance-creator__dialog">',
          '  <div class="c-guidance-creator__header">',
          '    <span class="c-guidance-creator__title">Guidance Creator</span>',
          '    <button type="button" class="js-gc-close c-guidance-creator__close" aria-label="Close">&times;</button>',
          '  </div>',
          '  <div class="c-guidance-creator__body">',
          '    <label class="c-guidance-creator__field">Title <input type="text" class="js-gc-input-title" /></label>',
          '    <div class="c-guidance-creator__steps js-gc-steps"></div>',
          '    <button type="button" class="js-gc-add-step c-guidance-creator__btn">Add Step</button>',
          '  </div>',
          '  <div class="c-guidance-creator__footer">',
          '    <button type="button" class="js-gc-save c-guidance-creator__btn is-primary">Save</button>',
          '    <button type="button" class="js-gc-cancel c-guidance-creator__btn">Cancel</button>',
          '  </div>',
          '</div>'
        ].join('');
      }
      root.classList.add('c-guidance-creator');
      if (opts && typeof opts.zIndex !== 'undefined') {
        root.style.zIndex = String(opts.zIndex);
      }

      // backdrop close
      var self = this;
      var onBackdrop = function (ev) {
        if (!ev) return;
        if (ev.target === root && handlers && typeof handlers.onRequestClose === 'function') {
          if (self.service.config.closeOnBackdrop) handlers.onRequestClose();
        }
      };
      root.addEventListener('click', onBackdrop, true);

      // buttons
      var btnClose  = root.querySelector('.js-gc-close');
      var btnAdd    = root.querySelector('.js-gc-add-step');
      var btnSave   = root.querySelector('.js-gc-save');
      var btnCancel = root.querySelector('.js-gc-cancel');
      var stepsWrap = root.querySelector('.js-gc-steps');

      var onAdd = function (ev) { ev && ev.preventDefault && ev.preventDefault(); self._appendStep(stepsWrap, ''); };
      var onSave = function (ev) { ev && ev.preventDefault && ev.preventDefault(); if (handlers && typeof handlers.onSubmit === 'function') handlers.onSubmit(self.getData(root)); };
      var onCancel = function (ev) { ev && ev.preventDefault && ev.preventDefault(); if (handlers && typeof handlers.onCancel === 'function') handlers.onCancel(); };
      var onClose = function (ev) { ev && ev.preventDefault && ev.preventDefault(); if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose(); };

      if (btnAdd) btnAdd.addEventListener('click', onAdd, true);
      if (btnSave) btnSave.addEventListener('click', onSave, true);
      if (btnCancel) btnCancel.addEventListener('click', onCancel, true);
      if (btnClose) btnClose.addEventListener('click', onClose, true);

      root.__gc = {
        onBackdrop: onBackdrop,
        onAdd: onAdd,
        onSave: onSave,
        onCancel: onCancel,
        onClose: onClose
      };

      return root;
    }

    /**
     * データ設定
     * data: { title: String, steps: String[] }
     */
    setData(root, data) {
      if (!root) return;
      data = data || { title: '', steps: [] };
      var inputTitle = root.querySelector('.js-gc-input-title');
      if (inputTitle) inputTitle.value = String(data.title || '');

      var stepsWrap = root.querySelector('.js-gc-steps');
      if (!stepsWrap) return;
      // 既存をクリア
      while (stepsWrap.firstChild) stepsWrap.removeChild(stepsWrap.firstChild);
      var steps = Array.isArray(data.steps) ? data.steps : [];
      for (var i = 0; i < steps.length; i++) {
        this._appendStep(stepsWrap, String(steps[i] == null ? '' : steps[i]));
      }
    }

    /**
     * 現在の入力からデータを収集
     */
    getData(root) {
      var result = { title: '', steps: [] };
      if (!root) return result;
      var inputTitle = root.querySelector('.js-gc-input-title');
      if (inputTitle) result.title = String(inputTitle.value || '');
      var stepsWrap = root.querySelector('.js-gc-steps');
      if (stepsWrap) {
        var nodes = stepsWrap.querySelectorAll('.js-gc-step-text');
        for (var i = 0; i < nodes.length; i++) {
          result.steps.push(String(nodes[i].value || ''));
        }
      }
      return result;
    }

    /**
     * ルートのイベント解除など後片付け
     */
    teardown(root) {
      if (!root || !root.__gc) return;
      root.removeEventListener('click', root.__gc.onBackdrop, true);
      var btnClose  = root.querySelector('.js-gc-close');
      var btnAdd    = root.querySelector('.js-gc-add-step');
      var btnSave   = root.querySelector('.js-gc-save');
      var btnCancel = root.querySelector('.js-gc-cancel');
      if (btnAdd)    btnAdd.removeEventListener('click', root.__gc.onAdd, true);
      if (btnSave)   btnSave.removeEventListener('click', root.__gc.onSave, true);
      if (btnCancel) btnCancel.removeEventListener('click', root.__gc.onCancel, true);
      if (btnClose)  btnClose.removeEventListener('click', root.__gc.onClose, true);
      root.__gc = null;
    }

    /**
     * ステップ入力一件分を追加
     */
    _appendStep(stepsWrap, text) {
      var row = document.createElement('div');
      row.className = 'c-guidance-creator__step';

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'js-gc-step-text c-guidance-creator__step-input';
      input.value = String(text || '');

      var btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.className = 'c-guidance-creator__btn js-gc-step-up';
      btnUp.textContent = '↑';

      var btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.className = 'c-guidance-creator__btn js-gc-step-down';
      btnDown.textContent = '↓';

      var btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'c-guidance-creator__btn js-gc-step-del';
      btnDel.textContent = '×';

      var self = this;
      btnUp.addEventListener('click', function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        var prev = row.previousElementSibling;
        if (prev) stepsWrap.insertBefore(row, prev);
      }, true);

      btnDown.addEventListener('click', function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        var next = row.nextElementSibling;
        if (next) stepsWrap.insertBefore(next, row);
      }, true);

      btnDel.addEventListener('click', function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        if (row.parentNode) row.parentNode.removeChild(row);
      }, true);

      row.appendChild(input);
      row.appendChild(btnUp);
      row.appendChild(btnDown);
      row.appendChild(btnDel);

      stepsWrap.appendChild(row);
    }

  }

  var NS = Services.GuidanceCreator || (Services.GuidanceCreator = {});
  NS.JobUI = NS.JobUI || JobUI;  

})(window, document);
