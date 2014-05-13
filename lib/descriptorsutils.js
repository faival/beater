var python = require('node-python');
var async = require('async');
var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');
var freesoundUtils = require('./freesoundutils');



var beatRoot = null;
var pathToTmp = './tmp/';
var featuresDPath = '.features';
var onsetsHash = {};


var lowLevelDesc = [
 'barkbands',
 'barkbands_kurtosis',
 'barkbands_skewness',
 'barkbands_spread',
 'hfc',
 'mfcc',
 'pitch',
 'pitch_instantaneous_confidence',
 'pitch_salience',
 'silence_rate_20dB',
 'silence_rate_30dB',
 'silence_rate_60dB',
 'spectral_complexity',
 'spectral_crest',
 'spectral_decrease',
 'spectral_energy',
 'spectral_energyband_low',
 'spectral_energyband_middle_low',
 'spectral_energyband_middle_high',
 'spectral_energyband_high',
 'spectral_flatness_db',
 'spectral_flux',
 'spectral_rms',
 'spectral_rolloff',
 'spectral_strongpeak',
 'zerocrossingrate',
 'inharmonicity',
 'tristimulus',
 'oddtoevenharmonicenergyratio',
 'logAttackTime'
 ];

var BeatRoot = function() {
};


var processData = function(data) {
	//console.log(''+data);
};

var processClose = function(data) {
	//console.log(''+data);
};

var processError = function(data) {
	console.log('>>>ERROR: '+data);
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
	getSongDUrlSpawn.stderr.on('data', function(data) {
		console.log(""+data);
		processError(data);	
	});
	getSongDUrlSpawn.stdout.on('data', function(data){
		console.log(""+data);
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
	essentiaFeaturesExtractor.on('close', function(data) {
		callback();
	});			
};

var getSongFile = function(songDUrl, callback) {
	console.log("DOWNLOAD SONG: "+songDUrl);
	var itemsStr = '/items/';

	var songDNameWithAuthor = songDUrl.substring(songDUrl.search(itemsStr)+itemsStr.length, songDUrl.length);
	var songDPath = pathToTmp+songDNameWithAuthor.replace(/\//g,"*_*").trim();
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


function parseBeatDescriptors(beatDescriptors) {
	var beatDescriptorsParsed = {};
	var beatDescriptorObj = null;
	delete beatDescriptors['metadata'];

	for (beatDescriptor in beatDescriptors) {
		beatDescriptorObj = beatDescriptors[beatDescriptor];
		beatDescriptorObj = (beatDescriptorObj.length)? beatDescriptorObj[0] : beatDescriptorObj;
		//it can be an array of arrays
		//beatDescriptorObj = (beatDescriptorObj.length)? beatDescriptorObj[0] : beatDescriptorObj;

		beatDescriptorsParsed[beatDescriptor] = parseFloat(beatDescriptorObj);
	}
	return beatDescriptorsParsed;
}

BeatRoot.prototype.downloadRequest = function(songId, callback) {
	/*
		var soundProviders = 
		{
		 	"https://archive.org/download/OldTechno/Old_Techno_64kb.mp3":{},
			"http://www.freesound.org/people/Setuniman/sounds/193591/":{}
		};
	*/

	if(songId.search("https://archive.org/") > -1) {
		getSongDUrl(songId, function(songDUrl){ 
			getSongFile(songDUrl, function(songDPath){
				analyseRhythmFeatures(songDPath, callback);
			});
		});
	} else if(songId.search("https://archive.org/") > -1) { 
		freesoundUtils.requestPreviewUrl(songId, callback);
	}
}

BeatRoot.prototype.analyseRhythmDescriptors = function(songId, callback) {
	analyseRhythmFeatures(songId, callback);
}

BeatRoot.prototype.readRhythmDescriptors = function(songId) {
	return JSON.parse(fs.readFileSync(songId, 'utf8'));
}

BeatRoot.prototype.readBeatsDescriptors = function(songId, numBeatDescriptors) {

	var beatDescriptors,
		beatDescriptorsParsed;
	var rhythmDescriptorsParsed = {};
	console.log("INFO MongoMix readBeatsDescriptors: found numBeatDescriptors"+numBeatDescriptors);
	for (var beatIndex = 0; beatIndex < numBeatDescriptors; beatIndex++) {
		var beatInfoPath = songId+'/'+beatIndex+'.features.json';
		beatDescriptors = JSON.parse(fs.readFileSync(beatInfoPath, 'utf8'));
		beatDescriptorsParsed = parseBeatDescriptors(beatDescriptors);
		beatDescriptorsParsed['beatIndex'] = beatIndex;

		rhythmDescriptorsParsed[beatIndex] = beatDescriptorsParsed;
	}

	return rhythmDescriptorsParsed;
}


module.exports = BeatRoot;