

function divEscapedContentElement(message) { 
	return $('<div></div>').text(message);
}

function processUserInput(Mix, socket) {
	var message = $('#send-message').val();
	var systemMessage;

	if(message.charAt(0) == '/') {
		Mix.processCommand(message);
	} else {
		Mix.sendMessage($('room').text(), message);	
	}

	$('#messages').append(divEscapedContentElement(message));
	$('#messages').scrollTop($('#messages').prop('scrollHeight'));

	$('#send-message').val('');
}

var socket = io.connect();
var MixClient = new Mix(socket);

$(document).ready(function(){


	socket.on('message', function(result){
		$('#messages').append(divEscapedContentElement(result.text+'\n'));



	});

	socket.on('joined', function(result){
		
		$('#room-list').append(divEscapedContentElement("rooms: "+result.rooms+'\n'));
		$('#room-list').append(divEscapedContentElement("participants: "+result.participants+'\n'));


	});


	socket.on('rooms', function(rooms){
		$('#room-list').empty();

		for(var room in rooms) {
			
			console.log(room.id);
		}
	});

	$('#send-form').submit(function() { 
		processUserInput(MixClient, socket); 
		return false;
	});

	

});
