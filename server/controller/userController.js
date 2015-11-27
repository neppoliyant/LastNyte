var url = require('url');
var constructErrorMessage = require('../utils/appUtils').constructErrorMessage;
var constructSuccessMessage = require('../utils/appUtils').constructSuccessMessage;
var db = require('../dao/db');
var utils = require('../utils/appUtils');
var fs = require('fs');
var config = require('../config/config.js');
var logger = require('../log/winston');
var auditlog = require('../log/auditlog').auditlog;
var nodemailer = require('nodemailer');

var smtpTransport = nodemailer.createTransport("STMP", {
   service: "Yahoo",
   auth: {
    user: 'neppoliyanthangavelu28@yahoo.com',
    pass: 'star_2828'
   }
});

function getUserbyId(req, res) {
    logger.info("MethodEnter: getUsers");
    if (!req.params.id) {
        res.statusCode = 400;
        res.send(constructErrorMessage("id is Mandatory", 400));
    } else {
        db.getUser(req.params.id, function(err, result) {
            if (err || !result) {
                res.statusCode = 500;
                res.send(constructErrorMessage(err, 500));
                auditlog(req, err);
            } else {
                res.statusCode = 200;
                res.send(result.value);
                auditlog(req, result.value);
            }
        });
    }
    logger.info("MethodExit: getUsers");
}

function addUser(req, res) {
    logger.info("MethodEnter: addUser");
    if (!req.body) {
        res.statusCode = 400;
        res.send(constructErrorMessage("payload is Mandatory", 400));
    } else {
        db.updateUser(req.params.id, req.body, function(err, result) {
            if (err || !result) {
                res.statusCode = 500;
                res.send(constructErrorMessage(err, 500));
                auditlog(req, err);
            } else {
                res.statusCode = 200;
                res.send(constructSuccessMessage("Updated/Inserted Successfully", 200, result));
                auditlog(req, "Success");
            }
        });
    }
    logger.info("MethodExit: addUser");
}

function register(req, res) {
    logger.info("MethodEnter: register");
    if (!req.body) {
        res.statusCode = 400;
        res.send(constructErrorMessage("payload is Mandatory", 400));
    } else {
        var id = utils.userToken(req.body.email, req.body.password);
        console.log("User Added : " + id + "Email : " + req.body.email);
        logger.info("User Added : " + id + "Email : " + req.body.email);
        req.body.id = id;
        req.body._id = id;
        req.body.isValid = true;
        db.updateUser(id, req.body, function(err, result) {
            if (err || !result) {
                res.statusCode = 500;
                res.send(constructErrorMessage(err, 500));
                auditlog(req, err);
            } else {
                res.statusCode = 200;
                res.send(req.body);
                auditlog(req, res.body);
            }
        });
    }
    logger.info("MethodExit: register");
}

function login(req, res) {
    if (!req.body) {
        res.statusCode = 400;
        res.send(constructErrorMessage("payload is Mandatory", 400));
    } else {
        var id = utils.userToken(req.body.email, req.body.password);
        console.log("user id : " + id);
        req.body.id = id;
        db.getUser(id, function(err, result) {
            if (err || !result) {
                res.statusCode = 500;
                res.send(constructErrorMessage(err, 500));
                auditlog(req, err);
            } else {
                res.statusCode = 200;
                res.send(result.value);
                auditlog(req, result.value);
            }
        });
    }
}

function deleteUserbyId(req, res) {
    if (!req.params.id) {
        res.statusCode = 400;
        res.send(constructErrorMessage("id is Mandatory", 400));
    } else {
        db.deleteUser(req.params.id, function(err, result) {
            if (err || !result) {
                res.statusCode = 500;
                res.send(constructErrorMessage(err, 500));
                auditlog(req, err);
            } else {
                res.statusCode = 200;
                res.send(constructSuccessMessage("Deleted Successfully", 200, result));
                auditlog(req, "Delete Successfully");
            }
        });
    }
}

function savePicture(req, res) {
    var dir = config.dir + req.params.id + ".png";
    var data = req.body.body.imageData;
    fs.writeFile(dir, data, 'binary', function(err){
        if (err) throw err
        console.log('File saved.')
    });
    res.statusCode = 200;
    res.send("Success");
    auditlog(req, "Success");
}

function getPicture(req, res) {
    var dir = config.dir + req.params.id + ".png";
    fs.readFile(dir, function (err, data) {
        var data1 = {};
        if (err) {
            res.statusCode = 400;
            res.send("Error");
        } else {
            res.statusCode = 200;
            res.setHeader('content-type', 'image/png');
            res.send(data);
            auditlog(req, "Success");
        }
    });
}

function updateTracker(req, res) {
    logger.info("MethodEnter: updateTracker");
    if (!req.body) {
        res.statusCode = 400;
        res.send(constructErrorMessage("payload is Mandatory", 400));
    } else {
        db.getUser(req.params.id, function(err, results) {
            var updateValue = {};
            if (results != null) {
                results.value.lastRecordedItem = results.value.lastRecordedItem + 1;
                req.body.id = results.value.lastRecordedItem;
                results.value.tracker.push(req.body);
                updateValue = results.value;
            } else {
                var obj = {};
                obj.tracker = [];
                req.body.id = 1;
                obj.lastRecordedItem = 1;
                obj.tracker.push(req.body);
                updateValue = obj;
            }
            console.log("before db " + updateValue);
            db.updateUser(req.params.id, updateValue, function(err, result) {
                if (!err) {
                    res.statusCode = 200;
                    res.send("Success");
                    auditlog(req, "Success update tracker");
                } else {
                    res.statusCode = 500;
                    res.send("Error Occured");
                    auditlog(req, "Error Occured");
                }
            });
        });
    }
    logger.info("MethodExit: updateTracker");
}

function getTracker(req, res) {
    logger.info("MethodEnter: getTracker");
    if (!req.body) {
        res.statusCode = 400;
        res.send(constructErrorMessage("payload is Mandatory", 400));
    } else {
        db.getUser(req.params.id, function(err, results) {
            console.log(err);
            if (results != null) {
                console.log(results.value);
                res.statusCode = 200;
                res.send(results.value);
                auditlog(req, "Success of GetTracker");
            } else {
                res.statusCode = 500;
                res.send("No record found");
                auditlog(req, "No record found");
            }
        });
    }
    logger.info("MethodExit: getTracker");
}

module.exports.getUserbyId = getUserbyId;
module.exports.addUser = addUser;
module.exports.deleteUserbyId = deleteUserbyId;
module.exports.login = login;
module.exports.register = register;
module.exports.savePicture = savePicture;
module.exports.getPicture = getPicture;
module.exports.updateTracker = updateTracker;
module.exports.getTracker = getTracker;

