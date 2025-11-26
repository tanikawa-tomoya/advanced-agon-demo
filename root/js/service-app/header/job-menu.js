(function (w)
 {
   'use strict';
   
   class HeaderJobMenu
   {
     constructor(serviceInstance)
     {
       this.serviceInstance = serviceInstance;
     }

    renderMenu(menuItems)
    {
      const service = this.serviceInstance;
      if (!service) { return; }
      const $root = service._$root;
      if (!$root || $root.length === 0) { return; }
      const selectors = service.SELECTORS || {};
      const $links = $root.find(selectors.menuLinks);
      this.renderMenuSub($links, Array.isArray(menuItems) ? menuItems : []);
      const cfg = service.config || {};
      if (cfg.activeByPath) {
        this.highlightActiveLinkByUrl($links, w.location.pathname);
      }
    }

    renderUserMenu($root, selectors)
    {
      if (!$root || $root.length === 0) { return; }
      this.attachToggle($root, selectors || {});
      const service = this.serviceInstance;
      if (!service || !service.config) { return; }
      this.renderMenu(service.config.menu || []);
    }
     
     /**
      * メニューラッパー内のリンク群を差し替える。
      * 副作用: 既存のメニュー DOM を空にし、新しいアンカー要素を追加する。
      *
      * @param {JQuery<HTMLElement>} $container ナビゲーションリンクの親要素。
      * @param {Array<Object>} items 表示する項目。key/label/href を想定。
      */
     renderMenuSub($container, items)
     {
      if (!$container || $container.length === 0) { return; }
      $container.empty();
       for (let i = 0; i < items.length; i++) {
         const it = items[i];
         const $a = $('<a/>', {
          'class': 'site-header__link',
          'href': it.href || '#',
          'text': String(it.label || '')
        }).attr('data-key', it.key || '');
         $container.append($a);
       }
     }

     /**
      * ハンバーガーメニュー等の開閉トグルを初期化する。
      * 副作用: イベントハンドラをバインドし、ARIA 属性およびクラスを更新する。
      *
      * @param {JQuery<HTMLElement>} $root ヘッダー全体のラッパー。
      * @param {Object} selectors 各部品のセレクタ。
      */
     attachToggle($root, selectors) {
       const $btn = $root.find(selectors.menuToggle);
       const $overlay = $root.find(selectors.overlay);
       const $nav = $root.find(selectors.nav);
       function close() {
         $btn.attr('aria-expanded', 'false');
         $root.removeClass('is-open');
         $overlay.attr('aria-hidden', 'true');
       }
       function open() {
         $btn.attr('aria-expanded', 'true');
         $root.addClass('is-open');
         $overlay.attr('aria-hidden', 'false');
       }
       $btn.off('click.site-header').on('click.site-header', function () {
         const expanded = $(this).attr('aria-expanded') === 'true';
         if (expanded) { close(); } else { open(); }
       });
       $overlay.off('click.site-header').on('click.site-header', close);
       // ナビゲーション領域クリックで閉じる（任意）
       $nav.off('click.site-header').on('click.site-header', 'a', close);
     }

     /**
      * URL の部分一致でメニュー内のリンクを探索し、最初に一致した要素へ aria-current="page" を付与する。
      * 副作用: 対象アンカーの aria-current 属性を書き換える。
      *
      * @param {JQuery<HTMLElement>} $container ナビゲーションリンクを含むラッパー要素。
      * @param {string} url 判定に使用する現在の URL またはパス。
      */
     highlightActiveLinkByUrl($container, url)
     {
       const $links = $container.find('a[href]');
       let applied = false;
       $links.each(function () {
         const $a = $(this);
         const href = $a.attr('href') || '';
         $a.removeAttr('aria-current');
         if (!applied && url.indexOf(href) >= 0 && href !== '#') {
           $a.attr('aria-current', 'page');
           applied = true;
         }
       });
     }

     cloneMenu(items)
     {
      const menu = Array.isArray(items) ? items : [];
      const cloned = [];
      for (let i = 0; i < menu.length; i++) {
        const it = menu[i] || {};
        cloned.push({
          key: it.key || '',
          label: it.label || '',
          href: it.href || '#'
        });
      }
       return cloned;
     }     
   }
   
  // Services.header 名前空間の直下に公開（再定義ガード付き）
  var Services = window.Services = window.Services || {};
  var NS = Services.header || (Services.header = {});
  NS.JobMenu = NS.JobMenu || HeaderJobMenu;

})(window);
