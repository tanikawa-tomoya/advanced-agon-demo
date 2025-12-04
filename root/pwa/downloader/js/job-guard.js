(function (window, document) {
  'use strict';

  class JobGuard
  {
    constructor(context)
    {
      this.context = context;
      this.closeTimer = null;
    }

    async run()
    {
      this.context.state.contentsCode = this.resolveContentsCode();

      var isLoggedIn = await this.isLoggedIn();
      if (!isLoggedIn)
      {
        this.block('ログインしていないため高速ダウンローダーを利用できません。ウインドウを閉じます。');
        return;
      }

      if (!this.context.state.contentsCode)
      {
        this.block('ContentsCodeが指定されていないため高速ダウンローダーを利用できません。ウインドウを閉じます。');
      }
    }

    async isLoggedIn()
    {
      var session = (window.Services && window.Services.sessionInstance) || null;
      if (session && typeof session.getUser === 'function')
      {
        var user = await session.getUser();
        return !!user;
      }
      return false;
    }

    resolveContentsCode()
    {
      var search = (window.location && window.location.search) || '';
      if (!search)
      {
        return '';
      }
      var params = new window.URLSearchParams(search);
      var code = params.get('ContentsCode') || params.get('contentsCode') || params.get('contentscode');
      if (typeof code === 'string')
      {
        return code.trim();
      }
      return '';
    }

    block(message)
    {
      this.context.state.isBlocked = true;
      this.context.state.blockMessage = message || '利用できません。';
      this.renderBlocker(this.context.state.blockMessage);
      this.deferWindowClose();
    }

    renderBlocker(message)
    {
      var existing = document.querySelector('.c-pwa-downloader__blocker');
      if (existing)
      {
        var textNode = existing.querySelector('.c-pwa-downloader__blocker-message');
        if (textNode)
        {
          textNode.textContent = message;
        }
        existing.removeAttribute('hidden');
        return;
      }

      var container = document.createElement('div');
      container.className = 'c-pwa-downloader__blocker';

      var content = document.createElement('div');
      content.className = 'c-pwa-downloader__blocker-content';

      var text = document.createElement('p');
      text.className = 'c-pwa-downloader__blocker-message';
      text.textContent = message;

      var hint = document.createElement('p');
      hint.className = 'c-pwa-downloader__blocker-hint';
      hint.textContent = 'ウインドウが閉じない場合は、この画面を閉じてください。';

      content.appendChild(text);
      content.appendChild(hint);
      container.appendChild(content);
      document.body.appendChild(container);
    }

    deferWindowClose()
    {
      if (this.closeTimer)
      {
        window.clearTimeout(this.closeTimer);
      }
      this.closeTimer = window.setTimeout(function () {
        try { window.close(); } catch (_err) {}
      }, 1500);
    }
  }

  window.PwaDownloader = window.PwaDownloader || {};
  window.PwaDownloader.JobGuard = JobGuard;
})(window, document);
