(function (w)
 {
   'use strict';

   class IndexrefJobView
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
       this.buttonService = null;
       this.verticalBlockService = null;
       this.overlayBlockService = null;
     }

     async loadPage()
     {
       await w.Utils.loadScriptsSync([
         { src: '/js/service-app/button/main.js' },
         { src: '/js/service-app/fixed-overlay-vertical-block/main.js' },
         { src: '/js/service-app/fixed-overlay-block/main.js' }
       ]);

       this.buttonService = new w.Services.button();
       this.verticalBlockService = new w.Services.FixedOverlayVerticalBlock();
       this.overlayBlockService = new w.Services.FixedOverlayBlock();

      await Promise.all([
        this.buttonService.boot(),
        this.verticalBlockService.boot(),
        this.overlayBlockService.boot()
      ]);

      this.renderButtonList();
      this.renderQuoteBlock();
      this.renderFestivalBlock();
    }

    renderButtonList()
    {
      var container = document.querySelector('#primary-actions');
      if (!container) { return; }

       var items = [
         { main: '最新情報', color: '#B93C29', border: '#7a241a', href: '/event' },
         { main: '阿含宗とは', color: '#438793', border: '#2e5c63', href: '/about' },
         { main: '映像でみる阿含の歩み', color: '#AF9C13', border: '#7c6d0e', href: '/contents1' },
         { main: '音声で聴く開祖著作', color: '#7D7B32', border: '#595825', href: '/contents2' },
         { main: '心と身体の健康のために', color: '#AB716F', border: '#7a4f4d', href: '/wellness' }
       ];

       container.innerHTML = '';

       for (var i = 0; i < items.length; i++) {
         var entry = items[i];
         var labelHtml = '<span class="curl-ribbon-button__text">' +
           '<span class="curl-ribbon-button__main">' + entry.main + '</span>' +
           '</span>';
         var button = this.buttonService.createActionButton('curl-ribbon', {
           labelHtml: labelHtml,
           backgroundColor: entry.color,
           backgroundOpacity: 1,
           borderColor: entry.border,
           borderWidth: '8px',
           hoverLabel: entry.main,
           elementTag: 'a',
           attributes: {
             href: entry.href
           }
         });
         button.classList.add('landing-action');
         container.appendChild(button);
       }
     }

    renderQuoteBlock()
    {
      this.verticalBlockService.render({
        title: '開祖 今日のお言葉',
        details: ['失敗に学ぶ知恵あるものが、', '成功への道を歩む'],
        position: 'right',
        offsetTop: this.resolveMainTopOffset(10),
        offsetRight: 40,
        borderWidth: 6,
        borderColor: '#d9b55a',
        backgroundColor: '#0f0f0f',
        backgroundOpacity: 0.82,
        titleFont: '"Noto Sans JP", sans-serif',
        detailFont: '"Noto Sans JP", sans-serif',
         zIndex: 9200
       });
     }

    renderFestivalBlock()
    {
      this.overlayBlockService.render({
        headerHtml: '',
        titleHtml: '阿含の星まつり',
        footerHtml: '2月8日（日）',
        outerLabelHtml: '点火まであと66日',
        position: 'right',
        offsetBottom: 28,
        offsetRight: 28,
        width: 640,
        minHeight: 320,
        borderWidth: 8,
        borderColor: '#d14b2f',
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backgroundImage: 'https://picsum.photos/600/400?blur=3',
        imageOpacity: 0.82,
        imageSize: 'cover',
        zIndex: 9100
      });
    }

    resolveMainTopOffset(extra)
    {
      var main = document.querySelector('.landing-main');
      var scrollY = w.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      var base = main ? (main.getBoundingClientRect().top + scrollY) : 0;
      var delta = typeof extra === 'number' && isFinite(extra) ? extra : 0;
      return Math.max(base + delta, 0);
    }
  }

   var NS = w.Indexref || (w.Indexref = {});
   NS.JobView = NS.JobView || IndexrefJobView;

 })(window);
