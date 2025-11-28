(function ()
 {
   'use strict';

   class AgonContents2JobView
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
       this.dataset = this._buildDataset();
     }

     loadPage(page)
     {
       var SEL   = window.AgonContents2Config.SELECTOR;
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
           console.error('[agon-contents2] init error:', error);
           if (page && page.showError) {
             page.showError(window.AgonContents2Config.TEXT.featureInitError);
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
           title: '音声・書籍コンテンツのサンプル',
           highlight: 'リスニング向け UI モック',
           summary: '音声や朗読コンテンツを紹介するためのダミーレイアウトです。',
           metrics: ['カード 3 種', 'テーブル行 4 件', 'API 架空 3 本']
         },
         panels: [
           { icon: '♪', title: '音声ギャラリー', body: 'プレイリスト的な表示を想定したパネル。' },
           { icon: '♪', title: '朗読ダイジェスト', body: '短い音声クリップをまとめる枠。' },
           { icon: '♪', title: '資料ピックアップ', body: '関連資料の導線を置くサンプル。' }
         ],
         cards: [
           { subtitle: 'Audio', title: '法話ダミーA', summary: '再生時間や雰囲気を確認するモックカード。', points: ['再生回数の仮値', 'テキスト抜粋', 'いいね数サンプル'] },
           { subtitle: 'Audio', title: '法話ダミーB', summary: 'シリーズ配信を想定したカード。', points: ['シリーズ名', 'トラック数', '公開日の仮情報'] },
           { subtitle: 'Audio', title: '朗読ダミーC', summary: 'ナレーション付き書籍を紹介する枠。', points: ['章立てサンプル', '音質メモ', 'おすすめコメント'] }
         ],
         screens: [
           { title: 'プレイリスト', category: 'Mock UI', description: '音声一覧の見せ方を確認するカード。', meta: '曲数: 12 (仮)', image: 'https://picsum.photos/seed/agon-contents2-screen1/640/360' },
           { title: '波形ビュー', category: 'Mock UI', description: '波形プレビューを示すダミー画像。', meta: '長さ: 18:20', image: 'https://picsum.photos/seed/agon-contents2-screen2/640/360' },
           { title: '朗読ハイライト', category: 'Mock UI', description: '朗読の一節を切り出したプレビュー。', meta: '再生: 510 (仮)', image: 'https://picsum.photos/seed/agon-contents2-screen3/640/360' }
         ],
         table: {
           columns: ['タイトル', '種類', '長さ', '更新'],
           rows: [
             ['ダミートラックA', '法話', '12:00', '2025/03/04'],
             ['ダミートラックB', '朗読', '18:20', '2025/03/09'],
             ['ダミートラックC', '座談', '09:10', '2025/03/12'],
             ['ダミートラックD', 'BGM', '04:30', '2025/03/20']
           ]
         },
         apiEndpoints: [
           { method: 'GET', path: '/api/mock/audios', description: '音声リスト取得のデモ。', note: 'JSON 返却のみ' },
           { method: 'POST', path: '/api/mock/favorite', description: 'お気に入り登録の疑似エンドポイント。', note: 'レスポンス固定' },
           { method: 'PUT', path: '/api/mock/playlist', description: 'プレイリスト更新のモック。', note: '保存されません' }
         ],
         roadmap: [
           { title: 'Phase 1', scope: '選曲', items: ['音声選定', '台本仮置き', 'キーワード整理'] },
           { title: 'Phase 2', scope: '編集', items: ['チャプター調整', 'BGM バランス', 'イントロ作成'] },
           { title: 'Phase 3', scope: '公開', items: ['メタデータ入力', '確認再生', 'リリース告知'] }
         ],
         kpis: [
           { label: '再生回数', value: '12.4k', note: 'ダミーデータ' },
           { label: '保存数', value: '302件', note: 'サンプル値' },
           { label: 'レビュー', value: '57件', note: '仮の数値' },
           { label: '平均評価', value: '4.7', note: 'モック' }
         ],
         gallery: [
           { title: '収録風景', caption: '音声収録の雰囲気を示すダミー画像。', image: 'https://picsum.photos/seed/agon-contents2-gallery1/640/360' },
           { title: '資料サンプル', caption: '書籍連動資料の見せ方を確認。', image: 'https://picsum.photos/seed/agon-contents2-gallery2/640/360' },
           { title: 'リスニング', caption: '聴取シーンのイメージ。', image: 'https://picsum.photos/seed/agon-contents2-gallery3/640/360' }
         ]
       };
     }
   }

   var NS = window.AgonContents2 || (window.AgonContents2 = {});
   NS.JobView = NS.JobView || AgonContents2JobView;

 })(window);
