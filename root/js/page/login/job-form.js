(function ()
 {
   'use strict';
   
   class LoginJobForm
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
     }
     
     //
     // Submit
     // 
     submit(textConfig)
	   {
		   var $userCode  = $('#login-uid, input[name="user-code"], #user, input[name="uid"], input[type="text"]').first();
		   var $pass = $('#login-password, input[type="password"]').first();
		   var $msg  = $('#login-message, [data-role="login-message"], .login-msg, .message, [role="status"]').first();
		   var $form = $('#login-form, form[action*="login"], form[name="login"]').first();
		   var $btn  = $('#login-submit, button[type="submit"], input[type="submit"]').first();

		   var userCode = String($userCode.val() || '').trim();
		   var pass = String($pass.val() || '');

		   if (!userCode) {
			   $msg.text(textConfig.errUserRequired);
			   window.pageInstance.Login.toastService.error(textConfig.errInputLack);
			   $userCode.trigger('focus'); return;
		   }
       if (userCode.indexOf('@') !== -1 && !this._isEmail(userCode)) {
			   $msg.text(textConfig.errEmailFormat);
			   window.pageInstance.Login.toastService.error(textConfig.errEmailFormatShort);
			   $userCode.trigger('focus'); return;
		   }
		   if (!pass) {
			   $msg.text(textConfig.errPasswordRequired);
			   window.pageInstance.Login.toastService.error(textConfig.errInputLack);
			   $pass.trigger('focus'); return;
		   }

		   $btn.prop('disabled', true);
		   $msg.text(textConfig.authenticating);
                  window.pageInstance.Login.loaderService.show(textConfig.loading, { ariaLabel: textConfig.loading });

		   var fd = new FormData();
		   fd.set('p', $('#password').val() || $('#login-password').val() || '');
		   fd.set('userCode', $('#userCode').val() || $('#login-uid').val() || '');
		   fd.set('check', "あかさたなは"); // 暫定
		   
       var rawRequest = null;
       rawRequest = window.Utils.requestApi('Session', 'Login', fd);
       
       var loginRequest = Promise.resolve(rawRequest).then(function (data) {
         return data || {};
       });
       
       loginRequest.then((data) => {
         if (!data || data.status === 'ERROR') {
           var reason = (data && data.reason) ? data.reason : 'unknown';
           throw new Error('[login] authentication failed: ' + reason);
         }

         var user = data.result || null;
         var ret = data.returnTo || this._getUrlParam('returnTo') || this._getUrlParam('return_to');

         return this._refreshSessionUser().then(function (profile) {
           return { profile: profile, fallback: user, redirect: ret };
         }).catch(function (err) {
           console.error('[login] failed to refresh session user', err);
           return { profile: null, fallback: user, redirect: ret };
         });
       }).then((ctx) => {
         var effectiveUser = ctx.profile || ctx.fallback || {};
         $msg.text('');
         window.pageInstance.Login.toastService.success(textConfig.loginSuccess);
         var target = this._decideRedirect(effectiveUser, ctx.redirect);
         window.location.href = target;
       }).catch(function (err) {
         console.error('[login] ajax failed', err && err.responseText ? err.responseText : err);
         $msg.text(textConfig.loginFailed);
         if (window.pageInstance && window.pageInstance.Login && window.pageInstance.Login.toastService) {
           window.pageInstance.Login.toastService.error(textConfig.loginFailed);
         }
       }).finally(function () {
         window.pageInstance.Login.loaderService.hide();
         $btn.prop('disabled', false);
       });
     }

     //
     // パスワード入力部の表示・非表示切り替え
     // 
     togglePassword(textConfig)
           {
                   var $pass = $('#login-password, input[type="password"]').first();
                   var el = $pass.get(0);
                   var asText = (el.type === 'password');
                   var nextType = asText ? 'text' : 'password';

                   try
                   {
                     el.type = nextType;
                   }
                   catch (_err)
                   {
                     var $clone = $pass.clone();
                     $clone.attr('type', nextType);
                     $clone.val($pass.val());
                     $pass.replaceWith($clone);
                     $pass = $clone;
                     el = $clone.get(0);
                   }

                   var $toggle = $('#toggle-password, [data-action="toggle-password"]').first();
                   $toggle.text(asText ? textConfig.toggleHide : textConfig.toggleShow)
        .attr('aria-pressed', asText ? 'true' : 'false');
    }
     
     // 以下、private

	   _isEmail(value)
	   {
		   var s = String(value || '');
		   if (!s || s.indexOf('@') === -1) { return false; }
		   if (window.Utils && window.Utils.validate && typeof window.Utils.validate.isEmail === 'function') {
			   try { return !!window.Utils.validate.isEmail(s); } catch (_e) {}
		   }
		   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
	   }

	   _getUrlParam(name)
	   {
		   try {
			   var q = (window.location && window.location.search) ? window.location.search.slice(1) : '';
			   if (!q) { return ''; }
			   var parts = q.split('&');
			   for (var i = 0; i < parts.length; i += 1) {
				   var kv = parts[i].split('=');
				   if (decodeURIComponent(kv[0]) === name) {
					   return decodeURIComponent(kv[1] || '');
				   }
			   }
			   return '';
		   } catch (_e) { return ''; }
	   }

    _decideRedirect(user, returnToRaw)
    {
      var info = user || {};
      var safe = this._toSafeRelativePath(returnToRaw);
      if (safe) { return safe; }

      if (this._isDashboardDisabled(info)) {
        return 'targets.html';
      }

      return 'dashboard.html';
    }

    _toSafeRelativePath(path)
    {
      if (typeof path !== 'string' || !path) { return ''; }
      if (/^[a-z]+:/i.test(path)) { return ''; }
      if (path.indexOf('//') !== -1) { return ''; }
      return path.replace(/^\/*/, '');
    }

    _isDashboardDisabled(user)
    {
      var value;
      if (user && typeof user === 'object')
      {
        if (Object.prototype.hasOwnProperty.call(user, 'useDashboard'))
        {
          value = user.useDashboard;
        }
        else if (Object.prototype.hasOwnProperty.call(user, 'use_dashboard'))
        {
          value = user.use_dashboard;
        }
      }
      if (typeof value === 'undefined')
      {
        return false;
      }
      return !(value === true || value === 1 || value === '1' || value === 'true');
    }

     _refreshSessionUser()
     {
       try {
         var svc = this._getSessionServiceInstance();
         if (svc && typeof svc.syncFromServer === 'function') {
           return Promise.resolve(svc.syncFromServer());
         }

         var general = this._getSessionGeneral();
         if (general && typeof general.fetchUserProfile === 'function') {
           return general.fetchUserProfile().then(function (profile) {
             if (svc && typeof svc.setUser === 'function') {
               return svc.setUser(profile);
             }
             if (general && typeof general.cloneUser === 'function') {
               return general.cloneUser(profile);
             }
             if (!profile || typeof profile !== 'object') {
               return null;
             }
             return JSON.parse(JSON.stringify(profile));
           });
         }

         if (svc && typeof svc.getUser === 'function') {
           return Promise.resolve(svc.getUser());
         }

         return Promise.reject(new Error('[login] session service API is not available'));
       } catch (err) {
         return Promise.reject(err);
       }
     }

     _getSessionServiceInstance()
     {
       return (window.Services && window.Services.sessionInstance) ? window.Services.sessionInstance : null;
     }

     _getSessionGeneral()
     {
       return window.ServicesGeneral.session;
     }     
   }
   
   // Login 名前空間の直下に公開（再定義ガード付き）
   var NS = window.Login || (window.Login = {});   // window.Login が class でも OK（関数はオブジェクト）
   NS.JobForm = NS.JobForm || LoginJobForm;
   
 })(window);
