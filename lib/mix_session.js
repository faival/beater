var socketio = require('socket.io');

var io;
var participantNumber = 1;
var roomNumber = 1;
var participants = {};
var rooms = {};

exports.listen = function(server) {
	io = socketio.listen(server);
	io.set('log level', 1);

	io.sockets.on('connection', function(socket) {

		handleBroadcast(socket, participantNumber, roomNumber, participants, rooms);

	});
}




function handleBroadcast(socket) {

	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message', { 
			text: participants[socket.id].name + ': ' + message.text
		}); 
	});

	socket.on('rooms', function(){
		socket.emit('rooms', io.sockets.manager.rooms);
	});

	socket.on('join', function(newParty) {

		console.log(newParty);

		var participant = participants[socket.id];

		if(!participant) {
			participant = createParticipant(participantNumber, newParty.pName);
			participants[socket.id] = participant;
			participantNumber+=1;
		}

		var room = rooms[newParty.pRoom];

		if(!room){
			//create new room
			room = createRoom(newParty.pRoom, roomNumber);
			rooms[room.id] = room;
			roomNumber+=1;
		} 



		//assign room to participant
		participants[socket.id].rooms.push(room.id);
		//assign participant to room
		rooms[room.id].participants.push(participant.number);

		//join participant to room
		socket.join(room.id);

		//inform room of new participant
		socket.broadcast.to(room.id).emit('message', { 
			text:  '-->joined:'+JSON.stringify(participant)
		});
	});


	socket.on('disconnect', function() {
		var participant = participants[socket.id];

		if(participant) {
			console.log(participant.rooms);
			for(var i; i < participant.rooms.length; i++) {
				var roomId = participant.rooms[i];
				console.log(roomId);
				delete rooms[roomId].participants[participant.number];

				socket.broadcast.to(roomId).emit('message', { 
					text:  '-->abandon:'+JSON.stringify(participant)
				});
			}
			delete participants[socket.id];
		}
	});
}


function createParticipant(pId, pName) {
	 
	var participant = {};
	participant['number'] = pId;
	participant['name'] = pName;
	participant['rooms'] = [];
	participant['playlist'] = [];

	return participant;
}  

function createRoom(roomId, roomNumber) {
	var room = {};
	room['id'] = roomId;
	room['number'] = roomNumber;
	room['participants'] = [];
	return room;
}





