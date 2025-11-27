// js/service-app/button/job-action-design-pill-button.js
(function (w) {
  'use strict';

  const DESIGN_KEY = 'pill-button';

  function createDefinition(key, config)
  {
    return Object.freeze({
      key: key,
      config: Object.freeze(Object.assign({
        designKey: DESIGN_KEY,
        baseClass: 'btn',
        variantPrefix: Object.freeze([]),
        type: 'button',
        hoverLabel: ''
      }, config || {}))
    });
  }

  const TYPE_DEFINITIONS = Object.freeze([
    createDefinition('pill-button'),
    createDefinition('pill-button/outline', {
      baseClass: 'btn btn--ghost'
    })
  ]);

  class ButtonJobActionDesignPillButton
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
  if (!ButtonNS.JobActionDesignPillButton) {
    ButtonNS.JobActionDesignPillButton = ButtonJobActionDesignPillButton;
    registerDesignJob(ButtonNS, ButtonJobActionDesignPillButton);
  }
})(window);
