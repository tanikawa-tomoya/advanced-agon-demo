(function () {

  'use strict';

  class JobContent
  {
    constructor(service)
    {
      this.service = service;
    }

    buildContentVideoUrl(apiConfig, params)
    {
      var config = apiConfig || {};
      var requestType = config.requestType || '';
      var apiToken = config.apiToken || '';
      var apiEndpoint = config.apiEndpoint || '';
      var contentCode = params && params.contentCode;
      var quality = params && params.quality;

      if (!apiEndpoint || !contentCode)
      {
        return '';
      }

      var queryParams = [
        ['requestType', requestType],
        ['type', 'ContentVideoGet'],
        ['token', apiToken],
        ['contentCode', contentCode]
      ];
      if (quality)
      {
        queryParams.push(['quality', quality]);
      }
      var query = queryParams
        .map(function (entry)
        {
          return encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1]);
        })
        .join('&');
      return apiEndpoint + '?' + query;
    }

    async fetchContentRecord(apiConfig, params)
    {
      var payload = {};
      if (params && params.userCode)
      {
        payload.userCode = params.userCode;
      }
      if (params && params.contentCode)
      {
        payload.contentCode = params.contentCode;
      }
      var response = await window.Utils.requestApi(apiConfig.requestType || 'Contents', 'ContentList', payload);
      var items = [];
      var result = response && response.result ? response.result : null;

      if (Array.isArray(response))
      {
        items = response;
      }
      else if (response && Array.isArray(response.items))
      {
        items = response.items;
      }
      else if (result && Array.isArray(result.items))
      {
        items = result.items;
      }
      else if (result && Array.isArray(result.contents))
      {
        items = result.contents;
      }

      var code = params && params.contentCode ? String(params.contentCode) : '';
      for (var i = 0; i < items.length; i += 1)
      {
        var item = items[i];
        if (item && String(item.contentCode) === code)
        {
          return item;
        }
      }
      return null;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.MultiVideoModal || (Services.MultiVideoModal = {});
  NS.JobContent = NS.JobContent || JobContent;

})(window, document);
