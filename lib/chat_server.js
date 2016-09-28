var socketio = require('socket.io');
var io;
var guestNumber = 1; // 每一個 socket 都會增加一個 guestNumber
var nickNames = {}; // 每一個 socket.id的nickname
var namesUsed = []; // 所有使用中的 nickname
var currentRoom = {}; // 每一個socket.id現在所在的聊天室房間

exports.listen = function(server) { // chat server啟動及基本設定
  io = socketio.listen(server);
  io.set('log level', 1);

  io.sockets.on('connect', function(socket) { // 當有 socket 連線進來時，要做的基本動作
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);

    joinRoom(socket, 'Lobby');

    handleMessageBroadcasting(socket, nickNames); // event emitter，處理訊息傳送
    handleNameChangeAttempts(socket, nickNames, namesUsed); // event emitter，處理變更暱稱
    handleRoomJoining(socket); // event emitter，處理加入或新增聊天室房間

    socket.on('room', function() { // 顯示使用中的聊天室清單
      socket.emit('room', io.sockets.manager.rooms);
    });

    handleClientDisconnection(socket, nickNames, namesUsed); // event emitter

  })
}

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  var name = 'Guest' + guestNumber;
  nickNames[socket.id] = name;
  socket.emit('nameResult', {
    success: true,
    name: name
  });
  namesUsed.push(name);
  return guestNumber + 1;
}

function joinRoom(socket, room) {
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit('joinResult', {room: room});
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });

  var usersInRoom = io.sockets.clients(room); // 回傳的是 array
  if (usersInRoom.length > 1) {
    var usersInRoomSummary = 'Users current in ' + room + ': ';
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id;
      if (userSocketId != socket.id) { // 不是自己的才要加到 summary 裡
        if (index > 0) { // 第一個名字前面不需要加逗號
          usersInRoomSummary += ', ';
        }
        usersInRoomSummary += nickNames[userSocketId];
      }
    }
    usersInRoomSummary += '.'; // 最後加上句號
    socket.emit('message', {text: usersInRoomSummary});
  }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
  socket.on('nameAttempt', function(name) {
    if (name.indexOf('Guest') == 0) { // 如果名字是 Guest 開頭
      socket.emit('nameResult', { // 丟錯誤訊息
        success: false,
        message: 'Names cannot begin with "Guest".'
      });
    } else { // 如果名字不是 Guest 開頭
      if (namesUsed.indexOf(name) == -1) { // 如果名字還沒被註冊過
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previousNameIndex]; // 刪除舊的名字

        socket.emit('nameResult', { // 回傳使用者名字註冊成功
          success: true,
          name: name
        });

        socket.broadcast.to(currentRoom[socket.id]).emit('message', { // 告訴其他使用者使用者名字變更
          text: previousName + ' is now known as ' + name + '.'
        });
      } else { // 名字已被註冊過
        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use.'
        });
      }
    }
  });
}

function handleMessageBroadcasting(socket) {
  socket.on('message', function(message) {   // 當 socket有'message'事件時
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': ' + message.text
    }); // 將訊息傳到現在所在房間
  });
}

function handRoomJoining(socket) {
  socket.on('join', function(room) {  // 當socket有'join'事件時
    socket.leave(currentRoom[socket.id]); // socket先離開目前的房間
    joinRoom(socket, room.newRoom) // socket加入新的房間 room.newRoom
  })
}

function handleClientDisconnection(socket) {
  socket.on('disconnect', function() {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}
