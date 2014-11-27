



var AudioMixer = function(audioNode, beatUI) {

	this.mixer = audioNode;
	this.srcIndex = 0;
	this.currentBeat = 0;
	this.beatStamp = 0.0;
	this.timeoutDelay = 0.0;
	this.beatUI = beatUI;
	this.beatTimer = beatTimer;
	this.audioData = $(this.mixer).data().nowmixingPayload;
	this.trackData = {};

	var self = this;

	var BeatTimer = function() {

		this.fired = false;
		this.toggleMillis = 400;
		this.beatTimeout = null;

		function getCurrentBeat() {
			var mixerStamp = self.mixer.currentTime,
				beatStamp = self.beats[0].beatStamp,
				beatSearchIndex = self.currentBeat,
				beatSearchSize = 32,
				beatSize = self.beats.length - 1;

			if (self.currentBeat > 32) {
				beatSearchIndex = self.currentBeat - 28;
			} 

			while (beatSearchIndex < beatSize) {

//self.beats[beatSearchIndex].beatStamp < mixerStamp &&
				if ( 
					self.beats[beatSearchIndex + 1].beatStamp > mixerStamp ) {
					self.beatStamp = self.beats[beatSearchIndex].beatStamp || self.beatStamp;
					return beatSearchIndex;	
				} 
				beatSearchIndex++;
			}

			return -1;
		}

		function timeoutNextBeat() {

			var beatTimeDiff = ( self.trackData.beatsData[self.currentBeat].beatStamp
				 - self.trackData.beatsData[self.currentBeat - 1].beatStamp ) * 1000,
				beatIndex = ( self.currentBeat % 8 ),
				currentBeatBtn = self.beatUI[beatIndex];
		
			var disableAndCountNext = function() {
				currentBeatBtn.setInactive();
				countNextBeat();
			};

			currentBeatBtn.setActive();
			self.beatTimeout = setTimeout(disableAndCountNext, beatTimeDiff);
		}


		function countNextBeat(currentBeat) {

			self.currentBeat = getCurrentBeat();

			console.log("currentBeat: ", self.currentBeat);

			if (self.currentBeat < 0) {
				self.currentBeat = 1;
			}
			
			if (self.currentBeat > self.beats.length - 1 
				|| self.mixer.currentTime > self.beats[self.beats.length - 1]) {
				self.currentBeat = 1;
				self.mixer.currentTime = self.beats[self.currentBeat].beatStamp;
				self.mixer.pause();
				self.mixer.play();
				return;
			}

			timeoutNextBeat();
		}

		this.firstBeat = function(){
			self.currentBeat = 1;
			countNextBeat();	
		}
	};

	BeatTimer.prototype.start = function() {
		this.fired = true;
		this.firstBeat();
	};

	BeatTimer.prototype.stop = function() {
		this.fired = false;
		if (self.beatTimeout) {
			window.clearTimeout(self.beatTimeout);	
		}
		self.beatUI[(self.currentBeat % 8)].setInactive();
	};

	var beatTimer = new BeatTimer();

	var play = function() {
		beatTimer.start();
		self.mixer.loop = true;
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
		var songNames = Object.keys(this.audioData);
		
		this.srcIndex = (this.srcIndex > songNames.length -1)? 0 : this.srcIndex;
		this.trackData = this.audioData[songNames[this.srcIndex]];
		this.beats = getArrayOfValues(this.trackData.beatsData, 'beatStamp');
		this.beatsStamps = arrayToObjKeys(this.beats, 'beatStamp');
		var nextSong  =  this.trackData.songData.songUrl;

		if (nextSong) {
			this.mixer.src = nextSong;
		}

		pause();
		play();
	};

	this.setVolume = function(ev) {
		var sliderGain = ev.target.value / 120;
		self.mixer.volume = sliderGain;
	}
}



AudioMixer.prototype.togglePlayback = function() {
	this.toggle();
};

AudioMixer.prototype.next = function() {
	this.next();
};

AudioMixer.prototype.setVolume = function(ev) {
	
	console.log(sliderGain);
	this.setVolume(sliderGain);
}

var CanvasButton = function(domNode){
	this.active = false;
	this.loopIn = false;
	this.loopOut = false;
	this.button = domNode;
	this.canvas = domNode.getElementsByTagName('canvas')[0];
	//this.initPlayButton();
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

	//var ctx = this.canvas.getContext("2d");
	if (this.active) {
		$(this.button).addClass('nowmixing-beat-button-active');
		//ctx.fillStyle="#3083FF";
		//ctx.fill();
	} else {
		$(this.button).removeClass('nowmixing-beat-button-active');
		//ctx.fillStyle="#FF1975";
		//ctx.fill();
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

CanvasButton.prototype.setLoopIn = function() {
	this.loopIn = true;
	this.updateUIStatus();
};
CanvasButton.prototype.setLoopOut = function() {
	this.loopIn = true;
	this.updateUIStatus();
};

function getArrayOfValues(dataObj, dataKey) {
	var dataArray = new Array();
	for(var o in dataObj) {
    	dataArray.push(dataObj[o].dataKey || dataObj[o]);
	}
	return dataArray;
}

function arrayToObjKeys(dataArray, dataKey) {
	var dataObj = {};
	for (var o in dataArray) {
		dataObj[(o.dataKey || o) + ''] = o;
	}
	return dataObj;
}


function initBeatNavigator(){

	var beatButtons = {};
	var beatButtonsCanvas = $(".nowmixing-button");
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

function initAudioMixer(beatButtons){

	var audioMixer = new AudioMixer($('#nowmixing-mix-sound-source')[0], beatButtons);

	$("#nowmixing-play-current-mix").click(function(ev){
		audioMixer.next();
	});

	$(".nowmixing-controls-slider").change(audioMixer.setVolume);
}

function initView() {
	var beatButtons = initBeatNavigator();
	initAudioMixer(beatButtons);	
}	

$(document).ready(function(){	
	initView();
});




