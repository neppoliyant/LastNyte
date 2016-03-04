module.exports = function() {
    var express = require('express');
    var app = express();
    var methodOverride = require('method-override');
    var user = require('../controller/userController');
    var userConnector = require('../connector/userConnector');
    var rn = require('../controller/remoteNotification');
    var logger = require('../log/winston');
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.logger());
    app.use(methodOverride('_method'));
    app.use(express.bodyParser());

    //lastnyte App relates Apis

    //LastNyte Login Apis

    app.put('/lastnyte/user/:id', function(req, res) {
        user.getUser(req, res);
    });

    app.put('/lastnyte/userupdate/:id', function(req, res) {
        user.UpdateUserCas(req, res);
    });

    app.post('/lastnyte/user/:id', function(req, res, next) {
        user.insertUser(req, res);     
    });

    app.delete('/lastnyte/user/:uid', function(req, res, next) {
        user.deleteUser(req, res);     
    });

    app.put('/lastnyte/tracker', function(req, res) {
        user.updateTracerCas(req, res);
    });

    app.get('/lastnyte/tracker/:uid/:trackerId', function(req, res) {
        user.getLastTracker(req, res);
    });

    app.get('/lastnyte/trackerhistory/:uid', function(req, res) {
        user.getTrackerHistory(req, res);
    });

    app.put('/lastnytepicture/:id', function(req, res, next) {
        user.saveLastNytePicture(req, res);
    });

    app.get('/lastnytepicture/:id', function(req, res, next) {
        user.getLastNytePicture(req, res);
    });

    app.put('/lastnyte/rn/:id', function(req, res, next) {
        rn.sendNotificationtoDevice(req, res);
    });

    //Notification
    app.get('/lastnyte/subscription/:id/:uid', function(req, res, next) {
        user.getSubscription(req, res);
    });

    app.put('/lastnyte/subscription/:id/:uid', function(req, res, next) {
        user.putSubscription(req, res);
    });

    app.delete('/lastnyte/subscription/:id/:uid', function(req, res, next) {
        user.deleteSubscription(req, res);
    });

    app.put('/lastnyte/invitefriends/:uid', function(req, res, next) {
        user.inviteFriends(req, res);
    });

    app.put('/lastnyte/acceptfriends/:uid', function(req, res, next) {
        user.AcceptFriends(req, res);
    });

    app.get('/lastnyte/gettrackfriends/:uid', function(req, res, next) {
        user.getTackFriends(req, res);
    });

    app.put('/lastnyte/userlocation/:uid', function(req, res, next) {
        user.updateUserLocation(req, res);
    });

    app.get('/lastnyte/userlocation/:uid', function(req, res, next) {
        user.getUserLocation(req, res);
    });

    app.get('/lastnyte/validateuser/:uid', function(req, res, next) {
        user.verificationUser(req, res);
    });

    app.delete('/lastnyte/trackfriends/:uid/:toid', function(req, res, next) {
        user.DeleteTrackFriends(req, res);
    });

    app.put('/lastnyte/updatetrackertime', function(req, res, next) {
        user.updateTrackerTimer(req, res);
    });

    app.put('/lastnyte/messages', function(req, res, next) {
        user.sendMessage(req, res);
    });

    app.put('/lastnyte/updatemessage', function(req, res, next) {
        user.messageRead(req, res);
    });

    //Health check
    app.get('/lastnyte/health.html', function(req, res, next) {
      res.send('LastNyte App is running');   
    });

    //version check
    app.get('/lastnyte/version.html', function(req, res, next) {
      res.send('LastNyte App version is 1.0');   
    });

	return app;
}();