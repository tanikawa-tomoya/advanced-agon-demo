(function (window, document) {
  'use strict';

  class JobContents
  {
    constructor(context)
    {
      this.context = context;
      this.instance = null;
    }

    async run()
    {
      await this.loadContentsPage();
      this.bootContentsPage();
    }

    async loadContentsPage()
    {
      if (window.Contents && typeof window.Contents === 'function')
      {
        return;
      }
      await window.Utils.loadScriptsSync(['/js/page/contents/main.js']);
    }

    bootContentsPage()
    {
      if (this.instance || !(window.Contents && typeof window.Contents === 'function'))
      {
        return;
      }
      try
      {
        this.instance = new window.Contents('contents');
        if (typeof this.instance.boot === 'function')
        {
          this.instance.boot();
        }
      }
      catch (err)
      {
        this.context.onError(err);
      }
    }
  }

  window.PwaDownloader = window.PwaDownloader || {};
  window.PwaDownloader.JobContents = JobContents;
})(window, document);
