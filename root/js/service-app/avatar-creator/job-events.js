(function () {
  'use strict';

  class JobEvents
  {
    constructor(service) { this.service = service; }

    bind(overlay, handlers, cfg) {
      handlers = handlers || {};
      cfg = cfg || {};
      var nodes = overlay.__acNodes || {};
      var self = this;

      // 初期ズーム設定
      var initial = (typeof cfg.initialScale === 'number') ? cfg.initialScale : 1.0;
      nodes.zoomInput.min = String(cfg.minScale != null ? cfg.minScale : 0.5);
      nodes.zoomInput.max = String(cfg.maxScale != null ? cfg.maxScale : 4.0);
      nodes.zoomInput.value = String(initial);

      // ファイル選択
      var onFileChange = function (ev) {
        var file = ev.target.files && ev.target.files[0];
        if (!file) return;
        var p = handlers.onChooseFile && handlers.onChooseFile(file);
        if (p && typeof p.then === 'function') {
          p.then(function () { /* 読込後の描画は editor 側で実施済み */ });
        }
      };
      nodes.fileInput.addEventListener('change', onFileChange, true);

      // ズーム
      var onZoomInput = function () {
        var scale = parseFloat(nodes.zoomInput.value);
        if (isNaN(scale)) return;
        if (handlers.onZoom) handlers.onZoom(scale);
      };
      nodes.zoomInput.addEventListener('input', onZoomInput, true);

      // 保存
      var onSaveClick = function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        var p = handlers.onSave && handlers.onSave();
        if (p && typeof p.then === 'function') {
          p.then(function () { /* 保存完了後は service 側で close 済み */ });
        }
      };
      nodes.btnSave.addEventListener('click', onSaveClick, true);

      // キャンセル
      var onCancelClick = function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        if (handlers.onCancel) handlers.onCancel();
      };
      nodes.btnCancel.addEventListener('click', onCancelClick, true);

      overlay.__acEventHandlers = {
        onFileChange: onFileChange,
        onZoomInput: onZoomInput,
        onSaveClick: onSaveClick,
        onCancelClick: onCancelClick
      };
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.AvatarCreator || (Services.AvatarCreator = {});
  NS.JobEvents = NS.JobEvents || JobEvents;   

})(window, document);
