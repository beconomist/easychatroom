// var express = require('express');
// var app = express();
//
// app.get('/', function(req, res) {
//   res.send('Hello World!');
// });
//
// app.listen(process.env.PORT || 3000, function(){
//   console.log("Easychatroom app listening on port " + process.env.PORT);
// });

var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

function send404(response) {
  response.writeHead(404, {'Content-Type': 'text/plain'});
  response.write('Error 404: resource not found.');
  response.end();
}

function sendFile(response, filePath, fileContent) {
  response.writeHead(
    200, {'Content-Type': mime.lookup(path.basename(filePath))}
  );
  response.end(fileContent);
}

function serveStatic(response, cache, absPath) {
  if(cache[absPath]) {
    sendFile(response, absPath, cache[absPath]);
  } else {
    fs.exists(absPath, function(exists) {
      if (exists) {
        fs.readFile(absPath, function(err, data) {
          if (err) {
            send404(response);
          } else {
            cache[absPath] = data;
            sendFile(response, absPath, data);
          }
        });
      } else {
        send404(response);
      }
    });
  }
}

// Create http server (回覆靜態網頁)
var server = http.createServer(function(request, response) {
  var filePath = false;

  if (request.url == '/') {
    filePath = 'public/index.html';
  } else {
    filePath = 'public' + request.url;
  }

  var absPath = './' + filePath;
  serveStatic(response, cache, absPath);
})

// Start http server
server.listen(process.env.PORT || 3000, function() {
  console.log("Server listening on port: " + process.env.PORT);
});

// Link to chat server
var chatServer = require('./lib/chat_server');
// Start chat server
chatServer.listen(server);
