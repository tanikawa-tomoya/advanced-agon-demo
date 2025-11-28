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
       this.maxSymbols = 60;
       this.initialCount = 8;
       this.intervalMs = 1400;
     }

    setup()
    {
      this.skyRoot = this._ensureSky();
      if (!this.skyRoot) {
        return Promise.resolve();
      }

      this._primeSymbols(this.initialCount);
      this._startEmitter();
      return Promise.resolve();
    }

    _ensureSky()
    {
      var pageMain = document.querySelector('.page-main');
      if (!pageMain) {
        return null;
      }

      var existing = pageMain.querySelector('.ambient-sky');
      if (existing) {
        return existing;
      }

      var sky = document.createElement('div');
      sky.className = 'ambient-sky';
      pageMain.insertBefore(sky, pageMain.firstChild);
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
      }, this.intervalMs);
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

      var originX = 48 + Math.random() * 4;
      var originY = 46 + Math.random() * 8;
      symbol.style.setProperty('--origin-x', originX.toFixed(2) + '%');
      symbol.style.setProperty('--origin-y', originY.toFixed(2) + '%');

      var angle = Math.random() * Math.PI * 2;
      var spread = 32 + Math.random() * 26;
      var driftX = Math.cos(angle) * spread;
      var driftY = Math.sin(angle) * spread;
      symbol.style.setProperty('--drift-x', driftX.toFixed(2) + 'vh');
      symbol.style.setProperty('--drift-y', driftY.toFixed(2) + 'vh');

      symbol.style.fontSize = (12 + Math.random() * 22).toFixed(1) + 'px';
      symbol.style.animationDuration = (8 + Math.random() * 6).toFixed(1) + 's';
      symbol.style.animationDelay = isInitial ? (-1 * Math.random() * 8).toFixed(1) + 's' : '0s';
      symbol.style.opacity = (0.38 + Math.random() * 0.32).toFixed(2);

       var self = this;
       symbol.addEventListener('animationend', function () {
         if (symbol && symbol.parentNode === self.skyRoot) {
           self.skyRoot.removeChild(symbol);
         }
       });

      if (this.skyRoot.childElementCount > this.maxSymbols) {
        this.skyRoot.removeChild(this.skyRoot.firstChild);
      }

       this.skyRoot.appendChild(symbol);
     }
   }

   window.AgonIndex = window.AgonIndex || {};
   window.AgonIndex.JobAmbientSymbols = AgonIndexJobAmbientSymbols;
 })();
