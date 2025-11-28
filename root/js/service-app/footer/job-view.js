(function (window)
 {
   'use strict';

   class FooterJobView
   {
     constructor(serviceInstance)
     {
       this.serviceInstance = serviceInstance;
     }

     ensureRoot(selector)
     {
       const sel = selector || '.site-footer';
       let $root = $(sel);
       if ($root.length === 0)
       {
         const root = document.createElement('footer');
         root.className = 'site-footer';
         const body = document.body || document.querySelector('body');
         if (body)
         {
           body.appendChild(root);
         }
         else
         {
           document.documentElement.appendChild(root);
         }
         $root = $(root);
       }
       return $root;
     }

     render($root, config)
     {
       if (!$root || $root.length === 0) { return; }
       const root = $root[0];
       while (root.firstChild)
       {
         root.removeChild(root.firstChild);
       }

       if (config && typeof config.text === 'string' && config.text)
       {
         const paragraph = document.createElement('p');
         paragraph.textContent = config.text;
         root.appendChild(paragraph);
       }

       const links = Array.isArray(config && config.links) ? config.links : [];
       if (links.length > 0)
       {
         const nav = document.createElement('nav');
         nav.className = 'site-footer__nav';
         nav.setAttribute('aria-label', 'フッターナビゲーション');
         const list = document.createElement('ul');
         list.className = 'site-footer__links';

         for (let i = 0; i < links.length; i += 1)
         {
           const link = links[i];
           const li = document.createElement('li');
           const anchor = document.createElement('a');
           anchor.className = 'site-footer__link';
           anchor.href = link.href;
           anchor.textContent = link.label;
           if (link.target)
           {
             anchor.target = link.target;
           }
           if (link.rel)
           {
             anchor.rel = link.rel;
           }
           else if (link.target && link.target === '_blank')
           {
             anchor.rel = 'noopener noreferrer';
           }
           li.appendChild(anchor);
           list.appendChild(li);
         }

         nav.appendChild(list);
         root.appendChild(nav);
       }
     }
   }

   var Services = window.Services = window.Services || {};
   var NS = Services.footer || (Services.footer = {});
   NS.JobView = NS.JobView || FooterJobView;

 }(window));
