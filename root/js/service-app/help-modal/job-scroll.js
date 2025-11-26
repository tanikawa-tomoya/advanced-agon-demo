(function () {
  'use strict';

  class JobScroll
  {
    constructor(service) {
      this.service = service;
      this._count = 0;
      this._prevOverflow = '';
      this._prevRootOverflow = '';
    }

    lock()
    {
      if (this._count === 0) {
        this._prevOverflow = document.body.style.overflow;
        this._prevRootOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      }
      this._count++;
    }

    unlock()
    {
      if (this._count > 0) {
        this._count--;
        if (this._count === 0) {
          document.body.style.overflow = this._prevOverflow || '';
          document.documentElement.style.overflow = this._prevRootOverflow || '';
        }
      }
    }

    unlockAll() {
      while (this._count > 0) this.unlock();
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.HelpModal || (Services.HelpModal = {});
  NS.JobScroll = NS.JobScroll || JobScroll;  

})(window, document);
