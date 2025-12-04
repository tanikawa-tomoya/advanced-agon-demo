(function (window, document) {
  'use strict';

  class PwaDownloader
  {
    constructor(name)
    {
      this.name = name || 'pwa-downloader';
      this.path = '/pwa/downloader/js';
      this.jobs = null;
      this.services = {};
      this.selectorConfig = {
        queueBody: '[data-pwa-queue-body]',
        status: '[data-pwa-status]',
        updated: '[data-pwa-updated]',
        refreshButton: '[data-pwa-refresh]',
        panel: '[data-pwa-panel]',
        tabButtons: '[data-pwa-tab]',
        tabPanels: '[data-pwa-tab-panel]'
      };
      this.textConfig = {
        title: '高速ダウンローダー',
        subtitle: 'ダウンロードキューの状態を表示します',
        loading: '読み込み中…',
        refreshed: '最新の状態を表示しています',
        empty: '現在、キューに登録されているジョブはありません。',
        refreshButtonLabel: '再読み込み',
        refreshFailed: 'キューの取得に失敗しました。'
      };
      this.apiConfig = {
        requestType: 'FastDownload',
        listType: 'FastDownloadQueue',
        actionType: 'FastDownloadAction'
      };
      this.state = {
        queue: [],
        lastUpdated: null,
        isLoading: false,
        isBlocked: false,
        blockMessage: '',
        contentsCode: ''
      };
    }

    initConfig()
    {
      var body = document.body || {};
      var dataset = body.dataset || {};
      if (dataset.pageScriptBase)
      {
        this.path = dataset.pageScriptBase;
      }
      if (dataset.fastDownloadRequestType)
      {
        this.apiConfig.requestType = dataset.fastDownloadRequestType;
      }
      if (dataset.fastDownloadListType)
      {
        this.apiConfig.listType = dataset.fastDownloadListType;
      }
      if (dataset.fastDownloadActionType)
      {
        this.apiConfig.actionType = dataset.fastDownloadActionType;
      }
    }

    async boot()
    {
      try
      {
        window.Utils.initScreenModalHistoryObserver().observe();

        this.initConfig();
        await this.loadJobScripts();
        this.initJobs();
        await this.runJobs();
      }
      catch (err)
      {
        this.onError(err);
      }
    }

    async loadJobScripts()
    {
      await window.Utils.loadScriptsSync([
        this.path + '/job-guard.js',
        this.path + '/job-state.js',
        this.path + '/job-render.js',
        this.path + '/job-events.js',
        this.path + '/job-service-worker.js'
      ]);
    }

    initJobs()
    {
      window.PwaDownloader = window.PwaDownloader || {};
      this.jobs = {
        guard: new window.PwaDownloader.JobGuard(this),
        state: new window.PwaDownloader.JobState(this),
        render: new window.PwaDownloader.JobRender(this),
        events: new window.PwaDownloader.JobEvents(this),
        serviceWorker: new window.PwaDownloader.JobServiceWorker(this)
      };
    }

    async runJobs()
    {
      var list = [
        this.jobs.guard,
        this.jobs.state,
        this.jobs.render,
        this.jobs.events,
        this.jobs.serviceWorker
      ];
      for (var i = 0; i < list.length; i += 1)
      {
        var job = list[i];
        if (this.state.isBlocked)
        {
          break;
        }
        if (job && typeof job.run === 'function')
        {
          await job.run();
        }
      }
    }

    async callApi(type, payload, overrides)
    {
      if (!(window.Utils && typeof window.Utils.requestApi === 'function'))
      {
        throw new Error('APIクライアントが初期化されていません。');
      }
      var response = await window.Utils.requestApi(this.apiConfig.requestType, type, payload || {}, overrides);
      if (!response)
      {
        throw new Error(this.textConfig.refreshFailed);
      }
      var statusRaw = typeof response.status === 'string' ? response.status : '';
      var status = statusRaw.toUpperCase();
      if (status && status !== 'OK')
      {
        var message = response.response || response.result || response.reason || this.textConfig.refreshFailed;
        throw new Error(message);
      }
      if (Object.prototype.hasOwnProperty.call(response, 'result'))
      {
        return response.result;
      }
      return response;
    }

    setQueue(entries)
    {
      this.state.queue = Array.isArray(entries) ? entries : [];
      this.state.lastUpdated = new Date();
    }

    onError(err)
    {
      if (window.console && console.error)
      {
        console.error('[PwaDownloader]', err);
      }
      if (this.services && this.services.toast && typeof this.services.toast.error === 'function')
      {
        this.services.toast.error(this.textConfig.refreshFailed);
      }
    }
  }

  window.PwaDownloader = window.PwaDownloader || PwaDownloader;
})(window, document);
