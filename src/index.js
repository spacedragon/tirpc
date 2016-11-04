const jsonrpc = "2.0";

var debug = require("debug")("tirpc");


class RpcClient {
    constructor(clientId, methods) {
        this.clientId = clientId;
        this.methods = methods;
        this.curid = 0;
        this.callbacks = {};
    }

    nextId() {
        return this.curid++;
    }

    setCallback(id, callback) {
        this.callbacks[id] = callback
    }

    clearCallback(id) {
        delete this.callbacks[id];
    }

    request(data) {
        throw "client should override this method."
    }

    onResponse(response) {
        debug("onResponse ", response);
        var cb = this.callbacks[response.id];
        if (cb) {
            cb(response);
            delete this.callbacks[response.id]
        }
    }

    callbackReturn(callbackFunc, json) {
        var sendResult = (r) => {
            this.request({
                jsonrpc,
                id: json.id,
                result: r
            })
        };
        var sendError = (e) => {
            this.request({
                jsonrpc: "2.0",
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
                    jsonrpc,
                    id: json.id,
                    result: result
                });
            }
        } catch (e) {
            sendError(e)
        }
    }

    call(method, ...args) {

        var params = Array.from(args);
        var callbackIndices = [];
        for (var i = 0; i < args.length; i++) {
            const arg = args[i];
            if (typeof(arg) == "function") {
                var id = this.nextId();
                callbackIndices.push(i);

                params[i] = id;
                this.setCallback(id, (json)=> {
                    this.callbackReturn(arg, json);
                });
            }
        }
        var req = {
            id: this.nextId(),
            method,
            params: params,
            from: this.clientId,
            callbacks: callbackIndices
        };

        var cleanCallbacks = (ret) => {
            debug("client clean", req.id, callbackIndices);
            callbackIndices.forEach(funcid => this.clearCallback(funcid));
            this.clearCallback(req.id);
            return ret
        };

        var p = new Promise((resolve, reject)=> {
            this.setCallback(req.id, (ret)=> {
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
        ret[m] = ret.call.bind(ret, m)
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
 id: target.nextId(),
 method: propKey,
 params: args
 };
 target.setCallback(json.id, (ret)=> {
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
 nextId(){
 return this.curid++;
 }, callbacks: {},
 setCallback: function (id, callback) {
 this.callbacks[id] = callback
 },
 clearCallback: function (id) {
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
    return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}


class ServerHandler {

    constructor(impl) {
        this.impl = impl
        this.callbackReturns = {};
    }

    response(data, ref) {
        throw "newclient should override this method."
    }

    onRequest(data, ref) {
        debug("onRequest", data, ref);

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
        var p = new Promise( (resolve, reject) => {
            this.callbackReturns[callbackId] = [resolve, reject];
        });
        this.response({
            jsonrpc,
            id: callbackId,
            params: args
        });
        return p;
    }

    _serverError(reason,id, ref) {
        this.response({
            jsonrpc: "2.0",
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
                    jsonrpc,
                    code: -32601,
                    message: "Method not found"
                }
            }, ref)
        }
    }

    _sendResult(value, data, ref) {
        debug("sendresult ", value);
        this.response({
            jsonrpc,
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