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
 	var command = words[0].substring(1, words[0].length);
 	console.log(command);
 	var joinData = null;
	switch(command) {
		case 'join' :
			joinData = {
				pName : words[1],
				pRoom : words[2]
			};
			break;

		case 'addSong' :
			joinData = {
				pSong : words[1]
			};
			break;
		default: 
	}
	this.socket.emit(command, joinData);
}