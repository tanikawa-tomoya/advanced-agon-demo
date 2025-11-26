(function () {

  'use strict';

  class JobBitrate
  {
    constructor(service, buttonService)
    {
      this.service = service;
      this.buttonService = buttonService;
    }

    normalizeNumber(value)
    {
      if (typeof value === 'number')
      {
        return Number.isFinite(value) ? value : 0;
      }
      if (typeof value === 'string')
      {
        var trimmed = value.trim();
        var n = Number(trimmed);
        if (Number.isFinite(n))
        {
          return n;
        }
        var match = /^([0-9]+(?:\.[0-9]+)?)([kKmMgG])?$/.exec(trimmed.replace(/\s+/g, ''));
        if (match)
        {
          var base = Number(match[1]);
          if (!Number.isFinite(base))
          {
            return 0;
          }
          var unit = match[2] ? match[2].toLowerCase() : '';
          if (unit === 'k')
          {
            return base * 1000;
          }
          if (unit === 'm')
          {
            return base * 1000 * 1000;
          }
          if (unit === 'g')
          {
            return base * 1000 * 1000 * 1000;
          }
          return base;
        }
        return 0;
      }
      return 0;
    }

    formatBitrate(bps)
    {
      var rate = this.normalizeNumber(bps);
      if (rate <= 0)
      {
        return '';
      }
      var units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
      var unitIndex = 0;
      var value = rate;
      while (value >= 1000 && unitIndex < units.length - 1)
      {
        value = value / 1000;
        unitIndex += 1;
      }
      var fixed = unitIndex === 0 ? value.toFixed(0) : (value >= 10 ? value.toFixed(0) : value.toFixed(1));
      return fixed + ' ' + units[unitIndex];
    }

    normalizeProxyList(record)
    {
      if (!record || !Array.isArray(record.proxyList))
      {
        return [];
      }
      var list = record.proxyList.slice();
      for (var i = 0; i < list.length; i += 1)
      {
        if (!list[i])
        {
          continue;
        }
        list[i].bitrate = this.normalizeNumber(list[i].bitrate);
      }
      return list;
    }

    hasProxyList(record)
    {
      return record && Array.isArray(record.proxyList) && record.proxyList.length > 0;
    }

    buildVariantList(spec, contentRecord, fallbackSrc)
    {
      var contentCode = spec && spec.contentCode ? String(spec.contentCode) : '';
      var variants = [];
      var baseBitrate = contentRecord ? this.normalizeNumber(contentRecord.bitrate) : 0;
      var baseSrc = fallbackSrc || this.service.getContentVideoUrl(spec);
      variants.push({
        key: 'original',
        requestQuality: '',
        bitrate: baseBitrate,
        label: this.formatBitrate(baseBitrate),
        src: baseSrc,
        proxyId: ''
      });

      var proxyList = this.normalizeProxyList(contentRecord);
      for (var i = 0; i < proxyList.length; i += 1)
      {
        var proxy = proxyList[i];
        if (!proxy)
        {
          continue;
        }
        var bitrate = this.normalizeNumber(proxy.bitrate);
        var qualityKey = bitrate > 0 ? String(bitrate) : ('proxy-' + (i + 1));
        var url = this.service.jobs.content.buildContentVideoUrl(this.service.config.api, {
          contentCode: contentCode,
          quality: qualityKey
        });
        variants.push({
          key: qualityKey,
          requestQuality: qualityKey,
          bitrate: bitrate,
          label: this.formatBitrate(bitrate),
          src: url,
          proxyId: this.resolveProxyId(proxy)
        });
      }
      return variants;
    }

    pickInitialVariant(variants, requestedQuality, requestedProxyId)
    {
      if (!Array.isArray(variants) || variants.length === 0)
      {
        return null;
      }
      var normalizedProxyId = typeof requestedProxyId === 'string' || typeof requestedProxyId === 'number'
        ? String(requestedProxyId)
        : '';
      if (normalizedProxyId)
      {
        for (var p = 0; p < variants.length; p += 1)
        {
          if (variants[p] && variants[p].proxyId !== undefined && String(variants[p].proxyId) === normalizedProxyId)
          {
            return variants[p];
          }
        }
      }
      var normalized = typeof requestedQuality === 'string' ? requestedQuality.trim() : '';
      if (normalized)
      {
        for (var i = 0; i < variants.length; i += 1)
        {
          if (variants[i] && variants[i].key === normalized)
          {
            return variants[i];
          }
        }
      }

      if (normalized === 'low' && variants.length > 1)
      {
        var sorted = variants.slice().sort(function (a, b) { return this.normalizeNumber(a.bitrate) - this.normalizeNumber(b.bitrate); }.bind(this));
        return sorted[0];
      }
      return variants[0];
    }

    normalizeContentId(value)
    {
      if (value === undefined || value === null)
      {
        return '';
      }
      return String(value);
    }

    resolveProxyId(proxy)
    {
      if (!proxy)
      {
        return '';
      }
      var candidates = [proxy.id, proxy.usersContentsProxyId, proxy.usersContentsProxyID];
      for (var i = 0; i < candidates.length; i += 1)
      {
        if (candidates[i] !== undefined && candidates[i] !== null)
        {
          return String(candidates[i]);
        }
      }
      return '';
    }

    filterDatasetProxies(record, proxies)
    {
      var matched = [];
      var candidates = [
        this.normalizeContentId(record && record.contentCode),
        this.normalizeContentId(record && record.id),
        this.normalizeContentId(record && record.usersContentsId),
        this.normalizeContentId(record && record.usersContentsID)
      ];
      var list = Array.isArray(proxies) ? proxies : [];
      for (var i = 0; i < list.length; i += 1)
      {
        var proxy = list[i];
        if (!proxy)
        {
          continue;
        }
        var proxyCandidates = [
          this.normalizeContentId(proxy.usersContentsId),
          this.normalizeContentId(proxy.usersContentsID),
          this.normalizeContentId(proxy.contentCode),
          this.normalizeContentId(proxy.contentId)
        ];
        var matchedContent = false;
        for (var c = 0; c < candidates.length; c += 1)
        {
          var key = candidates[c];
          if (!key)
          {
            continue;
          }
          for (var pc = 0; pc < proxyCandidates.length; pc += 1)
          {
            if (proxyCandidates[pc] && proxyCandidates[pc] === key)
            {
              matchedContent = true;
              break;
            }
          }
          if (matchedContent)
          {
            break;
          }
        }
        if (matchedContent)
        {
          matched.push(proxy);
        }
      }
      return matched;
    }

    findDatasetRecord(spec, dataset)
    {
      var hasDataset = dataset && (Array.isArray(dataset.usersContents) || Array.isArray(dataset.usersContentsProxy));
      if (!hasDataset)
      {
        return null;
      }
      var contentCode = spec && spec.contentCode ? String(spec.contentCode) : '';
      if (!contentCode)
      {
        return null;
      }
      var contents = Array.isArray(dataset.usersContents) ? dataset.usersContents : [];
      var record = null;
      for (var i = 0; i < contents.length; i += 1)
      {
        var entry = contents[i];
        var entryCode = this.normalizeContentId(entry && (entry.contentCode || entry.id));
        if (entryCode && entryCode === contentCode)
        {
          record = Object.assign({}, entry);
          break;
        }
      }
      if (!record)
      {
        return null;
      }
      var proxies = this.filterDatasetProxies(record, dataset.usersContentsProxy);
      var baseList = Array.isArray(record.proxyList) ? record.proxyList.slice() : [];
      record.proxyList = baseList.concat(proxies);
      return record;
    }

    async loadVariants(spec, fallbackSrc, dataset, providedRecord)
    {
      var record = providedRecord || this.findDatasetRecord(spec, dataset) || null;
      var fetchedRecord = null;
      var shouldFetch = !record || !this.hasProxyList(record);
      if (shouldFetch)
      {
        try
        {
          fetchedRecord = await this.service.jobs.content.fetchContentRecord(this.service.config.api, spec);
        }
        catch (_err)
        {
          fetchedRecord = null;
        }
      }
      if (fetchedRecord)
      {
        record = record ? Object.assign({}, fetchedRecord, record) : fetchedRecord;
      }
      return this.buildVariantList(spec, record, fallbackSrc);
    }

    createActions(variants, activeKey)
    {
      if (!Array.isArray(variants) || variants.length === 0)
      {
        return null;
      }
      var container = document.createElement('div');
      container.className = this.service.CSS.actions;

      for (var i = 0; i < variants.length; i += 1)
      {
        var variant = variants[i];
        if (!variant || !variant.src)
        {
          continue;
        }
        var ariaLabel = variant.label ? ('ビットレート ' + variant.label) : 'ビットレートを切り替え';
        var btn = this.buttonService.createActionButton('content-bitrate', {
          label: variant.label,
          ariaLabel: ariaLabel,
          elementTag: 'button',
          type: 'button'
        });
        btn.classList.add(this.service.CSS.bitrateButton);
        btn.setAttribute('data-bitrate-key', variant.key);
        if (activeKey && variant.key === activeKey)
        {
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
        }
        else
        {
          btn.setAttribute('aria-pressed', 'false');
        }
        container.appendChild(btn);
      }
      return container;
    }

    bindActions(container, videoEl, variants, initialKey, autoplay)
    {
      if (!container || !videoEl)
      {
        return function () {};
      }
      var self = this;
      var currentKey = initialKey;
      var handler = function (event)
      {
        var target = event.target;
        while (target && target !== container)
        {
          if (target.hasAttribute('data-bitrate-key'))
          {
            break;
          }
          target = target.parentNode;
        }
        if (!target || target === container)
        {
          return;
        }
        var key = target.getAttribute('data-bitrate-key');
        if (!key || key === currentKey)
        {
          return;
        }
        var variant = self.findVariant(variants, key);
        if (!variant || !variant.src)
        {
          return;
        }
        currentKey = key;
        self.updateActive(container, key);
        self.switchSource(videoEl, variant, autoplay);
      };
      container.addEventListener('click', handler, true);
      return function () { container.removeEventListener('click', handler, true); };
    }

    updateActive(container, key)
    {
      var buttons = container.querySelectorAll('[data-bitrate-key]');
      for (var i = 0; i < buttons.length; i += 1)
      {
        var btn = buttons[i];
        var active = btn.getAttribute('data-bitrate-key') === key;
        if (active)
        {
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
        }
        else
        {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-pressed', 'false');
        }
      }
    }

    findVariant(list, key)
    {
      if (!Array.isArray(list))
      {
        return null;
      }
      for (var i = 0; i < list.length; i += 1)
      {
        if (list[i] && list[i].key === key)
        {
          return list[i];
        }
      }
      return null;
    }

    switchSource(videoEl, variant, autoplay)
    {
      var currentTime = 0;
      var wasPlaying = false;
      try
      {
        currentTime = videoEl.currentTime || 0;
        wasPlaying = !videoEl.paused && !videoEl.ended;
      }
      catch (_err) {}

      var resume = autoplay || wasPlaying;
      var handled = false;
      var onLoaded = function ()
      {
        if (handled)
        {
          return;
        }
        handled = true;
        videoEl.removeEventListener('loadedmetadata', onLoaded, true);
        videoEl.removeEventListener('canplay', onLoaded, true);
        try
        {
          if (currentTime > 0)
          {
            videoEl.currentTime = currentTime;
          }
          if (resume)
          {
            var playPromise = videoEl.play();
            if (playPromise && typeof playPromise.catch === 'function')
            {
              playPromise.catch(function () {});
            }
          }
        }
        catch (_err2) {}
      };

      videoEl.addEventListener('loadedmetadata', onLoaded, true);
      videoEl.addEventListener('canplay', onLoaded, true);
      try
      {
        videoEl.pause();
      }
      catch (_err3) {}
      videoEl.src = variant.src;
      videoEl.load();
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.MultiVideoModal || (Services.MultiVideoModal = {});
  NS.JobBitrate = NS.JobBitrate || JobBitrate;

})(window, document);
