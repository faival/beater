var express = require('express');
var router = express.Router();
var MongoMix = require('../lib/MongoMix');
var mongoMix = new MongoMix();

function getMixUsers() {
	var users = [];
	users.push({
		name: "pablo"
	});
	users.push({
		name: "peter"
	});
	return users;
}

function postRender() {
	console.log("postRender");
}

function getViewData() {
	var viewData = { users : getMixUsers()};
	viewData.title = "Now Mixing! ";
	viewData.viewHeading = " B2B ";
	viewData.beats = ['0', '1', '2', '3', '4', '5', '6', '7'];

	return viewData;
}

/* GET users listing. */
router.get('/', function(req, res) {
	var users = getMixUsers();
	var mixData = null;

	mongoMix.getDataForParticipant(null, function(participantData){
		console.log(participantData);
		mixData = participantData;

		console.log(Object.keys(mixData));
		console.log(mixData);
		console.log(users);
		var viewData = getViewData();
		res.render('nowmixing', 
			{ 
				title: viewData.title, 
				viewData: viewData,
				users: users,
				mixData: mixData,
				postRender: postRender
			}
		);
	});
	
});

module.exports = router;
