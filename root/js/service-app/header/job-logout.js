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
      const finishLogout = () => {
        this._storeLogoutNoticeFlag();
        this.redirectAfterLogout(cfg);
      };

      return this.performLogoutRequest(cfg)
        .catch(function ()
        {
          return null;
        })
        .then(() =>
        {
          return this.clearSessionState();
        })
        .then(() =>
        {
          return this.clearCaches();
        })
        .then(finishLogout, finishLogout);
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

    clearCaches()
    {
      if (!window.caches || typeof window.caches.keys !== 'function')
      {
        return Promise.resolve();
      }
      try
      {
        return window.caches.keys().then(function (keys)
                                      {
                                        return Promise.all(keys.map(function (name)
                                                                    {
                                                                      return window.caches.delete(name);
                                                                    }));
                                      }).catch(function ()
                                                {
                                                  return null;
                                                });
      }
      catch (_err)
      {
        return Promise.resolve();
      }
    }
     
    performLogoutRequest(options)
    {
      const cfg = this.resolveLogoutOptions(options || {});
      const params = cfg.params && typeof cfg.params === 'object' ? cfg.params : {};
      const overrides =
      {
        url: cfg.endpoint,
        type: cfg.method,
        xhrFields: { withCredentials: true }
      };
      return window.Utils.requestApi(cfg.requestType, cfg.type, params, overrides);
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
