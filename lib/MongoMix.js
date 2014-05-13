
var MongoClient = require('mongodb').MongoClient;
var BeatRoot = require('./descriptorsutils');
var fs = require('fs');
var assert = require('assert');


var beatRoot = null;
var db = null;
var beatsDB = null;
var songsDB = null;
var pathToTmp = './tmp/';
var processSongsReadingOnlyIndex = 0;
var processSongsAnalysingOnlyIndex = 0;

var toProcessForReadingOnlyBeatClasses = new Array();
var toProcessForAnalysingOnlyBeatClasses = new Array();


var MongoMix = function(dbName) {
	this.dbName = dbName;
	initMongoMix();
};

function initMongoMix(dbName) {
	beatRoot = new BeatRoot();

	var mongoClientSuccess = function() {
		//removeAllDBObjects();
		countObjectsInDB();
		addMixInfo();
	};
	// Connect to the db
	MongoClient.connect("mongodb://localhost:27017/db/"+this.dbName, function(err, db) {
		assert.equal(null, err);
		console.log("We are connected");
		db = db;
		db.collection('beatsDB', function(err, collection){
			assert.equal(null, err);
			beatsDB = collection;
			db.collection('songsDB', function(err, collection){
				assert.equal(null, err);
				songsDB = collection;
				mongoClientSuccess();
			});
		});
	});
	
};

function countObjectsInDB(){
	songsDB.count(function(err, result) {
		assert.equal(null, err);
		console.log(">>> we now have "+result+" songs!");
		beatsDB.count(function(err, result) {
			assert.equal(null, err);
			console.log(">>> we now have "+result+" beats!");
		});
	});	
};

function removeAllDBObjects() {
	beatsDB.remove({}, function(err, removed){
		assert.equal(null, err);
		console.log("Beats removed %d", removed);
		songsDB.remove({}, function(err, removed){
			assert.equal(null, err);
			console.log("Songs removed %d", removed);
		});
	});
};

function addInfoForSong(songDataPath, songId, numBeatDescriptors) {
	songDataPath = pathToTmp + songDataPath;
	songId = songId.replace("+$%$+", "/");
	songId = songId.replace("+$%%$+", "/");
	songId = songId.replace("*_*", "/");
	console.log(">>> getting beatClasses hash for: "+songDataPath);

	var rhythmDescriptors = beatRoot.readRhythmDescriptors(songDataPath.replace('.features', '.rhythm.json'));
	var beatDescriptors = beatRoot.readBeatsDescriptors(songDataPath, numBeatDescriptors);
	var songBeatsClasses = [];
	var songItem = {};
	
	var beatDescriptorsArray = new Array();
	var beatStamp = null;

	songItem['songId'] = songId;
	songItem['bpm'] = rhythmDescriptors['bpm'];
	songItem['participantId'] = 0;

	for (beatNumber in Object.keys(beatDescriptors)) {

		beatStamp = rhythmDescriptors['beats_position'][beatNumber];
		beatDescriptors[beatNumber]['beatStamp'] = beatStamp;
		beatDescriptors[beatNumber]['songId'] = songId;
		beatDescriptorsArray.push(beatDescriptors[beatNumber]);
	}

	//TODO set property to remove before adding or update
    beatsDB.remove({songId:songId}, function(err, removed) {
    	assert.equal(null, err);
    	console.log(removed+"\t Beats removed!");	
	});

	beatsDB.insert(beatDescriptorsArray, {w:1}, function(err, result) {
		assert.equal(null, err);
		console.log(">>> "+result.length+" beats added!");
	});

	songsDB.remove({songId:songId}, function(err, removed) {
		assert.equal(null, err);
		console.log(">>> "+removed+" songs removed!");
	});

	songsDB.insert(songItem, {w:1}, function(err, result) {
		assert.equal(null, err);
		console.log(">>> "+result.length+" songs added!");
	});

	console.log(songId+" Info Added!");
};

function markBeatAsModelBeat(item, beatModel) {
	console.log("TODO: implement markBeatAsModelBeat!");
};

function getBeatsIndexesLikeModelBeat(beatModel, songId, finishBeatModelQuery) {

	var beatsLikeModelBeat = new Array();

	var compareToBeatModelQuery = beatsDB.find({
		$and: [
		{ songId:  					songId} , 
		{ logAttackTime: 			{$gt:beatModel.logAttackTime - gtFactor}},
		{ logAttackTime: 			{$lt:beatModel.logAttackTime + ltFactor}},
		{ mfcc: 					{$gt:beatModel.mfcc - gtFactor}},
		{ mfcc: 					{$lt:beatModel.mfcc + ltFactor}},
		{ spectral_energyband_low: 	{$gt:beatModel.spectral_energyband_low - gtFactor}},
		{ spectral_energyband_low:  {$lt:beatModel.spectral_energyband_low + ltFactor}},
		{ spectral_energyband_high: {$gt:beatModel.spectral_energyband_high - gtFactor}},
		{ spectral_energyband_high: {$lt:beatModel.spectral_energyband_high + ltFactor}},
		{ zerocrossingrate: 		{$gt:beatModel.zerocrossingrate - gtFactor}},
		{ zerocrossingrate: 		{$lt:beatModel.zerocrossingrate + ltFactor}}
		]
	}).stream();

	compareToBeatModelQuery.on("data", function(item) {
		markBeatAsModelBeat(item, beatModel);
		beatsLikeModelBeat.push(item.beatIndex);
	});
	compareToBeatModelQuery.on("end", function(){

		finishBeatModelQuery(beatsLikeModelBeat);
	});
};



function getBeatsLikeParticipantBeatRequest(songId, beatIndex, callback) {
	var beatModelQuery = collection.findOne({songId:songId, beatIndex: beatIndex}, function(err, item) {
		assert.equal(null, err);
		
		var beatModel = item;
    	var gtFactor, ltFactor = 0.01;

    	getBeatsIndexesLikeModelBeat(beatModel, songId, callback);
    });
};

function processSongsReadingOnlyBeatClasses() {

	var processLength = toProcessForReadingOnlyBeatClasses.length - 1;
	if (processLength == 0 || processSongsReadingOnlyIndex > processLength){
		toProcessForReadingOnlyBeatClasses = new Array();
		countObjectsInDB();
		return;
	}
		
	//Just read beat and rhythm descriptors
	var songDataPath = toProcessForReadingOnlyBeatClasses[processSongsReadingOnlyIndex];
	var	songId = songDataPath.substring(0, songDataPath.search('.features'));
	var numBeatDescriptors = fs.readdirSync(pathToTmp + songDataPath).length;
	console.log(">>>processSongsReadingOnlyBeatClasses: "+songId);
	console.log(">>> index: "+processSongsReadingOnlyIndex);
	addInfoForSong(songDataPath, songId, numBeatDescriptors);
	processSongsReadingOnlyIndex++
	processSongsReadingOnlyBeatClasses();
};

function processSongsAnalysingOnlyBeatClasses() {
	//Analyse beat descriptors and read beat and rhythm descriptors
	var processLength = toProcessForAnalysingOnlyBeatClasses.length;

	if (processLength == 0 || processSongsAnalysingOnlyIndex > processLength - 1) {
		toProcessForAnalysingOnlyBeatClasses = new Array();
		processSongsReadingOnlyBeatClasses(0);
		return;
	}


	var songDataPath = toProcessForAnalysingOnlyBeatClasses[processSongsAnalysingOnlyIndex];
	var songId = songDataPath.substring(0, songDataPath.search('.rhythm.json'));
	console.log(">>>processSongsAnalysingOnlyBeatClasses: "+songId);
	console.log(">>> index: "+processSongsAnalysingOnlyIndex);

	toProcessForReadingOnlyBeatClasses.push(songDataPath);
	processSongsAnalysingOnlyIndex++;
	beatRoot.analyseRhythmDescriptors(pathToTmp+songId, processSongsAnalysingOnlyBeatClasses);
};

function getSongsToProcess() {
	var songHash = [];
	console.log("reading dir: "+ pathToTmp);
	var tmpDir = fs.readdirSync(pathToTmp);
	
	var songDataPath = null;

	for(var i = 0; i < tmpDir.length; i++) {
		songDataPath = tmpDir[i];
		if (songDataPath.search('.features') > 0) {
			toProcessForReadingOnlyBeatClasses.push(songDataPath);
		}
		var featuresPath = (tmpDir.indexOf(songDataPath.substring(0, songDataPath.length - '.rhythm.json'.length) + '.features') > -1);  ;
		if (songDataPath.search('.rhythm.json') > 0 && !featuresPath) {
			toProcessForAnalysingOnlyBeatClasses.push(songDataPath);
		}
	}

	console.log(">>>getSongsToProcess: toProcessForReadingOnlyBeatClasses");
	console.log(toProcessForReadingOnlyBeatClasses);
	console.log(">>>getSongsToProcess: toProcessForAnalysingOnlyBeatClasses");
	console.log(toProcessForAnalysingOnlyBeatClasses);
}

function addMixInfo() {
	getSongsToProcess();
	processSongsReadingOnlyBeatClasses(0);
	processSongsAnalysingOnlyBeatClasses(0);
};

function getParticipantData(partId, callback) {
	

	//db.collection('songsDB', function(err, collection){
		//assert.equal(null, err);

		songsDB.find().toArray(function(err, songsInDb) {

			var beatDescriptor = 'spectral_energyband_middle_low';

			var songIndexReq = 0;
			var songItem = null;
			var songItemParsed = null;
			var songsSize = songsInDb.length;
			console.log(" songs found: "+ songsSize);
			var participantData = {};

			var partySongsRequestComplete = function(currentSongIndex, song, beatsForSong, participantData) {
				var beatsItems = {};
				var beat = null;
				var beatParsed = null;
				console.log("adding participantData for: "+song.songId);
				participantData[song.songId] = {};
				console.log("num bets found for song: "+beatsForSong.length);
				for(beatIndex in beatsForSong) {
					beat = beatsForSong[beatIndex];
					beatParsed = {};
					beatParsed['beatIndex'] = beat.beatIndex;
					beatParsed['beatStamp'] = beat.beatStamp;
					beatParsed['beatDescriptor'] = beat[beatDescriptor];
					beatsItems[beat.beatIndex] = beatParsed;
				}

				participantData[song.songId]['songData'] = song;
				participantData[song.songId]['beatsData'] = beatsItems;
				console.log("requesting songIndex: "+currentSongIndex+" of "+ songsSize);
				if(currentSongIndex == songsSize - 1) {
					console.log("Sending songs Info for:" +Object.keys(participantData));
					callback(participantData);
					return;
				}
			};

		
			for(songIndex in songsInDb) {
				songItem = songsInDb[songIndex];
				console.log("fill participantData for: "+songItem.songId);
				beatsDB.find({songId: songItem.songId}).toArray(function(err, beatsForSong){	
					songItemParsed = songsInDb[songIndexReq];
					delete songItemParsed['_id'];
					partySongsRequestComplete(songIndexReq, songItemParsed,  beatsForSong, participantData);
					songIndexReq += 1;
				});

			}
		});
	//}
};

MongoMix.prototype.getDataForParticipant = function(partId, callback) {
	getParticipantData(partId, callback);
};

MongoMix.prototype.runAddMixInfoProcess = function(callback) {
	addMixInfo();
};


module.exports = MongoMix;
