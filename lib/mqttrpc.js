"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.mqttRPCServer = mqttRPCServer;
exports.mqttRPCClient = mqttRPCClient;

var _mqtt = require("mqtt");

var _mqtt2 = _interopRequireDefault(_mqtt);

var _index = require("./index.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require("debug")("mqtt-rpc");

function mqttRPCServer(impl, host) {
    var client = _mqtt2.default.connect(host);

    var handler = (0, _index.serverhandler)(impl);

    handler.response = function (data, from) {
        var reply_topic = from + "_reply";
        debug("server response", data);

        client.publish(reply_topic, JSON.stringify(data), { qos: 1 });
    };

    client.subscribe("rpc");
    client.subscribe("init");
    client.on('message', function (t, message) {
        debug("server receive,", t, message);

        if (t == "rpc") {
            var data = JSON.parse(message);
            handler.onRequest(data, data.from);
        } else if (t == "init") {
            var id = message;
            var methods = Object.keys(impl);
            debug("reply to init");
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
            debug(id, "connected", methods);
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
                    debug("client receive,", t, message);
                    if (t == init_reply && !methods) {
                        client.unsubscribe(init_reply);
                        methods = JSON.parse(message);
                        debug(methods);
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
            debug("publish", data);
            client.publish('rpc', JSON.stringify(data), { qos: 2 });
        };
        return p;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tcXR0cnBjLmpzIl0sIm5hbWVzIjpbIm1xdHRSUENTZXJ2ZXIiLCJtcXR0UlBDQ2xpZW50IiwiZGVidWciLCJyZXF1aXJlIiwiaW1wbCIsImhvc3QiLCJjbGllbnQiLCJjb25uZWN0IiwiaGFuZGxlciIsInJlc3BvbnNlIiwiZGF0YSIsImZyb20iLCJyZXBseV90b3BpYyIsInB1Ymxpc2giLCJKU09OIiwic3RyaW5naWZ5IiwicW9zIiwic3Vic2NyaWJlIiwib24iLCJ0IiwibWVzc2FnZSIsInBhcnNlIiwib25SZXF1ZXN0IiwiaWQiLCJtZXRob2RzIiwiT2JqZWN0Iiwia2V5cyIsImNsaWVudElkIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwcm94eSIsInJlc3BvbnNlVG9waWMiLCJvblJlc3BvbnNlIiwiaW5pdF9yZXBseSIsInVuc3Vic2NyaWJlIiwidGhlbiIsInAiLCJyZXF1ZXN0Il0sIm1hcHBpbmdzIjoiOzs7OztRQU9nQkEsYSxHQUFBQSxhO1FBK0JBQyxhLEdBQUFBLGE7O0FBdENoQjs7OztBQUNBOzs7O0FBR0EsSUFBSUMsUUFBUUMsUUFBUSxPQUFSLEVBQWlCLFVBQWpCLENBQVo7O0FBR08sU0FBU0gsYUFBVCxDQUF1QkksSUFBdkIsRUFBNkJDLElBQTdCLEVBQW1DO0FBQ3RDLFFBQUlDLFNBQVMsZUFBS0MsT0FBTCxDQUFhRixJQUFiLENBQWI7O0FBRUEsUUFBSUcsVUFBVSwwQkFBY0osSUFBZCxDQUFkOztBQUVBSSxZQUFRQyxRQUFSLEdBQW1CLFVBQVVDLElBQVYsRUFBZ0JDLElBQWhCLEVBQXNCO0FBQ3JDLFlBQUlDLGNBQWNELE9BQU8sUUFBekI7QUFDQVQsY0FBTSxpQkFBTixFQUF5QlEsSUFBekI7O0FBRUFKLGVBQU9PLE9BQVAsQ0FBZUQsV0FBZixFQUE0QkUsS0FBS0MsU0FBTCxDQUFlTCxJQUFmLENBQTVCLEVBQWtELEVBQUNNLEtBQUssQ0FBTixFQUFsRDtBQUNILEtBTEQ7O0FBT0FWLFdBQU9XLFNB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QUFDbEJBLGlCQUFLQyxJQUFMLEdBQVlZLEVBQVo7QUFDQXJCLGtCQUFNLFNBQU4sRUFBaUJRLElBQWpCO0FBQ0FKLG1CQUFPTyxPQUFQLENBQWUsS0FBZixFQUFzQkMsS0FBS0MsU0FBTCxDQUFlTCxJQUFmLENBQXRCLEVBQTRDLEVBQUNNLEtBQUssQ0FBTixFQUE1QztBQUNILFNBSkQ7QUFLQSxlQUFPcUIsQ0FBUDtBQUNILEtBN0NNLENBQVA7QUE4Q0giLCJmaWxlIjoibXF0dHJwYy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBtcXR0IGZyb20gXCJtcXR0XCJcbmltcG9ydCB7c2VydmVyaGFuZGxlciwgbmV3Y2xpZW50fSBmcm9tIFwiLi9pbmRleC5qc1wiXG5cblxudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpKFwibXF0dC1ycGNcIik7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIG1xdHRSUENTZXJ2ZXIoaW1wbCwgaG9zdCkge1xuICAgIHZhciBjbGllbnQgPSBtcXR0LmNvbm5lY3QoaG9zdCk7XG5cbiAgICB2YXIgaGFuZGxlciA9IHNlcnZlcmhhbmRsZXIoaW1wbCk7XG5cbiAgICBoYW5kbGVyLnJlc3BvbnNlID0gZnVuY3Rpb24gKGRhdGEsIGZyb20pIHtcbiAgICAgICAgdmFyIHJlcGx5X3RvcGljID0gZnJvbSArIFwiX3JlcGx5XCI7XG4gICAgICAgIGRlYnVnKFwic2VydmVyIHJlc3BvbnNlXCIsIGRhdGEpO1xuXG4gICAgICAgIGNsaWVudC5wdWJsaXNoKHJlcGx5X3RvcGljLCBKU09OLnN0cmluZ2lmeShkYXRhKSwge3FvczogMX0pXG4gICAgfTtcblxuICAgIGNsaWVudC5zdWJzY3JpYmUoXCJycGNcIik7XG4gICAgY2xpZW50LnN1YnNjcmliZShcImluaXRcIik7XG4gICAgY2xpZW50Lm9uKCdtZXNzYWdlJywgZnVuY3Rpb24gKHQsIG1lc3NhZ2UpIHtcbiAgICAgICAgZGVidWcoXCJzZXJ2ZXIgcmVjZWl2ZSxcIiwgdCwgbWVzc2FnZSk7XG5cbiAgICAgICAgaWYgKHQgPT0gXCJycGNcIikge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgaGFuZGxlci5vblJlcXVlc3QoZGF0YSwgZGF0YS5mcm9tKTtcbiAgICAgICAgfSBlbHNlIGlmICh0ID09IFwiaW5pdFwiKSB7XG4gICAgICAgICAgICB2YXIgaWQgPSBtZXNzYWdlO1xuICAgICAgICAgICAgdmFyIG1ldGhvZHMgPSBPYmplY3Qua2V5cyhpbXBsKTtcbiAgICAgICAgICAgIGRlYnVnKFwicmVwbHkgdG8gaW5pdFwiKTtcbiAgICAgICAgICAgIGNsaWVudC5wdWJsaXNoKGlkICsgXCJfaW5pdF9yZXBseVwiLCBKU09OLnN0cmluZ2lmeShtZXRob2RzKSwge3FvczogMn0pXG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBjbGllbnQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtcXR0UlBDQ2xpZW50KGhvc3QsIGlkLCBtZXRob2RzKSB7XG4gICAgdmFyIGNsaWVudCA9IG1xdHQuY29ubmVjdChob3N0KTtcbiAgICBpZCA9IGlkIHx8IGNsaWVudC5jbGllbnRJZDtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNsaWVudC5vbihcImNvbm5lY3RcIiwgKCk9PiB7XG4gICAgICAgICAgICBkZWJ1ZyhpZCwgXCJjb25uZWN0ZWRcIiwgbWV0aG9kcyk7XG4gICAgICAgICAgICB2YXIgcHJveHkgPSBudWxsO1xuICAgICAgICAgICAgdmFyIHJlc3BvbnNlVG9waWMgPSBpZCArIFwiX3JlcGx5XCI7XG5cbiAgICAgICAgICAgIGlmIChtZXRob2RzKSB7XG4gICAgICAgICAgICAgICAgcHJveHkgPSBjbGllbnQobWV0aG9kcyk7XG4gICAgICAgICAgICAgICAgY2xpZW50LnN1YnNjcmliZShyZXNwb25zZVRvcGljKTtcbiAgICAgICAgICAgICAgICBjbGllbnQub24oJ21lc3NhZ2UnLCBmdW5jdGlvbiAodCwgbWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodCA9PSByZXNwb25zZVRvcGljKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm94eS5vblJlc3BvbnNlKEpTT04ucGFyc2UobWVzc2FnZSkpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHByb3h5KVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5pdF9yZXBseSA9IGlkICsgXCJfaW5pdF9yZXBseVwiO1xuICAgICAgICAgICAgICAgIHZhciBtZXRob2RzO1xuICAgICAgICAgICAgICAgIGNsaWVudC5vbignbWVzc2FnZScsIGZ1bmN0aW9uICh0LCBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnKFwiY2xpZW50IHJlY2VpdmUsXCIsIHQsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodCA9PSBpbml0X3JlcGx5ICYmICFtZXRob2RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGllbnQudW5zdWJzY3JpYmUoaW5pdF9yZXBseSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2RzID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnKG1ldGhvZHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJveHkgPSBuZXdjbGllbnQobWV0aG9kcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHByb3h5KVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHQgPT0gcmVzcG9uc2VUb3BpYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJveHkub25SZXNwb25zZShKU09OLnBhcnNlKG1lc3NhZ2UpKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY2xpZW50LnB1Ymxpc2goXCJpbml0XCIsIGlkKTtcbiAgICAgICAgICAgICAgICBjbGllbnQuc3Vic2NyaWJlKGluaXRfcmVwbHkpO1xuICAgICAgICAgICAgICAgIGNsaWVudC5zdWJzY3JpYmUocmVzcG9uc2VUb3BpYyk7XG5cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgIH0pLnRoZW4ocCA9PiB7XG4gICAgICAgIHAucmVxdWVzdCA9IChkYXRhKSA9PiB7XG4gICAgICAgICAgICBkYXRhLmZyb20gPSBpZDtcbiAgICAgICAgICAgIGRlYnVnKFwicHVibGlzaFwiLCBkYXRhKTtcbiAgICAgICAgICAgIGNsaWVudC5wdWJsaXNoKCdycGMnLCBKU09OLnN0cmluZ2lmeShkYXRhKSwge3FvczogMn0pXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBwO1xuICAgIH0pO1xufSJdfQ==