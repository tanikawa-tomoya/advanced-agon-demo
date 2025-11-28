(function ()
 {
   'use strict';

   class AgonIndexJobBackground
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
       this.backdropRoot = null;
       this.backdropLayers = [];
       this.activeLayerIndex = 0;
       this.observer = null;
     }

     setup()
     {
       var sections = this._collectSectionMappings();
       if (!sections.length) {
         return Promise.resolve();
       }

       this._createBackdrop();
       this._setInitialImage(sections[0]);
       this._watchSections(sections);
       document.body.classList.add('has-section-backdrop');
       return Promise.resolve();
     }

     _collectSectionMappings()
     {
       var sections = [];
       var hero = document.querySelector('.hero');
       var standardSections = document.querySelectorAll('.page-main .section');

       var mapping = [
         { element: hero, image: 'https://picsum.photos/seed/agon-hero-backdrop/1920/1080', key: 'hero' },
         { element: standardSections[0], image: 'https://picsum.photos/seed/agon-schedule/1920/1080', key: 'schedule' },
         { element: standardSections[1], image: 'https://picsum.photos/seed/agon-features/1920/1080', key: 'features' },
         { element: standardSections[2], image: 'https://picsum.photos/seed/agon-flow/1920/1080', key: 'flow' }
       ];

       for (var i = 0; i < mapping.length; i++) {
         var entry = mapping[i];
         if (entry.element && entry.image) {
           entry.element.setAttribute('data-background-key', entry.key);
           entry.element.setAttribute('data-background-image', entry.image);
           sections.push(entry);
         }
       }

       return sections;
     }

     _createBackdrop()
     {
       if (this.backdropRoot) {
         return;
       }

       var root = document.createElement('div');
       root.className = 'section-backdrop';
       var layerA = document.createElement('div');
       layerA.className = 'section-backdrop__layer is-active';
       var layerB = document.createElement('div');
       layerB.className = 'section-backdrop__layer';

       root.appendChild(layerA);
       root.appendChild(layerB);
       document.body.insertBefore(root, document.body.firstChild);

       this.backdropRoot = root;
       this.backdropLayers = [layerA, layerB];
       this.activeLayerIndex = 0;
     }

     _setInitialImage(section)
     {
       if (!section || !this.backdropLayers.length) {
         return;
       }
       this.backdropLayers[0].style.backgroundImage = 'url(' + section.image + ')';
       this.activeLayerIndex = 0;
     }

     _watchSections(sections)
     {
       if (typeof window.IntersectionObserver !== 'function') {
         return;
       }

       var self = this;
       this.observer = new window.IntersectionObserver(function (entries) {
         var best = null;
         for (var i = 0; i < entries.length; i++) {
           var entry = entries[i];
           if (!entry.isIntersecting) {
             continue;
           }
           if (!best || entry.intersectionRatio > best.intersectionRatio) {
             best = entry;
           }
         }

         if (best) {
           var image = best.target.getAttribute('data-background-image');
           var key = best.target.getAttribute('data-background-key');
           self._swapLayer(image, key);
         }
       }, { threshold: [0.25, 0.4, 0.6, 0.8], rootMargin: '-10% 0px -10% 0px' });

       for (var i = 0; i < sections.length; i++) {
         this.observer.observe(sections[i].element);
       }
     }

     _swapLayer(imageUrl, key)
     {
       if (!imageUrl || !this.backdropLayers.length) {
         return;
       }

       var nextIndex = this.activeLayerIndex === 0 ? 1 : 0;
       var currentLayer = this.backdropLayers[this.activeLayerIndex];
       var nextLayer = this.backdropLayers[nextIndex];

       nextLayer.style.backgroundImage = 'url(' + imageUrl + ')';
       nextLayer.setAttribute('data-active-key', key || '');
       nextLayer.classList.add('is-active');
       currentLayer.classList.remove('is-active');
       this.activeLayerIndex = nextIndex;
     }
   }

   window.AgonIndex = window.AgonIndex || {};
   window.AgonIndex.JobBackground = AgonIndexJobBackground;
 })();
