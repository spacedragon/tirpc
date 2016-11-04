"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.newclient = newclient;
exports.serverhandler = serverhandler;

var _debug = require("./debug");

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot _method_call a class as a function"); } }

var jsonrpc = "2.0";

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
        value: function nextId() {
            return this.curid++;
        }
    }, {
        key: "_setCallback",
        value: function setCallback(id, callback) {
            this.callbacks[id] = callback;
        }
    }, {
        key: "_clearCallback",
        value: function clearCallback(id) {
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
            (0, _debug2.default)("onResponse ", response);
            var cb = this.callbacks[response.id];
            if (cb) {
                cb(response);
                delete this.callbacks[response.id];
            }
        }
    }, {
        key: "_callbackReturn",
        value: function callbackReturn(callbackFunc, json) {
            var _this = this;

            var sendResult = function sendResult(r) {
                _this.request({
                    jsonrpc: jsonrpc,
                    id: json.id,
                    result: r
                });
            };
            var sendError = function sendError(e) {
                _this.request({
                    jsonrpc: "2.0",
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
                        jsonrpc: jsonrpc,
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
        value: function call(method) {
            var _this2 = this;

            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            var params = Array.from(args);
            var callbackIndices = [];

            var _loop = function _loop() {
                var arg = args[i];
                if (typeof arg == "function") {
                    id = _this2.nextId();

                    callbackIndices.push(i);

                    params[i] = id;
                    _this2.setCallback(id, function (json) {
                        _this2.callbackReturn(arg, json);
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
                (0, _debug2.default)("client clean", req.id, callbackIndices);
                callbackIndices.forEach(function (funcid) {
                    return _this2.clearCallback(funcid);
                });
                _this2.clearCallback(req.id);
                return ret;
            };

            var p = new Promise(function (resolve, reject) {
                _this2.setCallback(req.id, function (ret) {
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

/**
 *
 * @param handler  interface {
 *                    request(data)   method for sending data remotely
   *                  onResponse(id,callback)   reply callback
       *              clearReply(id)   clear the callback
 *                 }
 * @returns proxied clientproxy
 */
/*export function clientproxy() {
 var Proxy = require('harmony-proxy');

 let proxy = {
 get(target, propKey, receiver) {
 const origin = target[propKey];
 if (origin) {
 return origin;
 } else {
 if (propKey == "request") {
 throw "newclient has not implement " + propKey + " yet";
 } else if (propKey == "then") {
 return undefined;
 } else {
 return function (...args) {
 var last = args[args.length - 1];

 if (typeof(last) == "function") {
 var callback = args.pop();
 var json = {
 id: target._nextId(),
 method: propKey,
 params: args
 };
 target._setCallback(json.id, (ret)=> {
 if (ret.error) {
 callback(ret.error, ret.data)
 } else {
 callback(null, ret.result)
 }
 });
 target.request(json);
 return json.id;
 } else {
 target.request({
 jsonrpc,
 method: propKey,
 params: args
 });
 return null;
 }
 }
 }
 }
 }
 };

 return new Proxy({
 curid: 0,
 _nextId(){
 return this.curid++;
 }, callbacks: {},
 _setCallback: function (id, callback) {
 this.callbacks[id] = callback
 },
 _clearCallback: function (id) {
 delete this.callbacks[id];
 },
 request(data){
 throw "newclient should override this method."
 },
 onResponse: function (json) {
 var cb = this.callbacks[json.id];
 if (cb) {
 cb(json);
 delete this.callbacks[json.id]
 }
 }
 }, proxy)
 }*/

function isPromise(obj) {
    return !!obj && ((typeof obj === "undefined" ? "undefined" : _typeof(obj)) === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

var ServerHandler = function () {
    function ServerHandler(impl) {
        _classCallCheck(this, ServerHandler);

        this.impl = impl;
        this.callbackReturns = {};
    }

    _createClass(ServerHandler, [{
        key: "response",
        value: function response(data, ref) {
            throw "newclient should override this method.";
        }
    }, {
        key: "onRequest",
        value: function onRequest(data, ref) {
            (0, _debug2.default)("onRequest", data, ref);

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
            (0, _debug2.default)("handle callback ret", data, arr);

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
        value: function _sendCallback(callbackId) {
            var _this3 = this;

            for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
            }

            var p = new Promise(function (resolve, reject) {
                _this3.callbackReturns[callbackId] = [resolve, reject];
            });
            this.response({
                jsonrpc: jsonrpc,
                id: callbackId,
                params: args
            });
            return p;
        }
    }, {
        key: "_serverError",
        value: function _serverError(reason, id, ref) {
            this.response({
                jsonrpc: "2.0",
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
                        jsonrpc: jsonrpc,
                        code: -32601,
                        message: "Method not found"
                    }
                }, ref);
            }
        }
    }, {
        key: "_sendResult",
        value: function _sendResult(value, data, ref) {
            (0, _debug2.default)("sendresult ", value);
            this.response({
                jsonrpc: jsonrpc,
                result: value,
                id: data.id
            }, ref);
        }
    }, {
        key: "_cleanCallbacks",
        value: function _cleanCallbacks(callbackIds) {
            var _this4 = this;

            (0, _debug2.default)("server clean", callbackIds);
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
                    data.params[i] = this._sendCallback.bind(this, callbackId);
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
                    (0, _debug2.default)(e.stack);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJuZXdjbGllbnQiLCJzZXJ2ZXJoYW5kbGVyIiwianNvbnJwYyIsIlJwY0NsaWVudCIsImNsaWVudElkIiwibWV0aG9kcyIsImN1cmlkIiwiY2FsbGJhY2tzIiwiaWQiLCJjYWxsYmFjayIsImRhdGEiLCJyZXNwb25zZSIsImNiIiwiY2FsbGJhY2tGdW5jIiwianNvbiIsInNlbmRSZXN1bHQiLCJyIiwicmVxdWVzdCIsInJlc3VsdCIsInNlbmRFcnJvciIsImUiLCJlcnJvciIsImNvZGUiLCJtZXNzYWdlIiwicGFyYW1zIiwiaXNQcm9taXNlIiwidGhlbiIsImJpbmQiLCJtZXRob2QiLCJhcmdzIiwiQXJyYXkiLCJmcm9tIiwiY2FsbGJhY2tJbmRpY2VzIiwiYXJnIiwiaSIsIm5leHRJZCIsInB1c2giLCJzZXRDYWxsYmFjayIsImNhbGxiYWNrUmV0dXJuIiwibGVuZ3RoIiwicmVxIiwiY2xlYW5DYWxsYmFja3MiLCJyZXQiLCJmb3JFYWNoIiwiY2xlYXJDYWxsYmFjayIsImZ1bmNpZCIsInAiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImNhbmNlbCIsIm0iLCJjYWxsIiwib2JqIiwiU2VydmVySGFuZGxlciIsImltcGwiLCJjYWxsYmFja1JldHVybnMiLCJyZWYiLCJfaGFuZGxlUmVxdWVzdCIsIl9oYW5kbGVDYWxsYmFja1JldHVybiIsImFyciIsImNhbGxiYWNrSWQiLCJyZWFzb24iLCJ2YWx1ZSIsImNhbGxiYWNrSWRzIiwiaGFzT3duUHJvcGVydHkiLCJfbWV0aG9kTm90Rm91bmQiLCJfc2VuZENhbGxiYWNrIiwiYXBwbHkiLCJfc2VuZFJlc3VsdCIsIl9jbGVhbkNhbGxiYWNrcyIsIl9zZXJ2ZXJFcnJvciIsInN0YWNrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7UUFnSWdCQSxTLEdBQUFBLFM7UUF3UEFDLGEsR0FBQUEsYTs7QUF0WGhCOzs7Ozs7Ozs7O0FBRkEsSUFBTUMsVUFBVSxL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QkFBS2EsZUFBTCxDQUFxQk4sV0FBckI7QUFDSDtBQUNKLGFBekJELE1BeUJPO0FBQ0gsb0JBQUksT0FBT3BDLE1BQVAsSUFBa0IsVUFBdEIsRUFBa0M7QUFDOUJBLDJCQUFPd0MsS0FBUCxDQUFhLEtBQUtiLElBQWxCLEVBQXdCN0MsS0FBS2MsTUFBN0I7QUFDSDtBQUNKO0FBQ0o7Ozs7OztBQUtMOzs7Ozs7Ozs7QUFTTyxTQUFTdkIsYUFBVCxDQUF1QnNELElBQXZCLEVBQTZCO0FBQ2hDLFdBQU8sSUFBSUQsYUFBSixDQUFrQkMsSUFBbEIsQ0FBUDtBQUNIIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QganNvbnJwYyA9IFwiMi4wXCI7XG5cbmltcG9ydCBkZWJ1ZyBmcm9tIFwiLi9kZWJ1Z1wiXG5cblxuY2xhc3MgUnBjQ2xpZW50IHtcbiAgICBjb25zdHJ1Y3RvcihjbGllbnRJZCwgbWV0aG9kcykge1xuICAgICAgICB0aGlzLmNsaWVudElkID0gY2xpZW50SWQ7XG4gICAgICAgIHRoaXMubWV0aG9kcyA9IG1ldGhvZHM7XG4gICAgICAgIHRoaXMuY3VyaWQgPSAwO1xuICAgICAgICB0aGlzLmNhbGxiYWNrcyA9IHt9O1xuICAgIH1cblxuICAgIG5leHRJZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3VyaWQrKztcbiAgICB9XG5cbiAgICBzZXRDYWxsYmFjayhpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5jYWxsYmFja3NbaWRdID0gY2FsbGJhY2tcbiAgICB9XG5cbiAgICBjbGVhckNhbGxiYWNrKGlkKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLmNhbGxiYWNrc1tpZF07XG4gICAgfVxuXG4gICAgcmVxdWVzdChkYXRhKSB7XG4gICAgICAgIHRocm93IFwiY2xpZW50IHNob3VsZCBvdmVycmlkZSB0aGlzIG1ldGhvZC5cIlxuICAgIH1cblxuICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgZGVidWcoXCJvblJlc3BvbnNlIFwiLCByZXNwb25zZSk7XG4gICAgICAgIHZhciBjYiA9IHRoaXMuY2FsbGJhY2tzW3Jlc3BvbnNlLmlkXTtcbiAgICAgICAgaWYgKGNiKSB7XG4gICAgICAgICAgICBjYihyZXNwb25zZSk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5jYWxsYmFja3NbcmVzcG9uc2UuaWRdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjYWxsYmFja1JldHVybihjYWxsYmFja0Z1bmMsIGpzb24pIHtcbiAgICAgICAgdmFyIHNlbmRSZXN1bHQgPSAocikgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0KHtcbiAgICAgICAgICAgICAgICBqc29ucnBjLFxuICAgICAgICAgICAgICAgIGlkOiBqc29uLmlkLFxuICAgICAgICAgICAgICAgIHJlc3VsdDogclxuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHNlbmRFcnJvciA9IChlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3Qoe1xuICAgICAgICAgICAgICAgIGpzb25ycGM6IFwiMi4wXCIsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyMDAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlNlcnZlciBlcnJvclwiLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpZDoganNvbi5pZFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGNhbGxiYWNrRnVuYyguLi5qc29uLnBhcmFtcyk7XG4gICAgICAgICAgICBpZiAoaXNQcm9taXNlKHJlc3VsdCkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQudGhlbihzZW5kUmVzdWx0LmJpbmQodGhpcyksIHNlbmRFcnJvci5iaW5kKHRoaXMpKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3Qoe1xuICAgICAgICAgICAgICAgICAgICBqc29ucnBjLFxuICAgICAgICAgICAgICAgICAgICBpZDoganNvbi5pZCxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZXN1bHRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgc2VuZEVycm9yKGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjYWxsKG1ldGhvZCwgLi4uYXJncykge1xuXG4gICAgICAgIHZhciBwYXJhbXMgPSBBcnJheS5mcm9tKGFyZ3MpO1xuICAgICAgICB2YXIgY2FsbGJhY2tJbmRpY2VzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgYXJnID0gYXJnc1tpXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YoYXJnKSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWQgPSB0aGlzLm5leHRJZCgpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrSW5kaWNlcy5wdXNoKGkpO1xuXG4gICAgICAgICAgICAgICAgcGFyYW1zW2ldID0gaWQ7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRDYWxsYmFjayhpZCwgKGpzb24pPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrUmV0dXJuKGFyZywganNvbik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlcSA9IHtcbiAgICAgICAgICAgIGlkOiB0aGlzLm5leHRJZCgpLFxuICAgICAgICAgICAgbWV0aG9kLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICAgICAgICBmcm9tOiB0aGlzLmNsaWVudElkLFxuICAgICAgICAgICAgY2FsbGJhY2tzOiBjYWxsYmFja0luZGljZXNcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgY2xlYW5DYWxsYmFja3MgPSAocmV0KSA9PiB7XG4gICAgICAgICAgICBkZWJ1ZyhcImNsaWVudCBjbGVhblwiLCByZXEuaWQsIGNhbGxiYWNrSW5kaWNlcyk7XG4gICAgICAgICAgICBjYWxsYmFja0luZGljZXMuZm9yRWFjaChmdW5jaWQgPT4gdGhpcy5jbGVhckNhbGxiYWNrKGZ1bmNpZCkpO1xuICAgICAgICAgICAgdGhpcy5jbGVhckNhbGxiYWNrKHJlcS5pZCk7XG4gICAgICAgICAgICByZXR1cm4gcmV0XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KT0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0Q2FsbGJhY2socmVxLmlkLCAocmV0KT0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmV0LmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXQpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXQucmVzdWx0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0KHJlcSk7XG4gICAgICAgIH0pLnRoZW4oY2xlYW5DYWxsYmFja3MsIGNsZWFuQ2FsbGJhY2tzKTtcblxuICAgICAgICBwLmNhbmNlbCA9ICgpPT4geyAgLy8gYWRkIGEgY2FuY2VsIGZ1bmN0aW9uIHRvIHByb21pc2UsIHRoaXMgd2lsbCB1bnJlZ2lzdGVyIGFsbCBjYWxsYmFja3NcbiAgICAgICAgICAgIGNsZWFuQ2FsbGJhY2tzKClcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfVxufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gbWV0aG9kcyAgc3RyaW5nIGFycmF5IG9mIGFwaSBtZXRob2QgbmFtZXM7XG4gKiBAcGFyYW0gY2xpZW50SWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5ld2NsaWVudChtZXRob2RzLCBjbGllbnRJZCkge1xuICAgIGxldCByZXQgPSBuZXcgUnBjQ2xpZW50KGNsaWVudElkLCBtZXRob2RzKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbSA9IG1ldGhvZHNbaV07XG4gICAgICAgIHJldFttXSA9IHJldC5jYWxsLmJpbmQocmV0LCBtKVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG5cbi8qKlxuICpcbiAqIEBwYXJhbSBoYW5kbGVyICBpbnRlcmZhY2Uge1xuICogICAgICAgICAgICAgICAgICAgIHJlcXVlc3QoZGF0YSkgICBtZXRob2QgZm9yIHNlbmRpbmcgZGF0YSByZW1vdGVseVxuICAgKiAgICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UoaWQsY2FsbGJhY2spICAgcmVwbHkgY2FsbGJhY2tcbiAgICAgICAqICAgICAgICAgICAgICBjbGVhclJlcGx5KGlkKSAgIGNsZWFyIHRoZSBjYWxsYmFja1xuICogICAgICAgICAgICAgICAgIH1cbiAqIEByZXR1cm5zIHByb3hpZWQgY2xpZW50cHJveHlcbiAqL1xuLypleHBvcnQgZnVuY3Rpb24gY2xpZW50cHJveHkoKSB7XG4gdmFyIFByb3h5ID0gcmVxdWlyZSgnaGFybW9ueS1wcm94eScpO1xuXG4gbGV0IHByb3h5ID0ge1xuIGdldCh0YXJnZXQsIHByb3BLZXksIHJlY2VpdmVyKSB7XG4gY29uc3Qgb3JpZ2luID0gdGFyZ2V0W3Byb3BLZXldO1xuIGlmIChvcmlnaW4pIHtcbiByZXR1cm4gb3JpZ2luO1xuIH0gZWxzZSB7XG4gaWYgKHByb3BLZXkgPT0gXCJyZXF1ZXN0XCIpIHtcbiB0aHJvdyBcIm5ld2NsaWVudCBoYXMgbm90IGltcGxlbWVudCBcIiArIHByb3BLZXkgKyBcIiB5ZXRcIjtcbiB9IGVsc2UgaWYgKHByb3BLZXkgPT0gXCJ0aGVuXCIpIHtcbiByZXR1cm4gdW5kZWZpbmVkO1xuIH0gZWxzZSB7XG4gcmV0dXJuIGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gdmFyIGxhc3QgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV07XG5cbiBpZiAodHlwZW9mKGxhc3QpID09IFwiZnVuY3Rpb25cIikge1xuIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gdmFyIGpzb24gPSB7XG4gaWQ6IHRhcmdldC5uZXh0SWQoKSxcbiBtZXRob2Q6IHByb3BLZXksXG4gcGFyYW1zOiBhcmdzXG4gfTtcbiB0YXJnZXQuc2V0Q2FsbGJhY2soanNvbi5pZCwgKHJldCk9PiB7XG4gaWYgKHJldC5lcnJvcikge1xuIGNhbGxiYWNrKHJldC5lcnJvciwgcmV0LmRhdGEpXG4gfSBlbHNlIHtcbiBjYWxsYmFjayhudWxsLCByZXQucmVzdWx0KVxuIH1cbiB9KTtcbiB0YXJnZXQucmVxdWVzdChqc29uKTtcbiByZXR1cm4ganNvbi5pZDtcbiB9IGVsc2Uge1xuIHRhcmdldC5yZXF1ZXN0KHtcbiBqc29ucnBjLFxuIG1ldGhvZDogcHJvcEtleSxcbiBwYXJhbXM6IGFyZ3NcbiB9KTtcbiByZXR1cm4gbnVsbDtcbiB9XG4gfVxuIH1cbiB9XG4gfVxuIH07XG5cbiByZXR1cm4gbmV3IFByb3h5KHtcbiBjdXJpZDogMCxcbiBuZXh0SWQoKXtcbiByZXR1cm4gdGhpcy5jdXJpZCsrO1xuIH0sIGNhbGxiYWNrczoge30sXG4gc2V0Q2FsbGJhY2s6IGZ1bmN0aW9uIChpZCwgY2FsbGJhY2spIHtcbiB0aGlzLmNhbGxiYWNrc1tpZF0gPSBjYWxsYmFja1xuIH0sXG4gY2xlYXJDYWxsYmFjazogZnVuY3Rpb24gKGlkKSB7XG4gZGVsZXRlIHRoaXMuY2FsbGJhY2tzW2lkXTtcbiB9LFxuIHJlcXVlc3QoZGF0YSl7XG4gdGhyb3cgXCJuZXdjbGllbnQgc2hvdWxkIG92ZXJyaWRlIHRoaXMgbWV0aG9kLlwiXG4gfSxcbiBvblJlc3BvbnNlOiBmdW5jdGlvbiAoanNvbikge1xuIHZhciBjYiA9IHRoaXMuY2FsbGJhY2tzW2pzb24uaWRdO1xuIGlmIChjYikge1xuIGNiKGpzb24pO1xuIGRlbGV0ZSB0aGlzLmNhbGxiYWNrc1tqc29uLmlkXVxuIH1cbiB9XG4gfSwgcHJveHkpXG4gfSovXG5cblxuZnVuY3Rpb24gaXNQcm9taXNlKG9iaikge1xuICAgIHJldHVybiAhIW9iaiAmJiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJykgJiYgdHlwZW9mIG9iai50aGVuID09PSAnZnVuY3Rpb24nO1xufVxuXG5cbmNsYXNzIFNlcnZlckhhbmRsZXIge1xuXG4gICAgY29uc3RydWN0b3IoaW1wbCkge1xuICAgICAgICB0aGlzLmltcGwgPSBpbXBsXG4gICAgICAgIHRoaXMuY2FsbGJhY2tSZXR1cm5zID0ge307XG4gICAgfVxuXG4gICAgcmVzcG9uc2UoZGF0YSwgcmVmKSB7XG4gICAgICAgIHRocm93IFwibmV3Y2xpZW50IHNob3VsZCBvdmVycmlkZSB0aGlzIG1ldGhvZC5cIlxuICAgIH1cblxuICAgIG9uUmVxdWVzdChkYXRhLCByZWYpIHtcbiAgICAgICAgZGVidWcoXCJvblJlcXVlc3RcIiwgZGF0YSwgcmVmKTtcblxuICAgICAgICBpZiAoZGF0YS5tZXRob2QpIHtcbiAgICAgICAgICAgIHRoaXMuX2hhbmRsZVJlcXVlc3QoZGF0YSwgcmVmKTtcbiAgICAgICAgfSBlbHNlIHsgLy8gdGhpcyBpcyBhIHJldHVybiB2YWx1ZSBvZiBhIGNhbGxiYWNrXG4gICAgICAgICAgICB0aGlzLl9oYW5kbGVDYWxsYmFja1JldHVybihkYXRhKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIF9oYW5kbGVDYWxsYmFja1JldHVybihkYXRhKSB7XG4gICAgICAgIGxldCBhcnIgPSB0aGlzLmNhbGxiYWNrUmV0dXJuc1tkYXRhLmlkXTtcbiAgICAgICAgZGVidWcoXCJoYW5kbGUgY2FsbGJhY2sgcmV0XCIsIGRhdGEsIGFycik7XG5cbiAgICAgICAgdHJ5IHtcblxuICAgICAgICAgICAgaWYoYXJyICYmIGFyci5sZW5ndGg9PTIpIHtcbiAgICAgICAgICAgICAgICB2YXIgW3Jlc29sdmUscmVqZWN0XSA9IGFycjtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZGF0YS5lcnJvcilcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEucmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gIGZpbmFsbHkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuY2FsbGJhY2tSZXR1cm5zW2RhdGEuaWRdO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBfc2VuZENhbGxiYWNrKGNhbGxiYWNrSWQsIC4uLmFyZ3MpIHtcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja1JldHVybnNbY2FsbGJhY2tJZF0gPSBbcmVzb2x2ZSwgcmVqZWN0XTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucmVzcG9uc2Uoe1xuICAgICAgICAgICAganNvbnJwYyxcbiAgICAgICAgICAgIGlkOiBjYWxsYmFja0lkLFxuICAgICAgICAgICAgcGFyYW1zOiBhcmdzXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9XG5cbiAgICBfc2VydmVyRXJyb3IocmVhc29uLGlkLCByZWYpIHtcbiAgICAgICAgdGhpcy5yZXNwb25zZSh7XG4gICAgICAgICAgICBqc29ucnBjOiBcIjIuMFwiLFxuICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICBjb2RlOiAtMzIwMDAsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJTZXJ2ZXIgZXJyb3JcIixcbiAgICAgICAgICAgICAgICBkYXRhOiByZWFzb25cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZFxuICAgICAgICB9LCByZWYpO1xuICAgIH1cblxuICAgIF9tZXRob2ROb3RGb3VuZChkYXRhLCByZWYpIHtcbiAgICAgICAgaWYgKGRhdGEuaWQpIHtcbiAgICAgICAgICAgIHRoaXMucmVzcG9uc2Uoe1xuICAgICAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGpzb25ycGMsXG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJNZXRob2Qgbm90IGZvdW5kXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCByZWYpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBfc2VuZFJlc3VsdCh2YWx1ZSwgZGF0YSwgcmVmKSB7XG4gICAgICAgIGRlYnVnKFwic2VuZHJlc3VsdCBcIiwgdmFsdWUpO1xuICAgICAgICB0aGlzLnJlc3BvbnNlKHtcbiAgICAgICAgICAgIGpzb25ycGMsXG4gICAgICAgICAgICByZXN1bHQ6IHZhbHVlLFxuICAgICAgICAgICAgaWQ6IGRhdGEuaWRcbiAgICAgICAgfSwgcmVmKTtcbiAgICB9XG5cbiAgICBfY2xlYW5DYWxsYmFja3MoY2FsbGJhY2tJZHMpIHtcbiAgICAgICAgZGVidWcoXCJzZXJ2ZXIgY2xlYW5cIiwgY2FsbGJhY2tJZHMpO1xuICAgICAgICBjYWxsYmFja0lkcy5mb3JFYWNoKGlkID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNhbGxiYWNrUmV0dXJuc1tpZF1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgX2hhbmRsZVJlcXVlc3QoZGF0YSwgcmVmKSB7XG4gICAgICAgIGlmICghdGhpcy5pbXBsLmhhc093blByb3BlcnR5KGRhdGEubWV0aG9kKSkge1xuICAgICAgICAgICAgdGhpcy5fbWV0aG9kTm90Rm91bmQoZGF0YSwgcmVmKTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgbWV0aG9kID0gdGhpcy5pbXBsW2RhdGEubWV0aG9kXTtcbiAgICAgICAgdmFyIGNhbGxiYWNrSWRzID0gW107XG4gICAgICAgIGlmIChkYXRhLmNhbGxiYWNrcyAmJiBkYXRhLmNhbGxiYWNrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGxiYWNrSWQgPSBkYXRhLmNhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgICAgICBkYXRhLnBhcmFtc1tpXSA9IHRoaXMuX3NlbmRDYWxsYmFjay5iaW5kKHRoaXMsIGNhbGxiYWNrSWQpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrSWRzLnB1c2goY2FsbGJhY2tJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuaWQgIT0gbnVsbCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mKG1ldGhvZCkgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXQgPSBtZXRob2QuYXBwbHkodGhpcy5pbXBsLCBkYXRhLnBhcmFtcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Byb21pc2UocmV0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0LnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZW5kUmVzdWx0KHJlc3VsdCwgZGF0YSwgcmVmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jbGVhbkNhbGxiYWNrcyhjYWxsYmFja0lkcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2VydmVyRXJyb3IoZXJyb3IsZGF0YS5pZCwgcmVmKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jbGVhbkNhbGxiYWNrcyhjYWxsYmFja0lkcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NlbmRSZXN1bHQocmV0LCBkYXRhLCByZWYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2xlYW5DYWxsYmFja3MoY2FsbGJhY2tJZHMpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9zZW5kUmVzdWx0KG1ldGhvZCwgZGF0YSwgcmVmKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2xlYW5DYWxsYmFja3MoY2FsbGJhY2tJZHMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGRlYnVnKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NlcnZlckVycm9yKGUsZGF0YS5pZCwgcmVmKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9jbGVhbkNhbGxiYWNrcyhjYWxsYmFja0lkcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YobWV0aG9kKSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBtZXRob2QuYXBwbHkodGhpcy5pbXBsLCBkYXRhLnBhcmFtcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn1cblxuXG4vKipcbiAqXG4gKiBAcGFyYW0gaGFuZGxlciAgaW50ZXJmYWNlIHtcbiAqICAgICAgICAgICAgICAgICAgICAgIG9uUmVxdWVzdChkYXRhKSAgcmVjZWl2ZWQgcmVtb3RlIGRhdGFcbiAqICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlKGlkLGRhdGEpICByZXBseSB0byBjbGllbnRwcm94eVxuICogICAgICAgICAgICAgICAgIH1cbiAqIEBwYXJhbSBpbXBsXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcnZlcmhhbmRsZXIoaW1wbCkge1xuICAgIHJldHVybiBuZXcgU2VydmVySGFuZGxlcihpbXBsKVxufSJdfQ==