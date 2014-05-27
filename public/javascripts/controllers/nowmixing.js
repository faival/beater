



var AudioMixer = function(audioNode, beatUI, trackData) {

	this.mixer = audioNode;
	this.srcIndex = 0;
	this.trackData = {	beats : [2.3333, 3.4444] };
	this.currentBeat = 0;
	this.beatUI = beatUI;
	this.beatTimer = beatTimer;
	var self = this;

	var BeatTimer = function() {

			this.fired = false;
			this.toggleMillis = 400;
			this.beatTimeout = null;

			function countNextBeat() {
				var beatTimeDiff = ( self.trackData.beats[1] - self.trackData.beats[0] ) * 1000;
				var beatIndex = ( self.currentBeat % 8 );
				var currentBeatBtn = self.beatUI[beatIndex];
				
				currentBeatBtn.toggleStatus();
				self.beatTimeout = setTimeout(function() {
						currentBeatBtn.toggleStatus();
						beatTimeCounter();
				}, beatTimeDiff);
			}

			function beatTimeCounter() {
				self.currentBeat++;
				countNextBeat();
			}

			this.nextBeat = countNextBeat;
		};

		BeatTimer.prototype.start = function() {
			this.fired = true;
			this.nextBeat();
		};

		BeatTimer.prototype.stop = function() {
			this.fired = false;
			if (self.beatTimeout) {
				window.clearTimeout(self.beatTimeout);	
				self.beatUI[(self.currentBeat % 8)].setInactive();
			}
		};

	var beatTimer = new BeatTimer();

	var play = function() {
		beatTimer.start();
		self.currentBeat = 0;
		self.mixer.play();
	};

	var pause = function() {
		beatTimer.stop();
		self.mixer.pause();
	};

	var checkPlaybackStatus = function() {
		if (self.mixer.paused) {			
			play();
		} else {
			pause();
		}
	};

	this.toggle = function() {
		checkPlaybackStatus();
	};

	this.next = function() {
		this.srcIndex++;
		this.srcIndex = (this.srcIndex > this.mixer.children.length)? 0 : this.srcIndex;
		pause();
		this.mixer.src = this.mixer.children[this.srcIndex].src;
		play();
	};
}



AudioMixer.prototype.togglePlayback = function() {
	this.toggle();
};

AudioMixer.prototype.next = function() {
	this.next();
};

var CanvasButton = function(canvas){
	this.active = false;
	this.canvas = canvas;
	this.initPlayButton();
};

CanvasButton.prototype.initPlayButton = function() {
	var ctx = this.canvas.getContext("2d");
	ctx.beginPath();
	ctx.moveTo(30, 10);
	ctx.lineTo(275,70);          // Create a horizontal line
	//ctx.arcTo(280,70,280,80,60); // Create an arc
	ctx.lineTo(30,130);         // Continue with vertical line
	ctx.lineTo(30,10);
	ctx.closePath();
	ctx.lineWidth=12;
	ctx.stroke();
	ctx.fillStyle="#FF1975";
	ctx.fill();
};

CanvasButton.prototype.updateUIStatus = function() {
	var ctx = this.canvas.getContext("2d");
	if (this.active) {
		ctx.fillStyle="#3083FF";
		ctx.fill();
	} else {
		ctx.fillStyle="#FF1975";
		ctx.fill();
	}
}

CanvasButton.prototype.toggleStatus = function() {
	this.active = ! this.active;
	this.updateUIStatus();
};

CanvasButton.prototype.setActive = function() {
	this.active = true;
	this.updateUIStatus();
};

CanvasButton.prototype.setInactive = function() {
	this.active = false;
	this.updateUIStatus();
};

function initBeatNavigator(){

	var beatButtons = {};
	var beatButtonsCanvas = $(".nowmixing-canvas-button");
	var beatDataIndex = null;

	for (var beatIndex = 0; beatIndex < beatButtonsCanvas.length ; beatIndex++) {
		beatDataIndex = $(beatButtonsCanvas[beatIndex]).data().beatNumber;
		beatButtons[beatDataIndex] = new CanvasButton(beatButtonsCanvas[beatIndex]);
		console.log(beatIndex);
	}

	function playBeatButton(ev){
		var targetBeatBtn = $(ev.target);
		var beatIndex = targetBeatBtn.data().beatNumber;
		beatButtons[beatIndex].toggleStatus();
		console.log(beatIndex);
	}

	beatButtonsCanvas.click(playBeatButton);

	return beatButtons;
}

function initAudioMixer(beatButtons, mixData){

	var audioMixer = new AudioMixer($('#nowmixing-mix-sound-source')[0], beatButtons, mixData);

	$("#nowmixing-play-current-mix").click(function(ev){
		audioMixer.next();
		console.log("now-mixing >> playSong");
	});
}

function initView(mixData) {
	console.log(mixData);
	var beatButtons = initBeatNavigator();
	initAudioMixer(beatButtons, mixData);	
}	

$(document).ready(function(mixData){
	initView($('#nowmixing-mix-sound-source').data());
});




