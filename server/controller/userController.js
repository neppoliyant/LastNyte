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
var cassandra = require('cassandra-driver');
var async = require('async');
var authProvider = new cassandra.auth.PlainTextAuthProvider('cassandra', 'cassandra');
var uuid = require('node-uuid');

var client = new cassandra.Client({contactPoints: ['96.119.183.251'], keyspace: 'lastnyte'});

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

function insertUser(req, res) {
    var query = '';
    var params = [];

    query = 'select * from lastnyte.users where email=?;';

    params = [req.body.email];

    client.execute(query, params, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(err);
            auditlog(req, err);
        } else {
            if (result.rows.length > 0) {
                console.log('Inserted user details in cassandra');
                res.statusCode = 400;
                res.send("User Already Exist");
                auditlog(req, "User Already Exist");
            } else {
                query = 'insert into lastnyte.users(uid, email, firstname, lastname, password, createdtime) values(?,?,?,?,?,?)';

                var uuid5 = uuid.v4();
                console.log('valeus' + req.body.email);
                console.log('valeus' + req.body.firstname);
                req.body.uid = uuid5;
                params = [uuid5, req.body.email, req.body.firstname, req.body.lastname, req.body.password, new Date()];
                client.execute(query, params, function(err) {
                  if (err) {
                    res.statusCode = 500;
                    res.send("Failed");
                    auditlog(req, "Failed");
                  } else {
                    console.log('Inserted user details in cassandra');
                    res.statusCode = 200;
                    res.send(req.body);
                    auditlog(req, "Success");
                  }
                });
            }
        }
    });
}

function getUser(req, res) {
    var query = 'select * from users where email = ? and password= ? ALLOW FILTERING';

    var uuid5 = uuid.v4();
    var params = [req.body.email, req.body.password];
    client.execute(query, params, function(err, result) {
      if (err) {
        res.statusCode = 500;
        res.send("Failed");
        auditlog(req, "Failed");
      } else {
        var obj = {};
        if (result.rows[0]) {
            obj.firstName = result.rows[0].firstname;
            obj.lastName = result.rows[0].lastname;
            obj.email = result.rows[0].email;
            obj.uid = result.rows[0].uid;
            res.statusCode = 200;
            res.send(obj);
            auditlog(req, "Success");
        } else {
            res.statusCode = 404;
            res.send("No User Found");
            auditlog(req, "Success");
        }
      }
    });
}

function getTrackerHistory(req, res) {
    var query = '';
    var params = [];

    query = 'select trackerid, blobAsText(trackerdata) as trackerdata, createdtime, isalive from tracker where uid = ?;';

    params = [req.params.uid];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 202;
            res.send(err);
            auditlog(req, "Try Again");
        } else {
            var objArr = [];
            if (result.rows.length > 0) {
                for (var i=0;i<result.rows.length;i++) {
                    var obj = {};
                    obj.trackerId = result.rows[i].trackerid;
                    obj.trackerData = JSON.parse(result.rows[i].trackerdata);
                    obj.createdTime = result.rows[i].createdtime;
                    obj.isAlive = result.rows[i].isalive;
                    objArr.push(obj);
                }
                var finalObj = {};
                finalObj.history = objArr;
                res.statusCode = 200;
                res.send(finalObj);
                auditlog(req, "Get Successfully");
            } else {
                res.statusCode = 404;
                res.send("No Record Found");
                auditlog(req, "No Record Found");
            }
        }
    });
}

function getLastTracker(req, res) {
    var query = '';
    var params = [];

    query = 'select trackerid, blobAsText(trackerdata) as trackerdata, createdtime, isalive from tracker where uid = ? and trackerid = ?;';

    params = [req.params.uid, req.params.trackerId];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 202;
            res.send(err);
            auditlog(req, "Try Again");
        } else {
            if (result.rows.length > 0) {
                var obj = {};
                obj.trackerId = result.rows[0].trackerid;
                obj.trackerData = JSON.parse(result.rows[0].trackerdata);
                obj.createdTime = result.rows[0].createdtime;
                obj.isAlive = result.rows[0].isalive
                res.statusCode = 200;
                res.send(obj);
                auditlog(req, "Get Successfully");
            } else {
                res.statusCode = 404;
                res.send("No Record Found");
                auditlog(req, "No Record Found");
            }
        }
    });
}

function updateTracerCas(req, res) {
    var query = '';
    var params = [];
    console.log('Inside updateTracerCas');
    console.log('Inside updateTracerCas body' + JSON.stringify(req.body));
    if (req.body.trackerId) {
        if (req.body.isAlive == false) {
            query = 'update tracker set isAlive = ? where uid = ? and trackerid = ?;';

            params = [false, req.body.uid, req.body.trackerId];

            client.execute(query, params,{ prepare: true }, function(err, result) {
                    if (err) {
                        res.statusCode = 202;
                        res.send(err);
                        auditlog(req, "Try Again");
                    } else {
                        res.statusCode = 200;
                        res.send("Updated Successfully Tracker Completed");
                        auditlog(req, "Updated Successfully");
                    }
                });
            return;
        } else {
            console.log('Inside updateTracerCas Select');
            query = 'select blobAsText(trackerdata) as trackerdata, isalive from tracker where uid = ? and trackerid = ? ALLOW FILTERING;';

            params = [req.body.uid, req.body.trackerId];

            client.execute(query, params,{ prepare: true}, function(err, result) {
                if (err) {
                    res.statusCode = 202;
                    res.send(err);
                    auditlog(req, "Try Again");
                } else {
                    if (!result.rows[0].isalive) {
                        res.statusCode = 200;
                        res.send("Completed Tracker");
                        auditlog(req, "Completed Tracker");
                    } else {
                        console.log('Inside updateTracerCas Update' + result.rows[0].trackerdata);

                        var updatedData = JSON.parse(result.rows[0].trackerdata);

                        result.rows[0].trackerdata.lastTrackItem = result.rows[0].trackerdata.lastTrackItem + 1;

                        req.body.trackerData.tracker[0].id = result.rows[0].trackerdata.lastTrackItem;

                        console.log('Before updated data' + JSON.stringify(updatedData));

                        updatedData.tracker.push(req.body.trackerData);

                        console.log('updated data' + JSON.stringify(updatedData));

                        var query1 = 'update tracker set trackerdata = textAsBlob(?) where uid = ? and trackerid = ?;';

                        var params1 = [JSON.stringify(updatedData), req.body.uid, req.body.trackerId];

                        client.execute(query1, params1,{ prepare: true }, function(err, result) {
                            if (err) {
                                res.statusCode = 202;
                                res.send(err);
                                auditlog(req, "Try Again");
                            } else {
                                res.statusCode = 200;
                                res.send("Updated Successfully");
                                auditlog(req, "Updated Successfully");
                            }
                        });
                    }
                }
            }); 
        }
    } else {
        console.log('Inside updateTracerCas Inside');

        query = 'insert into tracker(uid, trackerid, isalive, trackerdata, createdtime) values(?, ?, ?, textAsBlob(?), ?);';

        var uuid5 = uuid.v4();

        var date = new Date();

        req.body.trackerData.lastTrackItem = 1;

        req.body.trackerData.tracker[0].id = 1;

        params = [req.body.uid, uuid5, true, JSON.stringify(req.body.trackerData), date];

        client.execute(query, params,{ prepare: true}, function(err, result) {
            if (err) {
                res.statusCode = 202;
                res.send(err);
                auditlog(req, "Try Again");
            } else {
                req.body.trackerId = uuid5;
                res.statusCode = 200;
                res.send(req.body);
                auditlog(req, "Success Created first Record");
            }
        });
    }
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
module.exports.insertUser = insertUser;
module.exports.updateTracerCas = updateTracerCas;
module.exports.getLastTracker = getLastTracker;
module.exports.getTrackerHistory = getTrackerHistory;
module.exports.getUser = getUser;


