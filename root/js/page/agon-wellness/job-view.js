(function ()
 {
   'use strict';

   class AgonWellnessJobView
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
       this.dataset = this._buildDataset();
     }

     loadPage(page)
     {
       var SEL   = window.AgonWellnessConfig.SELECTOR;
       var tasks = [];

       var navEl = document.querySelector(SEL.nav);
       if (navEl) {
         this._highlightNav(navEl);
       }

       var hero = document.querySelector(SEL.heroGlance);
       if (hero) {
         tasks.push(this.renderHero(hero));
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
        tasks.push(this.renderScreenGrid(screenGrid));
      }

       var table = document.querySelector(SEL.dataTable);
       if (table) {
         tasks.push(this.renderTable(table));
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

       var gallery = document.querySelector(SEL.galleryGrid);
       if (gallery) {
         tasks.push(this.renderGallery(gallery));
       }

       if (tasks.length) {
         Promise.allSettled(tasks).catch(function (error) {
           console.error('[agon-wellness] init error:', error);
           if (page && page.showError) {
             page.showError(window.AgonWellnessConfig.TEXT.featureInitError);
           }
         });
       }
     }

     _highlightNav(navEl)
     {
       var path = (location.pathname || '').replace(/\/+$/, '');
       var links = navEl.querySelectorAll('a[href]');
       for (var i = 0; i < links.length; i++) {
         var a = links[i];
         var href = a.getAttribute('href') || '';
         try {
           var clean = href.replace(/\/+$/, '');
           if (clean && path.indexOf(clean) === 0) {
             a.classList.add('is-active');
           }
         } catch (e) {
           // no-op
         }
       }
     }

     renderHero(container)
     {
       var data = this.dataset.hero;
       container.innerHTML = '';
       var eyebrow = document.createElement('p');
       eyebrow.className = 'hero-card__eyebrow';
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
       var panels = this.dataset.panels;
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
       var roles = this.dataset.cards;
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
         for (var j = 0; j < role.points.length; j++) {
           var bullet = document.createElement('li');
           bullet.textContent = role.points[j];
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

     renderScreenGrid(grid)
     {
       var screens = this.dataset.screens;
       grid.innerHTML = '';
       for (var i = 0; i < screens.length; i++) {
         var screen = screens[i];
         var card = document.createElement('article');
         card.className = 'screen-card';
        card.setAttribute('tabindex', '0');
         var frame = document.createElement('div');
         frame.className = 'screen-card__frame';
         var img = document.createElement('img');
         img.alt = screen.title;
         img.src = screen.image;
         frame.appendChild(img);
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
         card.appendChild(frame);
         card.appendChild(meta);
         grid.appendChild(card);
       }
       return Promise.resolve();
     }

     renderTable(container)
     {
       var tableData = this.dataset.table;
       container.innerHTML = '';
       var table = document.createElement('table');
       table.className = 'mock-table';
       var thead = document.createElement('thead');
       var headRow = document.createElement('tr');
       for (var i = 0; i < tableData.columns.length; i++) {
         var th = document.createElement('th');
         th.textContent = tableData.columns[i];
         headRow.appendChild(th);
       }
       thead.appendChild(headRow);
       table.appendChild(thead);
       var tbody = document.createElement('tbody');
       for (var r = 0; r < tableData.rows.length; r++) {
         var row = tableData.rows[r];
         var tr = document.createElement('tr');
         for (var c = 0; c < row.length; c++) {
           var td = document.createElement('td');
           td.textContent = row[c];
           tr.appendChild(td);
         }
         tbody.appendChild(tr);
       }
       table.appendChild(tbody);
       container.appendChild(table);
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

     renderGallery(container)
     {
       var gallery = this.dataset.gallery;
       container.innerHTML = '';
       for (var i = 0; i < gallery.length; i++) {
         var item = gallery[i];
         var card = document.createElement('article');
         card.className = 'screen-card';
         var frame = document.createElement('div');
         frame.className = 'screen-card__frame';
         var img = document.createElement('img');
         img.src = item.image;
         img.alt = item.title;
         frame.appendChild(img);
         var meta = document.createElement('div');
         meta.className = 'screen-card__meta';
         var title = document.createElement('h3');
         title.textContent = item.title;
         var desc = document.createElement('p');
         desc.className = 'screen-card__desc';
         desc.textContent = item.caption;
         meta.appendChild(title);
         meta.appendChild(desc);
         card.appendChild(frame);
         card.appendChild(meta);
         container.appendChild(card);
       }
       return Promise.resolve();
     }

     _buildDataset()
     {
       return {
         hero: {
           eyebrow: 'Agon Sample',
           title: 'ウェルネスのサンプル',
           highlight: 'セルフケア向けダミーUI',
           summary: '呼吸やストレッチを想定したコンテンツカードとテーブルを配置しています。',
           metrics: ['ハイライト 3 件', 'アクティビティ表 4 件', 'ギャラリー 3 枚']
         },
         panels: [
           { icon: '✺', title: '呼吸ガイド', body: '時間やカウントを記載するためのパネル。' },
           { icon: '✺', title: 'ストレッチ', body: '姿勢や回数を示すダミーの説明文。' },
           { icon: '✺', title: '休息ノート', body: 'セルフケアの記録を置くための枠。' }
         ],
         cards: [
           { subtitle: 'Mind', title: '呼吸セッション', summary: '落ち着いたトーンの説明文で構成。', points: ['時間: 5分', '場所: 室内', '効果: リフレッシュ'] },
           { subtitle: 'Body', title: 'ストレッチ', summary: '姿勢や回数をメモするカード。', points: ['回数: 8回', '難易度: やさしい', '注意: 痛みがない範囲で'] },
           { subtitle: 'Mood', title: 'セルフチェック', summary: '気分のメモを想定したカード。', points: ['朝のコンディション', '昼のエネルギー', '夜の睡眠メモ'] }
         ],
         screens: [
           { title: '呼吸リズム', category: 'Mock UI', description: 'ガイド画面のプレビュー枠。', meta: '推奨: 5分', image: 'https://picsum.photos/seed/agon-wellness-screen1/640/360' },
           { title: 'ストレッチ手順', category: 'Mock UI', description: '動きの流れを示すダミー画像。', meta: '回数: 8', image: 'https://picsum.photos/seed/agon-wellness-screen2/640/360' },
           { title: 'リフレッシュ記録', category: 'Mock UI', description: '記録画面のサンプル。', meta: '更新: 毎日', image: 'https://picsum.photos/seed/agon-wellness-screen3/640/360' }
         ],
         table: {
           columns: ['アクティビティ', '目安時間', '状態', '更新日'],
           rows: [
             ['朝の呼吸', '5分', '実施済み', '2025/03/03'],
             ['肩回し', '3分', '実施予定', '2025/03/05'],
             ['背中ストレッチ', '4分', '実施済み', '2025/03/07'],
             ['夜のリラックス', '6分', '下書き', '2025/03/09']
           ]
         },
         apiEndpoints: [
           { method: 'GET', path: '/api/mock/wellness/sessions', description: '日課一覧のダミー取得。', note: '返却は静的' },
           { method: 'POST', path: '/api/mock/wellness/notes', description: 'セルフケアメモ投稿のモック。', note: '保存は行われません' },
           { method: 'PATCH', path: '/api/mock/wellness/status', description: '状態更新の疑似エンドポイント。', note: '常に成功レスポンス' }
         ],
         roadmap: [
           { title: 'Phase 1', scope: '習慣化の下準備', items: ['項目洗い出し', '時間帯の整理', '背景色の確認'] },
           { title: 'Phase 2', scope: '画面整備', items: ['アイコン調整', 'ラベル微修正', 'ダミー画像更新'] },
           { title: 'Phase 3', scope: 'リリース', items: ['最終文言チェック', '動作確認', '公開告知'] }
         ],
         kpis: [
           { label: '継続日数', value: '12日', note: 'ダミー値' },
           { label: '完了率', value: '86%', note: 'サンプル' },
           { label: 'メモ投稿', value: '28件', note: '参考値' },
           { label: '気分スコア', value: '4.4/5', note: '仮集計' }
         ],
         gallery: [
           { title: '自然の色', caption: 'リラックスを連想させるダミー画像。', image: 'https://picsum.photos/seed/agon-wellness-gallery1/640/360' },
           { title: '運動風景', caption: '軽い運動シーンのサンプル。', image: 'https://picsum.photos/seed/agon-wellness-gallery2/640/360' },
           { title: '休息スペース', caption: '休憩をイメージした写真の枠。', image: 'https://picsum.photos/seed/agon-wellness-gallery3/640/360' }
         ]
       };
     }
   }

   var NS = window.AgonWellness || (window.AgonWellness = {});
   NS.JobView = NS.JobView || AgonWellnessJobView;

 })(window);
