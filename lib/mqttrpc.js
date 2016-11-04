"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.mqttRPCServer = mqttRPCServer;
exports.mqttRPCClient = mqttRPCClient;

var _mqtt = require("mqtt");

var _mqtt2 = _interopRequireDefault(_mqtt);

var _index = require("./index.js");

var _debug = require("./debug");

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function mqttRPCServer(impl, host) {
    var client = _mqtt2.default.connect(host);

    var handler = (0, _index.serverhandler)(impl);

    handler.response = function (data, from) {
        var reply_topic = from + "_reply";
        (0, _debug2.default)("server response", data);

        client.publish(reply_topic, JSON.stringify(data), { qos: 1 });
    };

    client.subscribe("rpc");
    client.subscribe("init");
    client.on('message', function (t, message) {
        (0, _debug2.default)("server receive,", t, message);

        if (t == "rpc") {
            var data = JSON.parse(message);
            handler.onRequest(data, data.from);
        } else if (t == "init") {
            var id = message;
            var methods = Object.keys(impl);
            (0, _debug2.default)("reply to init");
            client.publish(id + "_init_reply", JSON.stringify(methods), { qos: 2 });
        }
    });

    return client;
}

function mqttRPCClient(host, id, methods) {
    var client = _mqtt2.default.connect(host);
    id = id || client.clientId;

    return new Promise(function (resolve, reject) {
        client.on("connect", function () {
            (0, _debug2.default)(id, "connected", methods);
            var proxy = null;
            var responseTopic = id + "_reply";

            if (methods) {
                proxy = client(methods);
                client.subscribe(responseTopic);
                client.on('message', function (t, message) {
                    if (t == responseTopic) {
                        proxy.onResponse(JSON.parse(message));
                    }
                });
                resolve(proxy);
            } else {
                var init_reply = id + "_init_reply";
                var methods;
                client.on('message', function (t, message) {
                    (0, _debug2.default)("client receive,", t, message);
                    if (t == init_reply && !methods) {
                        client.unsubscribe(init_reply);
                        methods = JSON.parse(message);
                        (0, _debug2.default)(methods);
                        proxy = (0, _index.newclient)(methods);
                        resolve(proxy);
                    } else if (t == responseTopic) {
                        proxy.onResponse(JSON.parse(message));
                    }
                });
                client.publish("init", id);
                client.subscribe(init_reply);
                client.subscribe(responseTopic);
            }
        });
    }).then(function (p) {
        p.request = function (data) {
            data.from = id;
            (0, _debug2.default)("publish", data);
            client.publish('rpc', JSON.stringify(data), { qos: 2 });
        };
        return p;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tcXR0cnBjLmpzIl0sIm5hbWVzIjpbIm1xdHRSUENTZXJ2ZXIiLCJtcXR0UlBDQ2xpZW50IiwiaW1wbCIsImhvc3QiLCJjbGllbnQiLCJjb25uZWN0IiwiaGFuZGxlciIsInJlc3BvbnNlIiwiZGF0YSIsImZyb20iLCJyZXBseV90b3BpYyIsInB1Ymxpc2giLCJKU09OIiwic3RyaW5naWZ5IiwicW9zIiwic3Vic2NyaWJlIiwib24iLCJ0IiwibWVzc2FnZSIsInBhcnNlIiwib25SZXF1ZXN0IiwiaWQiLCJtZXRob2RzIiwiT2JqZWN0Iiwia2V5cyIsImNsaWVudElkIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwcm94eSIsInJlc3BvbnNlVG9waWMiLCJvblJlc3BvbnNlIiwiaW5pdF9yZXBseSIsInVuc3Vic2NyaWJlIiwidGhlbiIsInAiLCJyZXF1ZXN0Il0sIm1hcHBpbmdzIjoiOzs7OztRQUtnQkEsYSxHQUFBQSxhO1FBK0JBQyxhLEdBQUFBLGE7O0FBcENoQjs7OztBQUNBOztBQUVBOzs7Ozs7QUFFTyxTQUFTRCxhQUFULENBQXVCRSxJQUF2QixFQUE2QkMsSUFBN0IsRUFBbUM7QUFDdEMsUUFBSUMsU0FBUyxlQUFLQyxPQUFMLENBQWFGLElBQWIsQ0FBYjs7QUFFQSxRQUFJRyxVQUFVLDBCQUFjSixJQUFkLENBQWQ7O0FBRUFJLFlBQVFDLFFBQVIsR0FBbUIsVUFBVUMsSUFBVixFQUFnQkMsSUFBaEIsRUFBc0I7QUFDckMsWUFBSUMsY0FBY0QsT0FBTyxRQUF6QjtBQUNBLDZCQUFNLGlCQUFOLEVBQXlCRCxJQUF6Qjs7QUFFQUosZUFBT08sT0FBUCxDQUFlRCxXQUFmLEVBQTRCRSxLQUFLQyxTQUFMLENBQWVMLElBQWYsQ0FBNUIsRUFBa0QsRUFBQ00sS0FBSyxDQUFOLEVBQWxEO0FBQ0gsS0FMRDs7QUFPQVYsV0FBT1csU0FBUCxDQUFpQixLQUFqQjtBQUNBWCxXQUFPVyxTQUFQLENBQWlCLE1BQWpCO0FBQ0FYLFdBQU9Z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QUFPTyxPQUFQLENBQWUsS0FBZixFQUFzQkMsS0FBS0MsU0FBTCxDQUFlTCxJQUFmLENBQXRCLEVBQTRDLEVBQUNNLEtBQUssQ0FBTixFQUE1QztBQUNILFNBSkQ7QUFLQSxlQUFPcUIsQ0FBUDtBQUNILEtBN0NNLENBQVA7QUE4Q0giLCJmaWxlIjoibXF0dHJwYy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBtcXR0IGZyb20gXCJtcXR0XCJcbmltcG9ydCB7c2VydmVyaGFuZGxlciwgbmV3Y2xpZW50fSBmcm9tIFwiLi9pbmRleC5qc1wiXG5cbmltcG9ydCBkZWJ1ZyBmcm9tIFwiLi9kZWJ1Z1wiXG5cbmV4cG9ydCBmdW5jdGlvbiBtcXR0UlBDU2VydmVyKGltcGwsIGhvc3QpIHtcbiAgICB2YXIgY2xpZW50ID0gbXF0dC5jb25uZWN0KGhvc3QpO1xuXG4gICAgdmFyIGhhbmRsZXIgPSBzZXJ2ZXJoYW5kbGVyKGltcGwpO1xuXG4gICAgaGFuZGxlci5yZXNwb25zZSA9IGZ1bmN0aW9uIChkYXRhLCBmcm9tKSB7XG4gICAgICAgIHZhciByZXBseV90b3BpYyA9IGZyb20gKyBcIl9yZXBseVwiO1xuICAgICAgICBkZWJ1ZyhcInNlcnZlciByZXNwb25zZVwiLCBkYXRhKTtcblxuICAgICAgICBjbGllbnQucHVibGlzaChyZXBseV90b3BpYywgSlNPTi5zdHJpbmdpZnkoZGF0YSksIHtxb3M6IDF9KVxuICAgIH07XG5cbiAgICBjbGllbnQuc3Vic2NyaWJlKFwicnBjXCIpO1xuICAgIGNsaWVudC5zdWJzY3JpYmUoXCJpbml0XCIpO1xuICAgIGNsaWVudC5vbignbWVzc2FnZScsIGZ1bmN0aW9uICh0LCBtZXNzYWdlKSB7XG4gICAgICAgIGRlYnVnKFwic2VydmVyIHJlY2VpdmUsXCIsIHQsIG1lc3NhZ2UpO1xuXG4gICAgICAgIGlmICh0ID09IFwicnBjXCIpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgICAgIGhhbmRsZXIub25SZXF1ZXN0KGRhdGEsIGRhdGEuZnJvbSk7XG4gICAgICAgIH0gZWxzZSBpZiAodCA9PSBcImluaXRcIikge1xuICAgICAgICAgICAgdmFyIGlkID0gbWVzc2FnZTtcbiAgICAgICAgICAgIHZhciBtZXRob2RzID0gT2JqZWN0LmtleXMoaW1wbCk7XG4gICAgICAgICAgICBkZWJ1ZyhcInJlcGx5IHRvIGluaXRcIik7XG4gICAgICAgICAgICBjbGllbnQucHVibGlzaChpZCArIFwiX2luaXRfcmVwbHlcIiwgSlNPTi5zdHJpbmdpZnkobWV0aG9kcyksIHtxb3M6IDJ9KVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2xpZW50O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbXF0dFJQQ0NsaWVudChob3N0LCBpZCwgbWV0aG9kcykge1xuICAgIHZhciBjbGllbnQgPSBtcXR0LmNvbm5lY3QoaG9zdCk7XG4gICAgaWQgPSBpZCB8fCBjbGllbnQuY2xpZW50SWQ7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjbGllbnQub24oXCJjb25uZWN0XCIsICgpPT4ge1xuICAgICAgICAgICAgZGVidWcoaWQsIFwiY29ubmVjdGVkXCIsIG1ldGhvZHMpO1xuICAgICAgICAgICAgdmFyIHByb3h5ID0gbnVsbDtcbiAgICAgICAgICAgIHZhciByZXNwb25zZVRvcGljID0gaWQgKyBcIl9yZXBseVwiO1xuXG4gICAgICAgICAgICBpZiAobWV0aG9kcykge1xuICAgICAgICAgICAgICAgIHByb3h5ID0gY2xpZW50KG1ldGhvZHMpO1xuICAgICAgICAgICAgICAgIGNsaWVudC5zdWJzY3JpYmUocmVzcG9uc2VUb3BpYyk7XG4gICAgICAgICAgICAgICAgY2xpZW50Lm9uKCdtZXNzYWdlJywgZnVuY3Rpb24gKHQsIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgPT0gcmVzcG9uc2VUb3BpYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJveHkub25SZXNwb25zZShKU09OLnBhcnNlKG1lc3NhZ2UpKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwcm94eSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGluaXRfcmVwbHkgPSBpZCArIFwiX2luaXRfcmVwbHlcIjtcbiAgICAgICAgICAgICAgICB2YXIgbWV0aG9kcztcbiAgICAgICAgICAgICAgICBjbGllbnQub24oJ21lc3NhZ2UnLCBmdW5jdGlvbiAodCwgbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1ZyhcImNsaWVudCByZWNlaXZlLFwiLCB0LCBtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgPT0gaW5pdF9yZXBseSAmJiAhbWV0aG9kcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50LnVuc3Vic2NyaWJlKGluaXRfcmVwbHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kcyA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1ZyhtZXRob2RzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3h5ID0gbmV3Y2xpZW50KG1ldGhvZHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShwcm94eSlcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0ID09IHJlc3BvbnNlVG9waWMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3h5Lm9uUmVzcG9uc2UoSlNPTi5wYXJzZShtZXNzYWdlKSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNsaWVudC5wdWJsaXNoKFwiaW5pdFwiLCBpZCk7XG4gICAgICAgICAgICAgICAgY2xpZW50LnN1YnNjcmliZShpbml0X3JlcGx5KTtcbiAgICAgICAgICAgICAgICBjbGllbnQuc3Vic2NyaWJlKHJlc3BvbnNlVG9waWMpO1xuXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICB9KS50aGVuKHAgPT4ge1xuICAgICAgICBwLnJlcXVlc3QgPSAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgZGF0YS5mcm9tID0gaWQ7XG4gICAgICAgICAgICBkZWJ1ZyhcInB1Ymxpc2hcIiwgZGF0YSk7XG4gICAgICAgICAgICBjbGllbnQucHVibGlzaCgncnBjJywgSlNPTi5zdHJpbmdpZnkoZGF0YSksIHtxb3M6IDJ9KVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9KTtcbn0iXX0=