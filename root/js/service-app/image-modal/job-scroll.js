(function () {
  'use strict';

  class JobScroll
  {
    constructor(service)
    {
      this.service = service;
      this._count = 0;
      this._prevOverflow = '';
    }

    lock()
    {
      if (this._count === 0) {
        this._prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      this._count++;
    }

    unlock()
    {
      if (this._count > 0) {
        this._count--;
        if (this._count === 0) {
          document.body.style.overflow = this._prevOverflow || '';
        }
      }
    }

    unlockAll() {
      while (this._count > 0) this.unlock();
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.ImageModal || (Services.ImageModal = {});
  NS.JobScroll = NS.JobScroll || JobScroll;    

})(window, document);
