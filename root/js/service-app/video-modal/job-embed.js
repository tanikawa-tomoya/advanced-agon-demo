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

    buildHtml5Video(src, autoplay, poster) {
      var video = document.createElement('video');
      video.setAttribute('controls', 'controls');
      video.setAttribute('playsinline', 'playsinline');
      if (autoplay) {
        video.setAttribute('autoplay', 'autoplay');
        video.muted = true;
      }
      video.src = src;
      if (poster) {
        video.setAttribute('poster', poster);
      }
      video.style.width = '100%';
      video.style.height = '100%';
      return video;
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
  var NS = Services.VideoModal || (Services.VideoModal = {});
  NS.JobEmbed = NS.JobEmbed || JobEmbed;

})(window, document);
