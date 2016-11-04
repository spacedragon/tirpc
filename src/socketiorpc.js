/**
 * Created by draco on 2016/11/3.
 */
import {serverhandler, newclient} from "./index.js"

var debug = require("debug")("socketio-rpc");

export function socketioServer(io, impl) {

    var nsp = io.of("/jsonrpc");

    var handler = serverhandler(impl);

    handler.response = function (data,socket) {
        socket.emit('message_reply', data)
    };

    nsp.on('connection', function (socket) {
        socket.on('message', function (data) {
            handler.onRequest(data,socket);
        });
    });


    return nsp;
}

export function socketioClient(io, methods) {
    var nsp = io.of("/jsonrpc");

    return new Promise((resolve, reject) => {
        nsp.on("connect", ()=> {
            debug("connected");
            var client = newclient(methods);
            client.request = (data) => {
                debug("publish", topic, data);
                nsp.emit('message',data)
            };


            nsp.on('message_reply', function (message) {
                client.onResponse(message)
            });
            resolve(client)
        });
        nsp.on('connect_error',function(err){
            reject(err)
        })
    });
}