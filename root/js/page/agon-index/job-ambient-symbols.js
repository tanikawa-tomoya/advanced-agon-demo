(function ()
 {
   'use strict';

   var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#&%$+-=<>?';
   var ICONS = [
     'fa-star',
     'fa-moon',
     'fa-sun',
     'fa-snowflake',
     'fa-circle',
     'fa-heart',
     'fa-fire',
     'fa-peace',
     'fa-cloud',
     'fa-feather-pointed'
   ];

   class AgonIndexJobAmbientSymbols
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
       this.skyRoot = null;
       this.timerId = null;
     }

     setup()
     {
       this.skyRoot = this._ensureSky();
       if (!this.skyRoot) {
         return Promise.resolve();
       }

       this._primeSymbols(16);
       this._startEmitter();
       return Promise.resolve();
     }

     _ensureSky()
     {
       var existing = document.querySelector('.ambient-sky');
       if (existing) {
         return existing;
       }

       var sky = document.createElement('div');
       sky.className = 'ambient-sky';
       document.body.appendChild(sky);
       return sky;
     }

     _primeSymbols(count)
     {
       for (var i = 0; i < count; i++) {
         this._spawnSymbol(true);
       }
     }

     _startEmitter()
     {
       var self = this;
       this.timerId = window.setInterval(function () {
         self._spawnSymbol(false);
       }, 780);
     }

     _spawnSymbol(isInitial)
     {
       if (!this.skyRoot) {
         return;
       }

       var symbol = document.createElement('span');
       symbol.className = 'ambient-sky__symbol';

       var useIcon = Math.random() < 0.28;
       if (useIcon) {
         var icon = document.createElement('i');
         icon.className = 'fa-solid ' + ICONS[Math.floor(Math.random() * ICONS.length)];
         symbol.className += ' is-icon';
         symbol.appendChild(icon);
       } else {
         var letterIndex = Math.floor(Math.random() * LETTERS.length);
         symbol.textContent = LETTERS.charAt(letterIndex);
       }

       symbol.style.left = (Math.random() * 100).toFixed(2) + '%';
       symbol.style.fontSize = (12 + Math.random() * 22).toFixed(1) + 'px';
       symbol.style.animationDuration = (9 + Math.random() * 7).toFixed(1) + 's';
       symbol.style.animationDelay = isInitial ? (-1 * Math.random() * 9).toFixed(1) + 's' : '0s';
       symbol.style.opacity = (0.38 + Math.random() * 0.32).toFixed(2);

       var self = this;
       symbol.addEventListener('animationend', function () {
         if (symbol && symbol.parentNode === self.skyRoot) {
           self.skyRoot.removeChild(symbol);
         }
       });

       if (this.skyRoot.childElementCount > 120) {
         this.skyRoot.removeChild(this.skyRoot.firstChild);
       }

       this.skyRoot.appendChild(symbol);
     }
   }

   window.AgonIndex = window.AgonIndex || {};
   window.AgonIndex.JobAmbientSymbols = AgonIndexJobAmbientSymbols;
 })();
