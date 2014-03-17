var python = require('node-python');
var async = require('async');
var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');



var beatRoot = null;
var pathToTmp = './tmp/';
var featuresDPath = '.features';
var onsetsHash = {};

var BeatRoot = function() {
};


var processData = function(data) {
	console.log(data);
};

var processClose = function(data) {
	console.log(data);
};

var processError = function(data) {
	console.log(data);
};

var readBeatRootFile = function(songId) {
	var onsetsStr = null;
	var dataStr = ''+fs.readFileSync(songId);
	onsetsStr = dataStr.split('\n');
	var onsets = [];
	for(var j = 0; j < onsetsStr.length -1; j++){
		onsets.push(parseFloat(onsetsStr[j]));
	}
	return {beats_position:onsets};
};


var getSongDUrl = function(songId, callback) {
	var getSongDUrlSpawn = spawn('curl', ['-s', '-D', '-', songId, '-o', '/dev/null']);
	console.log("GETTING DURL OF: "+songId);
	var songDUrl = null;
	getSongDUrlSpawn.stderr.on('data', processError);
	getSongDUrlSpawn.stdout.on('data', function(data){
		var locationKey = 'Location: ';
		var dataStr = ''+data;
		var locationIndex = dataStr.search(locationKey);
		if(locationIndex > 0) {
			songDUrl = dataStr.substring(locationIndex+locationKey.length, dataStr.length).trim();
			console.log("DOWNLOAD URL: "+songDUrl);
			callback(songDUrl);
			return;
		}
		processError('no_DURL');
	});
	getSongDUrlSpawn.on('close', processData);
};

var analyseRhythmFeatures = function(songId, callback) {
	console.log(">>> analyseBeatsFeatures for: "+songId);
	var processArgs = ['./bin/beatDescriptor.py', '--method=analyseRhythmFeatures', songId];
	var essentiaFeaturesExtractor = spawn('python', processArgs);
	essentiaFeaturesExtractor.stderr.on('data', processError);
	essentiaFeaturesExtractor.stdout.on('data', processData);
	essentiaFeaturesExtractor.on('close', callback);			
};

var getSongFile = function(songDUrl, callback) {
	console.log("DOWNLOAD SONG: "+songDUrl);
	var itemsStr = '/items/';
	var songDNameWithAuthor = songDUrl.substring(songDUrl.search(itemsStr)+itemsStr.length, songDUrl.length);
	var songDPath = pathToTmp+songDNameWithAuthor.replace("/","-").trim();
	var downloadSong = spawn('curl', ['-o', songDPath, songDUrl]);

	downloadSong.stderr.on('data', processError);
	downloadSong.stdout.on('data', processData);
	downloadSong.on('close', function(){
		callback(songDPath);
	});
};



var convertToWav = function(songId, callback){
	//CONVERT TO WAV
	/*
	var convertToWav = spawn('./bin/sox', [songDPath, songDPath+".wav"]);

	console.log("CONVERT TO WAV: "+songDPath);
	convertToWav.stdout.on('data', processData);
	convertToWav.stderr.on('data', processError);
	convertToWav.on('close', function(data){

		//BEATROOT ANALYSE 
		beatRoot = spawn('java', ['-jar', './bin/beatroot-0.5.8.jar', songDPath+".wav", '-b', '-o', songDPath+".wav.txt"]);
		console.log("BEATROOT ANALYSE: "+songDPath);
		beatRoot.stdout.on('data', processData);
		beatRoot.stderr.on('data', processError);
		beatRoot.on('close', processClose);
	});
	*/
	callback();
};

var getArrayFromDescriptorValue = function(descriptorValueStr) {
	var descriptorArray = new Array(descriptorValueStr);//descriptorValueStr.split(',');
	var resultArray = [];
	for (value in descriptorArray)
		resultArray.push(parseFloat(value));
	
	return resultArray;
};

BeatRoot.prototype.downloadRequest = function(songId, callback) {
	/*
	* 	"https://archive.org/download/OldTechno/Old_Techno_64kb.mp3",
	* 	function
	*/
	getSongDUrl(songId, function(songDUrl){ 
		getSongFile(songDUrl, function(songDPath){
			analyseRhythmFeatures(songDPath, function(){
				console.log('song fully processed! '+songDPath);
			});
		});
	});
}

BeatRoot.prototype.analyseRhythmDescriptors = function(songId, callback) {
	analyseRhythmFeatures(pathToTmp+songId, function(result){
		console.log("Rhythm processed for song: "+songId);
		callback();
	});
}

BeatRoot.prototype.readRhythmDescriptors = function(songId) {
	var rhythmDescriptors = JSON.parse(fs.readFileSync(pathToTmp+songId, 'utf8'));
	return rhythmDescriptors;
}

BeatRoot.prototype.readBeatsDescriptors = function(songId) {
	var beatsDescriptors = JSON.parse(fs.readFileSync(pathToTmp+songId, 'utf8'));
	return beatsDescriptors;
}


module.exports = BeatRoot;