// js/service-app/button/job-action-design-translucent-rounded.js
(function (w) {
  'use strict';

  const DESIGN_KEY = 'translucent-rounded';
  const BASE_CLASS = 'mock-avatar__upload-btn';

  function normalizeVariantPrefix(value)
  {
    if (!value) {
      return Object.freeze([]);
    }
    if (Array.isArray(value)) {
      return Object.freeze(value.filter(Boolean));
    }
    if (typeof value === 'string' && value.trim()) {
      return Object.freeze([value.trim()]);
    }
    return Object.freeze([]);
  }

  function freezeMap(value)
  {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    var clone = {};
    Object.keys(value).forEach(function (key) {
      clone[key] = value[key];
    });
    return Object.freeze(clone);
  }

  function createDefinition(key, extraClass, overrides)
  {
    var className = BASE_CLASS;
    if (extraClass && typeof extraClass === 'string') {
      className = BASE_CLASS + ' ' + extraClass;
    }
    var config = {
      designKey: DESIGN_KEY,
      baseClass: className,
      variantPrefix: [],
      type: 'button'
    };
    if (overrides && typeof overrides === 'object') {
      Object.keys(overrides).forEach(function (prop) {
        config[prop] = overrides[prop];
      });
    }
    config.variantPrefix = normalizeVariantPrefix(config.variantPrefix);
    if (config.attributes) {
      config.attributes = freezeMap(config.attributes);
    }
    if (config.dataset) {
      config.dataset = freezeMap(config.dataset);
    }
    return Object.freeze({
      key: key,
      config: Object.freeze(config)
    });
  }

  const TYPE_DEFINITIONS = Object.freeze([
    createDefinition('account-settings-mail-send'),
    createDefinition('account-settings-mail-verify', 'mock-avatar__upload-btn--secondary-action'),
    createDefinition('account-settings-avatar-choose'),
    createDefinition('account-settings-avatar-reset', 'mock-avatar__upload-btn--secondary'),
    createDefinition('queue-error-detail', 'queue-table__error-detail-button'),
    createDefinition('queue-status', 'queue-status queue-table__status-label', {
      elementTag: 'span',
      variantPrefix: ['queue-status--']
    }),
    createDefinition('content-bitrate', 'content-item__bitrate-badge', {
      elementTag: 'span'
    }),
    createDefinition('target-detail-status', 'target-detail__status-button target-detail__badge', {
      elementTag: 'span',
      variantPrefix: ['target-detail__badge--status-']
    }),
    createDefinition('target-assignees-all', 'target-table__assignees-all'),
    createDefinition('announcement-required', 'announcement-management__required-indicator', {
      elementTag: 'span'
    }),
    createDefinition('survey-required', 'survey-management__required-indicator', {
      elementTag: 'span'
    }),
    createDefinition('admin-users-mail-pending', 'user-table__mail-indicator', {
      elementTag: 'span',
      attributes: { 'data-mail-status': 'pending' }
    }),
    createDefinition('admin-users-mail-verified', 'mock-avatar__upload-btn--secondary-action user-table__mail-indicator', {
      elementTag: 'span',
      attributes: { 'data-mail-status': 'verified' }
    }),
    createDefinition('admin-users-role-supervisor', 'user-table__role-badge', {
      elementTag: 'span',
      variant: 'supervisor',
      variantPrefix: ['user-table__role-badge--'],
      dataset: { role: 'supervisor' }
    }),
    createDefinition('admin-users-role-operator', 'user-table__role-badge', {
      elementTag: 'span',
      variant: 'operator',
      variantPrefix: ['user-table__role-badge--'],
      dataset: { role: 'operator' }
    })
  ]);

  class ButtonJobActionDesignTranslucentRounded
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
  if (!ButtonNS.JobActionDesignTranslucentRounded) {
    ButtonNS.JobActionDesignTranslucentRounded = ButtonJobActionDesignTranslucentRounded;
    registerDesignJob(ButtonNS, ButtonJobActionDesignTranslucentRounded);
  }
})(window);
