# tiRpc
a transport-layer independent  RPC framework

## Installation

```bash
$ npm install tirpc
```

## Usage

   
  tiRpc 是一个对于传输层不作限制的rpc 框架 , 使用者需要给它提供传输层的方法来进行实际的网络调用。 主要是 request, onRequest, response , onResponse 这4个方法。
  
  Google translate:
  `
  This is an unlimited rpc framework for the transport layer, the user needs to provide it with the transport layer methods to the actual network _method_call.
  These methods are  request, onRequest, response and onResponse.
  ` 
    
### A useless example :

```js

    import {serverhandler, newclient} from "tirpc";

    // a service implement  这是服务的实现类 
    var impl = {
        add(a, b) {
            return a + b;
        }
        
    };

    // create a server object  代表服务端的对象 
    var server = serverhandler(impl);

    // create a client object  代表客户端的对象
    var client = newclient(["add"]);  // tell the server method names;  客户端需要注册来自服务端的方法名称

    // bind client's request method to server's onRequest method    将客户端的request方法绑定到服务端的 onRequest 方法 
    client.request = server.onRequest.bind(server);
    // bind server's response method to client's onResponse method,   将服务端的response 方法绑定到客户端的 onResponse 方法
    server.response = client.onResponse.bind(client);
    // 这样， 服务端和客户端就直接连接了
    
    // test it. 测试一下
    client.add(1, 1).then((result)=> {
                assert.equal(result, 2);
            })
```

### A more useful example - http:

```js

    var express = require('express');
    var bodyParser = require('body-parser');
        
    var server = serverhandler(impl);
    var app = express();
    app.use(bodyParser.json());
    app.post('/rpc',  function (req, res) {  
        server.onRequest(req.body, res);  //tell server where request is comming
    });
    // tell server how to response a request
    server.response = (data, res) => {
                res.end(JSON.stringify(data))
    };
    
    var fetch = require('node-fetch');
    // tell client how to send a request
    client.request = (data) => {
        fetch("http://localhost:8000/rpc", {
                headers:{'Content-Type': 'application/json'},
                method: "post",
                body: JSON.stringify(data)}
             ).then(res => {
                return res.json()
             }).then(json => {
             client.onResponse(json)     // tell client a response is comming. 
             })
    }
    
    // test it. 测试一下
        client.add(1, 1).then((result)=> {
                    assert.equal(result, 2);
        })

```


tiRpc supports bidirectional async rpc ,  take socket io for example:

### Example - socket.io :
```js

    var impl = {
        callback(clientFunc) {  // this api receives a callback function
            for (var i = 4; i >= 0; i--) {
                clientFunc(i).then(msgFromClient => {       // the client callback function can be called repeatedly , until this api returns.
                    debug("msg from client,",msgFromClient)   
                })
            }
            return new Promise((resolve,reject)=> {   // async support by Promise   
                setTimeout(resolve,  1000)            // you can never call resolve() 
            });
        }
    };
    var server = serverhandler(impl);
    
    var io = require('socket.io')(8080);
    var nsp = io.of("/jsonrpc");   // optional
    

    
    nsp.on('connection', function (socket) {
        socket.on('message', function (data) {
            server.onRequest(data,socket);
        });
    });
    
    handler.response = function (data,socket) {
            socket.emit('message_reply', data) // use 'message_reply' event for response
    };
    
     var socket = require('socket.io-client')("http://localhost:5000/tirpc");
     socket.on("connect", ()=> {

        client.request = (data) => {
            debug("emitting", data);
            socket.emit('message', data)
        };

        socket.on('message_reply', function (message) {  // response is coming.
            client.onResponse(message)
        });
        debug("client initiated.");
        
        client.callback(count => {     // call the server api.
                debug("counter,", count);
                return "count " + count;   // this will return to server.
        });
        
     });  
    
```

## Future
    * client lifecycle managerment ? 

## Authors

 - spacedragon &lt;allendragon@gmail.com&gt

## License

(The MIT License)

Copyright (c) 2014-2016 spacedragon &lt;allendragon@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.