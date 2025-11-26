(function ()
{
  'use strict';

  class ContactService
  {
    constructor(options)
    {
      this.options = options || {};
      this.config = null;
      this.jobs = null;
      this.formModal = null;
      this.confirmModal = null;
      this.toastService = null;
      this._state = { overlay: null, fields: null };
      this._bootPromise = null;
      this.initConfig();
    }

    initConfig()
    {
      const DEFAULTS = Object.freeze({
        overlayClassName: 'c-help-modal c-contact-modal',
        contentClassName: 'c-help-modal__content c-contact-modal__content',
        confirmOverlayClassName: 'c-help-modal c-contact-modal c-contact-modal--confirm',
        confirmZIndex: 10010,
        title: 'お問い合わせ',
        lead: 'サポートチームへのお問い合わせ内容をご記入ください。',
        submitLabel: '送信する',
        cancelLabel: '閉じる',
        confirmTitle: 'この内容で送信してよろしいですか？',
        confirmSubmitLabel: '送信する',
        confirmCancelLabel: '戻る',
        confirmNote: '表示されている5文字のひらがなを入力してください。',
        challengeLength: 5,
        requiredErrorText: '必須項目を入力してください。',
        challengeErrorText: '確認用のひらがなが一致しません。',
        successText: 'お問い合わせを送信しました。',
        failureText: '送信に失敗しました。時間をおいて再度お試しください。',
        fieldLabels: Object.freeze({
          name: '氏名',
          mail: 'メールアドレス',
          message: 'お問い合わせ内容'
        }),
        placeholders: Object.freeze({
          name: '例）山田 太郎',
          mail: 'example@example.com',
          message: 'ご相談内容をできるだけ具体的にご記載ください'
        })
      });
      this.config = Object.assign({}, DEFAULTS, this.options || {});
    }

    async boot()
    {
      if (this._bootPromise) { return this._bootPromise; }
      this._bootPromise = window.Utils.loadScriptsSync([
        '/js/service-app/help-modal/main.js',
        '/js/service-app/toast/main.js',
        '/js/service-app/contact/job-build-form.js',
        '/js/service-app/contact/job-validator.js',
        '/js/service-app/contact/job-confirm.js',
        '/js/service-app/contact/job-request.js'
      ]).then(async () => {
        this.formModal = this.options.formModal || new window.Services.HelpModal({
          overlayClassName: this.config.overlayClassName,
          contentClassName: this.config.contentClassName,
          showWatermark: false
        });
        this.confirmModal = this.options.confirmModal || new window.Services.HelpModal({
          overlayClassName: this.config.confirmOverlayClassName,
          contentClassName: this.config.contentClassName,
          zIndex: this.config.confirmZIndex,
          showWatermark: false,
          closeOnBackdrop: false,
          closeOnEsc: false
        });
        this.toastService = this.options.toastService || new window.Services.Toast({ position: 'top-right', duration: 3200 });

        await Promise.all([
          this.formModal.boot(),
          this.confirmModal.boot(),
          this.toastService.boot()
        ]);

        this.jobs = {
          build: new window.Services.Contact.JobBuildForm(this),
          validator: new window.Services.Contact.JobValidator(this),
          confirm: new window.Services.Contact.JobConfirm(this),
          request: new window.Services.Contact.JobRequest(this)
        };
        return this;
      }).catch((err) => {
        this._bootPromise = null;
        throw err;
      });

      return this._bootPromise;
    }

    async open(options)
    {
      await this.boot();
      const user = (options && options.user) ? options.user : null;
      const defaults = this.jobs.build.normalizeInitialValues(options || {}, user);
      const content = this.jobs.build.buildContent(defaults, this.config, {
        onSubmit: () => { this.handleSubmit(); },
        onCancel: () => { this.dismissForm(); }
      });
      const dialog = this.formModal.show(content, {
        overlayClassName: this.config.overlayClassName,
        contentClassName: this.config.contentClassName
      });
      const overlay = this.formModal._current ? this.formModal._current.overlay : null;
      this._state.overlay = overlay;
      this._state.fields = this.jobs.build.collectFields(overlay);
      this.jobs.build.bindFieldEvents(this._state.fields);
      return dialog;
    }

    async handleSubmit()
    {
      if (!this._state || !this._state.fields) { return; }
      const validation = this.jobs.validator.validate(this._state.fields);
      if (!validation.ok)
      {
        this.toastService.error(this.config.requiredErrorText);
        return;
      }

      const confirmed = await this.jobs.confirm.requestConfirmation(validation.values, {
        modal: this.confirmModal,
        toast: this.toastService,
        config: this.config
      });
      if (!confirmed) { return; }

      try
      {
        await this.jobs.request.send(validation.values);
        this.toastService.success(this.config.successText);
        this.dismissAll();
      }
      catch (err)
      {
        this.toastService.error(this.config.failureText);
        // eslint-disable-next-line no-console
        console.error('[contact] failed to send contact request', err);
      }
    }

    dismissForm()
    {
      if (this.formModal) { this.formModal.dismiss(); }
      this._state = { overlay: null, fields: null };
    }

    dismissAll()
    {
      if (this.confirmModal) { this.confirmModal.dismiss(); }
      this.dismissForm();
    }
  }

  window.Services = window.Services || {};
  window.Services.Contact = ContactService;
})(window);
