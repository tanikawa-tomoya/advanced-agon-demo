(function ()
{
  'use strict';

  class JobValidator
  {
    constructor(service)
    {
      this.service = service;
    }

    validate(fields)
    {
      const values = { name: '', mail: '', message: '' };
      let ok = true;

      const applyError = function (field, hasError) {
        if (!field) { return; }
        if (field.wrap) { field.wrap.classList.toggle('is-error', hasError); }
        if (field.input) { field.input.classList.toggle('is-error', hasError); }
      };

      const requiredKeys = ['name', 'mail', 'message'];
      for (let i = 0; i < requiredKeys.length; i++)
      {
        const key = requiredKeys[i];
        const target = fields && fields[key] ? fields[key] : null;
        const input = target && target.input ? target.input : null;
        const value = input ? (input.value || '').trim() : '';
        values[key] = value;

        let hasError = value === '';
        if (!hasError && key === 'mail' && !this._isValidMail(value))
        {
          hasError = true;
        }

        applyError(target, hasError);
        if (hasError) { ok = false; }
      }

      return { ok: ok, values: values };
    }

    _isValidMail(value)
    {
      return /.+@.+\..+/.test(String(value || '').trim());
    }
  }

  window.Services = window.Services || {};
  window.Services.Contact = window.Services.Contact || {};
  window.Services.Contact.JobValidator = JobValidator;
})(window);
