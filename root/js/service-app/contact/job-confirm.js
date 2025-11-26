(function ()
{
  'use strict';

  class JobConfirm
  {
    constructor(service)
    {
      this.service = service;
      this.hiragana = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんぁぃぅぇぉゃゅょっ';
    }

    requestConfirmation(values, ctx)
    {
      const modal = ctx && ctx.modal ? ctx.modal : null;
      const toast = ctx && ctx.toast ? ctx.toast : null;
      const cfg = ctx && ctx.config ? ctx.config : this.service.config;
      if (!modal) { return Promise.resolve(false); }
      const challenge = this._generate(cfg.challengeLength || 5);
      const html = this._buildHtml(values, challenge, cfg);

      return new Promise((resolve) => {
        let settled = false;
        const finalize = (ok) => {
          if (settled) { return; }
          settled = true;
          resolve(!!ok);
        };

        const content = {
          title: cfg.confirmTitle,
          html: html,
          actions: [
            {
              label: cfg.confirmCancelLabel,
              className: 'c-help-modal__action',
              onClick: function () { modal.dismiss(); finalize(false); }
            },
            {
              label: cfg.confirmSubmitLabel,
              className: 'c-help-modal__action c-help-modal__action--primary',
              onClick: function (_ev, nodes) {
                const container = nodes && nodes.overlay ? nodes.overlay : null;
                const input = container ? container.querySelector('[data-contact-challenge-input]') : null;
                const typed = input ? (input.value || '').trim() : '';
                if (typed !== challenge)
                {
                  if (toast && typeof toast.error === 'function') { toast.error(cfg.challengeErrorText); }
                  if (input && typeof input.focus === 'function') { input.focus(); }
                  if (input && typeof input.select === 'function') { try { input.select(); } catch (e) {} }
                  return;
                }
                modal.dismiss();
                finalize(true);
              }
            }
          ]
        };

        modal.show(content, {
          overlayClassName: cfg.confirmOverlayClassName,
          contentClassName: cfg.contentClassName,
          closeOnBackdrop: false,
          closeOnEsc: false,
          zIndex: cfg.confirmZIndex
        });

        const overlay = modal._current ? modal._current.overlay : null;
        const closeBtn = overlay ? overlay.querySelector('.c-help-modal__close') : null;
        if (closeBtn)
        {
          closeBtn.addEventListener('click', function () { finalize(false); }, { once: true });
        }
      });
    }

    _buildHtml(values, challenge, cfg)
    {
      const esc = (s) => this._escape(String(s || ''));
      return [
        '<div class="contact-modal contact-modal--confirm">',
        '  <p class="contact-modal__lead contact-modal__lead--confirm">' + esc(cfg.confirmNote) + '</p>',
        '  <dl class="contact-modal__summary">',
        '    <div class="contact-modal__summary-row"><dt>' + esc(cfg.fieldLabels.name) + '</dt><dd>' + esc(values.name) + '</dd></div>',
        '    <div class="contact-modal__summary-row"><dt>' + esc(cfg.fieldLabels.mail) + '</dt><dd>' + esc(values.mail) + '</dd></div>',
        '    <div class="contact-modal__summary-row"><dt>' + esc(cfg.fieldLabels.message) + '</dt><dd>' + esc(values.message) + '</dd></div>',
        '  </dl>',
        '  <div class="contact-modal__challenge">',
        '    <p class="contact-modal__challenge-label">確認用のひらがな</p>',
        '    <div class="contact-modal__challenge-code" data-contact-challenge-display="1">' + esc(challenge) + '</div>',
        '    <label class="contact-modal__challenge-input">',
        '      <span class="mock-form__label">ひらがなを入力</span>',
        '      <input type="text" class="mock-control mock-control__input" data-contact-challenge-input="1" autocomplete="off" inputmode="kana" />',
        '    </label>',
        '  </div>',
        '</div>'
      ].join('');
    }

    _generate(length)
    {
      let result = '';
      const chars = this.hiragana;
      for (let i = 0; i < length; i++)
      {
        const idx = Math.floor(Math.random() * chars.length);
        result += chars.charAt(idx);
      }
      return result;
    }

    _escape(value)
    {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  window.Services = window.Services || {};
  window.Services.Contact = window.Services.Contact || {};
  window.Services.Contact.JobConfirm = JobConfirm;
})(window);
