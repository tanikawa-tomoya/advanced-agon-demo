// js/service-app/button/job-action-design-banner.js
(function (w) {
  'use strict';

  const DESIGN_KEY = 'banner';

  const TYPE_DEFINITIONS = Object.freeze([
    Object.freeze({
      key: 'content-uploader-primary',
      config: Object.freeze({
        designKey: DESIGN_KEY,
        baseClass: 'btn btn--primary',
        variant: 'primary',
        variantPrefix: Object.freeze([]),
        type: 'button'
      })
    }),
    Object.freeze({
      key: 'announcement-create',
      config: Object.freeze({
        designKey: DESIGN_KEY,
        baseClass: 'btn btn--primary',
        variant: 'primary',
        variantPrefix: Object.freeze([]),
        type: 'button',
        attributes: Object.freeze({
          'data-action': 'create'
        })
      })
    }),
    Object.freeze({
      key: 'target-create',
      config: Object.freeze({
        designKey: DESIGN_KEY,
        baseClass: 'btn btn--primary',
        variant: 'primary',
        variantPrefix: Object.freeze([]),
        type: 'button',
        attributes: Object.freeze({
          'data-action': 'new-target'
        })
      })
    }),
    Object.freeze({
      key: 'account-settings-save-profile',
      config: Object.freeze({
        designKey: DESIGN_KEY,
        baseClass: 'btn btn--primary account-settings-screen__banner-button',
        variant: 'primary',
        variantPrefix: Object.freeze([]),
        type: 'button'
      })
    }),
    Object.freeze({
      key: 'account-settings-save-notifications',
      config: Object.freeze({
        designKey: DESIGN_KEY,
        baseClass: 'btn btn--primary account-settings-screen__banner-button',
        variant: 'primary',
        variantPrefix: Object.freeze([]),
        type: 'button'
      })
    }),
    Object.freeze({
      key: 'account-settings-save-avatar',
      config: Object.freeze({
        designKey: DESIGN_KEY,
        baseClass: 'btn btn--primary account-settings-screen__banner-button',
        variant: 'primary',
        variantPrefix: Object.freeze([]),
        type: 'button'
      })
    }),
    Object.freeze({
      key: 'target-reference-refresh',
      config: Object.freeze({
        designKey: DESIGN_KEY,
        baseClass: 'btn btn--primary btn-primary',
        variant: 'primary',
        variantPrefix: Object.freeze([]),
        type: 'button'
      })
    }),
    Object.freeze({
      key: 'target-survey-response',
      config: Object.freeze({
        designKey: DESIGN_KEY,
        baseClass: 'btn btn--primary target-detail__survey-response-button',
        variant: 'primary',
        variantPrefix: Object.freeze([]),
        type: 'button'
      })
    }),
    Object.freeze({
      key: 'survey-status-download',
      config: Object.freeze({
        designKey: DESIGN_KEY,
        baseClass: 'btn btn--primary',
        variant: 'primary',
        variantPrefix: Object.freeze([]),
        type: 'button'
      })
    }),
    Object.freeze({
      key: 'admin-system-refresh',
      config: Object.freeze({
        designKey: DESIGN_KEY,
        baseClass: 'btn btn--ghost system-refresh-button',
        variant: 'ghost',
        variantPrefix: Object.freeze([]),
        type: 'button'
      })
    })
  ]);

  class ButtonJobActionDesignBanner
  {
    getDefinitions()
    {
      return TYPE_DEFINITIONS;
    }
  }

  function registerDesignJob(ns, JobClass)
  {
    const list = ns.ActionButtonDesignJobs || (ns.ActionButtonDesignJobs = []);
    if (list.indexOf(JobClass) === -1) {
      list.push(JobClass);
    }
  }

  const Services = w.Services = w.Services || {};
  const ButtonNS = Services.Button || (Services.Button = {});
  if (!ButtonNS.JobActionDesignBanner) {
    ButtonNS.JobActionDesignBanner = ButtonJobActionDesignBanner;
    registerDesignJob(ButtonNS, ButtonJobActionDesignBanner);
  }
})(window);
