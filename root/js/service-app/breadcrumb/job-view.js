(function () {

  'use strict';

  class JobView
  {
    constructor(service)
    {
      this.service = service;
    }

    normalizeItems(items)
    {
      if (!Array.isArray(items))
      {
        return [];
      }
      return items.map(function (item)
                      {
                        if (typeof item === 'string')
                        {
                          return { label: item };
                        }
                        if (!item || typeof item !== 'object')
                        {
                          return { label: '' };
                        }
                        return {
                          label: item.label || item.text || '',
                          href: typeof item.href === 'string' ? item.href : '',
                          current: Object.prototype.hasOwnProperty.call(item, 'current') ? item.current : undefined
                        };
                      });
    }

    truncateLabel(text, maxLength)
    {
      const label = String(text == null ? '' : text);
      const limit = Number(maxLength);
      if (!limit || label.length <= limit)
      {
        return { text: label, tooltip: '' };
      }
      const sliceLength = limit > 1 ? limit - 1 : limit;
      const truncated = label.slice(0, sliceLength) + '…';
      return { text: truncated, tooltip: label };
    }

    renderList(list, items, config)
    {
      if (!list)
      {
        return;
      }
      while (list.firstChild)
      {
        list.removeChild(list.firstChild);
      }
      const normalized = this.normalizeItems(items);
      const count = normalized.length;
      const maxLength = config && config.maxLabelLength;
      for (let i = 0; i < count; i += 1)
      {
        const entry = normalized[i];
        const li = document.createElement('li');
        li.className = 'screen-breadcrumbs__item';
        const isCurrent = typeof entry.current === 'boolean' ? entry.current : (i === count - 1);
        if (isCurrent)
        {
          li.setAttribute('aria-current', 'page');
        }
        else
        {
          li.removeAttribute('aria-current');
        }
        const truncated = this.truncateLabel(entry.label, maxLength);
        if (!isCurrent && entry.href)
        {
          const link = document.createElement('a');
          link.href = entry.href;
          link.textContent = truncated.text || '';
          if (truncated.tooltip)
          {
            link.setAttribute('title', truncated.tooltip);
          }
          else
          {
            link.removeAttribute('title');
          }
          li.appendChild(link);
        }
        else
        {
          li.textContent = truncated.text || '';
          if (truncated.tooltip)
          {
            li.setAttribute('title', truncated.tooltip);
          }
          else
          {
            li.removeAttribute('title');
          }
        }
        list.appendChild(li);
      }
      const wrapper = list.parentNode;
      if (wrapper && wrapper.classList)
      {
        if (count === 0)
        {
          wrapper.setAttribute('hidden', 'hidden');
        }
        else
        {
          wrapper.removeAttribute('hidden');
        }
      }
    }
  }

  const Services = window.Services = window.Services || {};
  const NS = Services.Breadcrumb || (Services.Breadcrumb = {});
  NS.JobView = NS.JobView || JobView;

}());
