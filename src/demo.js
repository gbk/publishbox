define(function(require, exports, module) {
  var E = require('./mods/util/event');

  var PublishBox = require('./mods/publishbox/index');

  // 创建输入框对象
  var publishBox = new PublishBox({
    textbox: '#J_TextBox', // 输入框选择器
    queryFriendsUrl: './mock/query_friends.json?q=', // 提示好友查询地址
    maxSize: 20 // 提示最大长度
  });

  E.on(document.getElementById('J_Button'), 'click', function() {
    document.getElementById('J_Content').innerHTML = publishBox.val();
    document.getElementById('J_Ids').innerHTML = publishBox.ids();
  });

});
