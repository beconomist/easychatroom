function divEscapedContentElement(message) {
  return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
  return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput(chatApp, socket) {
  var message = $('#send-message').val();
  var systemMessage;

  if (message.charAt(0) == '/') {
    systemMessage = chatApp.processCommand(message);
    if (systemMessage) {
      $('#messages').append(divSystemContentElement(systemMessage);
    }
  } else {
    chatApp.sendMessage($('#room').text(), message);
    $('#messages').append(divEscapedContentElement(message));
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
  }
  $('#send-message').val();
}

// 以下的Code是client-side initiaion of Socket.IO
var socket = io.connect();

$(document).ready(function() {
  var chatApp = new Chat(socket);

  // 當名字變更時
  socket.on('nameResult', function(result) {
    var message;

    if (result.success) {
      message = '你現在是 ' + result.name + ' 了。';
    } else {
      message = result.message;
    }

    $('#messages').append(divSystemContentElement(message));
  });

  // 當換聊天房間時
  socket.on('joinResult', function(result) {
    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('換房間囉'));
  });

  // 當收到訊息時
  socket.on('message', function(message) {
    var newElement = $('<div></div>').text(message.text); // 顯示收到的訊息
    $('#messages').append(newElement);
  })

  socket.on('rooms', function(rooms) {
    $('#room-list').empty;

    for (var room in rooms) {
      room = room.substring(1, room.length);
      if (room != '') {
        $('#room-list').append(divEscapedContentElement(room));
      }
    }
    // 當使用者從房間清單上點選房間時，可直接跳過去該房間
    $('#room-list div').click(function() {
      chatApp.processCommand('/join' + $(this).text());
      $('#send-message').focus();
    });
  });

  setInterval(function() { // 每隔1000ms自動更新最新的房間清單
    socket.emit('rooms');
  }, 1000);

  $('#send-message').focus();

  $('#send-form').submit(function() {
    processUserInput(chatApp, socket);
    return false;
  });
});
