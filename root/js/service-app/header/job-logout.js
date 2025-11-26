(function ()
 {
   'use strict';
   
   class HeaderJobLogout
   {
     constructor(serviceInstance)
     {
       this.serviceInstance = serviceInstance;
     }

    handleLogout(options)
    {
      const cfg = options && options.logout ? options.logout : {};
     return this.performLogoutRequest(cfg).catch(function () {
        return null;
      }).then(() => {
        return this.clearSessionState();
      }).finally(() => {
        this._storeLogoutNoticeFlag();
        this.redirectAfterLogout(cfg);
      });
    }
   
     redirectAfterLogout(options)
     {
       const cfg = this.resolveLogoutOptions(options || {});
       const target = cfg.redirectUrl || '/login.html';
       if (!target)
       {
         return;
       }
       try
       {
         if (window.location && typeof window.location.replace === 'function')
         {
           window.location.replace(target);
         }
         else if (window.location)
         {
           window.location.href = target;
         }
       }
       catch (_err)
       {
         try
         {
           window.location.href = target;
         }
         catch (_err2) {}
       }
     }

     clearSessionState()
     {
       if (this.sessionInstance && typeof this.sessionInstance.setUser === 'function')
       {
         try
         {
           return Promise.resolve(this.sessionInstance.setUser(null)).catch(function () {
             return null;
           });
         }
         catch (_err)
         {
           return Promise.resolve();
         }
       }
       if (window.ServicesGeneral
           && window.ServicesGeneral.session
           && typeof window.ServicesGeneral.session.clearStorage === 'function')
       {
         try
         {
           window.ServicesGeneral.session.clearStorage(null);
         }
         catch (_e) {}
       }
       return Promise.resolve();
     }
     
     performLogoutRequest(options)
     {
       const cfg = this.resolveLogoutOptions(options || {});
       const method = cfg.method || 'POST';
       const endpoint = cfg.endpoint;
       const payload = {
         requestType: cfg.requestType,
         type: cfg.type
       };
       if (typeof cfg.token === 'string' && cfg.token.length > 0)
       {
         payload.token = cfg.token;
       }
       if (cfg.params && typeof cfg.params === 'object')
       {
         Object.keys(cfg.params).forEach((key) =>
                                         {
                                           payload[key] = cfg.params[key];
                                         });
       }

       const canUseFetch = typeof window.fetch === 'function' && typeof window.FormData === 'function';
       if (canUseFetch)
       {
         const formData = new window.FormData();
         Object.keys(payload).forEach((key) =>
                                      {
                                        if (typeof payload[key] === 'undefined' || payload[key] === null)
                                        {
                                          return;
                                        }
                                        formData.append(key, payload[key]);
                                      });
         const requestInit = {
           method: method,
           credentials: 'include',
           body: formData,
           cache: 'no-store'
         };
         return window.fetch(endpoint, requestInit).catch(function ()
                                                     {
                                                       return Promise.resolve();
                                                     });
       }

       if (typeof $ === 'function' && typeof $.ajax === 'function')
       {
         return new Promise(function (resolve)
                            {
                              $.ajax({
                                url: endpoint,
                                method: method,
                                data: payload,
                                xhrFields: { withCredentials: true }
                              }).always(function ()
                                        {
                                          resolve();
                                        });
                            });
       }

       return Promise.resolve();
     }

    resolveLogoutOptions(raw)
    {
      const src = raw && typeof raw === 'object' ? raw : {};
      const merged = Object.assign({}, src);
      merged.endpoint = window.Utils.getApiEndpoint();
      merged.method = 'POST';
      merged.requestType = 'Session';
      merged.type = 'Logout';
      merged.redirectUrl = '/login.html';
      return merged;
    }
     
    _storeLogoutNoticeFlag()
    {
      const storage = window.sessionStorage;
      if (!storage || typeof storage.setItem !== 'function')
      {
        return;
      }
      try
      {
        storage.setItem('advanced:logout-notice', '1');
      }
      catch (_err) {}
    }
  }
   
  // Services.header 名前空間の直下に公開（再定義ガード付き）
  var Services = window.Services = window.Services || {};
  var NS = Services.header || (Services.header = {});
  NS.JobLogout = NS.JobLogout || HeaderJobLogout;

})(window);
