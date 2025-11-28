(function ()
{
  'use strict';

  var VIDEO_SRC = '/image/sample/contents-sample-001-01.mp4';
  var VIDEO_POSTER = '/image/sample/contents-sample-001-01.mp4_thumbnail';
  var AUDIO_SRC = '/image/sample/contents-sample-001-03.wav';
  var AUDIO_POSTER = 'https://picsum.photos/seed/agon-audio-modal/960/540';

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
        var title = el.getAttribute('data-video-title') || '';
        var mediaType = (el.getAttribute('data-media-type') || 'video').toLowerCase();
        var poster = el.getAttribute('data-poster');
        var src = VIDEO_SRC;

        if (mediaType === 'audio') {
          src = AUDIO_SRC;
          poster = poster || AUDIO_POSTER;
        } else {
          src = VIDEO_SRC;
          poster = poster || VIDEO_POSTER;
        }

        self.videoModalService.openHtml5(src, { title: title, autoplay: true, poster: poster });
      });
    }
  }

  window.AgonIndex = window.AgonIndex || {};
  window.AgonIndex.JobMediaModal = AgonIndexJobMediaModal;
})();
