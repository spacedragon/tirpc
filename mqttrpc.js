import mqtt from "mqtt"
import {serverhandler, newclient} from "./jsonrpc"

import debug from "./debug"

export function mqttRPCServer(impl, host) {
    var client = mqtt.connect(host);

    var handler = serverhandler(impl);

    handler.response = function (data, from) {
        var reply_topic = from + "_reply";
        debug("server response", data);

        client.publish(reply_topic, JSON.stringify(data), {qos: 1})
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
            client.publish(id + "_init_reply", JSON.stringify(methods), {qos: 2})
        }
    });

    return client;
}

export function mqttRPCClient(host, id, methods) {
    var client = mqtt.connect(host);
    id = id || client.clientId;

    return new Promise((resolve, reject) => {
        client.on("connect", ()=> {
            debug(id, "connected", methods);
            var proxy = null;
            var responseTopic = id + "_reply";

            if (methods) {
                proxy = client(methods);
                client.subscribe(responseTopic);
                client.on('message', function (t, message) {
                    if (t == responseTopic) {
                        proxy.onResponse(JSON.parse(message))
                    }
                });
                resolve(proxy)
            } else {
                var init_reply = id + "_init_reply";
                var methods;
                client.on('message', function (t, message) {
                    debug("client receive,", t, message);
                    if (t == init_reply && !methods) {
                        client.unsubscribe(init_reply);
                        methods = JSON.parse(message);
                        debug(methods);
                        proxy = newclient(methods);
                        resolve(proxy)
                    } else if (t == responseTopic) {
                        proxy.onResponse(JSON.parse(message))
                    }
                });
                client.publish("init", id);
                client.subscribe(init_reply);
                client.subscribe(responseTopic);


            }

        });
    }).then(p => {
        p.request = (data) => {
            data.from = id;
            debug("publish", data);
            client.publish('rpc', JSON.stringify(data), {qos: 2})
        };
        return p;
    });
}