(function ()
{
  'use strict';

  class JobRequest
  {
    constructor(service)
    {
      this.service = service;
    }

    async send(values)
    {
      const payload = {
        userName: values.name,
        userMail: values.mail,
        legend: values.message
      };
      const request = window.Utils.requestApi('System', 'SiteContact', payload);
      const response = await this._resolvePromise(request);
      const status = response && response.status ? String(response.status).toUpperCase() : '';
      if (status !== 'OK')
      {
        const reason = response && response.reason ? response.reason : 'request_failed';
        const error = new Error('Contact request failed');
        error.payload = response;
        error.reason = reason;
        throw error;
      }
      return response;
    }

    _resolvePromise(p)
    {
      if (p && typeof p.then === 'function' && typeof p.catch === 'function')
      {
        return p;
      }
      if (p && typeof p.then === 'function')
      {
        return new Promise(function (resolve, reject) { p.then(resolve, reject); });
      }
      if (p && typeof p.done === 'function')
      {
        return new Promise(function (resolve, reject) { p.done(resolve).fail(reject); });
      }
      return Promise.resolve(p);
    }
  }

  window.Services = window.Services || {};
  window.Services.Contact = window.Services.Contact || {};
  window.Services.Contact.JobRequest = JobRequest;
})(window);
