define(function(require, exports, module) {
  var E = require('../util/event');
  var D = require('../util/dom');
  var A = require('../util/ajax');

  var TPL_MENU = require('./tpl/menu');

  var isFirefox = navigator.userAgent.indexOf('Firefox') != -1;
  var isOpera = navigator.userAgent.indexOf('Opera') != -1;

  /**
   * 发布框
   * @param cfg 配置项
   *        cfg.textbox 输入框容器
   *        cfg.queryFriendsUrl 好友查询接口地址
   *        cfg.maxSize 提示框允许输入最大字符数
   */
  function PublishBox(cfg) {
    this.config = cfg;
    this._init();
  }

  PublishBox.prototype = {

    /**
     * 初始化
     */
    _init: function() {
      var that = this;

      // 相关视图结点
      var box = document.querySelector(that.config.textbox);
      var menu = document.createElement('ul');
      that.view = {
        box: box,
        menu: menu
      };
      that.state = {
        hover: null, // 当前高亮选项
        open: false, // 提示是否开启
        timeout: 0 // 查询延时器
      };

      // 输入框初始化
      box.contentEditable = true;
      // prevent auto mailto (IE9 only)
      try {
        document.execCommand('AutoUrlDetect', false, false);
      } catch (e) {
      }
      E.on(box, 'keydown', function(evt) {
        var target = evt.target || evt.srcElement;
        if (!target) {
          return;
        }
        if (target && target.className == 'at') { // @人员为一个整体，不能再做编辑
          return;
        }
        if (that.state.open) { // 提示已开启
          if (evt.shiftKey && evt.keyCode == 50) { // @：重新开启提示
            that._abort();
            that._open();
            E.halt(evt);
          } else if (evt.keyCode == 32) { // 空格：关闭提示
            that._abort();
          } else if (evt.keyCode == 13) { // 回车：有高亮时选中，否则关闭提示
            if (that.state.hover) {
              that._select();
            } else {
              that._abort();
            }
            E.halt(evt);
          } else if (evt.keyCode == 38) { // 上箭头：高亮上一个
            that._up();
            E.halt(evt);
          } else if (evt.keyCode == 40) { // 下箭头：高亮下一个
            that._down();
            E.halt(evt);
          } else if (that._text().length > that.config.maxSize) { // 超过最大输入字符数关闭提示
            that._abort();
          } else { // 其他字符做查询
            that._query();
          }
        } else if (evt.shiftKey && evt.keyCode == 50) { // @：开启提示
          that._open();
          E.halt(evt);
        } else if (evt.keyCode == 13) { // 回车：修改默认行为-插入<br/>
          if (!isFirefox) { // Firefox是正常的，其他浏览器有问题
            that._enter(isOpera ? 1 : 2); // Opera需要一个br，其他浏览器需要两个br
            E.halt(evt);
          }
        }
      });

      // 选择框初始化
      menu.className = 'publishbox-menu';
      document.body.appendChild(menu);
      E.on(menu, 'mousemove', function(evt) { // 鼠标高亮选项
        var target = evt.target || evt.srcElement;
        while (target && D.attr(target, 'role') != 'menuItem') {
          if (target == this) {
            return;
          }
          target = target.parentNode;
        }
        if (!target) {
          return;
        }
        if (D.attr(target, 'role') == 'menuItem' && target.className != 'hover') {
          that.state.hover = target;
          for (var i = 0; i < menu.childNodes.length; i++) {
            var child = menu.childNodes[i];
            child.className = child != target ? '' : 'hover';
          }
        }
      });
      E.on(document, 'click', function(evt) { // 鼠标点击选项
        var target = evt.target || evt.srcElement;
        var loop = 3;
        while (loop-- > 0 && target && D.attr(target, 'role') != 'menuItem') {
          target = target.parentNode;
        }
        if (!target) {
          return;
        }
        if (D.attr(target, 'role') == 'menuItem') { // 选中提示选项
          that.state.hover = target;
          that._select();
        } else if (that.state.open) { // 点击其他区域取消提示
          that._abort();
        }
      });
    },

    /**
     * 开启提示
     */
    _open: function() {
      if (window.getSelection) {
        var sel = getSelection();
        if (sel.rangeCount) {
          var range = sel.getRangeAt(0);
          this.state.open = true;
          var node = document.createElement('span');
          node.className = 'input';
          node.innerHTML = '@';
          range.insertNode(node);
          range = document.createRange();
          range.setStart(node, 1);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else {
        var range = document.selection.createRange();
        range.pasteHTML('<span class="input">@</span>');
        this.state.open = true;
        var input = this.view.box.querySelector('.input');
        range.moveToElementText(input);
        range.move('character', 1);
        range.select();
      }
    },

    /**
     * 关闭提示
     */
    _close: function() {
      this.state.hover = null;
      this.state.open = false;
      this.view.menu.innerHTML = '';
      this.view.menu.style.left = '-9999px';
      clearTimeout(this.state.timeout);
    },

    /**
     * 取消提示
     */
    _abort: function() {
      var box = this.view.box;
      var input = box.querySelector('.input');
      if (input) { // 文字结点合并
        var prev = input.previousSibling;
        var next = input.nextSlibing;
        var prevIsText = prev && prev.nodeType == 3;
        var nextIsText = next && next.nodeType == 3;
        var container = null;
        var index = 0;
        if (prevIsText && nextIsText) { // 前后都是文字结点
          var text = D.text(prev) + D.text(input);
          index = text.length;
          text += D.text(next);
          box.removeChild(input);
          box.removeChild(next);
          prev.nodeValue = text;
          container = prev;
        } else if (prevIsText) { // 只有前面是文字结点
          var text = D.text(prev) + D.text(input);
          index = text.length;
          box.removeChild(input);
          prev.nodeValue = text;
          container = prev;
        } else if (nextIsText) { // 只有后面是文字结点
          var text = D.text(input);
          index = text.length;
          text += D.text(next);
          box.removeChild(input);
          next.nodeValue = text;
          container = next;
        } else { // 前后都不是文字结点
          var text = D.text(input);
          index = text.length;
          next = document.createTextNode();
          box.insertBefore(next, input);
          box.removeChild(input);
          next.nodeValue = text;
          container = next;
        }
        // 创建选区
        if (window.getSelection) {
          var sel = getSelection();
          var range = document.createRange();
          range.setStart(container, index);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          try {
            var range = document.body.createTextRange();
            range.moveToElementText(box);
            range.move('character', D.text(box).length - D.text(container).length + index);
            range.select();
          } catch (e) {
          }
        }
      }
      this._close();
    },

    /**
     * 获取@后输入的文字
     */
    _text: function() {
      var box = this.view.box;
      var input = box.querySelector('.input');
      if (input) {
        var text = input.innerHTML;
        if (text.charAt(0) == '@') {
          text = text.substring(1);
        }
        return text;
      }
      return '';
    },

    /**
     * 上一个选项
     */
    _up: function() {
      if (this.state.open && this.state.hover) {
        var hover = this.state.hover;
        var prev = hover.previousSibling;
        if (prev) {
          hover.className = '';
          prev.className = 'hover';
          this.state.hover = prev;
        }
      }
    },

    /**
     * 下一个选项
     */
    _down: function() {
      if (this.state.open && this.state.hover) {
        var hover = this.state.hover;
        var next = hover.nextSibling;
        if (next) {
          hover.className = '';
          next.className = 'hover';
          this.state.hover = next;
        }
      }
    },

    /**
     * 选中当前选项
     */
    _select: function() {
      if (this.state.open && this.state.hover) {
        var box = this.view.box;
        var hover = this.state.hover;
        var input = box.querySelector('.input');
        if (input) {
          var btn;
          if (isFirefox) { // button在火狐下不能用backspace删掉
            btn = document.createElement('input');
            btn.type = 'button';
            btn.value = '+' + hover.querySelector('[role="nick"]').innerHTML;
            btn.style.MozUserSelect = 'none';
          } else {
            btn = document.createElement('button');
            btn.contentEditable = false;
            btn.innerHTML = '+' + hover.querySelector('[role="nick"]').innerHTML;
          }
          btn.setAttribute('data-id', D.attr(hover, 'data-id'));
          btn.className = 'at';
          box.insertBefore(btn, input);
          box.removeChild(input);
          box.lastChild.tagName != 'BR' && box.appendChild(document.createElement('br'));
          // 创建选区
          if (window.getSelection) {
            box.focus();
            var sel = getSelection();
            var range = document.createRange();
            range.setStartAfter(btn);
            range.setEndAfter(btn);
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            btn.unselectable = 'on';
            var range = document.body.createTextRange();
            range.moveToElementText(btn);
            var range1 = document.body.createTextRange();
            range1.setEndPoint('StartToEnd', range);
            range1.move('character', 1);
            range1.select();
          }
        }
      }
      this._close();
    },

    /**
     * 查询
     */
    _query: function() {
      var that = this;
      var menu = that.view.menu;
      clearTimeout(that.state.timeout);
      that.state.timeout = setTimeout(function() {
        that.state.hover = null;
        menu.innerHTML = '';
        menu.style.left = '-9999px';
        var text = that._text();
        text && A.get(that.config.queryFriendsUrl + text, function(result) {
          if (result.code == 0 && result.data && result.data.length) {
            var box = that.view.box;
            var input = box.querySelector('.input');
            if (input) {
              menu.innerHTML = TPL_MENU.render(result.data);
              that.state.hover = menu.firstChild;
              var offset = D.offset(input);
              menu.style.left = offset.left + 'px';
              menu.style.top = offset.top + input.offsetHeight + 'px';
            }
          }
        });
      }, 200);
    },

    /**
     * 修改默认回车行为-插入<br>
     */
    _enter: function(num) {
      if (window.getSelection) {
        var sel = getSelection();
        if (sel.rangeCount) {
          var range = sel.getRangeAt(0);
          range.deleteContents();
          var br = document.createElement('br');
          var br1 = document.createElement('br');
          range.insertNode(br);
          num == 2 && this.view.box.insertBefore(br1, br);
          range.setEndAfter(br);
          range.setStartAfter(br);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else {
        var range = document.selection.createRange();
        range.pasteHTML('<br/>');
        range.select();
      }
    },

    /**
     * 获取/设置输入框中文字
     * @param text {String} 可选，设置的文字
     * @returns 内容文字
     */
    val: function(text) {
      if (text) {
        this.view.box.innerHTML = text;
      } else {
        return D.text(this.view.box);
      }
    },

    /**
     * 获取输入框中所有@对象的id列表
     * @returns {Array<String>} ID列表
     */
    ids: function() {
      var nodes = this.view.box.childNodes;
      var at = [];
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node.nodeType == 1 && node.className == 'at') {
          at.push(D.attr(node, 'data-id'));
        }
      }
      return at;
    }
  };

  module.exports = PublishBox;
});
