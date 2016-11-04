import {assert} from "chai"
import {serverhandler, newclient, clientproxy} from "../src/index";
const http = require('http');
var fetch = require('node-fetch');


suite("http", function () {
    var impl = {
        add(a, b) {
            return a + b;
        }

    };

    var client = newclient(["add"]);
    var httpServer;
    setup(function () {
        var server = serverhandler(impl);

        httpServer = http.createServer((req, res) => {
            var body = '';
            req.on('data', function (chunk) {
                body += chunk;
            });
            req.on('end', function () {
                server.onRequest(JSON.parse(body), res);
            });

        });
        server.response = (data, res) => {
            res.end(JSON.stringify(data))
        };


        httpServer.listen(8000);

        client.request = (data) => {
            fetch("http://localhost:8000", {method: "post", body: JSON.stringify(data)})
                .then(res => {
                    return res.json()
                }).then(json => {
                client.onResponse(json)
            })
        }

    });

    teardown(function () {
        httpServer.close();
    });

    test('1 加 1 应该等于 2', function (done) {
        client.add(1, 1).then((result)=> {
            console.log("result is ", result);
            assert.equal(result, 2);
            done()
        })
    });

});

var express = require('express');
var bodyParser = require('body-parser');

suite("express", function () {
    var impl = {
        add(a, b) {
            return a + b;
        }

    };

    var client = newclient(["add"]);

    setup(function () {
        var server = serverhandler(impl);
        var app = express();
        app.use(bodyParser.json());
        app.post('/rpc',  function (req, res) {
            server.onRequest(req.body, res);
        });
        server.response = (data, res) => {
            res.send(JSON.stringify(data))
        };

        app.listen(8000,function(){
           console.log("server started");
        });

        client.request = (data) => {
            fetch("http://localhost:8000/rpc",
                {
                    headers:{'Content-Type': 'application/json'},
                    method: "post",
                    body: JSON.stringify(data)})
                .then(res => {
                    return res.json()
                }).then(json => {
                client.onResponse(json)
            })
        }

    });

    test('1 加 1 应该等于 2', function (done) {
        client.add(1, 1).then((result)=> {
            console.log("result is ", result);
            assert.equal(result, 2);
            done()
        })
    });
});