"use strict";
exports.__esModule = true;
// import http
var http = require("http");
// import ws
var ws = require("ws");
// returns a 'random' string
function generateRandomString(size) {
    if (size === void 0) { size = 10; }
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456790';
    var charsLength = characters.length;
    for (var i = 0; i < size; i++) {
        result += characters.charAt(Math.floor(Math.random() * charsLength));
    }
    return result;
}
var colors = [
    '#ff3636', '#ff6136', '#ff9b36', '#fff736', '#afff36', '#69ff36', '#36ff64',
    '#36ffb5', '#36faff', '#3699ff', '#3643ff', '#8236ff', '#cf36ff', '#ff36c1'
];
// get a random color from colors Array<string>
function getRandomColor() {
    var i = Math.floor(Math.random() * colors.length);
    return colors[i];
}
var Client = /** @class */ (function () {
    function Client(id, socket) {
        this.id = id;
        this.socket = socket;
    }
    Client.prototype.setName = function (username) {
        this.username = username;
    };
    Client.prototype.setColor = function (color) {
        this.color = color;
    };
    Client.prototype.getJSON = function () {
        return JSON.stringify({ id: this.id, username: this.username, color: this.color });
    };
    return Client;
}());
function addClient(socket) {
    var newClient = new Client(idIndex, socket);
    clients.push(newClient);
    idIndex++;
    return newClient;
}
function removeClient(client) {
    var clientIndex = -1;
    for (var i = clients.length; i >= 0; i--) {
        if (clients[i] === client) {
            clientIndex = i;
        }
    }
    if (clientIndex !== -1) {
        clients.splice(clientIndex, 1);
    }
}
function getJSONUserList() {
    var list = [];
    clients.forEach(function (client) {
        list.push({ id: client.id, username: client.username, color: client.color });
    });
    return JSON.stringify(list);
}
var PORT = 8080;
var connectedPeers = 0;
var idIndex = 0;
var clients = [];
var chatHistory = [];
var serverColor = '#88FFFFFF';
// logs the amount of active connections
function showActiveConnections() {
    console.log('Active connections: ' + connectedPeers);
}
// create http server
var httpServer = http.createServer(function (req, res) {
    res.end('<h2>Godot Websockets chat</h2>');
});
// http server start listening
httpServer.listen(PORT);
//  create ws server
var wsServer = new ws.Server({ server: httpServer });
// on listening
wsServer.on('listening', function () {
    console.log('WebSocket server listening on ' + PORT);
});
// on connection. fires whenever a new connection is received
wsServer.on('connection', function (socket, request) {
    connectedPeers++;
    // create new client
    var client = addClient(socket);
    client.username = 'user-' + generateRandomString(5);
    client.color = getRandomColor();
    // inform all clients of new client
    clients.forEach(function (c) {
        if (c === client)
            return; // except this one
        c.socket.send(':UC' + client.getJSON());
    });
    // send new client their id, generated name and color
    socket.send(':FM' + JSON.stringify({ id: client.id, username: client.username, color: client.color }));
    // send user list
    socket.send(':UL' + getJSONUserList());
    // send a message informing a new user
    var date = new Date();
    var m = {
        hour: date.getHours(), minute: date.getMinutes(),
        id: -1, username: '', color: client.color,
        message: '[i]** ' + '[b][color=' + client.color + ']' + client.username + '[/color][/b] conectou-se ao chat' + '[/i]'
    };
    sendMessage(m);
    // send the new client the chat history
    socket.send(':AM' + JSON.stringify(chatHistory));
    // message is received
    socket.on('message', function (message) {
        // process message
        // check if message is not string
        if (typeof (message) !== 'string') {
            // socket.close(4000, 'INVALID TRANSFER MODE')
            console.log('Invalid message from ' + request.connection.remoteAddress);
            return;
        }
        // check if message doesn't start with :
        if (!message.startsWith(':')) {
            console.log('Invalid message from ' + request.connection.remoteAddress);
            return;
        }
        var header = message.slice(0, 3);
        var content = message.slice(3, message.length);
        // console.log(header, content)
        switch (header) {
            case ':M1':
                { // send a message
                    // create the message obj and send it
                    var date_1 = new Date();
                    var m_1 = {
                        hour: date_1.getHours(), minute: date_1.getMinutes(),
                        id: client.id, username: client.username, color: client.color,
                        message: content.trim()
                    };
                    console.log('(' + m_1.hour + ':' + m_1.minute + ')', m_1.username + ": " + m_1.message);
                    sendMessage(m_1);
                }
                break;
            case ':UN':
                { // change username
                    console.log('(' + request.connection.remoteAddress + ')' + client.username + ' change user name to: ' + content);
                    // create message and send it informing the username change
                    var date_2 = new Date();
                    var m_2 = {
                        hour: date_2.getHours(), minute: date_2.getMinutes(),
                        id: -1, username: '', color: serverColor,
                        message: '[i]** ' + '[color=' + client.color + ']' + '[b]' + client.username + '[/b]' + '[/color]' + ' mudou seu nome para ' + '[color=' + client.color + ']' + '[b]' + content + '[/b]' + '[/color]' + '[/i]'
                    };
                    sendMessage(m_2);
                    // change client's username
                    client.setName(content);
                    // inform connected clients of the username change
                    var u_1 = client.getJSON();
                    clients.forEach(function (c) {
                        c.socket.send(':N2' + u_1);
                    });
                }
                break;
            case ':PI':
                client.socket.send(':PONG');
                break;
            default:
                // invalid message
                console.log('??? invalid ???? - ' + message);
                break;
        }
    });
    // connection is closed
    socket.on('close', function (code, reason) {
        connectedPeers--;
        console.log('A connection was closed. code: ' + code + ' reason: ' + reason);
        // remove the client from the list
        removeClient(client);
        // inform clients of the disconnection
        clients.forEach(function (c) {
            c.socket.send(':UD' + client.id);
        });
        // create and send the new message
        var date = new Date();
        var m = {
            hour: date.getHours(), minute: date.getMinutes(),
            id: -1, username: '', color: serverColor,
            message: '[i]** ' + '[color=' + client.color + ']' + client.username + '[/color]' + ' saiu' + '[/i]'
        };
        sendMessage(m);
    });
});
function sendMessage(message) {
    // add :M2 header and the jsonfied message
    var mJson = ':M2' + JSON.stringify(message);
    // add message to history
    addMessageToHistory(message);
    // send to all connected clients
    clients.forEach(function (client) {
        client.socket.send(mJson);
    });
}
function addMessageToHistory(message) {
    chatHistory.push(message);
    // remove older messages from history if it has more than 30
    if (chatHistory.length > 30) {
        chatHistory.shift();
    }
}
