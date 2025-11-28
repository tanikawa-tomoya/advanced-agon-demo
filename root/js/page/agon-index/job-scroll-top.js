(function ()
 {
   'use strict';

   class AgonIndexJobScrollTop
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
       this.button = null;
     }

     setup()
     {
       this.button = this._ensureButton();
       this._bindEvents(this.button);
       return Promise.resolve();
     }

     _ensureButton()
     {
       var existing = document.querySelector('.agon-scroll-top');
       if (existing) {
         return existing;
       }

       var button = document.createElement('button');
       button.type = 'button';
       button.className = 'agon-scroll-top';
       button.setAttribute('aria-label', 'ページの最初に戻る');
       button.innerHTML = '<span class="agon-scroll-top__icon" aria-hidden="true">\u25B2</span><span class="agon-scroll-top__label">先頭へ戻る</span>';

       document.body.appendChild(button);
       return button;
     }

     _bindEvents(button)
     {
       if (!button) {
         return;
       }

       button.addEventListener('click', function () {
         window.scrollTo({ top: 0, behavior: 'smooth' });
       });
     }
   }

   window.AgonIndex = window.AgonIndex || {};
   window.AgonIndex.JobScrollTop = AgonIndexJobScrollTop;
 })();
