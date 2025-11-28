(function ()
 {
   'use strict';

   class AgonAboutJobView
   {
     constructor(pageInstance)
     {
       this.pageInstance = pageInstance;
       this.dataset = this._buildDataset();
     }

     loadPage(page)
     {
       var SEL   = window.AgonAboutConfig.SELECTOR;
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
           console.error('[agon-about] init error:', error);
           if (page && page.showError) {
             page.showError(window.AgonAboutConfig.TEXT.featureInitError);
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
           title: '理念と教学のサンプル',
           highlight: 'UI モック + ダミーデータ',
           summary: '各セクションにプレースホルダーの情報を配置し、構成イメージを掴めるようにしています。',
           metrics: ['指標カード 6 件', 'テーブル行 4 件', 'ギャラリー画像 3 枚']
         },
         panels: [
           { icon: '◆', title: '文化紹介', body: '教義の要点を短い文章で並べるデモパネル。' },
           { icon: '◆', title: '活動サマリー', body: '年間イベントや取り組みをダミーで表示。' },
           { icon: '◆', title: '学びの流れ', body: '閲覧・参加・振り返りのステップを簡潔に紹介。' }
         ],
         cards: [
           { subtitle: 'Mock Story', title: '阿含の歩み', summary: 'トーンや文章量の目安として配置したカードです。', points: ['歴史年表のサンプル', '映像リンクのプレースホルダー', '関連記事のダミータグ'] },
           { subtitle: 'Community', title: 'オンライン道場', summary: 'フォーラムやQ&Aを想定したダミーのテキストを掲載。', points: ['雰囲気を掴むだけの内容', 'ボタンやフォームは未連携', '自由に差し替え可能'] },
           { subtitle: 'Library', title: '資料コレクション', summary: 'PDFや音声を格納する棚をイメージしたカード。', points: ['カテゴリ別のタグ', 'ダウンロード数のモック', '更新日のプレースホルダー'] }
         ],
         screens: [
           { title: '映像アーカイブ モック', category: 'Mock UI', description: 'サンプル動画の差し込み位置を示すカード。', meta: '更新: ダミー', image: 'https://picsum.photos/seed/agon-about-screen1/640/360' },
           { title: '講義ノート', category: 'Mock UI', description: 'テキスト教材を想定したプレビューです。', meta: '閲覧数: 120 (ダミー)', image: 'https://picsum.photos/seed/agon-about-screen2/640/360' },
           { title: '質疑応答', category: 'Mock UI', description: '質疑やコメントのサンプルを差し込む枠。', meta: '反応: 24 (ダミー)', image: 'https://picsum.photos/seed/agon-about-screen3/640/360' }
         ],
         table: {
           columns: ['名称', '担当', '状態', '更新日'],
           rows: [
             ['序章コンテンツ', 'スタッフA', '準備中', '2025/03/01'],
             ['講義ダイジェスト', 'スタッフB', '公開', '2025/03/15'],
             ['解説メモ', 'スタッフC', 'レビュー中', '2025/03/18'],
             ['関連リンク集', 'スタッフD', '公開', '2025/03/20']
           ]
         },
         apiEndpoints: [
           { method: 'GET', path: '/api/mock/about', description: 'ページ用のダミー設定を取得。', note: 'レスポンスは固定値' },
           { method: 'POST', path: '/api/mock/feedback', description: 'フィードバック送信用の仮想エンドポイント。', note: '未接続のため送信のみ表示' },
           { method: 'PUT', path: '/api/mock/library', description: '資料情報の更新デモ。', note: 'UI 連携なし' }
         ],
         roadmap: [
           { title: 'Phase 1', scope: 'コンテンツ草案', items: ['ヒーローコピー作成', 'カード配置確認', '表組みの項目検証'] },
           { title: 'Phase 2', scope: 'デザイン調整', items: ['余白と背景の確認', '画像の差し替え', '色味のチューニング'] },
           { title: 'Phase 3', scope: '公開準備', items: ['文言校正', 'アクセシビリティ確認', '最終レビュー'] }
         ],
         kpis: [
           { label: '閲覧完了', value: '72%', note: 'ダミー値' },
           { label: '資料DL', value: '158件', note: 'モックデータ' },
           { label: '質問投稿', value: '34件', note: '参考値' },
           { label: '満足度', value: '4.6/5', note: 'サンプル集計' }
         ],
         gallery: [
           { title: 'セクション背景', caption: '背景の色味を確認するためのダミー画像。', image: 'https://picsum.photos/seed/agon-about-gallery1/640/360' },
           { title: '資料イメージ', caption: 'テキスト量の見え方をテストするためのサンプル。', image: 'https://picsum.photos/seed/agon-about-gallery2/640/360' },
           { title: '交流の様子', caption: 'コミュニティ写真の差し込み位置を示す枠。', image: 'https://picsum.photos/seed/agon-about-gallery3/640/360' }
         ]
       };
     }
   }

   var NS = window.AgonAbout || (window.AgonAbout = {});
   NS.JobView = NS.JobView || AgonAboutJobView;

 })(window);
