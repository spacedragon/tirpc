import {serverhandler, newclient, clientproxy} from "../src/index.js";

import {assert} from "chai"

var debug = require('debug')('test');


suite('1+1', function () {
    var impl = {
        add(a, b) {
            return a + b;
        },
        callback(func) {

        }
    };

    var server = serverhandler(impl);


    var client = newclient(["add","callback"]);


    client.request = server.onRequest.bind(server);
    server.response = client.onResponse.bind(client);


    setup(function () {

    });

    test('1 加 1 应该等于 2', function (done) {
        client.add(1, 1).then((result)=> {
            assert.equal(result, 2);
            done()
        })
    });

    test("callback",function(done){
        impl.callback = (func) => {
            func("ok").then(ret => {
                debug("result is ",ret);
                assert.equal(ret,"callback value");
                done();

            });
            return new Promise((resolve,reject)=> {
                setTimeout(()=> {
                    resolve();
                },1000)
            })
        };
        client.callback(msg => {
            assert.equal(msg, "ok");

            return "callback value"
        })
    })
});
/*

import {mqttRPCServer, mqttRPCClient} from "../../src/rpc/mqttrpc"

suite('mqtt test', function () {
    var impl = {
        add(a, b) {
            return a + b;
        }
    };

    var host = "mqtt://192.168.31.143";

    var server = mqttRPCServer(impl, host);

    var promise = mqttRPCClient(host,"test");


    setup(function () {

    });

    test('1 加 1 应该等于 2', function (done) {
        console.log(promise);

        promise.then(c => {
            console.log("ready");
            return c.add(1, 1, (err, result)=> {
                assert.equal(err, null);
                console.log("result is ", result);
                assert.equal(result, 2);
                done();
            })
        });
    });
});*/


