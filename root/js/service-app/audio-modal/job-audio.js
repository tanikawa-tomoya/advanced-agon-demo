(function () {
  'use strict';

  class JobAudio
  {
    constructor(service)
    {
      this.service = service;
    }

    createAudio(spec)
    {
      var audio = document.createElement('audio');
      audio.controls = spec.controls !== false;
      if (spec.autoplay) audio.autoplay = true;
      if (spec.loop) audio.loop = true;
      if (spec.preload) audio.preload = spec.preload;
      if (spec.muted) audio.muted = true;
      audio.style.width = '100%';

      if (Array.isArray(spec.sources) && spec.sources.length)
      {
        for (var i = 0; i < spec.sources.length; i++)
        {
          var s = spec.sources[i];
          var sourceEl = document.createElement('source');
          if (s.src) sourceEl.src = s.src;
          if (s.type) sourceEl.type = s.type;
          audio.appendChild(sourceEl);
        }
      }

      if (spec.src)
      {
        audio.src = spec.src;
      }

      if (spec.title)
      {
        audio.setAttribute('title', String(spec.title));
      }

      return audio;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.AudioModal || (Services.AudioModal = {});
  NS.JobAudio = NS.JobAudio || JobAudio;

})(window, document);
