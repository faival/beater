
var MongoClient = require('mongodb').MongoClient;
var BeatRoot = require('./BeatRoot_Analyser');
var fs = require('fs');
var assert = require('assert');


var beatRoot = null;
var db = null;
var beatsDB = null;
var songsDB = null;



var pathToTmp = './tmp/';


var MongoMix = function(dbName){
	
	// Connect to the db
	MongoClient.connect("mongodb://localhost:27017/db/"+dbName, function(err, db) {
		if(!err) {
			console.log("We are connected");
			db = db;
			db.collection('beatsDB', function(err, collection){
				assert.equal(null, err);
				beatsDB = collection;
				/*
				beatsDB.remove({}, function(err, removed){
					assert.equal(null, err);
					console.log(removed);
				});
				*/	
				db.collection('songsDB', function(err, collection){
					assert.equal(null, err);
					songsDB = collection;
					init();
				});
			});


			
		} else {
			console.log(err);	
		}
	});
};

var init = function() {
	addMixInfo();
};

var addInfoForSong = function(songDataPath, songId) {
	console.log(">>> getting beatClasses hash for: "+songDataPath);
	var beatClasses = beatRoot.readBeatsDescriptors(songDataPath);
	var rhythmDescriptors = beatRoot.readRhythmDescriptors(songDataPath.replace('.beatclasses.json', '.rhythm.json'));
	var songBeatsClasses = [];
	var songItem = {};
	songItem['songId'] = songId;
	songItem['songBpm'] = rhythmDescriptors['bpm'];
	songItem['participantId'] = 0;
	
	
	for(beatIndex in beatClasses) {
		var beatInfo = beatClasses[beatIndex];
		beatInfo['beatIndex'] = parseInt(beatIndex);
		beatInfo['beatStamp'] = parseFloat(rhythmDescriptors['beats_position'][beatIndex]);
		beatInfo['songId'] = songId;
		songBeatsClasses.push(beatInfo);
	}

    beatsDB.remove({songId:songId}, function(err, removed) {
    	assert.equal(null, err);
    	console.log(removed+"\t removed!");	
	});

	beatsDB.insert(songBeatsClasses, {w:1}, function(err, result) {
		assert.equal(null, err);
		console.log(">>> "+result.length+" beats added!");
	});

	songsDB.remove({songId:songId}, function(err, removed) {
		assert.equal(null, err);
		if(removed.length > 0)
			console.log(">>> "+removed+" songs removed!");
	});

	songsDB.insert(songItem, {w:1}, function(err, result) {
		assert.equal(null, err);
		console.log(">>> "+result.length+" songs added!");
	});

	console.log(songId+" processed!");


	/*
	beatsDB.count({beatClass: 'LOW'}, function(err, result) {
		assert.equal(null, err);
		console.log(">>> we now have "+result+" LOW beats!");
	});
	beatsDB.count({beatClass: 'HI'}, function(err, result) {
		assert.equal(null, err);
		console.log(">>> we now have "+result+" HI beats!");
	});
	*/
};


var addMixInfo = function () {

	if(!beatRoot)
		beatRoot = new BeatRoot();

	var songHash = [];
	console.log("reading dir: "+ pathToTmp);
	var tmpDir = fs.readdirSync(pathToTmp);
	

	for(var i = 0; i < tmpDir.length; i++) {
		
		var songDataPath = tmpDir[i];
		var songId = songDataPath.substring(0, songDataPath.search('.beatclasses'));
		
		if (songDataPath.search('.beatclasses') > 0) {
			console.log("calling add Song Info on: "+ songDataPath);
			addInfoForSong(songDataPath, songId);
		}
	}

	beatsDB.count(function(err, result) {
		assert.equal(null, err);
		console.log(">>> we now have "+result+" beats!");
		
	});	
	songsDB.count(function(err, result) {
		assert.equal(null, err);
		console.log(">>> we now have "+result+" songs!");
	});	
};

var getParticipantData = function (partId, callback) {
	

	//db.collection('songsDB', function(err, collection){
		//assert.equal(null, err);

		songsDB.find().toArray(function(err, songsInDb) {

			var songIndexReq = 0;
			var songItem = null;
			var songItemParsed = null;
			var songsSize = songsInDb.length;

			var participantData = {};
			var partySongsRequestComplete = function(currentSongIndex, song, beatsForSong, participantData) {
				var beatsItems = {};
				var beat = null;
				var beatParsed = null;
				console.log("adding participantData for: "+song.songId);
				participantData[song.songId] = {};
				for(beatIndex in beatsForSong) {
					beat = beatsForSong[beatIndex];
					beatParsed = beat;
					delete beatParsed['_id'];
					delete beatParsed['songId'];
					delete beatParsed['logAttack'];
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


module.exports = MongoMix;
