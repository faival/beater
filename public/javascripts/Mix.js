var Mix = function(socket) {
	this.socket = socket;
};

Mix.prototype.sendMessage = function(room, text) {
	var message = {
		room: room,
		text: text
	};

	this.socket.emit('message', message);
};

Mix.prototype.changeRoom = function(room) {
	this.socket.emit('changeroom', {
		newRoom: room
	});
};

Mix.prototype.processCommand = function(action) {
	var words = action.split(' ');
 	var command = words[0].substring(1, words[0].length).toLowerCase();
 	console.log(this.class);
 	console.log(command);
	switch(command) {
		case 'join' :
			var joinData = {
				pName : words[1],
				pRoom : words[2]
			};
			this.socket.emit('join', joinData);
		break;
		case 'changeroom' :
			var room = words.join(' ');
			this.changeRoom(room);
		break;

		default: 
			this.sendMessage(words[0], action.substring(words[0].length, action.length));
	}
}