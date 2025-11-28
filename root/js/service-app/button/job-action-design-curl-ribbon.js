// js/service-app/button/job-action-design-curl-ribbon.js
(function (w) {
  'use strict';

  const DESIGN_KEY = 'curl-ribbon';

  function createDefinition(key, config)
  {
    return Object.freeze({
      key: key,
      config: Object.freeze(Object.assign({
        designKey: DESIGN_KEY,
        baseClass: 'curl-ribbon-button',
        variantPrefix: Object.freeze(['curl-ribbon-button--']),
        type: 'button',
        srLabelClass: 'visually-hidden',
        hoverLabel: '',
        backgroundColor: '#eebe6f',
        backgroundOpacity: 1,
        borderColor: '#000000',
        borderWidth: '8px',
        iconHtml: [
          '<svg class="curl-ribbon-button__bg-shape" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 250"',
          '  aria-hidden="true" focusable="false">',
          '  <path d="M30 60',
          '       C 220 10 430 110 600 60',
          '       L 600 210',
          '       C 430 240 220 150 30 210',
          '       Z" fill="#eebe6f" stroke="#000000" stroke-width="8" stroke-linejoin="round"></path>',
          '</svg>'
        ].join(''),
        iconAriaHidden: true,
        labelHtml: '<span class="curl-ribbon-button__text">Curl ribbon</span>'
      }, config || {}))
    });
  }

  const TYPE_DEFINITIONS = Object.freeze([
    createDefinition('curl-ribbon')
  ]);

  class ButtonJobActionDesignCurlRibbon
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
  if (!ButtonNS.JobActionDesignCurlRibbon) {
    ButtonNS.JobActionDesignCurlRibbon = ButtonJobActionDesignCurlRibbon;
    registerDesignJob(ButtonNS, ButtonJobActionDesignCurlRibbon);
  }
})(window);
