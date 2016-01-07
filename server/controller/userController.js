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
var geocoder = require('node-geocoder')('google', 'http', null);
var rn = require('./remoteNotification.js');

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

//---------------------------------Cassandra

function saveLastNytePicture(req, res) {
    var dir = config.dir + req.params.id + ".png";
    var data = req.body.imageData;
    console.log(JSON.stringify(req.body));
    fs.writeFile(dir, data, 'binary', function(err){
        if (err) throw err
        console.log('File saved.')
    });
    res.statusCode = 200;
    res.send("Success");
    auditlog(req, "Success");
}

function getLastNytePicture(req, res) {
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

function insertUser(req, res) {
    var query = '';
    var params = [];

    query = 'select * from lastnyte.users where email = ?;';

    params = [req.body.email];

    client.execute(query, params, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlog(req, err);
        } else {
            if (result.rows.length > 0) {
                console.log('Inserted user details in cassandra');
                res.statusCode = 400;
                res.send(errorMsg("User Already Exist", 404));
                auditlog(req, "User Already Exist");
            } else {
                query = 'insert into lastnyte.users(uid, email, firstname, lastname, password, createdtime) values(?,?,?,?,?,?)';

                var uuid5 = uuid.v4();
                console.log('valeus' + req.body.email);
                console.log('valeus' + req.body.firstname);
                req.body.uid = uuid5;

                params = [uuid5, req.body.email, req.body.firstname, req.body.lastname, req.body.password, req.body.createdTime];
                client.execute(query, params, function(err) {
                  if (err) {
                    res.statusCode = 500;
                    res.send(errorMsg(err, 500));
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

function UpdateUserCas(req, res) {
    var query = '';
    var params = [];

    query = 'select * from lastnyte.users where uid=?;';

    params = [req.params.id];

    client.execute(query, params, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlog(req, err);
        } else {
            if (result.rows.length > 0) {

                query = 'update lastnyte.users set email=?, firstName=?, lastname=?, password=? where uid=?';

                params = [req.body.email, req.body.firstname, req.body.lastname, req.body.password, req.params.id];

                client.execute(query, params, function(err) {
                  if (err) {
                    res.statusCode = 500;
                    res.send(errorMsg(err, 500));
                    auditlog(req, "Failed");
                  } else {
                    console.log('Updated user details in cassandra');
                    req.body.msg = 'Updated Successfully';
                    res.statusCode = 200;
                    res.send(req.body);
                    auditlog(req, "Updated user details in cassandra");
                  }
                });
            } else {
                res.statusCode = 404;
                res.send(errorMsg("User Not Found", 404));
                auditlog(req, "User Not Found");
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
        res.send(errorMsg(err, 500));
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
            res.send(errorMsg("No User Found", 404));
            auditlog(req, "Success");
        }
      }
    });
}

function getTrackerHistory(req, res) {
    var query = '';
    var params = [];

    console.log('results : Inside getTrackerHistory');

    query = 'select trackerid, blobAsText(trackerdata) as trackerdata, createdtime, isalive from tracker where uid = ?;';

    params = [req.params.uid];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 202;
            res.send(errorMsg(err, 202));
            auditlog(req, "Try Again");
        } else {
            var objArr = [];
            console.log('results : ' + result.rows.length);
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
                res.send(errorMsg("No Record Found", 404));
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
            res.send(errorMsg(err, 202));
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
                res.send(errorMsg("No Record Found", 404));
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
        console.log('Inside updateTracerCas Select');
        query = 'select blobAsText(trackerdata) as trackerdata, isalive from tracker where uid = ? and trackerid = ? ALLOW FILTERING;';

        params = [req.body.uid, req.body.trackerId];

        client.execute(query, params,{ prepare: true}, function(err, result) {
            if (err) {
                res.statusCode = 202;
                res.send(errorMsg(err, 202));
                auditlog(req, "Try Again");
            } else {
                if (!result.rows[0].isalive) {
                    res.statusCode = 200;
                    res.send("Completed Tracker");
                    auditlog(req, "Completed Tracker");
                } else {
                    console.log('Inside updateTracerCas Update' + result.rows[0].trackerdata);

                    var updatedData = JSON.parse(result.rows[0].trackerdata);

                    updatedData.lastTrackItem = updatedData.lastTrackItem + 1;

                    req.body.trackerData.tracker[0].id = updatedData.lastTrackItem;

                    var location = getLocationName(req.body.trackerData.tracker[0].lat, req.body.trackerData.tracker[0].long);

                    geocoder.reverse({lat:req.body.trackerData.tracker[0].lat, lon:req.body.trackerData.tracker[0].long}, function(err, response) {
                        if (err) {
                            console.log('Location Name :' + location);
                            console.log('Before updated data' + JSON.stringify(updatedData));

                            updatedData.tracker.push(req.body.trackerData.tracker[0]);

                            console.log('updated data' + JSON.stringify(updatedData));

                            var query1 = '';

                            var params1 = [];

                            if (req.body.isAlive == "false") { 
                                console.log('is Alive false' + req.body.isAlive);
                                query1 = 'update tracker set trackerdata = textAsBlob(?), isAlive=? where uid = ? and trackerid = ?;';
                                params1 = [JSON.stringify(updatedData), false, req.body.uid, req.body.trackerId];
                            } else {
                                query1 = 'update tracker set trackerdata = textAsBlob(?) where uid = ? and trackerid = ?;';
                                params1 = [JSON.stringify(updatedData), req.body.uid, req.body.trackerId];
                            }

                            client.execute(query1, params1,{ prepare: true }, function(err, result) {
                                var objResult = {};
                                if (err) {
                                    res.statusCode = 202;
                                    res.send(errorMsg(err, 202));
                                    auditlog(req, errorMsg(err, 202));
                                } else {
                                    res.statusCode = 200;
                                    res.send("Updated Successfully");
                                    auditlog(req, "Updated Successfully");
                                }
                            });
                        } else {
                            console.log('Location Name :' + response[0].formattedAddress);
                            console.log('Before updated data' + JSON.stringify(updatedData));
                            req.body.trackerData.tracker[0].location = response[0].formattedAddress;
                            updatedData.tracker.push(req.body.trackerData.tracker[0]);

                            console.log('updated data' + JSON.stringify(updatedData));

                            var query1 = '';

                            var params1 = [];

                            if (req.body.isAlive == "false") { 
                                console.log('is Alive false' + req.body.isAlive);
                                query1 = 'update tracker set trackerdata = textAsBlob(?), isAlive=? where uid = ? and trackerid = ?;';
                                params1 = [JSON.stringify(updatedData), false, req.body.uid, req.body.trackerId];
                            } else {
                                query1 = 'update tracker set trackerdata = textAsBlob(?) where uid = ? and trackerid = ?;';
                                params1 = [JSON.stringify(updatedData), req.body.uid, req.body.trackerId];
                            }

                            client.execute(query1, params1,{ prepare: true }, function(err, result) {
                                var objResult = {};
                                if (err) {
                                    res.statusCode = 202;
                                    res.send(errorMsg(err, 202));
                                    auditlog(req, errorMsg(err, 202));
                                } else {
                                    res.statusCode = 200;
                                    res.send("Updated Successfully");
                                    auditlog(req, "Updated Successfully");
                                }
                            });
                        }
                    });
                }
            }
        }); 
    } else {
        if (req.body.trackerName) {
            console.log('Inside updateTracerCas Inside');

            query = 'insert into tracker(uid, trackerid, isalive, trackerdata, createdtime, trackername) values(?, ?, ?, textAsBlob(?), ?, ?);';

            var uuid5 = uuid.v4();

            var date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

            req.body.trackerData.lastTrackItem = 1;

            req.body.trackerData.trackerName = req.body.trackerName;

            req.body.trackerData.tracker[0].id = 1;

            geocoder.reverse({lat:req.body.trackerData.tracker[0].lat, lon:req.body.trackerData.tracker[0].long}, function(err, response) {
                if (err) {
                    params = [req.body.uid, uuid5, true, JSON.stringify(req.body.trackerData), req.body.createdTime, req.body.trackerName];

                    client.execute(query, params,{ prepare: true}, function(err, result) {
                        if (err) {
                            res.statusCode = 202;
                            res.send(errorMsg(err, 202));
                            auditlog(req, "Try Again");
                        } else {
                            req.body.trackerId = uuid5;
                            res.statusCode = 200;
                            res.send(req.body);
                            auditlog(req, "Success Created first Record");
                        }
                    });
                } else {
                    console.log('Location Name :' + response[0].formattedAddress);
                    req.body.trackerData.tracker[0].location = response[0].formattedAddress;
                    params = [req.body.uid, uuid5, true, JSON.stringify(req.body.trackerData), req.body.createdTime, req.body.trackerName];

                    client.execute(query, params,{ prepare: true}, function(err, result) {
                        if (err) {
                            res.statusCode = 202;
                            res.send(errorMsg(err, 202));
                            auditlog(req, "Try Again");
                        } else {
                            req.body.trackerId = uuid5;
                            res.statusCode = 200;
                            res.send(req.body);
                            auditlog(req, "Success Created first Record");
                        }
                    });
                }
            });
        } else {
            res.statusCode = 400;
            res.send(errorMsg("No Tracker Name", 400));
            auditlog(req, "No Tracker Name");

        }
    }
}

function getLocationName(lat, long) {
    geocoder.reverse({lat:45.767, lon:4.833}, function(err, res) {
        return res.formattedAddress;
    });
}

function errorMsg(errorMsg, statusCode) {
    var obj = {};
    obj.status = statusCode;
    obj.hasError = true;
    obj.message = errorMsg;
    return obj;
}

function successMessage(msg, statusCode) {
    var obj = {};
    obj.status = statusCode;
    obj.hasError = false;
    obj.message = msg;
    return obj;
}

//Notification Methods

function getSubscription(req, res) {
    var query = '';
    var params = [];

    query = 'select * from usersdevicedetails where uid = ? and devicetoken = ?;';

    params = [req.params.uid, req.params.id];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 202;
            res.send(errorMsg(err, 202));
            auditlog(req, "Try Again");
        } else {
            if (result.rows.length > 0) {
                var obj = {};
                obj.uid = result.rows[0].uid;
                obj.deviceType = result.rows[0].devicetype;
                obj.deviceToken = result.rows[0].devicetoken;
                obj.notification = result.rows[0].notification
                res.statusCode = 200;
                res.send(obj);
                auditlog(req, "Get Successfully");
            } else {
                res.statusCode = 404;
                res.send(errorMsg("No Record Found", 404));
                auditlog(req, "No Record Found");
            }
        }
    });
}

function putSubscription(req, res) {
    var query = '';
    var params = [];

    query = 'insert into usersdevicedetails(uid, devicetoken, devicetype, notification, email) values(?,?,?,?,?);';
    console.log('request body' + JSON.stringify(req.body));
    console.log('request uid' + req.body.uid);
    params = [req.body.uid, req.body.deviceToken, req.body.deviceType, req.body.notification, req.body.email];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 202;
            res.send(errorMsg(err, 202));
            auditlog(req, "Try Again");
        } else {
            res.statusCode = 200;
            res.send(successMessage("Success", 200));
            auditlog(req, "Successfully");
        }
    });
}

function deleteSubscription(req, res) {
    var query = '';
    var params = [];

    query = 'delete from usersdevicedetails where uid =? and devicetoken = ?;';

    params = [req.params.uid, req.params.id];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 202;
            res.send(errorMsg(err, 202));
            auditlog(req, "Try Again");
        } else {
            res.statusCode = 200;
            res.send(successMessage("Success Delete of record", 200));
            auditlog(req, "Successfully");
        }
    });
}

function inviteFriends(req, res) {
    var query = '';
    var params = [];

    query = 'select uid, devicetoken from usersdevicedetails where email = ?';

    params = [req.body.to];

    console.log('invite body' + JSON.stringify(req.body));

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            console.log('invite error' + err);
            res.statusCode = 202;
            res.send(errorMsg(err, 202));
            auditlog(req, "Try Again");
        } else {
            if (result.rows.length > 0) {
                var touuid = result.rows[0].uid;
                var deviceid = result.rows[0].devicetoken;
                
                query = 'insert into trackmapuser(uid, trackeruser) values(?,?);';

                params = [req.params.uid, touuid];

                client.execute(query, params,{ prepare: true}, function(err1, result1) {
                    if (err1) {
                        console.log('invite error' + err1);
                        res.statusCode = 202;
                        res.send(errorMsg(err, 202));
                        auditlog(req, "Try Again");
                    } else {

                        var message = {};
                        message.toDeviceId = deviceid;
                        message.message = req.body.from + ' wants to track you...';
                        message.from = req.body.from;
                        message.to = req.body.to;
                        message.touuid = req.body.fromuuid;
                        message.fromDeviceId = req.body.fromDeviceId;

                        rn.sendInviteNotification(message, function(err, response){
                            if (err) {
                                res.statusCode = 202;
                                res.send(errorMsg(err, 202));
                                auditlog(req, "Try Again");
                            } else {
                                res.statusCode = 200;
                                res.send(successMessage("Success Invite of User", 200));
                                auditlog(req, "Successfully Invitated");
                            }
                        });
                    }
                });

            }
        }
    });
}

function AcceptFriends(req, res) {
    var query = '';
    var params = [];

    query = 'insert into trackmapuser(uid, trackeruser) values(?,?);';

    params = [req.body.fromuuid, touuid];
    console.log('accept body' + JSON.stringify(req.body));

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            console.log('accept error' + err);
            res.statusCode = 202;
            res.send(errorMsg(err, 202));
            auditlog(req, "Try Again");
        } else {
            var message = {};
            message.toDeviceId = req.body.fromDeviceId;
            message.message = req.body.from + ' accepts your invite!!!';
            message.from = req.body.from;
            message.to = req.body.to;
            message.touuid = req.body.fromuuid;

            rn.sendInviteNotification(message, function(err1, response1){
                if (err1) {
                    console.log('accept error' + err1);
                    res.statusCode = 202;
                    res.send(errorMsg(err, 202));
                    auditlog(req, "Try Again");
                } else {
                    res.statusCode = 200;
                    res.send(successMessage("Success Accept of User", 200));
                    auditlog(req, "Successfully Accept Invitation");
                }
            });
        }
    });
}
module.exports.AcceptFriends = AcceptFriends;
module.exports.inviteFriends = inviteFriends;
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
module.exports.UpdateUserCas = UpdateUserCas;
module.exports.saveLastNytePicture = saveLastNytePicture;
module.exports.getLastNytePicture = getLastNytePicture;
module.exports.deleteSubscription = deleteSubscription;
module.exports.putSubscription = putSubscription;
module.exports.getSubscription = getSubscription;

