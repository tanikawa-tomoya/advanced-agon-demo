(function () {

  'use strict';

  class JobTooltip
  {
    constructor(service)
    {
      this.service = service;
    }

    /**
     * 現段階ではネイティブの title 属性のみを使用。
     * 追加のUIは導入せず、header と同等の概念の範囲に留める。
     */
    attach(target, text)
    {
      if (!target) return;
      if (text == null) return;
      target.setAttribute('title', String(text));
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Icon || (Services.Icon = {});
  NS.JobTooltip = NS.JobTooltip || JobTooltip;      

})(window, document);
