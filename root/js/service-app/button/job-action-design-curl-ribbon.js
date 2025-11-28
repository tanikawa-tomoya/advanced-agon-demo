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
        backgroundColor: '#c13d36',
        backgroundOpacity: 0.9,
        borderColor: '#8f2622',
        borderWidth: '2px',
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
    console.log('[ButtonJobActionDesignCurlRibbon] Registered curl-ribbon design job', {
      keys: TYPE_DEFINITIONS.map(function (definition) { return definition.key; })
    });
  }
})(window);
