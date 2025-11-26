(function ()
 {
   'use strict';

   class LoginJobPasswordReset
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
      this.$modal = $('#password-reset-modal');
      this.$form = $('#password-reset-form');
      this.$mail = $('#password-reset-mail');
      this.$check = $('#password-reset-check');
      this.$feedback = $('#password-reset-feedback');
      this.$submit = $('#password-reset-submit');
    }

     open(textConfig)
     {
       this._clearFeedback();
       this.$modal.addClass('is-open').attr('aria-hidden', 'false');
       this.$mail.trigger('focus');
     }

     close()
     {
       const formElement = this.$form.get(0);
       if (formElement && typeof formElement.reset === 'function')
       {
         formElement.reset();
       }

       this._clearFeedback();
       this.$modal.removeClass('is-open').attr('aria-hidden', 'true');
     }

    submit(textConfig)
    {
      const mail = String(this.$mail.val() || '').trim();
      const check = String(this.$check.val() || '').trim();

       if (!mail)
       {
         this._setFeedback(textConfig.errResetMailRequired, true, false);
         this.$mail.trigger('focus');
         return;
       }

       if (!this._isEmail(mail))
       {
         this._setFeedback(textConfig.errEmailFormat, true, false);
         this.$mail.trigger('focus');
         return;
       }

       this.$submit.prop('disabled', true);
       this._setFeedback(textConfig.resetSending, false, true);
      this.pageInstance.loaderService.show(textConfig.resetSending, { ariaLabel: textConfig.resetSending });

      const fd = new FormData();
      fd.set('mail', mail);
      fd.set('check', check);
      fd.set('loginURL', this._resolveLoginUrl());

       const raw = window.Utils.requestApi('User', 'UserPasswordResetSend', fd);

       Promise.resolve(raw).then((data) =>
       {
         const errorMessage = this._resolveErrorFromResponse(data, textConfig);
         if (errorMessage)
         {
           throw new Error(errorMessage);
         }
         return data;
       }).then(() =>
       {
         this._setFeedback(textConfig.resetMailSent, false, false);
         this.pageInstance.toastService.success(textConfig.resetMailSent);
         this.close();
       }).catch((err) =>
       {
         const message = this._extractErrorMessage(err, textConfig);
         this._setFeedback(message, true, false);
         this.pageInstance.toastService.error(message);
       }).finally(() =>
       {
         this.pageInstance.loaderService.hide();
         this.$submit.prop('disabled', false);
       });
     }

     _resolveLoginUrl()
     {
       const href = (window.location && window.location.pathname) ? window.location.pathname : '';
       if (!href || href === '/')
       {
         return '/login.html';
       }
       if (href.toLowerCase().indexOf('login') !== -1)
       {
         return href;
       }
       return '/login.html';
     }

     _resolveErrorFromResponse(data, textConfig)
     {
       if (!data)
       {
         return textConfig.resetUnknownError;
       }

       if (data.status && data.status !== 'ERROR')
       {
         return '';
       }

       const reason = data.reason || '';

       if (reason === 'E1')
       {
         return textConfig.resetMailNotFound;
       }
       if (reason === 'E2')
       {
         return textConfig.resetHintMismatch;
       }
       if (reason === 'mail_not_configured')
       {
         return textConfig.resetMailNotConfigured;
       }
       if (reason === 'invalid_login_url')
       {
         return textConfig.resetLoginUrlInvalid;
       }
       if (data.message)
       {
         return data.message;
       }

       return textConfig.resetUnknownError;
     }

     _extractErrorMessage(err, textConfig)
     {
       if (err && err.message)
       {
         return err.message;
       }
       return textConfig.resetUnknownError;
     }

     _setFeedback(message, isError, isPending)
     {
       this.$feedback.text(message || '');
       this.$feedback.toggleClass('is-error', !!isError);
       this.$feedback.toggleClass('is-pending', !!isPending);
       this.$feedback.toggleClass('is-success', !isError && !isPending && !!message);
     }

     _clearFeedback()
     {
       this._setFeedback('', false, false);
     }

     _isEmail(value)
     {
       const s = String(value || '');
       if (!s || s.indexOf('@') === -1) { return false; }
       if (window.Utils && window.Utils.validate && typeof window.Utils.validate.isEmail === 'function')
       {
         try { return !!window.Utils.validate.isEmail(s); } catch (_e) {}
       }
       return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
     }
   }

   const NS = window.Login || (window.Login = {});
   NS.JobPasswordReset = NS.JobPasswordReset || LoginJobPasswordReset;

 })(window);
