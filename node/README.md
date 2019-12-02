The server
===

I'm beggining in this node/js thing, the code could probably be a lot better. I also have no idea how to write this readme.

Well, the server runs on Node.js. The version I had when this was made was v11.15.0. The only external dependency is `ws`, it provides the websocket server.

hmmm... the `server.js` file is the compiled version of `src/server.ts`. While it's readable, I think it's better to refer to the "original" typescript file.

The `src` folder contains two files: `server.ts` and `server glitch.ts`. The `server glitch.ts` file is the one I use in Glitch.com. The only difference between these two is that the glitch one serves a html file over http. You can check the [server project on Glitch.com](https://glitch.com/~godot-websockets-chat)

-----
The messages exchanged by the client and server have a small identificators(??? I'll just call them headers). Below are the list of the headers and the message contents.

message headers
---

header  | content | from>to | description
| - | - | - | - |
:FM | { id, username, color } | server>client | first message from server to client. sends the random username and color to the client
:UL | [{id, username, color}, ...] | server>client | contains the list of connected users
:AM | [{ hour, minute, time, message }, ... ] | server>client | contains a list of the last messages
:UN | username | client>server | contains new username
:N2 | { id, username } | server>clients | contains the new username of a user
:M1 | message | client>server | contains a message from a client
:M2 | { hour, minute, username, message } | server>clients | contains a message
:UC | {id, username, color} | server>clients | user connected
:UD | id | server>clients | user disconnected
:PI | - | client>server | PING. keep connection alive
:PO | - | server> client | PONG. keep connection alive