(function ()
 {
   'use strict';
	 
   class Login
   {
    constructor(name)
    {
      this.name = name || 'login';
      this.logoutNoticeStorageKey = 'advanced:logout-notice';
    }

     // このページではSessionServiceでのログイン状態のチェックは不要     
     async boot()
     {
       const jsList = [
	       '/js/service-app/header/main.js',
         '/js/service-app/toast/main.js',
	       '/js/service-app/loading/main.js',
       ];
       await window.Utils.loadScriptsSync(jsList);

       this.initConfig();
       
      this.headerService = new window.Services.Header({display: {forceLoginButton: true, hideLoginButton: false, showUserInfoWhenLoggedin: false}});
      this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.loaderService = new window.Services.Loading({
        container: document.body,
        position: 'center',
        lockScroll: true,
        dismissOnBackdrop: false,
        dismissOnEsc: false,
        maxStack: 1,
        ariaLabel: this.textConfig.loading
      });

        await Promise.all([
          this.headerService.boot('.site-header'),
          this.toastService.boot(),
          this.loaderService.boot()
        ]);
       
      this.updateEvent();
      this.displayLogoutToastIfNeeded();
    }

     updateEvent()
     {
       $(document).off('submit.login')
         .on('submit.login', '#login-form, form[action*="login"], form[name="login"]', async (ev) => {
           ev.preventDefault();
           await window.Utils.loadScriptsSync(["/js/page/login/job-form.js"]);
           const constructor = (window.Login && window.Login.JobForm);
           new constructor(this).submit(this.textConfig);
         });
       
       $(document).off('click.login')
         .on('click.login', '#toggle-password, [data-action="toggle-password"]', async (ev) => {
           ev.preventDefault();
           await window.Utils.loadScriptsSync(["/js/page/login/job-form.js"]);
           const constructor = window.Login && window.Login.JobForm;
           new constructor(this).togglePassword(this.textConfig);
         });

      $(document).off('click.login-reset-open')
        .on('click.login-reset-open', '[data-action="open-password-reset"]', async (ev) => {
          ev.preventDefault();
          await window.Utils.loadScriptsSync(["/js/page/login/job-password-reset.js"]);
          const constructor = window.Login && window.Login.JobPasswordReset;
          new constructor(this).open(this.textConfig);
        });

      $(document).off('click.login-reset-close')
        .on('click.login-reset-close', '[data-action="close-password-reset"]', async (ev) => {
          ev.preventDefault();
          await window.Utils.loadScriptsSync(["/js/page/login/job-password-reset.js"]);
          const constructor = window.Login && window.Login.JobPasswordReset;
          new constructor(this).close();
        });

      $(document).off('submit.login-reset')
        .on('submit.login-reset', '#password-reset-form', async (ev) => {
          ev.preventDefault();
          await window.Utils.loadScriptsSync(["/js/page/login/job-password-reset.js"]);
          const constructor = window.Login && window.Login.JobPasswordReset;
          new constructor(this).submit(this.textConfig);
        });
    }

     initConfig()
     {
       this.textConfig = Object.freeze({
         toggleShow: '表示',
         toggleHide: '非表示',
         errUserRequired:     'ユーザーコードまたはメールアドレスを入力してください。',
        errPasswordRequired: 'パスワードを入力してください。',
        errEmailFormat:      'メールアドレスの形式が正しくありません。',
        errEmailFormatShort: 'メール形式エラー',
        errInputLack:        '入力が不足しています。',
        authenticating:      '認証中…',
        loginSuccess:        'ログインに成功しました',
       loginFailed:         'ログインに失敗しました。もう一度お試しください。',
       loading:             'ログインしています…',
       logoutMessage:       'ログアウトしました。',
       errResetMailRequired: 'メールアドレスを入力してください。',
       resetSending:         'パスワードリセットメールを送信しています…',
       resetMailSent:        'パスワードリセットメールを送信しました。',
       resetMailNotFound:    '該当するメールアドレスが見つかりませんでした。',
       resetHintMismatch:    '登録情報と一致しません。',
       resetMailNotConfigured: 'メールアドレスが設定されていないため送信できません。',
       resetUnknownError:    'パスワードリセットの送信に失敗しました。時間をおいて再試行してください。',
       resetLoginUrlInvalid: '指定されたログインURLが不正です。'
      });

      this.selectorConfig = Object.freeze({
       // TODO
       });
    }

    displayLogoutToastIfNeeded()
    {
      if (!this.consumeLogoutNoticeFlag())
      {
        return;
      }
      this.toastService.info(this.textConfig.logoutMessage);
    }

    consumeLogoutNoticeFlag()
    {
      const storage = window.sessionStorage;
      if (!storage || typeof storage.getItem !== 'function')
      {
        return false;
      }
      let hasFlag = false;
      try
      {
        hasFlag = !!storage.getItem(this.logoutNoticeStorageKey);
      }
      catch (_err)
      {
        return false;
      }
      if (!hasFlag)
      {
        return false;
      }
      try
      {
        storage.removeItem(this.logoutNoticeStorageKey);
      }
      catch (_err2) {}
      return true;
    }
  }

   window.Login = window.Login || Login;
 })(window);
