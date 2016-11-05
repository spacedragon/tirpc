"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.newclient = newclient;
exports.serverhandler = serverhandler;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = require("debug")("tirpc");

var RpcClient = function () {
    function RpcClient(clientId, methods) {
        _classCallCheck(this, RpcClient);

        this.clientId = clientId;
        this.methods = methods;
        this.curid = 0;
        this.callbacks = {};
    }

    _createClass(RpcClient, [{
        key: "_nextId",
        value: function _nextId() {
            return this.curid++;
        }
    }, {
        key: "_setCallback",
        value: function _setCallback(id, callback) {
            this.callbacks[id] = callback;
        }
    }, {
        key: "_clearCallback",
        value: function _clearCallback(id) {
            delete this.callbacks[id];
        }
    }, {
        key: "request",
        value: function request(data) {
            throw "client should override this method.";
        }
    }, {
        key: "onResponse",
        value: function onResponse(response) {
            debug("onResponse ", response);
            var cb;
            if (response.callback != null) {
                cb = this.callbacks[response.callback];
                if (cb) {
                    cb(response);
                }
            } else {
                cb = this.callbacks[response.id];
                if (cb) {
                    cb(response);
                    delete this.callbacks[response.id];
                }
            }
        }
    }, {
        key: "_callbackReturn",
        value: function _callbackReturn(callbackFunc, json) {
            var _this = this;

            var sendResult = function sendResult(r) {
                _this.request({
                    id: json.id,
                    result: r
                });
            };
            var sendError = function sendError(e) {
                _this.request({
                    error: {
                        code: -32000,
                        message: "Server error",
                        data: e
                    },
                    id: json.id
                });
            };

            try {

                var result = callbackFunc.apply(undefined, _toConsumableArray(json.params));
                if (isPromise(result)) {
                    result.then(sendResult.bind(this), sendError.bind(this));
                } else {
                    this.request({
                        id: json.id,
                        result: result
                    });
                }
            } catch (e) {
                sendError(e);
            }
        }
    }, {
        key: "_method_call",
        value: function _method_call(method) {
            var _this2 = this;

            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            var params = Array.from(args);
            var callbackIndices = [];

            var _loop = function _loop() {
                var arg = args[i];
                if (typeof arg == "function") {
                    id = _this2._nextId();

                    callbackIndices.push(i);

                    params[i] = id;
                    _this2._setCallback(id, function (json) {
                        _this2._callbackReturn(arg, json);
                    });
                }
            };

            for (var i = 0; i < args.length; i++) {
                var id;

                _loop();
            }
            var req = {
                id: this._nextId(),
                method: method,
                params: params,
                from: this.clientId,
                callbacks: callbackIndices
            };

            var cleanCallbacks = function cleanCallbacks(ret) {
                debug("client clean", req.id, callbackIndices);
                callbackIndices.forEach(function (funcid) {
                    return _this2._clearCallback(funcid);
                });
                _this2._clearCallback(req.id);
                return ret;
            };

            var p = new Promise(function (resolve, reject) {
                _this2._setCallback(req.id, function (ret) {
                    if (ret.error) {
                        reject(ret);
                    } else {
                        resolve(ret.result);
                    }
                });
                _this2.request(req);
            }).then(cleanCallbacks, cleanCallbacks);

            p.cancel = function () {
                // add a cancel function to promise, this will unregister all callbacks
                cleanCallbacks();
            };
            return p;
        }
    }]);

    return RpcClient;
}();

/**
 *
 * @param methods  string array of api method names;
 * @param clientId
 */


function newclient(methods, clientId) {
    var ret = new RpcClient(clientId, methods);

    for (var i = 0; i < methods.length; i++) {
        var m = methods[i];
        ret[m] = ret._method_call.bind(ret, m);
    }
    return ret;
}

function isPromise(obj) {
    return !!obj && ((typeof obj === "undefined" ? "undefined" : _typeof(obj)) === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

var ServerHandler = function () {
    function ServerHandler(impl) {
        _classCallCheck(this, ServerHandler);

        this.impl = impl;
        this.callbackReturns = {};
        this.curid = 0;
    }

    _createClass(ServerHandler, [{
        key: "_nextId",
        value: function _nextId() {
            return this.curid++;
        }
    }, {
        key: "response",
        value: function response(data, ref) {
            throw "server should override this method.";
        }
    }, {
        key: "onRequest",
        value: function onRequest(data, ref) {
            debug("onRequest", data);

            if (data.method) {
                this._handleRequest(data, ref);
            } else {
                // this is a return value of a callback
                this._handleCallbackReturn(data);
            }
        }
    }, {
        key: "_handleCallbackReturn",
        value: function _handleCallbackReturn(data) {
            var arr = this.callbackReturns[data.id];
            debug("handle callback ret", data, arr);

            try {

                if (arr && arr.length == 2) {
                    var _arr = _slicedToArray(arr, 2),
                        resolve = _arr[0],
                        reject = _arr[1];

                    if (data.error) {
                        reject(data.error);
                    } else {
                        resolve(data.result);
                    }
                }
            } finally {
                delete this.callbackReturns[data.id];
            }
        }
    }, {
        key: "_sendCallback",
        value: function _sendCallback(callbackId, ref) {
            for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
                args[_key2 - 2] = arguments[_key2];
            }

            var _this3 = this;

            var id = this._nextId();
            var p = new Promise(function (resolve, reject) {
                _this3.callbackReturns[id] = [resolve, reject];
            });
            this.response({
                id: id,
                callback: callbackId,
                params: args
            }, ref);
            return p;
        }
    }, {
        key: "_serverError",
        value: function _serverError(reason, id, ref) {
            this.response({
                error: {
                    code: -32000,
                    message: "Server error",
                    data: reason
                },
                id: id
            }, ref);
        }
    }, {
        key: "_methodNotFound",
        value: function _methodNotFound(data, ref) {
            if (data.id) {
                this.response({
                    id: data.id,
                    error: {
                        code: -32601,
                        message: "Method not found"
                    }
                }, ref);
            }
        }
    }, {
        key: "_sendResult",
        value: function _sendResult(value, data, ref) {
            debug("sendresult ", value);
            this.response({
                result: value,
                id: data.id
            }, ref);
        }
    }, {
        key: "_cleanCallbacks",
        value: function _cleanCallbacks(callbackIds) {
            var _this4 = this;

            debug("server clean", callbackIds);
            callbackIds.forEach(function (id) {
                delete _this4.callbackReturns[id];
            });
        }
    }, {
        key: "_handleRequest",
        value: function _handleRequest(data, ref) {
            var _this5 = this;

            if (!this.impl.hasOwnProperty(data.method)) {
                this._methodNotFound(data, ref);
            }
            var method = this.impl[data.method];
            var callbackIds = [];
            if (data.callbacks && data.callbacks.length > 0) {
                for (var i = 0; i < data.callbacks.length; i++) {
                    var callbackId = data.callbacks[i];
                    data.params[i] = this._sendCallback.bind(this, callbackId, ref);
                    callbackIds.push(callbackId);
                }
            }
            if (data.id != null) {
                try {
                    if (typeof method == "function") {
                        var ret = method.apply(this.impl, data.params);
                        if (isPromise(ret)) {
                            ret.then(function (result) {
                                _this5._sendResult(result, data, ref);
                                _this5._cleanCallbacks(callbackIds);
                            }, function (error) {
                                _this5._serverError(error, data.id, ref);
                                _this5._cleanCallbacks(callbackIds);
                            });
                        } else {
                            this._sendResult(ret, data, ref);
                            this._cleanCallbacks(callbackIds);
                        }
                    } else {
                        this._sendResult(method, data, ref);
                        this._cleanCallbacks(callbackIds);
                    }
                } catch (e) {
                    debug(e.stack);
                    this._serverError(e, data.id, ref);
                    this._cleanCallbacks(callbackIds);
                }
            } else {
                if (typeof method == "function") {
                    method.apply(this.impl, data.params);
                }
            }
        }
    }]);

    return ServerHandler;
}();

/**
 *
 * @param handler  interface {
 *                      onRequest(data)  received remote data
 *                      response(id,data)  reply to clientproxy
 *                 }
 * @param impl
 */

function serverhandler(impl) {
    return new ServerHandler(impl);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJuZXdjbGllbnQiLCJzZXJ2ZXJoYW5kbGVyIiwiZGVidWciLCJyZXF1aXJlIiwiUnBjQ2xpZW50IiwiY2xpZW50SWQiLCJtZXRob2RzIiwiY3VyaWQiLCJjYWxsYmFja3MiLCJpZCIsImNhbGxiYWNrIiwiZGF0YSIsInJlc3BvbnNlIiwiY2IiLCJjYWxsYmFja0Z1bmMiLCJqc29uIiwic2VuZFJlc3VsdCIsInIiLCJyZXF1ZXN0IiwicmVzdWx0Iiwic2VuZEVycm9yIiwiZSIsImVycm9yIiwiY29kZSIsIm1lc3NhZ2UiLCJwYXJhbXMiLCJpc1Byb21pc2UiLCJ0aGVuIiwiYmluZCIsIm1ldGhvZCIsImFyZ3MiLCJBcnJheSIsImZyb20iLCJjYWxsYmFja0luZGljZXMiLCJhcmciLCJpIiwiX25leHRJZCIsInB1c2giLCJfc2V0Q2FsbGJhY2siLCJfY2FsbGJhY2tSZXR1cm4iLCJsZW5ndGgiLCJyZXEiLCJjbGVhbkNhbGxiYWNrcyIsInJldCIsImZvckVhY2giLCJfY2xlYXJDYWxsYmFjayIsImZ1bmNpZCIsInAiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImNhbmNlbCIsIm0iLCJfbWV0aG9kX2NhbGwiLCJvYmoiLCJTZXJ2ZXJIYW5kbGVyIiwiaW1wbCIsImNhbGxiYWNrUmV0dXJucyIsInJlZiIsIl9oYW5kbGVSZXF1ZXN0IiwiX2hhbmRsZUNhbGxiYWNrUmV0dXJuIiwiYXJyIiwiY2FsbGJhY2tJZCIsInJlYXNvbiIsInZhbHVlIiwiY2FsbGJhY2tJZHMiLCJoYXNPd25Qcm9wZXJ0eSIsIl9tZXRob2ROb3RGb3VuZCIsIl9zZW5kQ2FsbGJhY2siLCJhcHBseSIsIl9zZW5kUmVzdWx0IiwiX2NsZWFuQ2FsbGJhY2tzIiwiX3NlcnZlckVycm9yIiwic3RhY2siXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztRQXNJZ0JBLFMsR0FBQUEsUztRQTBLQUMsYSxHQUFBQSxhOzs7Ozs7QUEvU2hCLElB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QkFBS2EsZUFBTCxDQUFxQk4sV0FBckI7QUFDSDtBQUNKLGlCQW5CRCxDQW1CRSxPQUFPNUMsQ0FBUCxFQUFVO0FBQ1JuQiwwQkFBTW1CLEVBQUVvRCxLQUFSO0FBQ0EseUJBQUtELFlBQUwsQ0FBa0JuRCxDQUFsQixFQUFvQlYsS0FBS0YsRUFBekIsRUFBNkJpRCxHQUE3QjtBQUNBLHlCQUFLYSxlQUFMLENBQXFCTixXQUFyQjtBQUNIO0FBQ0osYUF6QkQsTUF5Qk87QUFDSCxvQkFBSSxPQUFPcEMsTUFBUCxJQUFrQixVQUF0QixFQUFrQztBQUM5QkEsMkJBQU93QyxLQUFQLENBQWEsS0FBS2IsSUFBbEIsRUFBd0I3QyxLQUFLYyxNQUE3QjtBQUNIO0FBQ0o7QUFDSjs7Ozs7O0FBS0w7Ozs7Ozs7OztBQVNPLFNBQVN4QixhQUFULENBQXVCdUQsSUFBdkIsRUFBNkI7QUFDaEMsV0FBTyxJQUFJRCxhQUFKLENBQWtCQyxJQUFsQixDQUFQO0FBQ0giLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKShcInRpcnBjXCIpO1xuXG5cbmNsYXNzIFJwY0NsaWVudCB7XG4gICAgY29uc3RydWN0b3IoY2xpZW50SWQsIG1ldGhvZHMpIHtcbiAgICAgICAgdGhpcy5jbGllbnRJZCA9IGNsaWVudElkO1xuICAgICAgICB0aGlzLm1ldGhvZHMgPSBtZXRob2RzO1xuICAgICAgICB0aGlzLmN1cmlkID0gMDtcbiAgICAgICAgdGhpcy5jYWxsYmFja3MgPSB7fTtcbiAgICB9XG5cbiAgICBfbmV4dElkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJpZCsrO1xuICAgIH1cblxuICAgIF9zZXRDYWxsYmFjayhpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5jYWxsYmFja3NbaWRdID0gY2FsbGJhY2tcbiAgICB9XG5cbiAgICBfY2xlYXJDYWxsYmFjayhpZCkge1xuICAgICAgICBkZWxldGUgdGhpcy5jYWxsYmFja3NbaWRdO1xuICAgIH1cblxuICAgIHJlcXVlc3QoZGF0YSkge1xuICAgICAgICB0aHJvdyBcImNsaWVudCBzaG91bGQgb3ZlcnJpZGUgdGhpcyBtZXRob2QuXCJcbiAgICB9XG5cbiAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgIGRlYnVnKFwib25SZXNwb25zZSBcIiwgcmVzcG9uc2UpO1xuICAgICAgICB2YXIgY2I7XG4gICAgICAgIGlmKHJlc3BvbnNlLmNhbGxiYWNrIT1udWxsKXtcbiAgICAgICAgICAgIGNiID0gdGhpcy5jYWxsYmFja3NbcmVzcG9uc2UuY2FsbGJhY2tdO1xuICAgICAgICAgICAgaWYoY2Ipe1xuICAgICAgICAgICAgICAgIGNiKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfWVsc2Uge1xuICAgICAgICAgICAgY2IgPSB0aGlzLmNhbGxiYWNrc1tyZXNwb25zZS5pZF07XG4gICAgICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICAgICAgICBjYihyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuY2FsbGJhY2tzW3Jlc3BvbnNlLmlkXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBfY2FsbGJhY2tSZXR1cm4oY2FsbGJhY2tGdW5jLCBqc29uKSB7XG4gICAgICAgIHZhciBzZW5kUmVzdWx0ID0gKHIpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdCh7XG4gICAgICAgICAgICAgICAgaWQ6IGpzb24uaWQsXG4gICAgICAgICAgICAgICAgcmVzdWx0OiByXG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgICAgICB2YXIgc2VuZEVycm9yID0gKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdCh7XG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyMDAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlNlcnZlciBlcnJvclwiLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpZDoganNvbi5pZFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gY2FsbGJhY2tGdW5jKC4uLmpzb24ucGFyYW1zKTtcbiAgICAgICAgICAgIGlmIChpc1Byb21pc2UocmVzdWx0KSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC50aGVuKHNlbmRSZXN1bHQuYmluZCh0aGlzKSwgc2VuZEVycm9yLmJpbmQodGhpcykpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdCh7XG4gICAgICAgICAgICAgICAgICAgIGlkOiBqc29uLmlkLFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHJlc3VsdFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBzZW5kRXJyb3IoZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9tZXRob2RfY2FsbChtZXRob2QsIC4uLmFyZ3MpIHtcblxuICAgICAgICB2YXIgcGFyYW1zID0gQXJyYXkuZnJvbShhcmdzKTtcbiAgICAgICAgdmFyIGNhbGxiYWNrSW5kaWNlcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGFyZyA9IGFyZ3NbaV07XG4gICAgICAgICAgICBpZiAodHlwZW9mKGFyZykgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkID0gdGhpcy5fbmV4dElkKCk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2tJbmRpY2VzLnB1c2goaSk7XG5cbiAgICAgICAgICAgICAgICBwYXJhbXNbaV0gPSBpZDtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRDYWxsYmFjayhpZCwgKGpzb24pPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jYWxsYmFja1JldHVybihhcmcsIGpzb24pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciByZXEgPSB7XG4gICAgICAgICAgICBpZDogdGhpcy5fbmV4dElkKCksXG4gICAgICAgICAgICBtZXRob2QsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICAgIGZyb206IHRoaXMuY2xpZW50SWQsXG4gICAgICAgICAgICBjYWxsYmFja3M6IGNhbGxiYWNrSW5kaWNlc1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBjbGVhbkNhbGxiYWNrcyA9IChyZXQpID0+IHtcbiAgICAgICAgICAgIGRlYnVnKFwiY2xpZW50IGNsZWFuXCIsIHJlcS5pZCwgY2FsbGJhY2tJbmRpY2VzKTtcbiAgICAgICAgICAgIGNhbGxiYWNrSW5kaWNlcy5mb3JFYWNoKGZ1bmNpZCA9PiB0aGlzLl9jbGVhckNhbGxiYWNrKGZ1bmNpZCkpO1xuICAgICAgICAgICAgdGhpcy5fY2xlYXJDYWxsYmFjayhyZXEuaWQpO1xuICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCk9PiB7XG4gICAgICAgICAgICB0aGlzLl9zZXRDYWxsYmFjayhyZXEuaWQsIChyZXQpPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXQuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJldClcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJldC5yZXN1bHQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3QocmVxKTtcbiAgICAgICAgfSkudGhlbihjbGVhbkNhbGxiYWNrcywgY2xlYW5DYWxsYmFja3MpO1xuXG4gICAgICAgIHAuY2FuY2VsID0gKCk9PiB7ICAvLyBhZGQgYSBjYW5jZWwgZnVuY3Rpb24gdG8gcHJvbWlzZSwgdGhpcyB3aWxsIHVucmVnaXN0ZXIgYWxsIGNhbGxiYWNrc1xuICAgICAgICAgICAgY2xlYW5DYWxsYmFja3MoKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBtZXRob2RzICBzdHJpbmcgYXJyYXkgb2YgYXBpIG1ldGhvZCBuYW1lcztcbiAqIEBwYXJhbSBjbGllbnRJZFxuICovXG5leHBvcnQgZnVuY3Rpb24gbmV3Y2xpZW50KG1ldGhvZHMsIGNsaWVudElkKSB7XG4gICAgbGV0IHJldCA9IG5ldyBScGNDbGllbnQoY2xpZW50SWQsIG1ldGhvZHMpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXRob2RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBtID0gbWV0aG9kc1tpXTtcbiAgICAgICAgcmV0W21dID0gcmV0Ll9tZXRob2RfY2FsbC5iaW5kKHJldCwgbSlcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn1cblxuXG5cbmZ1bmN0aW9uIGlzUHJvbWlzZShvYmopIHtcbiAgICByZXR1cm4gISFvYmogJiYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnIHx8IHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbicpICYmIHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuXG5jbGFzcyBTZXJ2ZXJIYW5kbGVyIHtcblxuICAgIGNvbnN0cnVjdG9yKGltcGwpIHtcbiAgICAgICAgdGhpcy5pbXBsID0gaW1wbDtcbiAgICAgICAgdGhpcy5jYWxsYmFja1JldHVybnMgPSB7fTtcbiAgICAgICAgdGhpcy5jdXJpZD0wO1xuICAgIH1cbiAgICBfbmV4dElkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJpZCsrO1xuICAgIH1cblxuICAgIHJlc3BvbnNlKGRhdGEsIHJlZikge1xuICAgICAgICB0aHJvdyBcInNlcnZlciBzaG91bGQgb3ZlcnJpZGUgdGhpcyBtZXRob2QuXCJcbiAgICB9XG5cbiAgICBvblJlcXVlc3QoZGF0YSwgcmVmKSB7XG4gICAgICAgIGRlYnVnKFwib25SZXF1ZXN0XCIsIGRhdGEpO1xuXG4gICAgICAgIGlmIChkYXRhLm1ldGhvZCkge1xuICAgICAgICAgICAgdGhpcy5faGFuZGxlUmVxdWVzdChkYXRhLCByZWYpO1xuICAgICAgICB9IGVsc2UgeyAvLyB0aGlzIGlzIGEgcmV0dXJuIHZhbHVlIG9mIGEgY2FsbGJhY2tcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZUNhbGxiYWNrUmV0dXJuKGRhdGEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX2hhbmRsZUNhbGxiYWNrUmV0dXJuKGRhdGEpIHtcbiAgICAgICAgbGV0IGFyciA9IHRoaXMuY2FsbGJhY2tSZXR1cm5zW2RhdGEuaWRdO1xuICAgICAgICBkZWJ1ZyhcImhhbmRsZSBjYWxsYmFjayByZXRcIiwgZGF0YSwgYXJyKTtcblxuICAgICAgICB0cnkge1xuXG4gICAgICAgICAgICBpZihhcnIgJiYgYXJyLmxlbmd0aD09Mikge1xuICAgICAgICAgICAgICAgIHZhciBbcmVzb2x2ZSxyZWplY3RdID0gYXJyO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChkYXRhLmVycm9yKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZGF0YS5yZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAgZmluYWxseSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5jYWxsYmFja1JldHVybnNbZGF0YS5pZF07XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIF9zZW5kQ2FsbGJhY2soY2FsbGJhY2tJZCxyZWYsIC4uLmFyZ3MpIHtcbiAgICAgICAgdmFyIGlkID0gdGhpcy5fbmV4dElkKCk7XG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tSZXR1cm5zW2lkXSA9IFtyZXNvbHZlLCByZWplY3RdO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZXNwb25zZSh7XG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFja0lkLFxuICAgICAgICAgICAgcGFyYW1zOiBhcmdzXG4gICAgICAgIH0scmVmKTtcbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfVxuXG4gICAgX3NlcnZlckVycm9yKHJlYXNvbixpZCwgcmVmKSB7XG4gICAgICAgIHRoaXMucmVzcG9uc2Uoe1xuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICBjb2RlOiAtMzIwMDAsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJTZXJ2ZXIgZXJyb3JcIixcbiAgICAgICAgICAgICAgICBkYXRhOiByZWFzb25cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZFxuICAgICAgICB9LCByZWYpO1xuICAgIH1cblxuICAgIF9tZXRob2ROb3RGb3VuZChkYXRhLCByZWYpIHtcbiAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgIHRoaXMucmVzcG9uc2Uoe1xuICAgICAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJNZXRob2Qgbm90IGZvdW5kXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCByZWYpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBfc2VuZFJlc3VsdCh2YWx1ZSwgZGF0YSwgcmVmKSB7XG4gICAgICAgIGRlYnVnKFwic2VuZHJlc3VsdCBcIiwgdmFsdWUpO1xuICAgICAgICB0aGlzLnJlc3BvbnNlKHtcbiAgICAgICAgICAgIHJlc3VsdDogdmFsdWUsXG4gICAgICAgICAgICBpZDogZGF0YS5pZFxuICAgICAgICB9LCByZWYpO1xuICAgIH1cblxuICAgIF9jbGVhbkNhbGxiYWNrcyhjYWxsYmFja0lkcykge1xuICAgICAgICBkZWJ1ZyhcInNlcnZlciBjbGVhblwiLCBjYWxsYmFja0lkcyk7XG4gICAgICAgIGNhbGxiYWNrSWRzLmZvckVhY2goaWQgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuY2FsbGJhY2tSZXR1cm5zW2lkXVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfaGFuZGxlUmVxdWVzdChkYXRhLCByZWYpIHtcbiAgICAgICAgaWYgKCF0aGlzLmltcGwuaGFzT3duUHJvcGVydHkoZGF0YS5tZXRob2QpKSB7XG4gICAgICAgICAgICB0aGlzLl9tZXRob2ROb3RGb3VuZChkYXRhLCByZWYpO1xuICAgICAgICB9XG4gICAgICAgIGxldCBtZXRob2QgPSB0aGlzLmltcGxbZGF0YS5tZXRob2RdO1xuICAgICAgICB2YXIgY2FsbGJhY2tJZHMgPSBbXTtcbiAgICAgICAgaWYgKGRhdGEuY2FsbGJhY2tzICYmIGRhdGEuY2FsbGJhY2tzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5jYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2tJZCA9IGRhdGEuY2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgICAgIGRhdGEucGFyYW1zW2ldID0gdGhpcy5fc2VuZENhbGxiYWNrLmJpbmQodGhpcywgY2FsbGJhY2tJZCxyZWYpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrSWRzLnB1c2goY2FsbGJhY2tJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuaWQgIT0gbnVsbCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mKG1ldGhvZCkgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBtZXRob2QuYXBwbHkodGhpcy5pbXBsLCBkYXRhLnBhcmFtcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Byb21pc2UocmV0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0LnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZW5kUmVzdWx0KHJlc3VsdCwgZGF0YSwgcmVmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jbGVhbkNhbGxiYWNrcyhjYWxsYmFja0lkcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2VydmVyRXJyb3IoZXJyb3IsZGF0YS5pZCwgcmVmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jbGVhbkNhbGxiYWNrcyhjYWxsYmFja0lkcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NlbmRSZXN1bHQocmV0LCBkYXRhLCByZWYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2xlYW5DYWxsYmFja3MoY2FsbGJhY2tJZHMpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZW5kUmVzdWx0KG1ldGhvZCwgZGF0YSwgcmVmKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2xlYW5DYWxsYmFja3MoY2FsbGJhY2tJZHMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGRlYnVnKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NlcnZlckVycm9yKGUsZGF0YS5pZCwgcmVmKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9jbGVhbkNhbGxiYWNrcyhjYWxsYmFja0lkcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YobWV0aG9kKSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBtZXRob2QuYXBwbHkodGhpcy5pbXBsLCBkYXRhLnBhcmFtcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuXG4vKipcbiAqXG4gKiBAcGFyYW0gaGFuZGxlciAgaW50ZXJmYWNlIHtcbiAqICAgICAgICAgICAgICAgICAgICAgIG9uUmVxdWVzdChkYXRhKSAgcmVjZWl2ZWQgcmVtb3RlIGRhdGFcbiAqICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlKGlkLGRhdGEpICByZXBseSB0byBjbGllbnRwcm94eVxuICogICAgICAgICAgICAgICAgIH1cbiAqIEBwYXJhbSBpbXBsXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcnZlcmhhbmRsZXIoaW1wbCkge1xuICAgIHJldHVybiBuZXcgU2VydmVySGFuZGxlcihpbXBsKVxufSJdfQ==