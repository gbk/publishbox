define(function(require, exports, module) {

  /**
   * 事件绑定
   */
  exports.on = function(ele, type, fn) {
    if (document.addEventListener) {
      ele.addEventListener(type, fn, false);
    } else {
      ele.attachEvent('on' + type, fn);
    }
  };

  /**
   * 取消冒泡
   */
  exports.halt = function(e) {
    if (e.preventDefault) {
      e.preventDefault();
    } else {
      e.returnValue = false;
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    } else {
      e.cancelBubble = true;
    }
  };
});
