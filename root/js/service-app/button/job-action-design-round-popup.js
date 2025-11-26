// js/service-app/button/job-action-design-round-popup.js
(function (w) {
  'use strict';

  const DESIGN_KEY = 'round-popup';

  function createDefinition(key, config)
  {
    return Object.freeze({
      key: key,
      config: Object.freeze(Object.assign({
        designKey: DESIGN_KEY
      }, config || {}))
    });
  }

  const EYE_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2.5 12s3.25-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.25 5.5-9.5 5.5S2.5 12 2.5 12z"></path>',
    '<circle cx="12" cy="12" r="2.75" fill="none" stroke="currentColor" stroke-width="1.5"></circle>',
    '<circle cx="12" cy="12" r="1.25" fill="currentColor"></circle>',
    '</svg>'
  ].join('');

  const STATISTICS_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M4.75 18.75h14.5"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M7.25 18.25v-4.5"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 18.25v-8.5"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M16.75 18.25v-6"></path>',
    '</svg>'
  ].join('');

  const LINK_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M9.5 14.5 6.5 17.5a3 3 0 0 1-4.24-4.24l3-3"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M14.5 9.5l3-3a3 3 0 0 1 4.24 4.24l-3 3"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m8.75 15.25 6.5-6.5"></path>',
    '</svg>'
  ].join('');

  const MEMBERS_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M7.75 11.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M16.25 12.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3.75 18.5c0-2.63 2.37-4.75 5.25-4.75 2.28 0 3.81 1.02 4.7 2.61"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M13.75 18.5c0-1.94 1.53-3.5 3.5-3.5 1.97 0 3.5 1.56 3.5 3.5"></path>',
    '</svg>'
  ].join('');

  const SUBMIT_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
    '  d="M4.5 12.75 19.25 6.5 12.5 19.5l-.75-5-4 2.25z"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M11.75 13.5 19.25 6.5"></path>',
    '</svg>'
  ].join('');

  const CHECK_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m9.25 12.25 1.75 1.75 3.75-4.25"></path>',
    '</svg>'
  ].join('');

  const OPEN_LINK_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M13.5 5.5h5v5"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m13.75 10.25 4.75-4.75"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M11 7H6.75A1.75 1.75 0 0 0 5 8.75v8.5A1.75 1.75 0 0 0 6.75 19h8.5A1.75 1.75 0 0 0 17 17.25V13"></path>',
    '</svg>'
  ].join('');

  const TYPE_DEFINITIONS = Object.freeze([
    createDefinition('add', {
      variant: 'add',
      iconHtml: [
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
        '<circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle>',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v7.5m-3.75-3.75h7.5"></path>',
        '</svg>'
      ].join(''),
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('execute', {
      variant: 'execute',
      iconHtml: SUBMIT_ICON_HTML,
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('select', {
      variant: 'select',
      iconHtml: CHECK_ICON_HTML,
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('manual-run', {
      variant: 'manual-run',
      iconHtml: [
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"',
        '  d="M9.5 7.5v9l6.5-4.5z"></path>',
        '</svg>'
      ].join(''),
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('download', {
      variant: 'download',
      iconHtml: [
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
        '  d="M6 17.25h12m-6-10.5v9m0 0 3.25-3.25M12 15.75 8.75 12.5"></path>',
        '</svg>'
      ].join(''),
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('proxy', {
      variant: 'proxy',
      iconHtml: [
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
        '<rect x="3.75" y="4.75" width="16.5" height="11.5" rx="1.75" ry="1.75"',
        '  fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></rect>',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
        '  d="M10.25 9.25v4l3.5-2z"></path>',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
        '  d="M12 16.25v3m0 0-1.75-1.75M12 19.25l1.75-1.75"></path>',
        '</svg>'
      ].join(''),
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('statistics', {
      variant: 'statistics',
      iconHtml: STATISTICS_ICON_HTML,
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('usage', {
      variant: 'statistics',
      iconHtml: LINK_ICON_HTML,
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('detail', {
      variant: 'detail',
      iconHtml: EYE_ICON_HTML,
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('open-link', {
      variant: 'detail',
      iconHtml: OPEN_LINK_ICON_HTML,
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('preview', {
      variant: 'preview',
      iconHtml: EYE_ICON_HTML,
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('round-popup/members', {
      variant: 'members',
      iconHtml: MEMBERS_ICON_HTML,
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('edit', {
      variant: 'edit',
      iconHtml: [
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
        '  d="M4 20h3.5L19 8.5a2.12 2.12 0 0 0 0-3L18.5 5a2.12 2.12 0 0 0-3 0L6.5 14.5 4 20z"></path>',
        '<path fill="currentColor" d="m14.75 6.25 3 3 .88-.88a1 1 0 0 0 0-1.42L17.05 4.3a1 1 0 0 0-1.41 0z"></path>',
        '</svg>'
      ].join(''),
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('delete', {
      variant: 'delete',
      iconHtml: [
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
        '  d="M4.5 6.75h15M9.5 4.5h5a1 1 0 0 1 1 1v1.25H8.5V5.5a1 1 0 0 1 1-1zm9 2.25v12A1.5 1.5 0 0 1 17 20.5H7a1.5 1.5 0 0 1-1.5-1.5v-12m4 4v6m3-6v6"></path>',
        '</svg>'
      ].join(''),
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('remove', {
      variant: 'delete',
      iconHtml: [
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
        '<circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></circle>',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M8.25 12h7.5"></path>',
        '</svg>'
      ].join(''),
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('up', {
      variant: 'up',
      iconHtml: [
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m7.5 13.75 4.5-4.5 4.5 4.5"></path>',
        '</svg>'
      ].join(''),
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('down', {
      variant: 'down',
      iconHtml: [
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m7.5 10.25 4.5 4.5 4.5-4.5"></path>',
        '</svg>'
      ].join(''),
      srLabelClass: 'visually-hidden'
    }),
    createDefinition('mail-check', {
      variant: 'mail-check',
      iconHtml: [
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
        '  d="M3.75 6.5A1.75 1.75 0 0 1 5.5 4.75h8.75a1.75 1.75 0 0 1 1.75 1.75v3.25L10 12.75 3.75 9.75z"></path>',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
        '  d="M3.75 9.25V17.5A1.75 1.75 0 0 0 5.5 19.25h8.75"></path>',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m13 6 3.25 2.5"></path>',
        '<circle cx="17.75" cy="16.25" r="4" fill="none" stroke="currentColor" stroke-width="1.5"></circle>',
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m16.1 16.25 1.3 1.3 2.15-2.6"></path>',
        '</svg>'
      ].join(''),
      srLabelClass: 'visually-hidden'
    })
  ]);

  class ButtonJobActionDesignRoundPopup
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
  if (!ButtonNS.JobActionDesignRoundPopup) {
    ButtonNS.JobActionDesignRoundPopup = ButtonJobActionDesignRoundPopup;
    registerDesignJob(ButtonNS, ButtonJobActionDesignRoundPopup);
  }
})(window);
