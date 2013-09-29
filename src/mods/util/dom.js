define(function(require, exports, module) {

  var testNode = document.createElement('div');
  var getText =
    ('textContent' in testNode)
    ?
    function(ele) {
      return ele.textContent;
    }
    :
    function(ele) {
      var ret = '';
      var nodeType = ele.nodeType;
      if (nodeType === 1) {
        for (ele = ele.firstChild; ele; ele = ele.nextSibling) {
          ret += getText(ele);
        }
      } else if (nodeType === 3 || nodeType === 4) {
        ret += ele.nodeValue;
      }
      return ret;
    };

  /**
   * 获取结点内文字
   */
  exports.text = getText;

  /**
   * 获取结点绝对偏移量
   */
  exports.offset = function(ele) {
    var x = 0;
    var y = 0;
    while (ele.offsetParent) {
      x += ele.offsetLeft;
      y += ele.offsetTop;
      ele = ele.offsetParent;
    }
    return {
      left: x,
      top: y
    };
  };

  /**
   * 获取/设置属性
   */
  exports.attr = function(ele, key, value) {
    if (value === undefined) { // getter
      if (ele && ele.getAttribute) {
        return ele.getAttribute(key);
      } else {
        return null;
      }
    } else { // setter
      if (ele && ele.setAttribute) {
        ele.setAttribute(key, value);
      }
    }
  };

});
