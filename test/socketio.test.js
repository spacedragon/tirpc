import {serverhandler, newclient} from "../src/index.js";

import {assert} from "chai"

var debug = require('debug')('test');


suite('socket.io', function () {
    var impl = {
        add(a, b) {
            return a + b;
        },
        callback(clientFunc) {  // this method receives a callback function
            for (var i = 4; i >= 0; i--) {
                clientFunc(i).then(msgFromClient => {
                    debug("msg from client,",msgFromClient)
                })
            }
            return new Promise((close,reject)=> {
                setTimeout(close,  1000)
            });
        }
    };

    var server = serverhandler(impl);

    var client = newclient(["add", "callback"]);


    var io = require('socket.io').listen(5000);
    setup(function (done) {
        var nsp = io.of("/tirpc");
        var ready = 0;
        nsp.on('connection', function (socket) {
            debug("connected", socket.id);
            socket.on('message', function (data) {
                server.onRequest(data, socket);
            });
            debug("server initiated");
            ready++;
            if (ready == 2)
                done()
        });

        server.response = function (data, socket) {
            nsp.emit('message_reply', data);  // use 'message_reply' event for response
        };

        var socket = require('socket.io-client')("http://localhost:5000/tirpc");
        socket.on("connect", ()=> {

            client.request = (data) => {
                debug("emitting", data);
                socket.emit('message', data)
            };

            socket.on('message_reply', function (message) {  // response is coming.
                client.onResponse(message)
            });
            debug("client initiated.");
            ready++;
            if (ready == 2)
                done()
        });
    });

    test('1 加 1 应该等于 2', function (done) {
        client.add(1, 1).then((result)=> {
            assert.equal(result, 2);
            done()
        })
    });

    test("callback", function (done) {
        client.callback(count => {
            debug("counter,", count);
            if (count <= 0)
                done();
            return "count " + count;
        })
    })
});