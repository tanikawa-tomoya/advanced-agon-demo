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

  var INITIAL_SYMBOLS = 10;
  var EMIT_INTERVAL = 1800;
  var MAX_SYMBOLS = 60;

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

       this._primeSymbols(INITIAL_SYMBOLS);
       this._startEmitter();
       return Promise.resolve();
     }

     _ensureSky()
     {
       var main = document.querySelector('.page-main');
       if (!main) {
         return null;
       }

       var existing = main.querySelector('.ambient-sky');
       if (existing) {
         return existing;
       }

       var sky = document.createElement('div');
       sky.className = 'ambient-sky';
       main.appendChild(sky);
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
       }, EMIT_INTERVAL);
     }

     _spawnSymbol(isInitial)
     {
       if (!this.skyRoot) {
         return;
       }

       var main = document.querySelector('.page-main');
       var sections = main ? main.querySelectorAll('.section') : null;
       if (!main || !sections || !sections.length) {
         return;
       }

       var section = sections[Math.floor(Math.random() * sections.length)];
       var mainRect = main.getBoundingClientRect();
       var sectionRect = section.getBoundingClientRect();

       var centerX = sectionRect.left + sectionRect.width / 2 - mainRect.left;
       var centerY = sectionRect.top + sectionRect.height / 2 - mainRect.top;

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

       symbol.style.left = centerX.toFixed(1) + 'px';
       symbol.style.top = centerY.toFixed(1) + 'px';

       var angle = Math.random() * Math.PI * 2;
       var distanceBase = Math.max(sectionRect.width, sectionRect.height) * 0.55 + 80;
       var travel = distanceBase + Math.random() * 120;
       var dx = Math.cos(angle) * travel;
       var dy = Math.sin(angle) * travel;

       symbol.style.setProperty('--dx', dx.toFixed(1) + 'px');
       symbol.style.setProperty('--dy', dy.toFixed(1) + 'px');
       symbol.style.fontSize = (12 + Math.random() * 22).toFixed(1) + 'px';
       symbol.style.animationDuration = (7 + Math.random() * 6).toFixed(1) + 's';
       symbol.style.animationDelay = isInitial ? (-1 * Math.random() * 7).toFixed(1) + 's' : '0s';
       symbol.style.opacity = (0.38 + Math.random() * 0.32).toFixed(2);

       var self = this;
       symbol.addEventListener('animationend', function () {
         if (symbol && symbol.parentNode === self.skyRoot) {
           self.skyRoot.removeChild(symbol);
         }
       });

       if (this.skyRoot.childElementCount > MAX_SYMBOLS) {
         this.skyRoot.removeChild(this.skyRoot.firstChild);
       }

       this.skyRoot.appendChild(symbol);
     }
   }

   window.AgonIndex = window.AgonIndex || {};
   window.AgonIndex.JobAmbientSymbols = AgonIndexJobAmbientSymbols;
 })();
