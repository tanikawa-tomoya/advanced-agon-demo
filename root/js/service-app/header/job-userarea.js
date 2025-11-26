(function ()
 {
   'use strict';
   
   class HeaderJobUserArea
   {
     constructor(serviceInstance)
     {
       this.serviceInstance = serviceInstance;
     }

     /**
      * ユーザー情報表示エリアを更新する。
      * 副作用: DOM の差し替え、画像読み込みイベント登録、ARIA 属性の更新を行う。
      *
      * @param {JQuery<HTMLElement>} $root ヘッダー全体のラッパー。
      * @param {Object} selectors DOM 参照用セレクタ群。
      * @param {Object|null} user 表示対象のユーザー情報。
      * @param {string} fallbackAvatar 代替アバター画像の URL。
      * @param {Object} options 描画オプション。loginLinkTemplate など。
      */
     renderUserArea($root, selectors, user, fallbackAvatar, options)
     {
       const loginTemplate = options && options.loginLinkTemplate ? options.loginLinkTemplate : null;
      const isLoggedIn = this.serviceInstance.isLoggedInUser(user);
      if (!isLoggedIn) {
        this.renderLoginArea($root, selectors, loginTemplate);
        return;
      }

      const resolvedAvatar = this.resolveAvatarSource(user, fallbackAvatar);
      const hasCustomAvatar = resolvedAvatar && resolvedAvatar !== fallbackAvatar;
      const displayName = typeof user.name === 'string' ? user.name : (typeof user.displayName === 'string' ? user.displayName : '');
      const roleLabel = typeof user.role === 'string' ? user.role : (typeof user.roleLabel === 'string' ? user.roleLabel : '');
      const accountEditHref = this.resolveAccountEditHref(options);
      const logoutOptions = options && options.logout ? options.logout : {};
      const logoutLabel = typeof logoutOptions.label === 'string' && logoutOptions.label ? logoutOptions.label : 'ログアウト';

       const details = {
         avatarSrc: hasCustomAvatar ? resolvedAvatar : null,
         fallbackAvatar: fallbackAvatar,
         displayName: displayName,
         roleLabel: roleLabel,
         accountEditHref: accountEditHref,
         logoutLabel: logoutLabel
       };

      $root.find('.site-header__user').remove();
      $root.find('[data-login-area="1"]').remove();
      const $existingAccount = $root.find('.site-header__account').first();
      if ($existingAccount.length > 0) {
        this._updateAccountDom($existingAccount, details);
        this.serviceInstance.attachAccountMenuEvents($existingAccount, { logout: logoutOptions });
        return;
      }

      const $cta = $root.find(selectors.loginLink).first();
      const $account = this.buildAccountElement(details);
      if ($cta.length > 0) {
        $cta.replaceWith($account);
      } else {
         $root.append($account);
       }
       this.serviceInstance.attachAccountMenuEvents($account, { logout: logoutOptions });
     }

     /**
      * 未ログイン時の CTA 領域をログインリンクへ差し替える。
      * 副作用: 既存のユーザー表示や CTA を置き換え、DOM を更新する。
      *
      * @param {JQuery<HTMLElement>} $root ヘッダー全体のラッパー。
      * @param {Object} selectors DOM 参照用セレクタ群。
     * @param {string} templateHtml 既存テンプレートの outerHTML。
     * @returns {JQuery<HTMLElement>} 描画したログイン要素。
     */
    renderLoginArea($root, selectors, templateHtml)
    {
      const $existingUser = $root.find('.site-header__user');
      const $account = $root.find('.site-header__account');
      const $loginArea = $root.find('[data-login-area="1"]').first();
      const $cta = $root.find(selectors.loginLink).first();
      const $login = this.buildLoginLink(templateHtml);
      const $contact = this.buildContactButton();
      const $group = this.buildLoginArea($login, $contact);

      if ($existingUser.length > 0) {
        $existingUser.replaceWith($group);
        this.serviceInstance.bindContactAction($contact);
        return $group;
      }

      if ($account.length > 0) {
        this.destroyAccountMenu($account);
        const $overlay = $root.find(selectors.overlay).first();
        $account.remove();
        if ($cta.length === 0 && $loginArea.length === 0) {
          if ($overlay.length > 0) {
            $overlay.before($group);
          } else {
            $root.append($group);
          }
          this.serviceInstance.bindContactAction($contact);
          return $group;
        }
      }

      if ($loginArea.length > 0) {
        $loginArea.replaceWith($group);
        this.serviceInstance.bindContactAction($contact);
        return $group;
      }

      if ($cta.length > 0) {
        $cta.replaceWith($group);
        this.serviceInstance.bindContactAction($contact);
        return $group;
      }

      $root.append($group);
      this.serviceInstance.bindContactAction($contact);
      return $group;
    }

     destroyAccountMenu($account)
     {
       if (!$account || $account.length === 0)
       {
         return;
       }
       const ns = $account.data('accountMenuNs') || '.accountMenu';
       const docHandler = $account.data('accountMenuDocHandler');
       const doc = $(document);
       if (docHandler)
       {
         doc.off('click' + ns, docHandler);
       }
       $account.off(ns);
       $account.find('.site-header__account-btn').off(ns);
       $account.find('.site-header__account-menu').off(ns);
       $account.find('[data-account-logout="1"]').off(ns);
       $account.removeData('accountMenuNs');
       $account.removeData('accountMenuDocHandler');
     }

     _updateAccountDom($account, details)
     {
       const avatarSrc = details.avatarSrc || null;
       const fallbackAvatar = details.fallbackAvatar;
       const displayName = details.displayName || '';
       const roleLabel = details.roleLabel || '';
       const ariaLabel = this.resolveAccountAriaLabel(displayName);
       const finalSrc = avatarSrc || fallbackAvatar;
       const $icon = $account.find('.site-header__account-icon');
       if ($icon.length > 0)
       {
         const $img = $icon.find('img.site-header__avatar');
         if ($img.length > 0)
         {
           $img.attr('src', finalSrc);
           $img.attr('alt', displayName || 'user');
           $img.removeData('fallbackApplied');
           const imgEl = $img.get(0);
           if (imgEl && imgEl.dataset && imgEl.dataset.fallbackApplied)
           {
             delete imgEl.dataset.fallbackApplied;
           }
           this.bindAvatarFallback($img, fallbackAvatar);
         }
         if (avatarSrc && avatarSrc !== fallbackAvatar)
         {
           $icon.addClass('site-header__account-icon--has-avatar');
         }
         else
         {
           $icon.removeClass('site-header__account-icon--has-avatar');
         }
       }
       const $name = $account.find('.site-header__user-name');
       if ($name.length > 0)
       {
         $name.text(displayName || '');
       }
       const $role = $account.find('.site-header__user-role');
       if ($role.length > 0)
       {
         $role.text(roleLabel || '');
       }
       const $btn = $account.find('.site-header__account-btn');
       if ($btn.length > 0)
       {
         $btn.attr('aria-label', ariaLabel);
       }
     }

     bindAvatarFallback($img, fallbackAvatar)
     {
       $img.off('error.site-header').on('error.site-header', function () {
         if (this.dataset.fallbackApplied === '1') { return; }
         this.src = fallbackAvatar;
         this.dataset.fallbackApplied = '1';
       });
     }

     resolveAvatarSource(user, fallbackAvatar)
     {
       const candidates = [
         user && user.avatar,
         user && user.avatarUrl,
         user && user.pictureUrl,
         user && user.iconUrl,
         user && user.imageUrl
       ];
       for (let i = 0; i < candidates.length; i++)
       {
         const value = candidates[i]; // 優先順位の高い順で最初の有効URLを採用
         if (typeof value === 'string')
         {
           const trimmed = value.trim();
           if (trimmed.length > 0)
           {
             return trimmed;
           }
         }
       }
       return fallbackAvatar;
     }

     /**
      * ログインリンクのテンプレートHTMLをもとにアンカー要素を構築する。
      * 副作用: なし（生成した要素を返すのみ）。
      *
      * @param {string} templateHtml 既存テンプレートの outerHTML 文字列。
      * @returns {JQuery<HTMLAnchorElement>} ログイン遷移用のアンカー。
      */
    buildLoginLink(templateHtml)
    {
      if (typeof templateHtml === 'string' && templateHtml.trim().length > 0) {
        const $rendered = $(templateHtml);
        if ($rendered.length > 0) {
          return $rendered.first();
        }
      }
      return $('<a/>', {
        'class': 'site-header__cta',
        'href': 'login.html',
        'text': 'ログイン'
      });
    }

    buildContactButton()
    {
      return $('<button/>', {
        'class': 'site-header__cta site-header__cta--ghost',
        'type': 'button',
        'data-contact-trigger': '1',
        'text': 'お問い合わせ'
      });
    }

    buildLoginArea($login, $contact)
    {
      const $group = $('<div/>', { 'class': 'site-header__cta-group', 'data-login-area': '1' });
      $group.append($login, $contact);
      return $group;
    }

     resolveDefaultAccountEditHref()
     {
       return 'account-settings.html';
     }

     resolveAccountEditHref(options)
     {
       if (typeof options === 'string' && options.trim().length > 0)
       {
         return options.trim();
       }
       if (options && typeof options.accountEditHref === 'string' && options.accountEditHref.trim().length > 0)
       {
         return options.accountEditHref.trim();
       }
       return this.resolveDefaultAccountEditHref();
     }

     resolveAccountAriaLabel(displayName)
     {
       if (typeof displayName === 'string' && displayName.trim().length > 0)
       {
         return displayName + 'としてログイン中';
       }
       return 'アカウントメニュー';
     }

     buildAccountElement(details)
     {
       const displayName = details.displayName || '';
       const roleLabel = details.roleLabel || '';
       const ariaLabel = this.resolveAccountAriaLabel(displayName);
       const logoutLabel = details.logoutLabel || 'ログアウト';
       const accountEditHref = details.accountEditHref || this.resolveDefaultAccountEditHref();

       const $account = $('<div/>', { 'class': 'site-header__account', 'data-account-menu': '1' });
       const $button = $('<button/>', {
         'class': 'site-header__account-btn',
         'type': 'button',
         'aria-haspopup': 'true',
         'aria-expanded': 'false',
         'aria-label': ariaLabel
       });

       const $icon = $('<span/>', { 'class': 'site-header__account-icon' });
       const $img = $('<img/>', { 'class': 'site-header__avatar', 'alt': displayName || 'user' });
       $icon.append($img);
       $button.append($icon);

       $button.append($('<span/>', { 'class': 'site-header__sr-only', 'text': 'アカウントメニュー' }));

       const $text = $('<span/>', { 'class': 'site-header__account-text' });
       $text.append($('<span/>', { 'class': 'site-header__user-name', 'text': displayName || '' }));
       $text.append($('<span/>', { 'class': 'site-header__user-role', 'text': roleLabel || '' }));
       $button.append($text);

      const $menu = $('<div/>', { 'class': 'site-header__account-menu', 'role': 'menu' });
      $menu.append($('<a/>', {
        'class': 'site-header__account-item',
        'href': accountEditHref,
        'role': 'menuitem',
        'text': 'アカウント設定'
      }));

      const $contact = $('<button/>', {
        'class': 'site-header__account-item site-header__account-item--button',
        'type': 'button',
        'role': 'menuitem',
        'text': 'お問い合わせ'
      }).attr('data-account-contact', '1');
      $menu.append($contact);

      const $logout = $('<a/>', {
        'class': 'site-header__account-item site-header__account-item--button',
        'href': '#',
        'role': 'menuitem',
         'text': logoutLabel
       }).attr('data-account-logout', '1');
       $menu.append($logout);

       $account.append($button, $menu);
       this._updateAccountDom($account, details);
       return $account;
     }
  }
   
  // Services.header 名前空間の直下に公開（再定義ガード付き）
  var Services = window.Services = window.Services || {};
  var NS = Services.header || (Services.header = {});
  NS.JobUserArea = NS.JobUserArea || HeaderJobUserArea;

})(window);
