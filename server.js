/*
var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};
*/

var mixSession = require('./lib/mix_session');

var http = require('http');
var express = require('express'),
    //partials = engine = require('express-partials');//
    engine = require('ejs-locals');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var nowmixing = require('./routes/nowmixing');

var app = express();
//app.register('.html', require('ejs'));
//app.use(partials());
app.engine('ejs', engine);

app.set('port', process.env.PORT || 3000);



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use(express.static(DOCUMENT_ROOT));

app.use('/', routes);
app.use('/nowmixing', nowmixing);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;

server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

mixSession.listen(server);





