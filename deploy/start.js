var fs = require('fs');
var spawn = require('child_process').spawn;

var printData = function(data){
	console.log(''+data);
}

var startMongoDB = spawn('mongod', ['--dbpath', '/Users/pablomolinapelaez/Documents/wemix/data/db']);
startMongoDB.stdout.on('data', printData);
startMongoDB.stderr.on('data', printData);
startMongoDB.stdout.on('close', printData);


var startServer = spawn('node', ['server.js']);
startServer.stdout.on('data', printData);
startServer.stderr.on('data', printData);
startServer.stdout.on('close', printData);


