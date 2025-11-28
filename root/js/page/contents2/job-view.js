(function ()
 {
   'use strict';

   var CHART_COLORS = {
     done:    'rgba(94, 255, 193, 0.9)',
     progress:'rgba(94, 236, 255, 0.85)',
     review:  'rgba(143, 213, 255, 0.85)',
     blocked: 'rgba(255, 153, 102, 0.85)',
     backlog: 'rgba(143, 213, 255, 0.55)'
   };

   class Contents2JobView
   {
     constructor(pageInstance)
     {
      this.pageInstance = pageInstance;
      this.state = {
        dashboardGroup: null,
        dashboardEvent: null
      };
       this.dataset = this._buildDataset();
     }

     loadPage(page)
     {
       var SEL   = window.Contents2Config.SELECTOR;
       var tasks = [];

       var navEl = document.querySelector(SEL.nav);
       if (navEl) {
         try {
           this.setupNav(navEl);
         } catch (e) {
           console.error('[contents2] setupNav failed:', e);
         }
       }

       var hero = document.querySelector(SEL.heroGlance);
       if (hero) {
         tasks.push(this.renderHeroGlance(hero));
       }

       var background = document.querySelector(SEL.backgroundPanels);
       if (background) {
         tasks.push(this.renderBackgroundPanels(background));
       }

       var roleCards = document.querySelector(SEL.roleCards);
       if (roleCards) {
         tasks.push(this.renderRoleCards(roleCards));
       }

      var screenGrid = document.querySelector(SEL.screenGrid);
      if (screenGrid) {
        tasks.push(this.setupScreenShowcase(screenGrid));
      }

       var dashboardRefs = this._resolveDashboardRefs();
       if (dashboardRefs.ready) {
         tasks.push(this.setupDashboardDemo(dashboardRefs));
       }

       var badgeShowcase = document.querySelector(SEL.badgeShowcase);
       if (badgeShowcase) {
         tasks.push(this.renderBadgeShowcase(badgeShowcase));
       }

       var journey = document.querySelector(SEL.journey);
       if (journey) {
         tasks.push(this.renderJourney(journey));
       }

       var dataTable = document.querySelector(SEL.dataTable);
       if (dataTable) {
         tasks.push(this.renderDataModel(dataTable));
       }

       var apiGrid = document.querySelector(SEL.apiGrid);
       if (apiGrid) {
         tasks.push(this.renderApiGrid(apiGrid));
       }

       var roadmap = document.querySelector(SEL.roadmap);
       if (roadmap) {
         tasks.push(this.renderRoadmap(roadmap));
       }

       var kpiGrid = document.querySelector(SEL.kpiGrid);
       if (kpiGrid) {
         tasks.push(this.renderKpis(kpiGrid));
       }

       var form = document.querySelector(SEL.contactForm);
       if (form) {
         tasks.push(this.enhanceContactForm(form, page));
       }

       if (tasks.length) {
         Promise.allSettled(tasks).catch(function (error) {
           try {
             if (page && page.showError) {
               page.showError(window.Contents2Config.TEXT.featureInitError);
             }
           } finally {
             console.error('[contents2] init error:', error);
           }
         });
       }
     }

     setupNav(navEl)
     {
       var path = (location.pathname || '').replace(/\/+$/, '');
       var links = navEl.querySelectorAll('a[href]');
       for (var i = 0; i < links.length; i++) {
         var a = links[i];
         var href = a.getAttribute('href') || '';
         try {
           var clean = href.replace(/\/+$/, '');
           if (clean && path.contents2Of(clean) === 0) {
             a.classList.add('is-active');
           }
         } catch (e) {
           // no-op（堅牢性重視）
         }
       }
     }

     renderHeroGlance(container)
     {
       var data = this.dataset.hero;
       container.innerHTML = '';
       var eyebrow = document.createElement('p');
       eyebrow.className = 'hero__eyebrow';
       eyebrow.textContent = data.eyebrow;
       var title = document.createElement('p');
       title.className = 'hero-card__title';
       title.textContent = data.title;
       var highlight = document.createElement('p');
       highlight.className = 'hero-card__highlight';
       highlight.textContent = data.highlight;
       var summary = document.createElement('p');
       summary.className = 'hero-card__summary';
       summary.textContent = data.summary;
       var list = document.createElement('ul');
       list.className = 'hero-card__list';
       for (var i = 0; i < data.metrics.length; i++) {
         var item = document.createElement('li');
         item.textContent = data.metrics[i];
         list.appendChild(item);
       }
       container.appendChild(eyebrow);
       container.appendChild(title);
       container.appendChild(highlight);
       container.appendChild(summary);
       container.appendChild(list);
       return Promise.resolve();
     }

     renderBackgroundPanels(container)
     {
       var panels = this.dataset.background;
       container.innerHTML = '';
       for (var i = 0; i < panels.length; i++) {
         var panel = panels[i];
         var el = document.createElement('article');
         el.className = 'panel';
         var icon = document.createElement('div');
         icon.className = 'panel__icon';
         icon.textContent = panel.icon;
         var title = document.createElement('h3');
         title.className = 'panel__title';
         title.textContent = panel.title;
         var body = document.createElement('p');
         body.className = 'panel__body';
         body.textContent = panel.body;
         el.appendChild(icon);
         el.appendChild(title);
         el.appendChild(body);
         container.appendChild(el);
       }
       return Promise.resolve();
     }

     renderRoleCards(container)
     {
       var roles = this.dataset.roles;
       container.innerHTML = '';
       for (var i = 0; i < roles.length; i++) {
         var role = roles[i];
         var card = document.createElement('article');
         card.className = 'role-card';
         var subtitle = document.createElement('p');
         subtitle.className = 'role-card__subtitle';
         subtitle.textContent = role.subtitle;
         var title = document.createElement('h3');
         title.className = 'role-card__title';
         title.textContent = role.title;
         var summary = document.createElement('p');
         summary.className = 'role-card__summary';
         summary.textContent = role.summary;
         var list = document.createElement('ul');
         list.className = 'role-card__list';
         for (var j = 0; j < role.responsibilities.length; j++) {
           var bullet = document.createElement('li');
           bullet.textContent = role.responsibilities[j];
           list.appendChild(bullet);
         }
         card.appendChild(subtitle);
         card.appendChild(title);
         card.appendChild(summary);
         card.appendChild(list);
         container.appendChild(card);
       }
       return Promise.resolve();
     }

    setupScreenShowcase(grid)
    {
      this.renderScreenGrid(grid);

      grid.addEventListener('click', function (ev) {
        var el = ev.target && ev.target.closest ? ev.target.closest('[data-screen]') : null;
         if (!el) {
           return;
         }
         var url = el.getAttribute('data-href') || el.getAttribute('data-screen');
         if (url) {
           location.href = url;
         }
       });
       return Promise.resolve();
     }

    renderScreenGrid(grid)
    {
      var screens = this.dataset.screens;
      grid.innerHTML = '';
      if (!screens.length) {
        var empty = document.createElement('p');
         empty.textContent = '表示する画面がありません。';
         grid.appendChild(empty);
         return;
       }
       for (var i = 0; i < screens.length; i++) {
         var screen = screens[i];
         var card = document.createElement('article');
         card.className = 'screen-card';
         card.setAttribute('tabcontents2', '0');
         card.setAttribute('data-screen', screen.href);
         card.setAttribute('data-href', screen.href);
         var meta = document.createElement('div');
         meta.className = 'screen-card__meta';
         var eyebrow = document.createElement('p');
         eyebrow.className = 'screen-card__eyebrow';
         eyebrow.textContent = screen.category;
         var title = document.createElement('h3');
         title.textContent = screen.title;
         var desc = document.createElement('p');
         desc.className = 'screen-card__desc';
         desc.textContent = screen.description;
         var metaLine = document.createElement('p');
         metaLine.className = 'screen-card__meta-line';
         metaLine.textContent = screen.meta;
         meta.appendChild(eyebrow);
         meta.appendChild(title);
         meta.appendChild(desc);
         meta.appendChild(metaLine);
         card.appendChild(meta);
         grid.appendChild(card);
       }
     }

     setupDashboardDemo(refs)
     {
       var self = this;
       return Promise.resolve();
     }

     _populateEventOptions(selectEl, group)
     {
       selectEl.innerHTML = '';
       for (var i = 0; i < group.events.length; i++) {
         var event = group.events[i];
         var option = document.createElement('option');
         option.value = event.id;
         option.textContent = event.label;
         selectEl.appendChild(option);
       }
     }

     _renderEventCharts(refs, eventId)
     {
       return;
     }

     renderTrendChart(container, values)
     {
       container.innerHTML = '';
       for (var i = 0; i < values.length; i++) {
         var value = values[i];
         var bar = document.createElement('div');
         bar.className = 'sparkline__bar';
         bar.style.height = Math.max(0, Math.min(100, value)) + '%';
         var label = document.createElement('span');
         label.textContent = value + '%';
         bar.appendChild(label);
         container.appendChild(bar);
       }
     }

     renderTrendLegend(container, group)
     {
       container.innerHTML = '';
       var latest = group.weeklyTrend[group.weeklyTrend.length - 1];
       var average = Math.round(group.weeklyTrend.reduce(function (sum, v) { return sum + v; }, 0) / group.weeklyTrend.length);
       var items = [
         { label: '最新週', value: latest + '%', note: group.latestNote },
         { label: '平均値', value: average + '%', note: group.averageNote }
       ];
       for (var i = 0; i < items.length; i++) {
         var item = document.createElement('li');
         item.textContent = items[i].label + '：' + items[i].value + '（' + items[i].note + '）';
         container.appendChild(item);
       }
     }

     renderStatusBars(container, statuses)
     {
       container.innerHTML = '';
       for (var i = 0; i < statuses.length; i++) {
         var status = statuses[i];
         var wrap = document.createElement('div');
         wrap.className = 'stacked-bar';
         var label = document.createElement('div');
         label.className = 'stacked-bar__label';
         label.textContent = status.label;
         var tally = document.createElement('span');
         tally.textContent = status.total + '件';
         label.appendChild(tally);
         var track = document.createElement('div');
         track.className = 'stacked-bar__track';
         var keys = ['done', 'progress', 'review', 'blocked'];
         for (var j = 0; j < keys.length; j++) {
           var key = keys[j];
           var value = status[key];
           if (!value) {
             continue;
           }
           var percent = status.total ? (value / status.total) * 100 : 0;
           var segment = document.createElement('div');
           var classSuffix = key;
           if (key === 'review') {
             classSuffix = 'todo';
           } else if (key === 'blocked') {
             classSuffix = 'late';
           }
           segment.className = 'stacked-bar__segment stacked-bar__segment--' + classSuffix;
           segment.style.width = percent + '%';
           segment.style.background = CHART_COLORS[key] || segment.style.background;
           track.appendChild(segment);
         }
         wrap.appendChild(label);
         wrap.appendChild(track);
         container.appendChild(wrap);
       }
     }

     renderDonut(donutEl, legendEl, eventData)
     {
       if (!donutEl || !legendEl || !eventData) {
         return;
       }
       var slices = eventData.slices;
       var total = 0;
       for (var i = 0; i < slices.length; i++) {
         total += slices[i].value;
       }
       if (!total) {
         total = 1;
       }
       var gradientParts = [];
       var currentDeg = 0;
       for (var j = 0; j < slices.length; j++) {
         var part = slices[j];
         var portion = (part.value / total) * 360;
         var entry = part.color + ' ' + currentDeg + 'deg ' + (currentDeg + portion) + 'deg';
         gradientParts.push(entry);
         currentDeg += portion;
       }
       donutEl.style.background = 'conic-gradient(' + gradientParts.join(', ') + ')';
       donutEl.setAttribute('data-total', eventData.completion + '%');
       legendEl.innerHTML = '';
       for (var k = 0; k < slices.length; k++) {
         var slice = slices[k];
         var row = document.createElement('li');
         var chip = document.createElement('span');
         chip.style.background = slice.color;
         var text = document.createElement('span');
         text.textContent = slice.label + ' ' + slice.value + '%';
         row.appendChild(chip);
         row.appendChild(text);
         legendEl.appendChild(row);
       }
     }

     renderHeatmap(container, cells)
     {
       container.innerHTML = '';
       for (var i = 0; i < cells.length; i++) {
         var cell = cells[i];
         var el = document.createElement('div');
         el.className = 'heatmap__cell';
         el.textContent = cell.label;
         el.setAttribute('data-level', cell.level);
         container.appendChild(el);
       }
     }

     renderBadgeShowcase(container)
     {
       var data = this.dataset.badges;
       container.innerHTML = '';
       var header = document.createElement('div');
       header.className = 'badge-showcase__header';
       var title = document.createElement('h2');
       title.textContent = data.title;
       var summary = document.createElement('p');
       summary.textContent = data.summary;
       header.appendChild(title);
       header.appendChild(summary);
       container.appendChild(header);
       var grid = document.createElement('div');
       grid.className = 'badge-showcase__grid';
       for (var i = 0; i < data.cards.length; i++) {
         var card = data.cards[i];
         var cardEl = document.createElement('article');
         cardEl.className = 'badge-showcase__card';
         var frame = document.createElement('div');
         frame.className = 'badge-showcase__frame';
         var fallback = document.createElement('div');
         fallback.className = 'badge-showcase__frame-fallback';
         fallback.textContent = card.mock;
         frame.appendChild(fallback);
         var meta = document.createElement('div');
         meta.className = 'badge-showcase__meta';
         var h3 = document.createElement('h3');
         h3.className = 'badge-showcase__title';
         h3.textContent = card.title;
         var metaLine = document.createElement('p');
         metaLine.className = 'badge-showcase__meta-line';
         metaLine.textContent = card.meta;
         var desc = document.createElement('p');
         desc.className = 'badge-showcase__description';
         desc.textContent = card.description;
         meta.appendChild(h3);
         meta.appendChild(metaLine);
         meta.appendChild(desc);
         cardEl.appendChild(frame);
         cardEl.appendChild(meta);
         grid.appendChild(cardEl);
       }
       container.appendChild(grid);
       var note = document.createElement('p');
       note.className = 'badge-showcase__note';
       note.textContent = data.note;
       container.appendChild(note);
       return Promise.resolve();
     }

     renderJourney(container)
     {
       var steps = this.dataset.journey;
       container.innerHTML = '';
       for (var i = 0; i < steps.length; i++) {
         var step = steps[i];
         var card = document.createElement('article');
         card.className = 'journey-card';
         var stepLabel = document.createElement('p');
         stepLabel.className = 'journey-card__step';
         stepLabel.textContent = step.step;
         var title = document.createElement('h3');
         title.className = 'journey-card__title';
         title.textContent = step.title;
         var desc = document.createElement('p');
         desc.className = 'journey-card__desc';
         desc.textContent = step.description;
         card.appendChild(stepLabel);
         card.appendChild(title);
         card.appendChild(desc);
         container.appendChild(card);
       }
       return Promise.resolve();
     }

     renderDataModel(container)
     {
       var entities = this.dataset.dataModel;
       container.innerHTML = '';
       for (var i = 0; i < entities.length; i++) {
         var entity = entities[i];
         var wrapper = document.createElement('article');
         wrapper.className = 'data-entity';
         var header = document.createElement('div');
         header.className = 'data-entity__header';
         var title = document.createElement('h3');
         title.textContent = entity.name;
         var purpose = document.createElement('span');
         purpose.textContent = entity.purpose;
         header.appendChild(title);
         header.appendChild(purpose);
         var fields = document.createElement('div');
         fields.className = 'data-entity__fields';
         for (var j = 0; j < entity.fields.length; j++) {
           var field = entity.fields[j];
           var pill = document.createElement('div');
           pill.className = 'field-pill';
           pill.textContent = field.name;
           var type = document.createElement('span');
           type.className = 'field-pill__type';
           type.textContent = field.type;
           pill.appendChild(type);
           fields.appendChild(pill);
         }
         wrapper.appendChild(header);
         wrapper.appendChild(fields);
         container.appendChild(wrapper);
       }
       return Promise.resolve();
     }

     renderApiGrid(container)
     {
       var apis = this.dataset.apiEndpoints;
       container.innerHTML = '';
       for (var i = 0; i < apis.length; i++) {
         var api = apis[i];
         var card = document.createElement('article');
         card.className = 'api-card';
         var method = document.createElement('div');
         method.className = 'api-card__method';
         method.textContent = api.method;
         var path = document.createElement('p');
         path.className = 'api-card__path';
         path.textContent = api.path;
         var desc = document.createElement('p');
         desc.className = 'api-card__description';
         desc.textContent = api.description;
         var note = document.createElement('p');
         note.className = 'api-card__note';
         note.textContent = api.note;
         card.appendChild(method);
         card.appendChild(path);
         card.appendChild(desc);
         card.appendChild(note);
         container.appendChild(card);
       }
       return Promise.resolve();
     }

     renderRoadmap(container)
     {
       var phases = this.dataset.roadmap;
       container.innerHTML = '';
       for (var i = 0; i < phases.length; i++) {
         var phase = phases[i];
         var card = document.createElement('article');
         card.className = 'roadmap-phase';
         var title = document.createElement('h3');
         title.className = 'roadmap-phase__title';
         title.textContent = phase.title;
         var scope = document.createElement('p');
         scope.className = 'roadmap-phase__scope';
         scope.textContent = phase.scope;
         var list = document.createElement('ul');
         for (var j = 0; j < phase.items.length; j++) {
           var li = document.createElement('li');
           li.textContent = phase.items[j];
           list.appendChild(li);
         }
         card.appendChild(title);
         card.appendChild(scope);
         card.appendChild(list);
         container.appendChild(card);
       }
       return Promise.resolve();
     }

     renderKpis(container)
     {
       var kpis = this.dataset.kpis;
       container.innerHTML = '';
       for (var i = 0; i < kpis.length; i++) {
         var kpi = kpis[i];
         var card = document.createElement('article');
         card.className = 'kpi-card';
         var label = document.createElement('p');
         label.textContent = kpi.label;
         var value = document.createElement('strong');
         value.textContent = kpi.value;
         var note = document.createElement('p');
         note.textContent = kpi.note;
         card.appendChild(label);
         card.appendChild(value);
         card.appendChild(note);
         container.appendChild(card);
       }
       return Promise.resolve();
     }

     enhanceContactForm(form, page)
     {
       form.addEventListener('submit', function (ev) {
         var required = form.querySelectorAll('[data-required], [required]');
         var ok = true;
         for (var i = 0; i < required.length; i++) {
           var input = required[i];
           var val = (input.value || '').trim();
           if (!val) {
             ok = false;
             input.classList.add('is-error');
           } else {
             input.classList.remove('is-error');
           }
         }
         if (!ok) {
           ev.preventDefault();
           if (page && page.showError) {
             page.showError(window.Contents2Config.TEXT.inputLack);
           }
         }
       });
       return Promise.resolve();
     }

     _resolveDashboardRefs()
     {
       var SEL = window.Contents2Config.SELECTOR;
       var refs = {
         group: document.querySelector(SEL.groupFilter),
         event: document.querySelector(SEL.eventFilter),
         trendChart: document.querySelector(SEL.trendChart),
         trendLegend: document.querySelector(SEL.trendLegend),
         statusBars: document.querySelector(SEL.statusBars),
         eventDonut: document.querySelector(SEL.eventDonut),
         eventLegend: document.querySelector(SEL.eventLegend),
         heatmap: document.querySelector(SEL.heatmap)
       };
       refs.ready = !!(refs.group && refs.event && refs.trendChart && refs.statusBars && refs.eventDonut && refs.eventLegend && refs.heatmap);
       return refs;
     }

     _getGroupById(id)
     {
       var groups = this.dataset.dashboard.groups;
       for (var i = 0; i < groups.length; i++) {
         if (groups[i].id === id) {
           return groups[i];
         }
       }
       return null;
     }

     _buildDataset()
     {
       return {
         hero: {
           eyebrow: '現在の接続状況',
           title: 'マスターズ連携のサマリー',
           highlight: '8リーグ / 620名が遠隔指導を利用中',
           summary: '合宿遠征なしでも週次レビューと進捗把握が回る体制を、北斎カップの知見をベースに再現しています。',
           metrics: [
             '週次レビュー平均 48 件（72 時間以内に応答）',
             '動画アップロード 310 本 / 月、オートタグで分類',
             '滞留検知は 12 時間以内に運営へ自動通知'
           ]
         },
         background: [
           { icon: '🛰️', title: '遠隔レビューの定着', body: '現地合宿に依存しないフィードバック体制を確立し、クラブ間の知見循環を高速化します。' },
           { icon: '🧭', title: 'ロール別の可視化', body: '運営・コーチ・生徒が同じ進捗指標を共有できるよう、ロール別に画面と KPI を整理。' },
           { icon: '🎯', title: '目標テンプレの標準化', body: 'クエストとイベントの紐付けで、課題粒度と評価観点を統一しレビューの再現性を確保します。' },
           { icon: '⚙️', title: '既存システムとの橋渡し', body: 'マスターズの認証・権限を流用しつつ、追加テーブルと API で PoC から本番までを想定。' }
         ],
         roles: [
           {
             title: '運営・事務局',
             subtitle: 'Operations',
             summary: '全体 KPI を監視し、滞留やボトルネックを即時にエスカレーション。',
             responsibilities: [
               '進捗ダッシュボードで全クラブの体温を把握',
               'レビュー SLA 違反を検知して各コーチに通知',
               'バッジ/証跡を作成し、スポンサー説明資料に反映'
             ]
           },
           {
             title: 'コーチ',
             subtitle: 'Coaches',
             summary: 'テンプレとタグで提出物を整理し、動画添削・フィードバックを遠隔で完結。',
             responsibilities: [
               'テンプレートをコピーしてクエスト発行',
               '提出ログを確認し、優先度順にレビュー',
               '合宿候補者を選抜し、生徒へ個別メッセージ'
             ]
           },
           {
             title: '生徒・クラブ',
             subtitle: 'Students',
             summary: 'やるべきことと評価観点を理解しやすい UI で、進捗の自己管理を支援。',
             responsibilities: [
               '提出ステータスとフィードバックを 1 画面で確認',
               'タスクの滞留理由をタグから把握',
               '動画レビュー結果をもとに練習計画を更新'
             ]
           }
         ],
        screens: [
          { title: 'ダッシュボード', category: 'KPI・監視', description: 'クラブ横断 KPI と SLA アラートをひと目で把握。', meta: '滞留検知 / SLA 通知', href: 'dashboard.html' },
          { title: '目標ポートフォリオ', category: 'テンプレ管理', description: 'クエストテンプレのバージョン管理と配布履歴。', meta: 'テンプレ比較 / 権限', href: 'targets.html' },
          { title: '個別目標レビュー', category: '添削', description: '動画・コメント・タグをまとめたレビューコンソール。', meta: '動画 / コメント / タグ', href: 'target-detail.html' },
          { title: 'コンテンツ', category: 'リソース', description: '練習メニューや教材をクラブ間で共有。', meta: '教材プレビュー / フィルタ', href: 'contents.html' },
          { title: 'レビューキュー', category: 'SLA 管理', description: '提出物の滞留時間を色分けし、担当を自動アサイン。', meta: '優先度ソート / 自動割当', href: 'admin-queue.html' },
          { title: '個人設定', category: '通知', description: 'チャネル別通知やデバイス設定を編集。', meta: '通知 / デバイス', href: 'account-settings.html' }
        ],
         dashboard: {
           groups: [
             {
               id: 'hokusai',
               label: '北斎カップ選抜',
               weeklyTrend: [62, 68, 72, 75, 79, 83, 86],
               latestNote: 'レビュー 18 件/週',
               averageNote: '過去 6 週平均',
               statuses: [
                 { label: '動画提出', total: 54, done: 28, progress: 18, review: 6, blocked: 2 },
                 { label: 'テンプレ作成', total: 32, done: 20, progress: 8, review: 4, blocked: 0 },
                 { label: 'フィードバック完了', total: 41, done: 30, progress: 7, review: 2, blocked: 2 }
               ],
               heatmap: [
                 { label: 'W1', level: 'medium' },
                 { label: 'W2', level: 'low' },
                 { label: 'W3', level: 'medium' },
                 { label: 'W4', level: 'high' },
                 { label: 'W5', level: 'medium' },
                 { label: 'W6', level: 'high' },
                 { label: 'W7', level: 'medium' },
                 { label: 'W8', level: 'low' },
                 { label: 'W9', level: 'medium' },
                 { label: 'W10', level: 'high' },
                 { label: 'W11', level: 'medium' },
                 { label: 'W12', level: 'high' }
               ],
               events: [
                 {
                   id: 'hokusai-qualifier',
                   label: '地区予選',
                   completion: 78,
                   slices: [
                     { label: '完了', value: 78, color: CHART_COLORS.done },
                     { label: 'レビュー中', value: 14, color: CHART_COLORS.progress },
                     { label: '滞留', value: 8, color: CHART_COLORS.blocked }
                   ]
                 },
                 {
                   id: 'hokusai-final',
                   label: '最終選考',
                   completion: 64,
                   slices: [
                     { label: '完了', value: 64, color: CHART_COLORS.done },
                     { label: 'レビュー中', value: 18, color: CHART_COLORS.review },
                     { label: '滞留', value: 18, color: CHART_COLORS.blocked }
                   ]
                 }
               ]
             },
             {
               id: 'masters',
               label: 'Masters 2025 強化',
               weeklyTrend: [58, 60, 63, 69, 74, 80, 85],
               latestNote: '映像 22 本/週',
               averageNote: '提出ピーク時',
               statuses: [
                 { label: '基礎ドリル', total: 40, done: 24, progress: 10, review: 4, blocked: 2 },
                 { label: '戦術レビュー', total: 36, done: 18, progress: 11, review: 5, blocked: 2 },
                 { label: 'フィジカルテスト', total: 28, done: 14, progress: 9, review: 3, blocked: 2 }
               ],
               heatmap: [
                 { label: 'W1', level: 'low' },
                 { label: 'W2', level: 'medium' },
                 { label: 'W3', level: 'high' },
                 { label: 'W4', level: 'medium' },
                 { label: 'W5', level: 'medium' },
                 { label: 'W6', level: 'high' },
                 { label: 'W7', level: 'medium' },
                 { label: 'W8', level: 'medium' },
                 { label: 'W9', level: 'high' },
                 { label: 'W10', level: 'high' },
                 { label: 'W11', level: 'medium' },
                 { label: 'W12', level: 'medium' }
               ],
               events: [
                 {
                   id: 'masters-trial',
                   label: 'Masters トライアル',
                   completion: 82,
                   slices: [
                     { label: '完了', value: 82, color: CHART_COLORS.done },
                     { label: 'レビュー中', value: 12, color: CHART_COLORS.progress },
                     { label: '滞留', value: 6, color: CHART_COLORS.blocked }
                   ]
                 },
                 {
                   id: 'masters-final',
                   label: '決勝ラウンド',
                   completion: 58,
                   slices: [
                     { label: '完了', value: 58, color: CHART_COLORS.done },
                     { label: 'レビュー中', value: 24, color: CHART_COLORS.review },
                     { label: '滞留', value: 18, color: CHART_COLORS.blocked }
                   ]
                 }
               ]
             }
           ]
         },
         badges: {
           title: 'バッジ + プレイブック',
           summary: '動画提出とレビュー履歴をもとに、実績証明やスポンサー説明資料として活用できるモックを収録しています。',
           note: '※ iframe の代わりにダミー画像文言を表示しています。',
           cards: [
             {
               title: '遠隔レビュー証跡',
               meta: '対象: コーチ向け / 更新頻度: 週次',
               description: 'SLA 遵守率と主要フィードバックを 1 枚で説明できるレイアウト。',
               mock: '遠隔レビュー証跡のモック'
             },
             {
               title: 'クラブ別 KPI サマリー',
               meta: '対象: 運営・スポンサー',
               description: '各クラブの提出率・滞留数・映像本数を比較し、支援優先度を判断。',
               mock: 'クラブ別 KPI モック'
             },
             {
               title: '生徒向け進行ガイド',
               meta: '対象: 生徒 / 更新頻度: イベントごと',
               description: '提出締切・必要リソース・合格ラインをカード式に提示。',
               mock: '進行ガイド モック'
             }
           ]
         },
         journey: [
           { step: '01', title: 'テンプレ設計', description: '運営がタグ・評価観点を設定し、クラブへ配信。' },
           { step: '02', title: 'クエスト起票', description: 'コーチがテンプレをコピーし、生徒ごとの条件を微調整。' },
           { step: '03', title: '提出 & 自動タグ', description: '生徒が動画やチェックリストを送信、AI タグで分類。' },
           { step: '04', title: 'レビュー & KPI 反映', description: '添削内容がダッシュボードと履歴へ自動連携。' },
           { step: '05', title: '合宿選抜・バッジ化', description: '評価済みの証跡をもとに選抜・証明書を発行。' }
         ],
         dataModel: [
           {
             name: 'quest_templates',
             purpose: '課題テンプレのマスタ',
             fields: [
               { name: 'template_id', type: 'PK' },
               { name: 'title', type: 'TEXT' },
               { name: 'review_tags', type: 'JSON' },
               { name: 'expected_artifacts', type: 'JSON' }
             ]
           },
           {
             name: 'quest_instances',
             purpose: '配布済みクエスト',
             fields: [
               { name: 'quest_id', type: 'PK' },
               { name: 'template_id', type: 'FK' },
               { name: 'assignee_id', type: 'FK' },
               { name: 'due_on', type: 'DATE' },
               { name: 'status', type: 'ENUM' }
             ]
           },
           {
             name: 'submissions',
             purpose: '提出物 / 添削ログ',
             fields: [
               { name: 'submission_id', type: 'PK' },
               { name: 'quest_id', type: 'FK' },
               { name: 'video_url', type: 'TEXT' },
               { name: 'auto_tags', type: 'JSON' },
               { name: 'review_state', type: 'ENUM' }
             ]
           }
         ],
         apiEndpoints: [
           { method: 'GET', path: '/api/groups/:groupId/dashboard', description: 'ロールに応じた KPI / trend を取得。', note: 'scope: admin, coach' },
           { method: 'POST', path: '/api/quests', description: 'テンプレから新しいクエストを発行。', note: 'scope: coach' },
           { method: 'PATCH', path: '/api/submissions/:id', description: 'レビュー結果・タグを更新。', note: 'scope: coach' },
           { method: 'GET', path: '/api/badges/:id', description: 'バッジ証跡を PDF 形式で取得。', note: 'scope: admin, student' }
         ],
         roadmap: [
           { title: 'Phase 1 / PoC', scope: '北斎カップ向け', items: ['ダッシュボード PoC', '動画レビュー画面', 'テンプレ設計ワークフロー'] },
           { title: 'Phase 2 / 拡張', scope: 'Masters 連携', items: ['API 認可の統合', '生徒ダッシュボード', 'クラブ横断の教材'] },
           { title: 'Phase 3 / 本番', scope: '商用運用', items: ['レポート/バッジ自動生成', '学年縦断アーカイブ', 'BI 連携'] }
         ],
         kpis: [
           { label: '提出完了率', value: '82%', note: '+6pt / 先週比' },
           { label: 'レビュー SLA 遵守', value: '91%', note: '目標 90% 達成' },
           { label: '動画アップロード', value: '312 本/月', note: '北斎クラブ合計' },
           { label: '滞留アラート', value: '4 件', note: 'すべて対応済み' }
         ]
       };
     }
   }

   var NS = window.Contents2 || (window.Contents2 = {});
   NS.JobView = NS.JobView || Contents2JobView;

 })(window);
