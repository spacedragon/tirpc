"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.socketioServer = socketioServer;
exports.socketioClient = socketioClient;

var _index = require("./index.js");

var debug = require("debug")("socketio-rpc"); /**
                                               * Created by draco on 2016/11/3.
                                               */
function socketioServer(io, impl) {

    var nsp = io.of("/jsonrpc");

    var handler = (0, _index.serverhandler)(impl);

    handler.response = function (data, socket) {
        socket.emit('message_reply', data);
    };

    nsp.on('connection', function (socket) {
        socket.on('message', function (data) {
            handler.onRequest(data, socket);
        });
    });

    return nsp;
}

function socketioClient(io, methods) {
    var nsp = io.of("/jsonrpc");

    return new Promise(function (resolve, reject) {
        nsp.on("connect", function () {
            debug("connected");
            var client = (0, _index.newclient)(methods);
            client.request = function (data) {
                debug("publish", topic, data);
                nsp.emit('message', data);
            };

            nsp.on('message_reply', function (message) {
                client.onResponse(message);
            });
            resolve(client);
        });
        nsp.on('connect_error', function (err) {
            reject(err);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zb2NrZXRpb3JwYy5qcyJdLCJuYW1lcyI6WyJzb2NrZXRpb1NlcnZlciIsInNvY2tldGlvQ2xpZW50IiwiZGVidWciLCJyZXF1aXJlIiwiaW8iLCJpbXBsIiwibnNwIiwib2YiLCJoYW5kbGVyIiwicmVzcG9uc2UiLCJkYXRhIiwic29ja2V0IiwiZW1pdCIsIm9uIiwib25SZXF1ZXN0IiwibWV0aG9kcyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY2xpZW50IiwicmVxdWVzdCIsInRvcGljIiwibWVzc2FnZSIsIm9uUmVzcG9uc2UiLCJlcnIiXSwibWFwcGluZ3MiOiI7Ozs7O1FBT2dCQSxjLEdBQUFBLGM7UUFvQkFDLGMsR0FBQUEsYzs7QUF4QmhCOztBQUVBLElBQUlDLFFBQVFDLFFBQVEsT0FBUixFQUFpQixjQUFqQixDQUFaLEMsQ0FMQTs7O0FBT08sU0FBU0gsY0FBVCxDQUF3QkksRUFBeEIsRUFBNEJDLElBQTVCLEVBQWtDOztBQUVyQyxRQUFJQyxNQUFNRixHQUFHRyxFQUFILENBQU0sVUFBTixDQUFWOztBQUVBLFFBQUlDLFVBQVUsMEJBQWNILElBQWQsQ0FBZDs7QUFFQUcsWUFBUUMsUUFBUixHQUFtQixVQUFVQyxJQUFWLEVBQWVDLE1BQWYsRUFBdUI7QUFDdENBLGVBQU9DLElBQVAsQ0FBWSxlQUFaLEVBQTZCRixJQUE3QjtBQUNILEtBRkQ7O0FBSUFKLFFBQUlPLEVBQUosQ0FBTyxZQUFQLEVBQXFCLFVBQVVGLE1BQVYsRUFBa0I7QUFDbkNBLGVBQU9FLEVBQVAsQ0FBVSxTQUFWLEVBQXFCLFVBQVVILElBQVYsRUFBZ0I7QUFDakNGLG9CQUFRTSxTQUFSLENBQWtCSixJQUFsQixFQUF1QkMsTUFBdkI7QUFDSCxTQUZEO0FBR0gsS0FKRDs7QUFPQSxXQUFPTCxHQUFQO0FBQ0g7O0FBRU0sU0FBU0wsY0FBVCxDQUF3QkcsRUFBeEIsRUFBNEJXLE9BQTVCLEVBQXFDO0FBQ3hDLFFBQUlULE1BQU1GLEdBQUdHLEVBQUgsQ0FBTSxVQUFOLENBQVY7O0FBRUEsV0FBTyxJQUFJUyxPQUFKLENBQVksVUFBQ0MsT0FBRCxFQUFVQyxNQUFWLEVBQXFCO0FBQ3BDWixZQUFJTyxFQUFKLENBQU8sU0FBUCxFQUFrQixZQUFLO0FBQ25CWCxrQkFBTSxXQUFOO0FBQ0EsZ0JBQUlpQixTQUFTLHNCQUFVSixPQUFWLENBQWI7QUFDQUksbUJBQU9DLE9BQVAsR0FBaUIsVUFBQ1YsSUFBRCxFQUFVO0FBQ3ZCUixzQkFBTSxTQUFOLEVBQWlCbUIsS0FBakIsRUFBd0JYLElBQXhCO0FBQ0FKLG9CQUFJTSxJQUFKLENBQVMsU0FBVCxFQUFtQkYsSUFBbkI7QUFDSCxhQUhEOztBQU1BSixnQkFBSU8sRUFBSixDQUFPLGVBQVAsRUFBd0IsVUFBVVMsT0FBVixFQUFtQjtBQUN2Q0gsdUJBQU9JLFVBQVAsQ0FBa0JELE9BQWxCO0FBQ0gsYUFGRDtBQUdBTCxvQkFBUUUsTUFBUjtBQUNILFNBYkQ7QUFjQWIsWUFBSU8sRUFBSixDQUFPLGVBQVAsRUFBdUIsVUFBU1csR0FBVCxFQUFhO0FBQ2hDTixtQkFBT00sR0FBUDtBQUNILFNBRkQ7QUFHSCxLQWxCTSxDQUFQO0FBbUJIIiwiZmlsZSI6InNvY2tldGlvcnBjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDcmVhdGVkIGJ5IGRyYWNvIG9uIDIwMTYvMTEvMy5cbiAqL1xuaW1wb3J0IHtzZXJ2ZXJoYW5kbGVyLCBuZXdjbGllbnR9IGZyb20gXCIuL2luZGV4LmpzXCJcblxudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpKFwic29ja2V0aW8tcnBjXCIpO1xuXG5leHBvcnQgZnVuY3Rpb24gc29ja2V0aW9TZXJ2ZXIoaW8sIGltcGwpIHtcblxuICAgIHZhciBuc3AgPSBpby5vZihcIi9qc29ucnBjXCIpO1xuXG4gICAgdmFyIGhhbmRsZXIgPSBzZXJ2ZXJoYW5kbGVyKGltcGwpO1xuXG4gICAgaGFuZGxlci5yZXNwb25zZSA9IGZ1bmN0aW9uIChkYXRhLHNvY2tldCkge1xuICAgICAgICBzb2NrZXQuZW1pdCgnbWVzc2FnZV9yZXBseScsIGRhdGEpXG4gICAgfTtcblxuICAgIG5zcC5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uIChzb2NrZXQpIHtcbiAgICAgICAgc29ja2V0Lm9uKCdtZXNzYWdlJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGhhbmRsZXIub25SZXF1ZXN0KGRhdGEsc29ja2V0KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cblxuICAgIHJldHVybiBuc3A7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzb2NrZXRpb0NsaWVudChpbywgbWV0aG9kcykge1xuICAgIHZhciBuc3AgPSBpby5vZihcIi9qc29ucnBjXCIpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgbnNwLm9uKFwiY29ubmVjdFwiLCAoKT0+IHtcbiAgICAgICAgICAgIGRlYnVnKFwiY29ubmVjdGVkXCIpO1xuICAgICAgICAgICAgdmFyIGNsaWVudCA9IG5ld2NsaWVudChtZXRob2RzKTtcbiAgICAgICAgICAgIGNsaWVudC5yZXF1ZXN0ID0gKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBkZWJ1ZyhcInB1Ymxpc2hcIiwgdG9waWMsIGRhdGEpO1xuICAgICAgICAgICAgICAgIG5zcC5lbWl0KCdtZXNzYWdlJyxkYXRhKVxuICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICBuc3Aub24oJ21lc3NhZ2VfcmVwbHknLCBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGNsaWVudC5vblJlc3BvbnNlKG1lc3NhZ2UpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlc29sdmUoY2xpZW50KVxuICAgICAgICB9KTtcbiAgICAgICAgbnNwLm9uKCdjb25uZWN0X2Vycm9yJyxmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgcmVqZWN0KGVycilcbiAgICAgICAgfSlcbiAgICB9KTtcbn0iXX0=