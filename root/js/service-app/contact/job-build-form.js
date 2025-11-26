(function ()
{
  'use strict';

  class JobBuildForm
  {
    constructor(service)
    {
      this.service = service;
    }

    normalizeInitialValues(options, user)
    {
      const input = options && options.initialValues ? options.initialValues : options || {};
      const values = {
        name: this._firstString([input.name, input.userName, this._resolveUserName(user)]),
        mail: this._firstString([input.mail, input.email, input.userMail, this._resolveUserMail(user)]),
        message: this._firstString([input.message, input.legend])
      };
      return {
        name: values.name || '',
        mail: values.mail || '',
        message: values.message || ''
      };
    }

    buildContent(values, config, handlers)
    {
      const idPrefix = 'contact-' + Date.now();
      const esc = (s) => this._escapeHtml(String(s || ''));
      const html = [
        '<div class="contact-modal">',
        '  <p class="contact-modal__lead">' + esc(config.lead) + '</p>',
        '  <div class="mock-form mock-form--stacked">',
        '    <div class="mock-form__field" data-contact-field-wrap="name">',
        '      <label class="mock-form__label" for="' + idPrefix + '-name">' + esc(config.fieldLabels.name) + '</label>',
        '      <input id="' + idPrefix + '-name" type="text" class="mock-control mock-control__input" data-contact-field="name" placeholder="' + esc(config.placeholders.name) + '" value="' + esc(values.name) + '" />',
        '    </div>',
        '    <div class="mock-form__field" data-contact-field-wrap="mail">',
        '      <label class="mock-form__label" for="' + idPrefix + '-mail">' + esc(config.fieldLabels.mail) + '</label>',
        '      <input id="' + idPrefix + '-mail" type="email" class="mock-control mock-control__input" data-contact-field="mail" placeholder="' + esc(config.placeholders.mail) + '" value="' + esc(values.mail) + '" />',
        '    </div>',
        '    <div class="mock-form__field" data-contact-field-wrap="message">',
        '      <label class="mock-form__label" for="' + idPrefix + '-message">' + esc(config.fieldLabels.message) + '</label>',
        '      <textarea id="' + idPrefix + '-message" class="mock-control mock-control__input mock-control--textarea" rows="4" data-contact-field="message" placeholder="' + esc(config.placeholders.message) + '">' + esc(values.message) + '</textarea>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');

      return {
        title: config.title,
        html: html,
        actions: [
          {
            label: config.cancelLabel,
            className: 'c-help-modal__action',
            onClick: function () { if (handlers && typeof handlers.onCancel === 'function') { handlers.onCancel(); } }
          },
          {
            label: config.submitLabel,
            className: 'c-help-modal__action c-help-modal__action--primary',
            onClick: function (ev) { ev && ev.preventDefault && ev.preventDefault(); if (handlers && typeof handlers.onSubmit === 'function') { handlers.onSubmit(); } }
          }
        ]
      };
    }

    collectFields(overlay)
    {
      const lookup = function (name) {
        if (!overlay) { return { input: null, wrap: null }; }
        return {
          input: overlay.querySelector('[data-contact-field="' + name + '"]'),
          wrap: overlay.querySelector('[data-contact-field-wrap="' + name + '"]')
        };
      };
      return {
        name: lookup('name'),
        mail: lookup('mail'),
        message: lookup('message')
      };
    }

    bindFieldEvents(fields)
    {
      if (!fields) { return; }
      const self = this;
      ['name', 'mail', 'message'].forEach(function (key) {
        const target = fields[key];
        if (!target || !target.input) { return; }
        const handler = function () {
          self._clearError(target);
        };
        target.input.removeEventListener('input', target.input.__contactInputHandler);
        target.input.__contactInputHandler = handler;
        target.input.addEventListener('input', handler, true);
      });
    }

    _resolveUserName(user)
    {
      if (!user || typeof user !== 'object') { return ''; }
      const keys = ['name', 'displayName', 'userName'];
      for (let i = 0; i < keys.length; i++)
      {
        const val = user[keys[i]];
        if (typeof val === 'string' && val.trim()) { return val; }
      }
      return '';
    }

    _resolveUserMail(user)
    {
      if (!user || typeof user !== 'object') { return ''; }
      const keys = ['mail', 'email', 'userMail', 'userEmail'];
      for (let i = 0; i < keys.length; i++)
      {
        const val = user[keys[i]];
        if (typeof val === 'string' && val.trim()) { return val; }
      }
      return '';
    }

    _firstString(list)
    {
      for (let i = 0; i < list.length; i++)
      {
        const val = list[i];
        if (typeof val === 'string' && val.trim())
        {
          return val;
        }
      }
      return '';
    }

    _clearError(field)
    {
      if (!field) { return; }
      const input = field.input;
      const wrap = field.wrap;
      if (input) { input.classList.remove('is-error'); }
      if (wrap) { wrap.classList.remove('is-error'); }
    }

    _escapeHtml(value)
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
  window.Services.Contact.JobBuildForm = JobBuildForm;
})(window);
