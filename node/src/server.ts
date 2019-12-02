// import http
import http = require('http')
// import ws
import ws = require('ws')

// returns a 'random' string
function generateRandomString(size:number = 10): string {
    let result = ''
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456790'
    let charsLength = characters.length
    
    for (var i = 0; i < size; i++) {
        result += characters.charAt(Math.floor(Math.random() * charsLength))
    }
    
    return result
}

const colors: Array<string> = [
    '#ff3636', '#ff6136', '#ff9b36', '#fff736', '#afff36', '#69ff36', '#36ff64',
    '#36ffb5', '#36faff', '#3699ff', '#3643ff', '#8236ff', '#cf36ff', '#ff36c1'

]
// get a random color from colors Array<string>
function getRandomColor(): string {
    let i = Math.floor(Math.random() * colors.length)
    return colors[i]
}

interface Message {
    hour: number,
    minute: number,
    id: number,
    username: string,
    color: string,
    message: string
}

class Client {
    id :number
    socket: ws
    username: string
    color: string
    
    constructor (id: number, socket: ws) {
        this.id = id
        this.socket = socket
    }
    
    setName(username: string) {
        this.username = username
    }
    
    setColor(color: string) {
        this.color = color
    }
    
    getJSON(): String {
        return JSON.stringify({id: this.id, username: this.username, color: this.color})
    }
}

function addClient(socket: ws) {
    var newClient = new Client(idIndex, socket)
    clients.push(newClient)
    idIndex++
    return newClient
}

function removeClient(client: Client): void {
    let clientIndex = -1
    for (let i = clients.length; i >= 0; i--) {
        if (clients[i] === client) {
            clientIndex = i
        }
    }
    
    if (clientIndex !== -1) {
        clients.splice(clientIndex, 1)
    }
}

function getJSONUserList(): string {
    let list = []
    clients.forEach((client) => {
       list.push({ id: client.id, username: client.username, color: client.color }) 
    })
    
    return JSON.stringify(list)
}

const PORT: number = 8080

let connectedPeers: number = 0
let idIndex: number = 0

let clients: Array<Client> = []
let chatHistory: Array<Message> = []
const serverColor: string = '#88FFFFFF'


// logs the amount of active connections
function showActiveConnections() {
    console.log('Active connections: ' + connectedPeers)
}

// create http server
const httpServer = http.createServer((req, res) => {
    res.end('<h2>Godot Websockets chat</h2>')
})

// http server start listening
httpServer.listen(PORT)

//  create ws server
const wsServer = new ws.Server( {server: httpServer} )


// on listening
wsServer.on('listening', () => {
    console.log('WebSocket server listening on ' + PORT)
})


// on connection. fires whenever a new connection is received
wsServer.on('connection', (socket, request) => {
    connectedPeers++
    
    // create new client
    var client = addClient(socket)
    client.username = 'user-' + generateRandomString(5)
    client.color = getRandomColor()
    
    // inform all clients of new client
    clients.forEach(c => {
        if (c === client) return // except this one
        c.socket.send(':UC' + client.getJSON())
    });
    
    // send new client their id, generated name and color
    socket.send(':FM' + JSON.stringify({id: client.id, username: client.username, color: client.color}))
    // send user list
    socket.send(':UL' + getJSONUserList())
    
    // send a message informing a new user
    let date = new Date()
    let m: Message = {
        hour: date.getHours(), minute: date.getMinutes(),
        id: -1, username: '', color: client.color,
        message: '[i]** ' + '[b][color=' + client.color + ']' + client.username + '[/color][/b] conectou-se ao chat' + '[/i]'
    }
    sendMessage(m)
    
    // send the new client the chat history
    socket.send(':AM' + JSON.stringify(chatHistory))
    
    
    // message is received
    socket.on('message', (message) => {
        // process message
        // check if message is not string
        if (typeof(message) !== 'string') {
            // socket.close(4000, 'INVALID TRANSFER MODE')
            console.log('Invalid message from ' + request.connection.remoteAddress)
            return
        }
        
        // check if message doesn't start with :
        if (!message.startsWith(':')) {
            console.log('Invalid message from ' + request.connection.remoteAddress)
            return
        }
        
        
        let header: string = message.slice(0, 3)
        let content: string = message.slice(3, message.length)
        
        // console.log(header, content)
        
        switch(header) {
            case ':M1': { // send a message
                // create the message obj and send it
                let date = new Date()
                let m: Message = {
                    hour: date.getHours(), minute: date.getMinutes(),
                    id: client.id, username: client.username, color: client.color,
                    message: content.trim()
                }
                console.log('(' + m.hour + ':' + m.minute + ')',  m.username + ": " + m.message)
                sendMessage(m)
            } break
            case ':UN': { // change username
                console.log('(' + request.connection.remoteAddress + ')' + client.username + ' change user name to: ' + content)
                // create message and send it informing the username change
                let date = new Date()
                let m: Message = {
                    hour: date.getHours(), minute: date.getMinutes(),
                    id: -1, username: '', color: serverColor,
                    message: '[i]** ' + '[color=' + client.color + ']' + '[b]' + client.username + '[/b]' + '[/color]' + ' mudou seu nome para ' + '[color=' + client.color + ']' + '[b]' + content + '[/b]' + '[/color]' + '[/i]'
                }
                sendMessage(m)
                // change client's username
                client.setName(content)
                // inform connected clients of the username change
                let u = client.getJSON()
                clients.forEach(c => {
                    c.socket.send(':N2' + u)
                })
            } break
            case ':PI':
                client.socket.send(':PONG')
                break
            default:
                // invalid message
                console.log('??? invalid ???? - ' + message)
                break
        }
    })
    
    // connection is closed
    socket.on('close', (code, reason) => {
        connectedPeers--
        
        console.log('A connection was closed. code: ' + code + ' reason: ' + reason)
        
        // remove the client from the list
        removeClient(client)
        
        // inform clients of the disconnection
        clients.forEach(c => {
            c.socket.send(':UD' + client.id)
        });
        
        // create and send the new message
        let date = new Date()
        let m: Message = {
            hour: date.getHours(), minute: date.getMinutes(),
            id: -1, username: '', color: serverColor,
            message: '[i]** ' + '[color=' + client.color + ']' + client.username + '[/color]' + ' saiu' + '[/i]'
        }
        sendMessage(m)
    })
})


function sendMessage(message: Message) {
    // add :M2 header and the jsonfied message
    var mJson = ':M2' + JSON.stringify(message)
    // add message to history
    addMessageToHistory(message)
    // send to all connected clients
    clients.forEach(client => {
        client.socket.send(mJson)
    });
}

function addMessageToHistory(message: Message) {
    chatHistory.push(message)
    // remove older messages from history if it has more than 30
    if (chatHistory.length > 30) {
        chatHistory.shift()
    }
}