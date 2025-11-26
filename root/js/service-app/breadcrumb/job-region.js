(function () {

  'use strict';

  class JobRegion
  {
    constructor(service)
    {
      this.service = service;
    }

    resolveContainer(target)
    {
      if (!target)
      {
        return document.querySelector('.screen-page') || document.body;
      }
      if (typeof target === 'string')
      {
        return document.querySelector(target);
      }
      if (target && target.nodeType === 1)
      {
        return target;
      }
      return document.querySelector('.screen-page') || document.body;
    }

    ensureWrapper(container, ariaLabel)
    {
      const root = this.resolveContainer(container);
      if (!root)
      {
        return { wrapper: null, list: null };
      }
      let wrapper = root.querySelector('.screen-breadcrumbs');
      let list = wrapper ? wrapper.querySelector('.screen-breadcrumbs__list') : null;
      if (!wrapper)
      {
        wrapper = document.createElement('nav');
        wrapper.className = 'screen-breadcrumbs';
        wrapper.setAttribute('aria-label', ariaLabel || 'パンくずリスト');
        wrapper.setAttribute('data-breadcrumb-service', 'mounted');
        list = document.createElement('ol');
        list.className = 'screen-breadcrumbs__list';
        wrapper.appendChild(list);
        if (root.firstChild)
        {
          root.insertBefore(wrapper, root.firstChild);
        }
        else
        {
          root.appendChild(wrapper);
        }
      }
      else
      {
        wrapper.setAttribute('aria-label', ariaLabel || 'パンくずリスト');
        wrapper.setAttribute('data-breadcrumb-service', 'mounted');
        if (!list)
        {
          list = document.createElement('ol');
          list.className = 'screen-breadcrumbs__list';
          wrapper.appendChild(list);
        }
      }
      return { wrapper: wrapper, list: list };
    }
  }

  const Services = window.Services = window.Services || {};
  const NS = Services.Breadcrumb || (Services.Breadcrumb = {});
  NS.JobRegion = NS.JobRegion || JobRegion;

}());
