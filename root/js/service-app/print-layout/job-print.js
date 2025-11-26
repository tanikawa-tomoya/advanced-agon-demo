(function () {

  'use strict';

  class JobPrint
  {
    constructor(service) {
      this.service = service;
    }

    doPrint(root)
    {
      // 必要に応じて一時的なクラスを付与するなどの拡張は可能（header の概念を超えない範囲）
      try { window.print(); } catch (e) {}
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.PrintLayout || (Services.PrintLayout = {});
  NS.JobPrint = NS.JobPrint || JobPrint;  

})(window, document);
