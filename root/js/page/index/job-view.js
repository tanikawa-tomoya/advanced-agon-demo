(function (w)
 {
   'use strict';

   class IndexJobView
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
         { main: '最新情報', sub: "What's new" },
         { main: '阿含宗とは', sub: '理念と教学' },
         { main: '映像でみる', sub: '阿含の歩み' },
         { main: '音声で聴く', sub: '開祖著作' },
         { main: '心と体の健康のために', sub: '' }
       ];

       container.innerHTML = '';

       for (var i = 0; i < items.length; i++) {
         var entry = items[i];
         var subText = entry.sub ? '<span class="curl-ribbon-button__sub">' + entry.sub + '</span>' : '';
         var labelHtml = '<span class="curl-ribbon-button__text">' +
           '<span class="curl-ribbon-button__main">' + entry.main + '</span>' +
           subText +
           '</span>';
         var button = this.buttonService.createActionButton('curl-ribbon', {
           labelHtml: labelHtml,
           backgroundColor: '#c13d36',
           backgroundOpacity: 0.9,
           borderColor: '#f0e9d8',
           borderWidth: '2px',
           hoverLabel: entry.main
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
         offsetTop: 28,
         offsetRight: 28,
         borderWidth: 3,
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
         headerHtml: '天下まであと66日',
         titleHtml: '阿含の星まつり',
         footerHtml: '2月8日（日）',
         position: 'right',
         offsetBottom: 28,
         offsetRight: 28,
         width: 320,
         minHeight: 160,
         borderWidth: 4,
         borderColor: '#d14b2f',
         backgroundColor: 'rgba(0, 0, 0, 0.72)',
         backgroundImage: 'https://picsum.photos/600/400?blur=3',
         imageOpacity: 0.82,
         imageSize: 'cover',
         zIndex: 9100
       });
     }
   }

   var NS = w.Index || (w.Index = {});
   NS.JobView = NS.JobView || IndexJobView;

 })(window);
