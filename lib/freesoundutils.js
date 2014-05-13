var $ = require('jquery'),
    XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

/*
//CORS SUPPORT
$.support.cors = true;
$.ajaxSettings.xhr = function () {
    return new XMLHttpRequest;
}
*/

var freeSoundUtils = function() {

};


function parseUrl(url) {
	/*
	//"http://www.freesound.org/people/Setuniman/sounds/193591/"
	//curl -H "Authorization: Token c8f5469c96d6553faebbc5a9df214bf0649d31f7" "http://www.freesound.org/apiv2/sounds/193591/"
	*/
	
	var soundRequestedIndex = url.search("/sounds/");
	soundRequested = url.substr(soundRequestedIndex, url.length - 1);
	soundRequested = parseInt(soundRequested);

	if (!soundRequested)
		soundRequested = 213524;

	var freeSoundXHRUrl = "http://www.freesound.org/apiv2/sounds/" +
		soundRequested +
		"/?descriptors=.lowlevel.mfcc,.rhythm.bpm&token=c8f5469c96d6553faebbc5a9df214bf0649d31f7";

	return freeSoundXHRUrl;
}

freeSoundUtils.prototype.requestPreviewUrl = function(url, callback) {

	var urlParsed = parseUrl(url);
	var freeSoundXHR = $.ajax( urlParsed )
		.done(function(data) {
			console.log(JSON.stringify(data));
			callback(data);
		})
		.fail(function() {
			console.log(">>>freeSoundUtils -> getting XHR preview url");
			callback("ERROR_FREESOUND_HOST");
		})
		.always(function() {
			console.log(">>>freeSoundUtils -> getting XHR preview url finished!");
		});
}


module.exports = freeSoundUtils;