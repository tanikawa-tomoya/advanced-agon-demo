(function () {
  'use strict';

  class JobGeneral
  {
    constructor(service)
    {
      this.service = service;
    }
    
    toSeparatedValues(data, columns, delimiter, quoteChar, includeHeader, eol)
    {
      // data: Array<Object>|Array<Array>
      var q = (typeof quoteChar === 'string' ? quoteChar : '"');
      var sep = (delimiter == null ? ',' : String(delimiter));
      var lineEnd = (typeof eol === 'string' ? eol : '\n');

      function escapeCell(val) {
        if (val == null) return '';
        var s = String(val);
        var needsQuote = s.indexOf(sep) >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0 || s.indexOf(q) >= 0;
        if (s.indexOf(q) >= 0) s = s.split(q).join(q + q); // quote escape
        return needsQuote ? (q + s + q) : s;
      }

      var rows = [];
      if (Array.isArray(data) && data.length > 0) {
        // 推論: columns が無ければ配列の最初の要素からキーを取得
        if (!columns) {
          if (Array.isArray(data[0])) {
            // 配列の配列
            columns = null;
          } else if (typeof data[0] === 'object') {
            columns = Object.keys(data[0]);
          }
        }

        if (includeHeader && columns && columns.length) {
          rows.push(columns.map(escapeCell).join(sep));
        }

        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          if (Array.isArray(row)) {
            rows.push(row.map(escapeCell).join(sep));
          } else if (typeof row === 'object' && row != null) {
            var line = [];
            var keys = columns || Object.keys(row);
            for (var k = 0; k < keys.length; k++) {
              line.push(escapeCell(row[keys[k]]));
            }
            rows.push(line.join(sep));
          } else {
            rows.push(escapeCell(row));
          }
        }
      }
      return rows.join(lineEnd) + lineEnd;
    }

    createBlobFromText(text, mime, bom) {
      var parts = [];
      if (bom) {
        // UTF-8 BOM
        parts.push(new Uint8Array([0xEF, 0xBB, 0xBF]));
      }
      parts.push(text);
      try {
        return new Blob(parts, { type: mime || 'text/plain;charset=utf-8' });
      } catch (e) {
        // 古いブラウザ向けフォールバック（あれば）
        return new Blob(parts);
      }
    }

    triggerDownload(blob, fileName) {
      var url = (w.URL || w.webkitURL).createObjectURL(blob);
      var a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        (w.URL || w.webkitURL).revokeObjectURL(url);
      }, 0);
    }

    copyText(text) {
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(String(text || '')).catch(function(){ /* ignore */ });
      }
      // フォールバック
      var ta = document.createElement('textarea');
      ta.value = String(text || '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      return Promise.resolve();
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Exporter || (Services.Exporter = {});
  NS.JobGeneral = NS.JobGeneral || JobGeneral;    

})(window, document);
