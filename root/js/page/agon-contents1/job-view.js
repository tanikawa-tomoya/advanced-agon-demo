(function ()
 {
   'use strict';

   class AgonContents1JobView
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
       this.dataset = this._buildDataset();
     }

     loadPage(page)
     {
       var SEL   = window.AgonContents1Config.SELECTOR;
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
           console.error('[agon-contents1] init error:', error);
           if (page && page.showError) {
             page.showError(window.AgonContents1Config.TEXT.featureInitError);
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
           title: '映像コンテンツのサンプル',
           highlight: '動画レイアウトと指標をデモ',
           summary: '映像セクションを想定したダミーのカードや表を配置しています。',
           metrics: ['ハイライト 3 件', 'テーブル行 4 件', 'ギャラリー画像 3 枚']
         },
         panels: [
           { icon: '▶', title: 'ダイジェスト', body: '映像冒頭の見せ方を確認するためのプレースホルダー。' },
           { icon: '▶', title: '特集コーナー', body: '複数の動画カテゴリを並べる例。' },
           { icon: '▶', title: 'レビュー', body: '視聴後の感想やメモを置くための枠。' }
         ],
         cards: [
           { subtitle: 'Clip', title: '映像サンプルA', summary: '説明テキストを短くまとめたカード。', points: ['再生時間のモック', '配信元の仮情報', 'タグ風のラベル'] },
           { subtitle: 'Clip', title: '映像サンプルB', summary: 'ナレーションや字幕の場所を示すプレースホルダー。', points: ['字幕ON/OFFの例', 'チャプター風の箇条書き', '更新日ダミー'] },
           { subtitle: 'Clip', title: '映像サンプルC', summary: 'サムネイルと概要をセットで表示するカード。', points: ['プレビュー文言', 'カテゴリ表記', '並び順の確認'] }
         ],
         screens: [
           { title: 'ダイジェスト映像', category: 'Mock UI', description: '映像サムネイルの差し込み位置。', meta: '尺: 03:12 (仮)', image: 'https://picsum.photos/seed/agon-contents1-screen1/640/360' },
           { title: 'インタビュー', category: 'Mock UI', description: '人物紹介を想定した枠。', meta: '収録: ダミー日付', image: 'https://picsum.photos/seed/agon-contents1-screen2/640/360' },
           { title: 'ハイライト', category: 'Mock UI', description: '名場面を短くまとめたカード。', meta: '再生: 220 (仮)', image: 'https://picsum.photos/seed/agon-contents1-screen3/640/360' }
         ],
         table: {
           columns: ['タイトル', '種別', '長さ', '更新'],
           rows: [
             ['サンプル映像A', '講話', '05:00', '2025/03/02'],
             ['サンプル映像B', 'イベント', '08:30', '2025/03/05'],
             ['サンプル映像C', 'ドキュメント', '06:10', '2025/03/11'],
             ['サンプル映像D', 'レクチャー', '04:45', '2025/03/18']
           ]
         },
         apiEndpoints: [
           { method: 'GET', path: '/api/mock/videos', description: '動画リストのダミー取得。', note: 'ページング未実装' },
           { method: 'POST', path: '/api/mock/bookmark', description: 'お気に入り登録のサンプル。', note: '動作はデモのみ' },
           { method: 'PATCH', path: '/api/mock/clip', description: 'メタ情報の更新デモ。', note: '保存はされません' }
         ],
         roadmap: [
           { title: 'Phase 1', scope: '映像収集', items: ['サムネイル選定', 'カテゴリ整理', '長さの表記検証'] },
           { title: 'Phase 2', scope: '編集モック', items: ['字幕レイアウト', 'チャプター配置', '並び替えパターン'] },
           { title: 'Phase 3', scope: '公開準備', items: ['再生確認', '見出し校正', '公開時の導線確認'] }
         ],
         kpis: [
           { label: '平均再生率', value: '68%', note: 'ダミー値' },
           { label: 'ブックマーク', value: '94件', note: 'モックデータ' },
           { label: 'コメント', value: '41件', note: '参考値' },
           { label: '公開本数', value: '24本', note: 'サンプル' }
         ],
         gallery: [
           { title: '場面サンプル1', caption: '映像に合わせた雰囲気確認用の画像。', image: 'https://picsum.photos/seed/agon-contents1-gallery1/640/360' },
           { title: '場面サンプル2', caption: '照明や色味の比較用ダミー。', image: 'https://picsum.photos/seed/agon-contents1-gallery2/640/360' },
           { title: '場面サンプル3', caption: '出演者紹介枠のイメージ。', image: 'https://picsum.photos/seed/agon-contents1-gallery3/640/360' }
         ]
       };
     }
   }

   var NS = window.AgonContents1 || (window.AgonContents1 = {});
   NS.JobView = NS.JobView || AgonContents1JobView;

 })(window);
