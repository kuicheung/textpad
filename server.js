var express = require('express');
var app = express();
var server = require('http').createServer(app);
var fs = require('fs');
var io = require('socket.io')(server);
var _ = require('lodash');


app.get('/room/*', function(req, res) {
    var options = {
        root: __dirname + '/',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    res.sendFile('index.html', options, function (err) {
        if (err) {
            console.log(err);
            res.status(err.status).end();
        }
        else {
            console.log('Sent index.html');
        }
    });
});

var rooms = ['/aaa','/bbb'];
_.forEach(rooms, function(room) {
    var queue = [];
    var startTime;
    var playback;
    console.log(room);
    var iosa = io.of(room);
    iosa.on("connection", function (socket) {
        console.log('connection');

        socket.on('message', function (message) {
            console.log(message);
            if (queue.length === 0) {
                startTime = Date.now();
            }
            var history = [Date.now() - startTime, message.text];
            queue.push(history);
            iosa.emit("message", {id:message.id,message:history});
        });

        socket.on('playback', function (message) {
            console.log(message);
            message = JSON.parse(message);
            if (message.playback === true) {
                var temp = queue.slice();
                var startTime;
                var current;
                playback = setInterval(function () {
                    if (temp.length === 0) {
                        console.log('done');
                        clearInterval(playback);
                        return;
                    }
                    if (temp.length === queue.length) {
                        startTime = Date.now();
                        current = temp.shift();
                    }
                    var time = current[0];
                    var text = current[1];
                    if (time < (Date.now() - startTime)) {
                        iosa.emit("message", {id:0,message:current});
                        current = temp.shift();
                    }
                }, 50);
            }
            else if (message.playback === false) {
                clearInterval(playback);
            }
        });
        socket.on('clearQueue', function (message) {
            console.log(message);
            message = JSON.parse(message);
            if (message.clearQueue) {
                queue = [];
                iosa.emit('message', {id:0,message:[0, '']});
            }
        });
        socket.on('disconnect', function () {
            console.log('disconnect');
        });
    });
});

server.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

