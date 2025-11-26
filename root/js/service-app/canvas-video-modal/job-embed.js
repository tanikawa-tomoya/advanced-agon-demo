(function () {

  'use strict';

  var w = window;

  class JobEmbed
  {
    constructor(service)
    {
      this.service = service;
    }

    parseYouTubeId(urlOrId)
    {
      if (typeof urlOrId !== 'string') return null;
      var s = urlOrId.trim();
      if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
      try {
        var u = new URL(s, w.location.href);
        if (u.hostname === 'youtu.be') {
          var parts = (u.pathname || '').split('/');
          return parts[1] || null;
        }
        if (u.hostname.indexOf('youtube.com') !== -1) {
          if ((u.pathname || '').indexOf('/watch') === 0) {
            return u.searchParams.get('v');
          }
          if ((u.pathname || '').indexOf('/embed/') === 0) {
            var xs = u.pathname.split('/');
            return xs[2] || null;
          }
        }
      } catch (e) { /* ignore */ }
      return null;
    }

    parseVimeoId(urlOrId) {
      if (typeof urlOrId !== 'string') return null;
      var s = urlOrId.trim();
      if (/^\d{6,}$/.test(s)) return s;
      try {
        var u = new URL(s, w.location.href);
        if (u.hostname === 'vimeo.com' || u.hostname === 'player.vimeo.com') {
          var parts = (u.pathname || '').split('/').filter(function (p) { return !!p; });
          var idx = (parts[0] === 'video' ? 1 : 0);
          var id = parts[idx];
          return (/^\d{6,}$/.test(id) ? id : null);
        }
      } catch (e) { /* ignore */ }
      return null;
    }

    buildYouTubeIframe(id, autoplay, title, iframeAllow) {
      var iframe = document.createElement('iframe');
      var src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&playsinline=1';
      if (autoplay) src += '&autoplay=1';
      iframe.setAttribute('src', src);
      iframe.setAttribute('title', String(title || 'YouTube video'));
      iframe.setAttribute('allow', iframeAllow || '');
      iframe.setAttribute('allowfullscreen', 'allowfullscreen');
      iframe.setAttribute('loading', 'lazy');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      return iframe;
    }

    buildVimeoIframe(id, autoplay, title, iframeAllow) {
      var iframe = document.createElement('iframe');
      var src = 'https://player.vimeo.com/video/' + encodeURIComponent(id);
      if (autoplay) src += '?autoplay=1';
      iframe.setAttribute('src', src);
      iframe.setAttribute('title', String(title || 'Vimeo video'));
      iframe.setAttribute('allow', iframeAllow || '');
      iframe.setAttribute('allowfullscreen', 'allowfullscreen');
      iframe.setAttribute('loading', 'lazy');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      return iframe;
    }

    buildHtml5Video(src, autoplay) {
      var player = this.buildCanvasVideoPlayer(src, autoplay);
      return player.node;
    }

    buildCanvasVideoPlayer(src, autoplay)
    {
      var container = document.createElement('div');
      container.className = 'c-video-modal__canvas-player';

      var canvas = document.createElement('canvas');
      canvas.className = 'c-video-modal__canvas';
      container.appendChild(canvas);

      var video = document.createElement('video');
      video.className = 'c-video-modal__hidden-video';
      video.setAttribute('playsinline', 'playsinline');
      video.setAttribute('preload', 'auto');
      if (autoplay)
      {
        video.setAttribute('autoplay', 'autoplay');
        video.muted = true;
      }
      video.src = src;
      container.appendChild(video);

      var ctx = canvas.getContext('2d');
      var rafId = 0;
      var rendering = false;

      var updateCanvasSize = function ()
      {
        var vw = video.videoWidth || 16;
        var vh = video.videoHeight || 9;
        canvas.width = vw;
        canvas.height = vh;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
      };

      var drawFrame = function ()
      {
        if (!rendering)
        {
          return;
        }
        try
        {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        catch (_err) {}
        rafId = w.requestAnimationFrame(drawFrame);
      };

      var startRender = function ()
      {
        if (rendering)
        {
          return;
        }
        rendering = true;
        drawFrame();
      };

      var stopRender = function ()
      {
        rendering = false;
        if (rafId)
        {
          w.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      };

      var toggle = document.createElement('button');
      toggle.className = 'c-video-modal__canvas-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-label', '再生/一時停止');
      var updateToggle = function ()
      {
        var paused = video.paused || video.ended;
        toggle.textContent = paused ? '再生' : '一時停止';
        if (paused)
        {
          toggle.classList.remove('is-playing');
        }
        else
        {
          toggle.classList.add('is-playing');
        }
      };

      var onLoaded = function ()
      {
        updateCanvasSize();
        if (autoplay)
        {
          try
          {
            var playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function')
            {
              playPromise.catch(function () {});
            }
          }
          catch (_err) {}
        }
      };

      var onPlay = function ()
      {
        startRender();
        updateToggle();
      };

      var onPause = function ()
      {
        stopRender();
        updateToggle();
      };

      var onEnded = function ()
      {
        stopRender();
        updateToggle();
      };

      video.addEventListener('loadedmetadata', onLoaded, true);
      video.addEventListener('play', onPlay, true);
      video.addEventListener('pause', onPause, true);
      video.addEventListener('ended', onEnded, true);
      updateCanvasSize();

      var onToggleClick = function (ev)
      {
        ev.preventDefault();
        ev.stopPropagation();
        if (video.paused || video.ended)
        {
          try
          {
            var playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function')
            {
              playPromise.catch(function () {});
            }
          }
          catch (_err2) {}
        }
        else
        {
          try { video.pause(); } catch (_err3) {}
        }
        updateToggle();
      };

      toggle.addEventListener('click', onToggleClick, true);

      container.appendChild(toggle);
      updateToggle();

      var dispose = function ()
      {
        stopRender();
        video.removeEventListener('loadedmetadata', onLoaded, true);
        video.removeEventListener('play', onPlay, true);
        video.removeEventListener('pause', onPause, true);
        video.removeEventListener('ended', onEnded, true);
        toggle.removeEventListener('click', onToggleClick, true);
        try { video.pause(); } catch (_err4) {}
        try
        {
          video.removeAttribute('src');
          video.load();
        }
        catch (_err5) {}
      };

      return { node: container, video: video, dispose: dispose };
    }

    sanitizeUrl(url, allowedHosts) {
      try {
        if (typeof url !== 'string') return null;
        if (url.indexOf('/') === 0) return url;
        var u = new URL(url, w.location.href);
        if (u.protocol !== 'https:') return null;
        // html5 video の直リンクは https であれば許可。同一オリジンであれば OK。
        if (u.origin === w.location.origin) return u.toString();
        // 外部 CDN 等への直リンクも可（ここではとくにホワイトリスト不要）。
        return u.toString();
      } catch (e) {
        return null;
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.CanvasVideoModal || (Services.CanvasVideoModal = {});
  NS.JobEmbed = NS.JobEmbed || JobEmbed;

})(window, document);
