// js/service-app/button/job-action-design-expandable-icon-button.js
(function (w) {
  'use strict';

  const DESIGN_KEY = 'expandable-icon-button';

  function createDefinition(key, config)
  {
    return Object.freeze({
      key: key,
      config: Object.freeze(Object.assign({
        designKey: DESIGN_KEY,
        baseClass: 'target-management__icon-button',
        variantPrefix: Object.freeze([]),
        srLabelClass: 'target-management__icon-label',
        hoverLabel: ''
      }, config || {}))
    });
  }

  const EXPANDABLE_BUTTON_ICONS = Object.freeze({
    add: [
      '<span class="target-management__icon" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
      '<circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></circle>',
      '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v7.5m-3.75-3.75h7.5"></path>',
      '</svg>',
      '</span>'
    ].join(''),
    reload: [
      '<span class="target-management__icon" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
      '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3.75 12a8.25 8.25 0 0 1 13.44-6.13"></path>',
      '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M20.25 4.75v4.5h-4.5"></path>',
      '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M20.25 12a8.25 8.25 0 0 1-13.44 6.13"></path>',
      '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3.75 19.25v-4.5h4.5"></path>',
      '</svg>',
      '</span>'
    ].join('')
  });

  const TYPE_DEFINITIONS = Object.freeze([
    createDefinition('expandable-icon-button/add', {
      baseClass: 'target-management__icon-button target-management__icon-button--primary',
      iconHtml: EXPANDABLE_BUTTON_ICONS.add,
      hoverLabel: 'レビューを追加',
      srLabelClass: 'target-management__icon-label',
      fallbackLabel: 'レビューを追加'
    }),
    createDefinition('expandable-icon-button/reload', {
      baseClass: 'target-management__icon-button target-management__icon-button--ghost',
      iconHtml: EXPANDABLE_BUTTON_ICONS.reload,
      hoverLabel: '再読み込み',
      srLabelClass: 'target-management__icon-label',
      fallbackLabel: '再読み込み'
    })
  ]);

  class ButtonJobActionDesignExpandableIconButton
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
  if (!ButtonNS.JobActionDesignExpandableIconButton) {
    ButtonNS.JobActionDesignExpandableIconButton = ButtonJobActionDesignExpandableIconButton;
    registerDesignJob(ButtonNS, ButtonJobActionDesignExpandableIconButton);
  }
})(window);
