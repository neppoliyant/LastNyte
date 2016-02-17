var url = require('url');
var constructErrorMessage = require('../utils/appUtils').constructErrorMessage;
var constructSuccessMessage = require('../utils/appUtils').constructSuccessMessage;
var db = require('../dao/db');
var utils = require('../utils/appUtils');
var fs = require('fs');
var config = require('../config/config.js');
var logger = require('../log/winston');
var auditlogRes = require('../log/auditlog').auditlogNew;
var nodemailer = require('nodemailer');
var cassandra = require('cassandra-driver');
var async = require('async');
var authProvider = new cassandra.auth.PlainTextAuthProvider('cassandra', 'cassandra');
var uuid = require('node-uuid');
var geocoder = require('node-geocoder')('google', 'http', null);
var rn = require('./remoteNotification.js');
var TimeUuid = require('cassandra-driver').types.TimeUuid;
var crypto = require('crypto');
var smtpTransport = require("nodemailer-smtp-transport")

var client = new cassandra.Client({contactPoints: [config.cassandraDB], keyspace: 'lastnyte'});

//var transporter = nodemailer.createTransport('smtps:virpal.v.singh@gmail.com:Lastnyte1@smtp.gmail.com');

var smpttransporter = nodemailer.createTransport("SMTP", {
service: "Gmail",
auth: {
    user: "neppoliyant@gmail.com",
    pass: "fire@2828"
}
});

var transporter = nodemailer.createTransport(smtpTransport({
    host : "smtp.gmail.com",
    secureConnection : false,
    port: 587,
    auth : {
        user : "neppoliyant@gmail.com",
        pass : "fire@2828"
    }
}));

function randomValueHex (len) {
    return crypto.randomBytes(Math.ceil(len/2))
        .toString('hex') // convert to hexadecimal format
        .slice(0,len);   // return required number of characters
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
    auditlogRes(req, 200, "Picture Saved Successfully");
}

function getLastNytePicture(req, res) {
    var dir = config.dir + req.params.id + ".png";
    fs.readFile(dir, function (err, data) {
        var data1 = {};
        if (err) {
            res.statusCode = 400;
            res.send("Error");
            auditlogRes(req, 400, err);
        } else {
            res.statusCode = 200;
            res.setHeader('content-type', 'image/png');
            res.send(data);
            auditlogRes(req, 200, "Success getting of picture");
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
            auditlogRes(req, 500, err);
        } else {
            if (result.rows.length > 0) {
                res.statusCode = 404;
                res.send(errorMsg("User Already Exist", 404));
                auditlogRes(req, 404, "User Already Exist");
            } else {
                var verificationCode = randomValueHex(6);

                query = 'insert into lastnyte.users(uid, email, firstname, lastname, password, createdtime, verificationcode, verified, tracktime) values(?,?,?,?,?,?,?,?,?);';

                var uuid5 = TimeUuid.fromDate(new Date());
                req.body.uid = uuid5;

                params = [uuid5.toString(), req.body.email, req.body.firstname, req.body.lastname, req.body.password, req.body.createdTime, verificationCode, "false", "1"];
                client.execute(query, params,{ prepare: true}, function(err) {
                  if (err) {
                    res.statusCode = 500;
                    console.log(err);
                    res.send(errorMsg(err, 500));
                    auditlogRes(req, 500, err);
                  } else {
                    sendEmailLastNyte(req.body.email, verificationCode);
                    res.statusCode = 200;
                    res.send(req.body);
                    auditlogRes(req, 200, successMessage("Success Inserting of data", 200));
                  }
                });
            }
        }
    });
}

function deleteUser(req, res) {
    var query = '';
    var params = [];

    query = 'delete from lastnyte.users where uid = ?;';

    params = [req.params.uid];

    client.execute(query, params, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            res.statusCode = 200;
            res.send(successMessage("Deleted User", 200));
            auditlogRes(req, 200, successMessage("Deleted User", 200));
        }
    });
}

function verificationUser(req, res) {
    var query = 'select * from lastnyte.users where uid = ?;';

    var params = [req.params.uid];

    client.execute(query, params,{ prepare: true}, function(err, result) {
      if (err) {
        res.statusCode = 500;
        res.send(errorMsg(err, 500));
        auditlogRes(req, 500, err);
      } else {
        var obj = {};
        if (result.rows[0]) {
            if (result.rows[0].verificationcode == req.query.code) {
                query = 'update users set verified = ? where uid = ? and email = ?';
                params = ['true', req.params.uid, result.rows[0].email];
                client.execute(query, params,{ prepare: true}, function(err, result) {
                    if (err) {
                        res.statusCode = 500;
                        res.send(errorMsg(err, 500));
                        auditlogRes(req, 500, err);
                    } else {
                        res.statusCode = 200;
                        obj.verified = "true";
                        res.send(obj);
                        auditlogRes(req, 200, successMessage("Success Verification of data", 200));
                    }
                });
            } else {
                res.statusCode = 400;
                res.send(errorMsg("Not a valid code", 400));
                auditlogRes(req, 400, "Not a valid code");
            }
        } else {
            res.statusCode = 404;
            res.send(errorMsg("No User Found", 404));
            auditlogRes(req, 404, "No User Found");
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
            auditlogRes(req, 500, err);
        } else {
            if (result.rows.length > 0) {

                query = 'update lastnyte.users set email=?, firstName=?, lastname=?, password=? where uid=?';

                params = [req.body.email, req.body.firstname, req.body.lastname, req.body.password, req.params.id];

                client.execute(query, params, function(err) {
                  if (err) {
                    res.statusCode = 500;
                    res.send(errorMsg(err, 500));
                    auditlogRes(req, 500, err);
                  } else {
                    req.body.msg = 'Updated Successfully';
                    res.statusCode = 200;
                    res.send(req.body);
                    auditlogRes(req, 200, successMessage("Updated user details in cassandra", 200));
                  }
                });
            } else {
                res.statusCode = 404;
                res.send(errorMsg("User Not Found", 404));
                auditlogRes(req, 404, errorMsg("User Not Found", 404));
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
        auditlogRes(req, 500, err);
      } else {
        var obj = {};
        if (result.rows[0]) {
            obj.firstName = result.rows[0].firstname;
            obj.lastName = result.rows[0].lastname;
            obj.email = result.rows[0].email;
            obj.uid = result.rows[0].uid;
            obj.verified = result.rows[0].verified;
            obj.tracktime = result.rows[0].tracktime;
            res.statusCode = 200;
            res.send(obj);
            auditlogRes(req, 200, successMessage("Success getting of user details", 200));
        } else {
            res.statusCode = 404;
            res.send(errorMsg("No User Found", 404));
            auditlogRes(req, 500, "No User Found");
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
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
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
                auditlogRes(req, 200, successMessage("Success getting of Tracker history", 200));
            } else {
                res.statusCode = 404;
                res.send(errorMsg("No Record Found", 404));
                auditlogRes(req, 404, "No Record Found");
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
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            if (result.rows.length > 0) {
                var obj = {};
                obj.trackerId = result.rows[0].trackerid;
                obj.trackerData = JSON.parse(result.rows[0].trackerdata);
                obj.createdTime = result.rows[0].createdtime;
                obj.isAlive = result.rows[0].isalive
                res.statusCode = 200;
                res.send(obj);
                auditlogRes(req, 200, successMessage("Success getting of Tracker data", 200));
            } else {
                res.statusCode = 404;
                res.send(errorMsg("No Record Found", 404));
                auditlogRes(req, 404, "No Record Found");
            }
        }
    });
}

function updateTracerCas(req, res) {
    var query = '';
    var params = [];
    if (req.body.trackerId) {
        query = 'select blobAsText(trackerdata) as trackerdata, isalive from tracker where uid = ? and trackerid = ? ALLOW FILTERING;';

        params = [req.body.uid, req.body.trackerId];

        client.execute(query, params,{ prepare: true}, function(err, result) {
            if (err) {
                res.statusCode = 500;
                res.send(errorMsg(err, 500));
                auditlogRes(req, 500, err);
            } else {
                if (!result.rows[0].isalive) {
                    res.statusCode = 200;
                    res.send(successMessage("Completed Tracker", 200));
                    auditlogRes(req, 200, successMessage("Completed Tracker", 200));
                } else {

                    var updatedData = JSON.parse(result.rows[0].trackerdata);

                    updatedData.lastTrackItem = updatedData.lastTrackItem + 1;

                    req.body.trackerData.tracker[0].id = updatedData.lastTrackItem;

                    var location = getLocationName(req.body.trackerData.tracker[0].lat, req.body.trackerData.tracker[0].long);

                    geocoder.reverse({lat:req.body.trackerData.tracker[0].lat, lon:req.body.trackerData.tracker[0].long}, function(err, response) {
                        if (err) {

                            updatedData.tracker.push(req.body.trackerData.tracker[0]);

                            var query1 = '';

                            var params1 = [];

                            if (req.body.isAlive == "false") { 
                                query1 = 'update tracker set trackerdata = textAsBlob(?), isAlive=? where uid = ? and trackerid = ?;';
                                params1 = [JSON.stringify(updatedData), false, req.body.uid, req.body.trackerId];
                            } else {
                                query1 = 'update tracker set trackerdata = textAsBlob(?) where uid = ? and trackerid = ?;';
                                params1 = [JSON.stringify(updatedData), req.body.uid, req.body.trackerId];
                            }

                            client.execute(query1, params1,{ prepare: true }, function(err, result) {
                                var objResult = {};
                                if (err) {
                                    res.statusCode = 500;
                                    res.send(errorMsg(err, 500));
                                    auditlogRes(req, 500, err);
                                } else {
                                    res.statusCode = 200;
                                    res.send(successMessage("Tracker record Updated Successfully", 200));
                                    auditlogRes(req, 200, successMessage("Tracker record Updated Successfully", 200));
                                }
                            });
                        } else {
                            req.body.trackerData.tracker[0].location = response[0].formattedAddress;
                            updatedData.tracker.push(req.body.trackerData.tracker[0]);

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
                                    res.statusCode = 500;
                                    res.send(errorMsg(err, 500));
                                    auditlogRes(req, 500, err);
                                } else {
                                    res.statusCode = 200;
                                    res.send(successMessage("Tracker record Updated Successfully", 200));
                                    auditlogRes(req, 200, successMessage("Tracker record Updated Successfully", 200));
                                }
                            });
                        }
                    });
                }
            }
        }); 
    } else {
        if (req.body.trackerName) {

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
                            res.statusCode = 500;
                            res.send(errorMsg(err, 500));
                            auditlogRes(req, 500, err);
                        } else {
                            req.body.trackerId = uuid5;
                            res.statusCode = 200;
                            res.send(req.body);
                            auditlogRes(req, 200, successMessage("Created first record for tracker", 200));
                        }
                    });
                } else {
                    console.log('Location Name :' + response[0].formattedAddress);
                    req.body.trackerData.tracker[0].location = response[0].formattedAddress;
                    params = [req.body.uid, uuid5, true, JSON.stringify(req.body.trackerData), req.body.createdTime, req.body.trackerName];

                    client.execute(query, params,{ prepare: true}, function(err, result) {
                        if (err) {
                            res.statusCode = 500;
                            res.send(errorMsg(err, 500));
                            auditlogRes(req, 500, err);
                        } else {
                            req.body.trackerId = uuid5;
                            res.statusCode = 200;
                            res.send(req.body);
                            auditlogRes(req, 200, successMessage("Created first record for tracker", 200));
                        }
                    });
                }
            });
        } else {
            res.statusCode = 400;
            res.send(errorMsg("No Tracker Name", 400));
            auditlogRes(req, 400, "No Tracker Name");
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
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            if (result.rows.length > 0) {
                var obj = {};
                obj.uid = result.rows[0].uid;
                obj.deviceType = result.rows[0].devicetype;
                obj.deviceToken = result.rows[0].devicetoken;
                obj.notification = result.rows[0].notification
                res.statusCode = 200;
                res.send(obj);
                auditlogRes(req, 200, successMessage("Get Subscription Successful", 200));
            } else {
                res.statusCode = 404;
                res.send(errorMsg("No Record Found", 404));
                auditlogRes(req, 404, "No Notification Record Found");
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
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            res.statusCode = 200;
            res.send(successMessage("Success", 200));
            auditlogRes(req, 200, successMessage("Put Subscription Successful", 200));
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
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            res.statusCode = 200;
            res.send(successMessage("Success Delete of record", 200));
            auditlogRes(req, 200, successMessage("Delete Subscription Successful", 200));
        }
    });
}

function inviteFriends(req, res) {
    var query = '';
    var params = [];

    query = 'select uid, devicetoken from usersdevicedetails where email = ?';

    params = [req.body.to];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            if (result.rows.length > 0) {
                var touuid = result.rows[0].uid;
                var deviceid = result.rows[0].devicetoken;

                query = 'select trackeruser from trackmapuser where uid = ? and trackeruser = ?';

                params = [req.params.uid, touuid];

                client.execute(query, params,{ prepare: true}, function(err, result) {
                    if (err) {
                        res.statusCode = 500;
                        res.send(errorMsg(err, 500));
                        auditlogRes(req, 500, err);
                    } else {
                        if (result.rows.length > 0) { 
                            res.statusCode = 201;
                            res.send(errorMsg("Already Invite Sent", 201));
                            auditlogRes(req, 201, "Already Invite Sent");
                            return;
                        } else {
                            var queries = [
                              {
                                query: 'insert into trackmapuser(uid, trackeruser, pendingaprroval) values(?,?,?);',
                                params: [touuid, req.params.uid, "false"]
                              }
                            ];

                            client.batch(queries,{ prepare: true}, function(err1) {
                                if (err1) {
                                    res.statusCode = 500;
                                    res.send(errorMsg(err, 500));
                                    auditlogRes(req, 500, err);
                                } else {
                                    var message = {};
                                    message.toDeviceId = deviceid;
                                    message.message = req.body.from + ' wants to track you...';
                                    message.from = req.body.from;
                                    message.fromuuid = req.params.uid;
                                    message.to = req.body.to;
                                    message.touuid = req.body.fromuuid;
                                    message.fromDeviceId = req.body.fromDeviceId;
                                    message.topic = "Invite";                                                                                   

                                    rn.sendInviteNotification(message, function(err, response){
                                        if (err) {
                                            res.statusCode = 500;
                                            res.send(errorMsg(err, 500));
                                            auditlogRes(req, 500, err);
                                        } else {
                                            res.statusCode = 200;
                                            res.send(successMessage("Success Invite of User", 200));
                                            auditlogRes(req, 200, successMessage("Successful Invite of user", 200));
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            } else {
                res.statusCode = 404;
                res.send(errorMsg("User not part of lastnyte app", 404));
                auditlogRes(req, 404, "User not part of lastnyte app");
            }
        }
    });
}

function AcceptFriends(req, res) {
    var query = '';
    var params = [];

    query = 'select devicetoken from usersdevicedetails where uid = ?';

    params = [req.body.touuid];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            if (result.rows.length > 0) {
                var queries = [
                              {
                                query: 'insert into trackmapuser(uid, trackeruser, pendingaprroval) values(?,?,?);',
                                params: [req.body.fromuuid, req.body.touuid, "true"]
                              },
                              {
                                query: 'insert into trackmapuser(uid, trackeruser, pendingaprroval) values(?,?,?);',
                                params: [req.body.touuid, req.body.fromuuid, "true"]
                              }
                            ];
                
                client.batch(queries,{ prepare: true}, function(err) {
                    if (err) {
                        res.statusCode = 500;
                        res.send(errorMsg(err, 500));
                        auditlogRes(req, 500, err);
                    } else {
                        var message = {};
                        message.toDeviceId = result.rows[0].devicetoken;
                        message.message = req.body.from + ' accepts your invite!!!';
                        message.from = req.body.from;
                        message.to = req.body.to;
                        message.touuid = req.body.fromuuid;
                        message.topic = "Accept";

                        rn.sendInviteNotification(message, function(err1, response1){
                            if (err1) {
                                res.statusCode = 500;
                                res.send(errorMsg(err, 500));
                                auditlogRes(req, 500, err);
                            } else {
                                res.statusCode = 200;
                                res.send(successMessage("Success Accept of User", 200));
                                auditlogRes(req, 200, successMessage("Successful Accept of user", 200));
                            }
                        });
                    }
                });
            } else {
                console.log('invite error' + err);
                res.statusCode = 404;
                res.send(errorMsg("User not part of lastnyte app", 404));
                auditlogRes(req, 404, errorMsg("User not part of lastnyte app", 404));
            }
        }
    });
}

function DeleteTrackFriends(req, res) {
    var queries = [
                  {
                    query: 'delete from trackmapuser where uid = ? and trackeruser = ?;',
                    params: [req.params.uid, req.params.toid]
                  },
                  {
                    query: 'delete from trackmapuser where uid = ? and trackeruser = ?;',
                    params: [req.params.toid, req.params.uid]
                  }
                ];
    
    client.batch(queries,{ prepare: true}, function(err) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            res.statusCode = 200;
            res.send(successMessage("Success Deletion of track User", 200));
            auditlogRes(req, 200, successMessage("Success Deletion of track User", 200));
        }
    });
}

function getTackFriends(req, res) {
    var query = '';
    var params = [];

    query = 'select trackeruser, pendingaprroval from trackmapuser where uid = ?;';

    params = [req.params.uid];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            if (result.rows.length > 0) {
                var arrUsers = "";
                for (var i=0;i<result.rows.length;i++) {
                    arrUsers = arrUsers + "'" + result.rows[i].trackeruser + "', ";
                }

                arrUsers = arrUsers.substring(0, arrUsers.length - 2);

                console.log(arrUsers);

                query = "select uid, email, firstname from users where uid in ("+ arrUsers +");";
                params = [];

                client.execute(query, params,{ prepare: true}, function(err, result1) {
                    if (err) {
                        res.statusCode = 500;
                        res.send(errorMsg(err, 500));
                        auditlogRes(req, 500, err);
                    } 
                    else {
                        var objarr = [];
                        for (var i=0;i<result1.rows.length;i++) {
                            var item = result1.rows[i];
                            for (var j=0;j<result.rows.length;j++) {
                                var item1 = result.rows[j];
                                if (item1.trackeruser == item.uid) {
                                    item.pendingapproval = item1.pendingaprroval;
                                    objarr.push(item);
                                    break;
                                }
                            }
                        }
                        console.log(objarr);
                        var obj = {};
                        obj.friends = objarr;
                        res.statusCode = 200;
                        res.send(obj);
                        auditlogRes(req, 200, successMessage("Successful getting of track user", 200));
                    }
                });
            } else {
                res.statusCode = 404;
                res.send(errorMsg("No users found", 404));
                auditlogRes(req, 404, errorMsg("No users found", 404));
            }
        }
    });
}

function getTackFriendsLocation(req, res) {
    var query = '';
    var params = [];

    query = 'select trackeruser from trackmapuser where uid = ?;';

    params = [req.params.uid];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            if (result.rows.length > 0) {
                var arrUsers = "";
                for (var i=0;i<result.rows.length;i++) {
                    arrUsers = arrUsers + "'" + result.rows[i].trackeruser + "', ";
                }

                arrUsers = arrUsers.substring(0, arrUsers.length - 2);

                console.log(arrUsers);

                query = "select uid, email, firstname from users where uid in ("+ arrUsers +");";
                params = [];

                client.execute(query, params,{ prepare: true}, function(err, result) {
                    if (err) {
                        console.log('accept error' + err);
                        res.statusCode = 500;
                        res.send(errorMsg(err, 500));
                        auditlogRes(req, 500, err);
                    } 
                    else {
                        console.log(result.rows);
                        var obj = {};
                        obj.friends = result.rows;
                        res.statusCode = 200;
                        res.send(obj);
                        auditlogRes(req, 200, successMessage("Successful getting of track user location", 200));
                    }
                });
            } else {
                res.statusCode = 404;
                res.send(errorMsg("No users found", 404));
                auditlogRes(req, 404, errorMsg("No users found", 404));
            }
        }
    });
}

function updateUserLocation(req, res) {
    var query = '';
    var params = [];

    query = 'insert into usercurrentLocation(uid, data, createdTime) values(?, textAsBlob(?), ?);';

    params = [req.params.uid, JSON.stringify(req.body), req.body.createdTime];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            console.log('accept error' + err);
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            res.statusCode = 200;
            res.send(successMessage("Success Update of user location", 200));
            auditlogRes(req, 200, successMessage("Successful update of track user location", 200));
        }
    });
}

function getUserLocation(req, res) {
    var query = '';
    var params = [];

    query = 'select uid, blobAsText(data) as data, createdTime from usercurrentLocation where uid=?';

    params = [req.params.uid];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            if (result.rows.length > 0) {
                var obj = {};
                obj.uid = req.params.uid;
                obj.data = JSON.parse(result.rows[0].data);
                obj.createdTime = result.rows[0].createdTime;
                res.statusCode = 200;
                res.send(obj);
                auditlogRes(req, 200, successMessage("Success getting of user location", 200));
            } else {
                res.statusCode = 404;
                res.send(errorMsg("No users found", 404));
                auditlogRes(req, 404, errorMsg("No users found", 404));
            }
        }
    });
}

function sendEmailLastNyte(to, code) {
    var msg = 'Please enter the code to verify account : ' + code;
    var mailOptions = {
        from: 'neppoliyant@gmail.com', // sender address
        to: to, // list of receivers
        subject: 'Verification for whereabouts', // Subject line
        text: msg, // plaintext body
        html: '<b>Welcome to WhereAbouts</b> </br> </br><b> ' + msg + '</b>' // html body
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
            return;
        }
    });
}

function updateTrackerTimer(req, res) {
    var query = '';
    var params = [];

    query = 'update users set tracktime = ? where uid = ? and email = ?;';

    params = [req.body.tracktime, req.body.uid, req.body.email];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            res.statusCode = 200;
            res.send(successMessage("Success update of track time", 200));
            auditlogRes(req, 200, successMessage("Success getting of user location", 200));
        }
    });
}

function notifyUser() {
    var query = '';
    var params = [];

    query = 'select * from ';

    params = [req.body.tracktime, req.body.uid, req.body.email];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            res.statusCode = 200;
            res.send(successMessage("Success update of track time", 200));
            auditlogRes(req, 200, successMessage("Success getting of user location", 200));
        }
    });
}

function sendMessage(req, res) {
    var query = '';
    var params = [];

    query = 'select devicetoken from usersdevicedetails where uid = ?';

    params = [req.body.touid];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            if (result.rows.length > 0) {
                var deviceid = result.rows[0].devicetoken;

                query = 'insert into lastnyte.messages(fromuid, touid, createdtime, msg, read) values(?,?,?,?,?);';

                params = [req.body.fromuid, req.body.touid, req.body.createdtime, req.body.msg, "false"];

                client.execute(query, params,{ prepare: true}, function(err, result) {
                    if (err) {
                        res.statusCode = 500;
                        res.send(errorMsg(err, 500));
                        auditlogRes(req, 500, err);
                    } else {
                        var message = {};
                        message.toDeviceId = deviceid;
                        message.message = req.body.name + ": " + req.body.msg;
                        message.from = req.body.name;
                        message.fromuuid = req.body.fromuid;
                        message.touuid = req.body.touid;
                        message.topic = "Message";                                                                                   

                        rn.sendInviteNotification(message, function(err, response){
                            if (err) {
                                res.statusCode = 500;
                                res.send(errorMsg(err, 500));
                                auditlogRes(req, 500, err);
                            } else {
                                res.statusCode = 200;
                                res.send(successMessage("Success Addition of Message", 200));
                                auditlogRes(req, 200, successMessage("Success Addition of Message", 200));
                            }
                        });
                    }
                });
            } else {
                res.statusCode = 404;
                res.send(errorMsg("User not part of lastnyte app", 404));
                auditlogRes(req, 404, "User not part of lastnyte app");
            }
        }
    });
}

function messageRead(req, res) {
    var query = '';
    var params = [];

    query = 'update lastnyte.messages set read = ? where fromuid = ? and touid = ? and createdtime = ?';

    params = ["true", req.body.fromuid, req.body.touid, req.body.createdtime];

    client.execute(query, params,{ prepare: true}, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send(errorMsg(err, 500));
            auditlogRes(req, 500, err);
        } else {
            res.statusCode = 200;
            res.send(successMessage("Success Update of Message", 200));
            auditlogRes(req, 200, successMessage("Success Update of Message", 200));
        }
    });
}

module.exports.updateTrackerTimer = updateTrackerTimer;
module.exports.DeleteTrackFriends = DeleteTrackFriends;
module.exports.deleteUser = deleteUser;
module.exports.verificationUser = verificationUser;
module.exports.sendEmailLastNyte = sendEmailLastNyte;
module.exports.getUserLocation = getUserLocation;
module.exports.updateUserLocation = updateUserLocation;
module.exports.getTackFriends = getTackFriends;
module.exports.AcceptFriends = AcceptFriends;
module.exports.inviteFriends = inviteFriends;
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
module.exports.sendMessage = sendMessage;
module.exports.messageRead = messageRead;

