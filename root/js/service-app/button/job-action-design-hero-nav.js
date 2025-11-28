// js/service-app/button/job-action-design-hero-nav.js
(function (w) {
  'use strict';

  const DESIGN_KEY = 'hero-nav';
  const BASE_CLASS = 'btn hero__nav-button hero__nav-button--tinted';
  const VARIANT_PREFIX = Object.freeze(['hero__nav-button--']);

  function createDefinition(key, config)
  {
    return Object.freeze({
      key: key,
      config: Object.freeze(Object.assign({
        designKey: DESIGN_KEY,
        baseClass: BASE_CLASS,
        variantPrefix: VARIANT_PREFIX
      }, config || {}))
    });
  }

  const TYPE_DEFINITIONS = Object.freeze([
    createDefinition('agon-index-nav-news', {
      fallbackLabel: '最新情報'
    }),
    createDefinition('agon-index-nav-about', {
      fallbackLabel: '阿含宗とは 理念と教学'
    }),
    createDefinition('agon-index-nav-videos', {
      fallbackLabel: '映像で見る 阿含の歩み'
    }),
    createDefinition('agon-index-nav-audio', {
      fallbackLabel: '音声で聴く 開祖著作'
    }),
    createDefinition('agon-index-nav-wellness', {
      fallbackLabel: '心と体の健康のために'
    })
  ]);

  class ButtonJobActionDesignHeroNav
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
  if (!ButtonNS.JobActionDesignHeroNav) {
    ButtonNS.JobActionDesignHeroNav = ButtonJobActionDesignHeroNav;
    registerDesignJob(ButtonNS, ButtonJobActionDesignHeroNav);
  }
})(window);
