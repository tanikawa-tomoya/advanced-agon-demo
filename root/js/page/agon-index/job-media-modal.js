(function ()
{
  'use strict';

  class AgonIndexJobMediaModal
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
      this.videoModalService = null;
      this.triggers = [];
    }

    async setup()
    {
      this.triggers = this._collectTriggers();
      if (!this.triggers.length) {
        return Promise.resolve();
      }

      this.videoModalService = new window.Services.VideoModal({ autoplay: true });
      await this.videoModalService.boot();
      this._bindEvents();
      return Promise.resolve();
    }

    _collectTriggers()
    {
      var nodes = document.querySelectorAll('[data-video-src]');
      if (!nodes || !nodes.length) {
        return [];
      }
      return Array.prototype.slice.call(nodes);
    }

    _bindEvents()
    {
      for (var i = 0; i < this.triggers.length; i++) {
        this._bindTrigger(this.triggers[i]);
      }
    }

    _bindTrigger(el)
    {
      var self = this;
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        var src = el.getAttribute('data-video-src');
        if (!src) {
          return;
        }
        var title = el.getAttribute('data-video-title') || '';
        self.videoModalService.openHtml5(src, { title: title, autoplay: true });
      });
    }
  }

  window.AgonIndex = window.AgonIndex || {};
  window.AgonIndex.JobMediaModal = AgonIndexJobMediaModal;
})();
