extends PanelContainer

onready var LabelUsername = $Display/LabelUsername
onready var InputUsername: LineEdit = $Edit/InputUsername

export var FontBold: DynamicFont = null

var id: int

var ChatWindow = null

var is_client: bool

func set_user(id: int, username: String, color: String, chat_window, is_client: bool = false) -> void:
	self.id = id
	LabelUsername.text = username
	LabelUsername.add_color_override("font_color", Color(color))
	self.ChatWindow = chat_window
	
	if is_client and FontBold != null:
		LabelUsername.add_font_override("font", FontBold)
	
	if not is_client:
		$Edit.queue_free()
		$Display/ButtonChangeName.queue_free()
		InputUsername = null


func set_name(new_name: String) -> void:
	print("name from %s to %s" %[LabelUsername.text, new_name])
	LabelUsername.text = new_name


func _on_ButtonChangeName_pressed() -> void:
	$Display.hide()
	$Edit.show()
	InputUsername.text = LabelUsername.text
	InputUsername.select_all()
	InputUsername.grab_focus()


func _on_ButtonConfirm_pressed() -> void:
	var new_name = InputUsername.text.strip_edges()
	
	# check if is valid name
	if new_name == "" or new_name == LabelUsername.text:
		$Edit.hide()
		$Display.show()
		return
	$Edit.hide()
	$Display.show()
	ChatWindow.on_client_change_username(new_name)


func _on_ButtonCancel_pressed() -> void:
	$Edit.hide()
	$Display.show()


func _on_InputUsername_gui_input(event: InputEvent) -> void:
	if event is InputEventKey:
		if event.scancode == KEY_ENTER and event.pressed:
			_on_ButtonConfirm_pressed()
