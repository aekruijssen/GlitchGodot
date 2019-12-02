extends PanelContainer
class_name ChatWindow

var websocket: wsclient

onready var ChatTextBox = $hbox/ChatContainer/panelcontainer/ChatText
onready var ChatInput = $hbox/ChatContainer/ChatInputContainer/ChatInput
onready var VboxUserList = $hbox/UserContainer/UserList/VboxUserList

const UserObject = preload("res://chat/user.tscn")

var client_id: int
var client_username: String
var client_color: String

# { id: { username, color, user_obj } }
var user_list: Dictionary = {}

# this is mostly to prevent the duplicated 'user connected' message when the user enters the chat
var is_set = false


func _on_ButtonSend_pressed() -> void:
	send_message()
	ChatInput.grab_focus()


func _on_LineEdit_gui_input(event: InputEvent) -> void:
	if event is InputEventKey:
		if event.scancode == KEY_ENTER or event.scancode == KEY_KP_ENTER:
			if event.pressed and not event.shift:
				send_message()


func send_message() -> void:
	var message = ChatInput.text.strip_edges()
	ChatInput.text = ""
	
	if message == "" or message == "\n":
		return
	
	websocket.send_message(":M1" + message)


# called from receive_message
func add_message(message: Dictionary) -> void:
	# { hour, minute, username, color, message }
	if not message.has_all(["hour", "minute", "id", "username", "color", "message"]):
		print("incorrect message " + str(message))
		return
	
	var bbtext = "[color=#88FFFFFF][%02d:%02d][/color] " %[message.hour, message.minute]
	bbtext += "[color=%s][b]%s[/b][/color] " %[message.color, message.username]
	bbtext += message.message + "\n"
	
	# with append_bbcode the text disappears when window is scaled or something
	# but is probably better to use
#	ChatTextBox.append_bbcode(bbtext)
	ChatTextBox.bbcode_text += bbtext

# called from websocket.gd
func receive_message(message: String) -> void:
	if not is_set:
		return
	
	var json_message = JSON.parse(message)
	
	# check if json was sucsessfully parsed
	if json_message.error != OK:
		print("incorrect message (could not parse JSON)")
		return
	
	# check is parsed object is a dictionary type
	elif typeof(json_message.result) != TYPE_DICTIONARY:
		print("incorrect message (not a dictionary)")
		return
	
	add_message(json_message.result)

# called from websocket.gd
func receive_message_list(list: String) -> void:
	ChatTextBox.bbcode_text = "Mensagens anteriores:\n"
	
	var json_list := JSON.parse(list)
	
	if json_list.error != OK:
		print("incorrect message list (couldn't parse JSON)")
		return
	
	elif typeof(json_list.result) != TYPE_ARRAY:
		print("incorrect message list (not an array)")
		return
	
	for message in json_list.result:
		if typeof(message) != TYPE_DICTIONARY:
			("incorrect message (not a dictionary)")
			continue
		add_message(message)
	
	# add message after adding all messages
	var welcome_bb = "----------\n"
	welcome_bb += "[i]Bem vinde ao chat! Seu nome no chat é [color=%s][b]%s[/b][/color]\n" %[client_color, client_username]
	welcome_bb += "Você pode mudar seu nome clicando no lápis na lista de usuários[/i]\n"
	welcome_bb += "----------\n"
#	ChatTextBox.append_bbcode(welcome_bb) # append_bbcode is not working properly at the time of this
	ChatTextBox.bbcode_text += welcome_bb
	# let this client receive messages
	is_set = true


# called from websocket.gd
func set_client(info: String) -> void:
	var v_info = validate_user_info(info)
	if v_info == null:
		return
	
	client_id = int(v_info.id)
	client_username = v_info.username
	client_color = v_info.color
	
	user_list[client_id] = {
		"username": v_info.username,
		"color": v_info.color,
		"user_obj": create_user_object(client_id, v_info.username, v_info.color, true)
	}


# called from websocket.gd
func receive_user_list(list: String) -> void:
	var json_list := JSON.parse(list)
	
	if json_list.error != OK:
		print("incorrect user list (couldn't parse JSON)")
		return
	
	if typeof(json_list.result) != TYPE_ARRAY:
		print("incorrect user list (not an array)")
		return
	
	for user in json_list.result:
		if int(user.id) == client_id:
			continue
		user_list[int(user.id)] = {
			"username": user.username,
			"color": user.color,
			"user_obj": create_user_object(int(user.id), user.username, user.color)
		}


# called from websocket.gd
func on_user_connected(info: String) -> void:
	var v_info = validate_user_info(info)
	if v_info == null:
		return
	
	user_list[int(v_info.id)] = {
		"username": v_info.username,
		"color": v_info.color,
		"user_obj": create_user_object(int(v_info.id), v_info.username, v_info.color)
	}


# called from websocket.gd
func on_user_disconnected(id: String) -> void:
	if not id.is_valid_integer():
		return
	user_list[int(id)]["user_obj"].queue_free()
	user_list.erase(int(id))


# called from websocket.gd
func change_username(info: String) -> void:
	var v_info = validate_user_info(info)
	if v_info == null:
		return
	
	var id = int(v_info.id)
	user_list[id]["user_obj"].set_name(v_info.username)
	
	if id == client_id:
		client_username = v_info.username


# called from self (set_client, receive_user_list)
func create_user_object(id: int, username: String, color: String, is_client: bool = false) -> Object:
	var new_user = UserObject.instance()
	new_user.name = str(id)
	VboxUserList.add_child(new_user)
	new_user.set_user(id, username, color, self, is_client)
	return new_user


# called from user.gd when changing name
func on_client_change_username(new_name):
	websocket.send_message(":UN" + new_name)
	ChatInput.grab_focus()


func validate_user_info(info):
	# { id, username, color }
	var json_info = JSON.parse(info)
	
	# error parsing json
	if json_info.error != OK:
		print("incorrect user info (couldn't parse json)")
		return null
		# TODO: close connection
	
	# parsed json is not a dictionary
	elif typeof(json_info.result) != TYPE_DICTIONARY:
		print("incorrect user info (not a dictionary)")
		return null
	
	# parsed json does not contain required fields
	elif not json_info.result.has_all(["id", "username", "color"]):
		print("incorrect user info " + str(json_info.result))
		return null
	
	return json_info.result


func on_connected():
	# enable chat input and button to send
	ChatInput.readonly = false
	$hbox/ChatContainer/ChatInputContainer/ButtonSend.disabled = false
	ChatInput.grab_focus()

func on_disconnected():
	ChatTextBox.bbcode_text += "----------\nDesconectado"
	clear_user_list()
	# disable chatinput and button to send
	ChatInput.readonly = true
	$hbox/ChatContainer/ChatInputContainer/ButtonSend.disabled = true

func on_connection_error():
	ChatTextBox.bbcode_text += "----------\nFalha ao conectar ao servidor"

func clear_user_list():
	for id in user_list.keys():
		user_list[id]["user_obj"].queue_free()
	user_list = {}
