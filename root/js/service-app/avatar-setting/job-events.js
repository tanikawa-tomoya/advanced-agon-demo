(function (window, document) {

  'use strict';

  class JobEvents
  {
    constructor(service)
    {
      this.service = service;
      this.bound = new Map();
    }

    bind(instance, handlers)
    {
      var root = instance.root;
      var input = instance.refs && instance.refs.input;
      var onClick = function (ev) {
        var origin = ev.target;
        if (!origin || typeof origin.closest !== 'function') return;
        var target = origin.closest('[data-action]');
        if (!target) return;
        var action = target.getAttribute('data-action');
        if (action === 'choose-avatar' && handlers && typeof handlers.onChoose === 'function') {
          ev.preventDefault();
          handlers.onChoose();
        }
        if (action === 'delete-avatar' && handlers && typeof handlers.onDelete === 'function') {
          ev.preventDefault();
          handlers.onDelete();
        }
      };
      root.addEventListener('click', onClick, false);
      var onChange = function (ev) {
        var file = ev.target && ev.target.files && ev.target.files[0];
        if (!file) return;
        if (handlers && typeof handlers.onFileSelected === 'function') {
          handlers.onFileSelected(file);
        }
      };
      if (input) {
        input.addEventListener('change', onChange, false);
      }
      this.bound.set(instance.id, { onClick: onClick, onChange: onChange });
    }

    unbind(instance)
    {
      var root = instance && instance.root;
      var refs = instance && instance.refs;
      var handlers = this.bound.get(instance.id);
      if (root && handlers && handlers.onClick) {
        root.removeEventListener('click', handlers.onClick, false);
      }
      if (refs && refs.input && handlers && handlers.onChange) {
        refs.input.removeEventListener('change', handlers.onChange, false);
      }
      this.bound.delete(instance.id);
    }
  }

  window.Services = window.Services || {};
  window.Services.AvatarSetting = window.Services.AvatarSetting || {};
  window.Services.AvatarSetting.JobEvents = JobEvents;

})(window, document);
