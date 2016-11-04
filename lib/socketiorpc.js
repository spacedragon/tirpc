"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.socketioServer = socketioServer;
exports.socketioClient = socketioClient;

var _index = require("./index.js");

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
} /**
   * Created by draco on 2016/11/3.
   */
function socketioClient(io, methods) {
    var nsp = io.of("/jsonrpc");

    return new Promise(function (resolve, reject) {
        nsp.on("connect", function () {
            console.log("connected");
            var proxy = (0, _index.newclient)(methods);
            proxy.request = function (data) {
                console.log("publish", topic, data);
                nsp.emit('message', data);
            };

            _index.newclient.on('message_reply', function (message) {
                proxy.onResponse(message);
            });
            resolve(proxy);
        });
        nsp.on('connect_error', function (err) {
            reject(err);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zb2NrZXRpb3JwYy5qcyJdLCJuYW1lcyI6WyJzb2NrZXRpb1NlcnZlciIsInNvY2tldGlvQ2xpZW50IiwiaW8iLCJpbXBsIiwibnNwIiwib2YiLCJoYW5kbGVyIiwicmVzcG9uc2UiLCJkYXRhIiwic29ja2V0IiwiZW1pdCIsIm9uIiwib25SZXF1ZXN0IiwibWV0aG9kcyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY29uc29sZSIsImxvZyIsInByb3h5IiwicmVxdWVzdCIsInRvcGljIiwibWVzc2FnZSIsIm9uUmVzcG9uc2UiLCJlcnIiXSwibWFwcGluZ3MiOiI7Ozs7O1FBTWdCQSxjLEdBQUFBLGM7UUFvQkFDLGMsR0FBQUEsYzs7QUF2QmhCOztBQUdPLFNBQVNELGNBQVQsQ0FBd0JFLEVBQXhCLEVBQTRCQyxJQUE1QixFQUFrQzs7QUFFckMsUUFBSUMsTUFBTUYsR0FBR0csRUFBSCxDQUFNLFVBQU4sQ0FBVjs7QUFFQSxRQUFJQyxVQUFVLDBCQUFjSCxJQUFkLENBQWQ7O0FBRUFHLFlBQVFDLFFBQVIsR0FBbUIsVUFBVUMsSUFBVixFQUFlQyxNQUFmLEVBQXVCO0FBQ3RDQSxlQUFPQyxJQUFQLENBQVksZUFBWixFQUE2QkYsSUFBN0I7QUFDSCxLQUZEOztBQUlBSixRQUFJTyxFQUFKLENBQU8sWUFBUCxFQUFxQixVQUFVRixNQUFWLEVBQWtCO0FBQ25DQSxlQUFPRSxFQUFQLENBQVUsU0FBVixFQUFxQixVQUFVSCxJQUFWLEVBQWdCO0FBQ2pDRixvQkFBUU0sU0FBUixDQUFrQkosSUFBbEIsRUFBdUJDLE1BQXZCO0FBQ0gsU0FGRDtBQUdILEtBSkQ7O0FBT0EsV0FBT0wsR0FBUDtBQUNILEMsQ0F4QkQ7OztBQTBCTyxTQUFTSCxjQUFULENBQXdCQyxFQUF4QixFQUE0QlcsT0FBNUIsRUFBcUM7QUFDeEMsUUFBSVQsTUFBTUYsR0FBR0csRUFBSCxDQUFNLFVBQU4sQ0FBVjs7QUFFQSxXQUFPLElBQUlTLE9BQUosQ0FBWSxVQUFDQyxPQUFELEVBQVVDLE1BQVYsRUFBcUI7QUFDcENaLFlBQUlPLEVBQUosQ0FBTyxTQUFQLEVBQWtCLFlBQUs7QUFDbkJNLG9CQUFRQyxHQUFSLENBQVksV0FBWjtBQUNBLGdCQUFJQyxRQUFRLHNCQUFVTixPQUFWLENBQVo7QUFDQU0sa0JBQU1DLE9BQU4sR0FBZ0IsVUFBQ1osSUFBRCxFQUFVO0FBQ3RCUyx3QkFBUUMsR0FBUixDQUFZLFNBQVosRUFBdUJHLEtBQXZCLEVBQThCYixJQUE5QjtBQUNBSixvQkFBSU0sSUFBSixDQUFTLFNBQVQsRUFBbUJGLElBQW5CO0FBQ0gsYUFIRDs7QUFNQSw2QkFBVUcsRUFBVixDQUFhLGVBQWIsRUFBOEIsVUFBVVcsT0FBVixFQUFtQjtBQUM3Q0gsc0JBQU1JLFVBQU4sQ0FBaUJELE9BQWpCO0FBQ0gsYUFGRDtBQUdBUCxvQkFBUUksS0FBUjtBQUNILFNBYkQ7QUFjQWYsWUFBSU8sRUFBSixDQUFPLGVBQVAsRUFBdUIsVUFBU2EsR0FBVCxFQUFhO0FBQ2hDUixtQkFBT1EsR0FBUDtBQUNILFNBRkQ7QUFHSCxLQWxCTSxDQUFQO0FBbUJIIiwiZmlsZSI6InNvY2tldGlvcnBjLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDcmVhdGVkIGJ5IGRyYWNvIG9uIDIwMTYvMTEvMy5cbiAqL1xuaW1wb3J0IHtzZXJ2ZXJoYW5kbGVyLCBuZXdjbGllbnR9IGZyb20gXCIuL2luZGV4LmpzXCJcblxuXG5leHBvcnQgZnVuY3Rpb24gc29ja2V0aW9TZXJ2ZXIoaW8sIGltcGwpIHtcblxuICAgIHZhciBuc3AgPSBpby5vZihcIi9qc29ucnBjXCIpO1xuXG4gICAgdmFyIGhhbmRsZXIgPSBzZXJ2ZXJoYW5kbGVyKGltcGwpO1xuXG4gICAgaGFuZGxlci5yZXNwb25zZSA9IGZ1bmN0aW9uIChkYXRhLHNvY2tldCkge1xuICAgICAgICBzb2NrZXQuZW1pdCgnbWVzc2FnZV9yZXBseScsIGRhdGEpXG4gICAgfTtcblxuICAgIG5zcC5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uIChzb2NrZXQpIHtcbiAgICAgICAgc29ja2V0Lm9uKCdtZXNzYWdlJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGhhbmRsZXIub25SZXF1ZXN0KGRhdGEsc29ja2V0KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cblxuICAgIHJldHVybiBuc3A7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzb2NrZXRpb0NsaWVudChpbywgbWV0aG9kcykge1xuICAgIHZhciBuc3AgPSBpby5vZihcIi9qc29ucnBjXCIpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgbnNwLm9uKFwiY29ubmVjdFwiLCAoKT0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGVkXCIpO1xuICAgICAgICAgICAgdmFyIHByb3h5ID0gbmV3Y2xpZW50KG1ldGhvZHMpO1xuICAgICAgICAgICAgcHJveHkucmVxdWVzdCA9IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJwdWJsaXNoXCIsIHRvcGljLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBuc3AuZW1pdCgnbWVzc2FnZScsZGF0YSlcbiAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgbmV3Y2xpZW50Lm9uKCdtZXNzYWdlX3JlcGx5JywgZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBwcm94eS5vblJlc3BvbnNlKG1lc3NhZ2UpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlc29sdmUocHJveHkpXG4gICAgICAgIH0pO1xuICAgICAgICBuc3Aub24oJ2Nvbm5lY3RfZXJyb3InLGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICByZWplY3QoZXJyKVxuICAgICAgICB9KVxuICAgIH0pO1xufSJdfQ==