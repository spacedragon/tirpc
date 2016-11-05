import {serverhandler, newclient} from "../src/index.js";

import {assert} from "chai"

var debug = require('debug')('test');


suite('mqtt', function () {
    var impl = {
        add(a, b) {
            return a + b;
        },
        callback(clientFunc) {  // this method receives a callback function
            for (var i = 4; i >= 0; i--) {
                clientFunc(i).then(msgFromClient => {
                    debug("msg from client,",msgFromClient)
                })
            }
            return new Promise((close,reject)=> {
                setTimeout(close,  1000)
            });
        }
    };

    var server = serverhandler(impl);

    var client = newclient(["add", "callback"]);

    var mqtt = require("mqtt").connect("mqtt://localhost");




    setup(function (done) {
        const TOPIC = "rpc";

        mqtt.subscribe(TOPIC);
        mqtt.on('message', function (t, message) {
            debug("server receive,", t, message);
            if (t == TOPIC) {

                var data = JSON.parse(message);
                debug(t, data);
                server.onRequest(data, data.from);
            }
        });
        server.response = function (data, from) {
            var reply_topic = from + "_reply";
            debug("response",from, data)
            mqtt.publish(reply_topic, JSON.stringify(data), {qos: 1})
        };

        var mqttclient = require("mqtt").connect("mqtt://localhost");

        mqttclient.on("connect", function(){
            var cid = mqttclient.options.clientId;
            debug("cid",cid);
            var responseTopic = cid + "_reply";
            mqttclient.on('message', function (t, message) {
                if (t == responseTopic) {
                    client.onResponse(JSON.parse(message))
                }
            });
            mqttclient.subscribe(responseTopic);
            client.request = (data) => {
                data.from = cid;
                mqttclient.publish(TOPIC, JSON.stringify(data), {qos: 2})
            };
            done()
        });
    });

    test('1 加 1 应该等于 2', function (done) {
        client.add(1, 1).then((result)=> {
            assert.equal(result, 2);
            done()
        })
    });

    test("callback", function (done) {
        client.callback(count => {
            debug("counter,", count);
            if (count <= 0)
                done();
            return "count " + count;
        })
    })
});