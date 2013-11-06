define(function(require, exports, module) {

  /**
   * 渲染提示菜单项方法
   */
  exports.render = function(ctx) {
    var html = '';
    for (var i = 0; i < ctx.length; i++) {
      html +=
        '<li role="menuItem" data-id="' + ctx[i].id + '"' + (i == 0 ? ' class="hover"' : '') + '>\
          <img class="avatar" src="http://wwc.taobaocdn.com/avatar/getAvatar.do?userId=' + ctx[i].id + '&width=30&height=30&type=sns"/>\
          <div class="info">\
            <div role="nick" class="nick">' + ctx[i].nick + '</div>\
            <div class="group">' + ctx[i].group + '</div>\
          </div>\
        </li>';
    }
    return html;
  }
});
