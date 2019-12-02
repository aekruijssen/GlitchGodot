extends Control
class_name wsclient

var wsc = WebSocketClient.new()
onready var ChatWindow = $ChatWindow

func _ready():
	# set chatwindow ws reference to self
	$ChatWindow.websocket = self
	connect_to_server()


func connect_to_server():
	wsc.connect_to_url("wss://godot-websockets-chat.glitch.me/")
#	wsc.connect_to_url("ws://127.0.0.1:8080")
	
	wsc.connect("data_received", self, "_on_data_received")
	wsc.connect("connection_established", self, "_on_connection_established")
	wsc.connect("connection_closed", self, "_on_connection_closed")
	wsc.connect("connection_error", self, "_on_connection_error")
	wsc.connect("server_close_request", self, "_on_close_request")


# received data from server
func _on_data_received():
	# in non godot multiplayer peers we use WebSocketPeer get_peer(1) to put packets, etc
	var data = wsc.get_peer(1).get_packet().get_string_from_utf8()
	parse_data(data)

# 
func _on_connection_established(protocol :String):
	wsc.get_peer(1).set_write_mode(WebSocketPeer.WRITE_MODE_TEXT)
	print("connected to websocket server!!! :D")
	ChatWindow.on_connected()
	$TimerPing.start(30) # pings every 30s

func _on_connection_closed(was_clean_close :bool):
	print("disconnected. clean? %s" %was_clean_close)
	ChatWindow.on_disconnected()
	$TimerPing.stop()

func _on_connection_error():
	print("connection error")
	ChatWindow.on_connection_error()

func _on_close_request(code :int, reason :String):
	print("close request %s, %s" %[code, reason])


func _process(delta):
	var status = wsc.get_connection_status()
	if status == WebSocketClient.CONNECTION_CONNECTING or status == WebSocketClient.CONNECTION_CONNECTED:
		wsc.poll()


func send_message(message: String):
	# send message to ws server
	wsc.get_peer(1).put_packet(message.to_utf8())


func parse_data(data: String):
	# check if starts with :
	if not data.begins_with(":"):
		print("received invalid message from server")
		print(data)
		return
	
	var header = data.substr(0, 3)
	var content = data.substr(3, data.length())
	
	match header:
		":FM": # first message from server. contains id, random username and color
			print("received client info")
			ChatWindow.set_client(content)
		":UL": # connected user list
			print("received user list")
			ChatWindow.receive_user_list(content)
		":AM": # list of messages (chatHistory)
			print("received list of messages")
			ChatWindow.receive_message_list(content)
		":M2": # new chat message
			print("received new message")
			ChatWindow.receive_message(content)
		":N2": # change username
			print("someone changed their username")
			ChatWindow.change_username(content)
		":UC": # user connected
			print("user connected")
			ChatWindow.on_user_connected(content)
		":UD": # user disconnected
			print("user disconnected")
			ChatWindow.on_user_disconnected(content)
		":PO":
			print("pong :)")



func _on_InfoRichtext_meta_clicked(meta) -> void:
	match meta:
		"godot":
			OS.shell_open("https://godotengine.org")
		"node":
			OS.shell_open("https://nodejs.org")
		"glitch":
			OS.shell_open("https://glitch.com/~godot-websockets-chat")
		"sourcecode":
			OS.shell_open("https://gitlab.com/umarl/glitch-godot-websockets")
		"twitter":
			OS.shell_open("https://twitter.com/uaumarlenne")


func _on_ButtonCloseInfo_pressed() -> void:
	$Info.hide()


func _on_TimerPing_timeout() -> void:
	send_message(":PING")
	print("ping :|")
