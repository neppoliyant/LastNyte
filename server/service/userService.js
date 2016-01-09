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

	app.get('/user/:id', function(req, res, next) {
        console.log('user id : ' + req.params.id);
	    user.getUserbyId(req, res);
	});

    app.get('/users', function(req, res, next) {
        console.log('user id : ' + req.params.id);
        userConnector.getUsers(req, res);
    });

	app.put('/user/:id', function(req, res, next) {
	    console.log('user id : ' + req.params.id);
        console.log('user payload : ' + req.body);
        user.addUser(req, res);     
	});

    

    app.delete('/user/:id', function(req, res, next) {
        console.log('user id : ' + req.params.id);
        user.deleteUserbyId(req, res);      
    });

    app.post('/login', function(req, res, next) {
        user.login(req, res);   
    });

    app.put('/login/:id', function(req, res, next) {
        user.register(req, res);    
    });

    app.post('/register', function(req, res, next) {
        logger.info("User Added : " + req.body);
        user.register(req, res);  
    });

    app.put('/register/:id', function(req, res, next) {
       user.register(req, res);  
    });

    app.get('/register/:id', function(req, res, next) {
       user.getUserbyId(req, res);  
    });

    app.put('/picture/:id', function(req, res, next) {
        console.log('user id : ' + req.params.id);
        user.savePicture(req, res);
    });

    app.get('/picture/:id', function(req, res, next) {
        console.log('user id : ' + req.params.id);
        user.getPicture(req, res);
    });

    app.put('/tracker/:id', function(req, res) {
        user.updateTracker(req, res);
    });

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
        console.log('user id : ' + req.params.id);
        user.saveLastNytePicture(req, res);
    });

    app.get('/lastnytepicture/:id', function(req, res, next) {
        console.log('user id : ' + req.params.id);
        user.getLastNytePicture(req, res);
    });

    app.put('/lastnyte/rn/:id', function(req, res, next) {
        console.log('device id : ' + req.params.id);
        console.log(__dirname);
        rn.sendNotificationtoDevice(req, res);
    });

    //Notification
    app.get('/lastnyte/subscription/:id/:uid', function(req, res, next) {
        console.log('device token id : ' + req.params.id);
        console.log('user id : ' + req.params.uid);
        user.getSubscription(req, res);
    });

    app.put('/lastnyte/subscription/:id/:uid', function(req, res, next) {
        console.log('device id : ' + req.params.id);
        user.putSubscription(req, res);
    });

    app.delete('/lastnyte/subscription/:id/:uid', function(req, res, next) {
        console.log('device id : ' + req.params.id);
        user.deleteSubscription(req, res);
    });

    app.put('/lastnyte/invitefriends/:uid', function(req, res, next) {
        console.log('device id : ' + req.params.uid);
        user.inviteFriends(req, res);
    });

    app.put('/lastnyte/acceptfriends/:uid', function(req, res, next) {
        console.log('device id : ' + req.params.uid);
        user.AcceptFriends(req, res);
    });

    app.get('/lastnyte/gettrackfriends/:uid', function(req, res, next) {
        console.log('user id : ' + req.params.uid);
        user.getTackFriends(req, res);
    });

    app.put('/lastnyte/userlocation/:uid', function(req, res, next) {
        console.log('device id : ' + req.params.uid);
        user.updateUserLocation(req, res);
    });

    app.get('/lastnyte/userlocation/:uid', function(req, res, next) {
        console.log('user id : ' + req.params.uid);
        user.getUserLocation(req, res);
    });

    app.get('/lastnyte/validateuser/:uid', function(req, res, next) {
        user.verificationUser(req, res);
    });

	return app;
}();