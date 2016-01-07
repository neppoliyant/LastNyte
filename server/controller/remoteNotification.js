var http = require('http');
var apn = require('apn');
var url = require('url');
var constructErrorMessage = require('../utils/appUtils').constructErrorMessage;
var constructSuccessMessage = require('../utils/appUtils').constructSuccessMessage; 
var config = require('../config/config.js');
var logger = require('../log/winston');
var auditlog = require('../log/auditlog').auditlog;
 
//apns Connection logic
var callback = function(errorNum, notification){
    console.log('Error is: %s', errorNum);
    console.log("Note " + notification);
}
var options = {
    gateway: 'gateway.sandbox.push.apple.com', // this URL is different for Apple's Production Servers and changes when you go to production
    errorCallback: callback,
    cert: __dirname + '/neppoliyan.pem',                 
    key:  __dirname + '/neppoliyankey.pem',                 
    passphrase: 'star_2828',                 
    port: 2195,                       
    enhanced: true,                   
    cacheLength: 100                  
}
var apnsConnection = new apn.Connection(options);

function sendNotificationtoDevice(req, res) {
    logger.info("MethodEnter: sendNotificationtoDevice");
    if (!req.params.id) {
        res.statusCode = 400;
        res.send(constructErrorMessage("Device id is Mandatory", 400));
    } else {
        var myDevice = new apn.Device(req.body.toDeviceId);
 		var body = req.body;
		var note = new apn.Notification();
		note.badge = 1;
		note.sound = "notification-beep.wav";
		note.alert = { "body" : body.message, "action-loc-key" : "Play" , "launch-image" : "mysplash.png"};
		note.payload = {'messageFrom': body.from, 'messageTo': body.to, 'message': body.message};
		 
		note.device = myDevice;

		if (!apnsConnection) {
			apnsConnection = new apn.Connection(options);
		}

		apnsConnection.sendNotification(note);

		res.statusCode = 200;
        res.send(constructSuccessMessage("Notification Sent Successfully", 200));
    }
    logger.info("MethodExit: sendNotificationtoDevice");
}

function sendInviteNotification(message, callback) {
    logger.info("MethodEnter: sendInviteNotification");
    console.log("notificastion body: " + JSON.stringify(message));
    var myDevice = new apn.Device(message.toDeviceId);
	var body = message;
	var note = new apn.Notification();
	note.badge = 1;
	note.sound = "notification-beep.wav";
	note.alert = { "body" : body.message, "action-loc-key" : "Play" , "launch-image" : "mysplash.png"};
	note.payload = message;
	note.topic = "Invite";
	 
	note.device = myDevice;

	if (!apnsConnection) {
		apnsConnection = new apn.Connection(options);
	}

	apnsConnection.sendNotification(note);

	callback(false, 'Success');
    logger.info("MethodExit: sendInviteNotification");
}

module.exports.sendInviteNotification = sendInviteNotification;
module.exports.sendNotificationtoDevice = sendNotificationtoDevice;