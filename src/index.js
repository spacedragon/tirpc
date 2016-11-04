
var debug = require("debug")("tirpc");


class RpcClient {
    constructor(clientId, methods) {
        this.clientId = clientId;
        this.methods = methods;
        this.curid = 0;
        this.callbacks = {};
    }

    _nextId() {
        return this.curid++;
    }

    _setCallback(id, callback) {
        this.callbacks[id] = callback
    }

    _clearCallback(id) {
        delete this.callbacks[id];
    }

    request(data) {
        throw "client should override this method."
    }

    onResponse(response) {
        debug("onResponse ", response);
        var cb;
        if(response.callback!=null){
            cb = this.callbacks[response.callback];
            if(cb){
                cb(response);
            }
        }else {
            cb = this.callbacks[response.id];
            if (cb) {
                cb(response);
                delete this.callbacks[response.id]
            }
        }

    }

    _callbackReturn(callbackFunc, json) {
        var sendResult = (r) => {
            this.request({
                id: json.id,
                result: r
            })
        };
        var sendError = (e) => {
            this.request({
                error: {
                    code: -32000,
                    message: "Server error",
                    data: e
                },
                id: json.id
            })
        };

        try {

            var result = callbackFunc(...json.params);
            if (isPromise(result)) {
                result.then(sendResult.bind(this), sendError.bind(this))
            } else {
                this.request({
                    id: json.id,
                    result: result
                });
            }
        } catch (e) {
            sendError(e)
        }
    }

    _method_call(method, ...args) {

        var params = Array.from(args);
        var callbackIndices = [];
        for (var i = 0; i < args.length; i++) {
            const arg = args[i];
            if (typeof(arg) == "function") {
                var id = this._nextId();
                callbackIndices.push(i);

                params[i] = id;
                this._setCallback(id, (json)=> {
                    this._callbackReturn(arg, json);
                });
            }
        }
        var req = {
            id: this._nextId(),
            method,
            params: params,
            from: this.clientId,
            callbacks: callbackIndices
        };

        var cleanCallbacks = (ret) => {
            debug("client clean", req.id, callbackIndices);
            callbackIndices.forEach(funcid => this._clearCallback(funcid));
            this._clearCallback(req.id);
            return ret
        };

        var p = new Promise((resolve, reject)=> {
            this._setCallback(req.id, (ret)=> {
                if (ret.error) {
                    reject(ret)
                } else {
                    resolve(ret.result)
                }
            });
            this.request(req);
        }).then(cleanCallbacks, cleanCallbacks);

        p.cancel = ()=> {  // add a cancel function to promise, this will unregister all callbacks
            cleanCallbacks()
        };
        return p;
    }
}

/**
 *
 * @param methods  string array of api method names;
 * @param clientId
 */
export function newclient(methods, clientId) {
    let ret = new RpcClient(clientId, methods);

    for (var i = 0; i < methods.length; i++) {
        var m = methods[i];
        ret[m] = ret._method_call.bind(ret, m)
    }
    return ret;
}



function isPromise(obj) {
    return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}


class ServerHandler {

    constructor(impl) {
        this.impl = impl;
        this.callbackReturns = {};
        this.curid=0;
    }
    _nextId() {
        return this.curid++;
    }

    response(data, ref) {
        throw "server should override this method."
    }

    onRequest(data, ref) {
        debug("onRequest", data);

        if (data.method) {
            this._handleRequest(data, ref);
        } else { // this is a return value of a callback
            this._handleCallbackReturn(data);
        }
    }

    _handleCallbackReturn(data) {
        let arr = this.callbackReturns[data.id];
        debug("handle callback ret", data, arr);

        try {

            if(arr && arr.length==2) {
                var [resolve,reject] = arr;
                if (data.error) {
                    reject(data.error)
                } else {
                    resolve(data.result);
                }
            }
        }  finally {
            delete this.callbackReturns[data.id];
        }
    }


    _sendCallback(callbackId, ...args) {
        var id = this._nextId();
        var p = new Promise( (resolve, reject) => {
            this.callbackReturns[id] = [resolve, reject];
        });
        this.response({
            id,
            callback: callbackId,
            params: args
        });
        return p;
    }

    _serverError(reason,id, ref) {
        this.response({
            error: {
                code: -32000,
                message: "Server error",
                data: reason
            },
            id
        }, ref);
    }

    _methodNotFound(data, ref) {
        if (data.id) {
            this.response({
                id: data.id,
                error: {
                    code: -32601,
                    message: "Method not found"
                }
            }, ref)
        }
    }

    _sendResult(value, data, ref) {
        debug("sendresult ", value);
        this.response({
            result: value,
            id: data.id
        }, ref);
    }

    _cleanCallbacks(callbackIds) {
        debug("server clean", callbackIds);
        callbackIds.forEach(id => {
            delete this.callbackReturns[id]
        });
    }

    _handleRequest(data, ref) {
        if (!this.impl.hasOwnProperty(data.method)) {
            this._methodNotFound(data, ref);
        }
        let method = this.impl[data.method];
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
                if (typeof(method) == "function") {
                    var ret = method.apply(this.impl, data.params);
                    if (isPromise(ret)) {
                        ret.then(result => {
                            this._sendResult(result, data, ref);
                            this._cleanCallbacks(callbackIds);
                        }, error => {
                            this._serverError(error,data.id, ref);
                            this._cleanCallbacks(callbackIds);
                        });
                    } else {
                        this._sendResult(ret, data, ref);
                        this._cleanCallbacks(callbackIds)
                    }
                } else {
                    this._sendResult(method, data, ref);
                    this._cleanCallbacks(callbackIds)
                }
            } catch (e) {
                debug(e.stack);
                this._serverError(e,data.id, ref);
                this._cleanCallbacks(callbackIds)
            }
        } else {
            if (typeof(method) == "function") {
                method.apply(this.impl, data.params);
            }
        }
    }

}


/**
 *
 * @param handler  interface {
 *                      onRequest(data)  received remote data
 *                      response(id,data)  reply to clientproxy
 *                 }
 * @param impl
 */

export function serverhandler(impl) {
    return new ServerHandler(impl)
}