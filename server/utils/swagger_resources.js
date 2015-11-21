var sw = require("swagger-node-express");
var paramTypes = sw.params;
var url = require("url");
var swe = sw.errors;

// the description will be picked up in the resource listing
exports.getUser = {
    'spec' : {
        description : "User Services for Mobile Clients",
        path : "/user/{id}",
        method : "GET",
        summary : "Get details for the user",
        notes : "Returns the details for the User",
        nickname : "getUser",
        produces : [ "application/json" ],
        parameters : [
                paramTypes.path("id", "UserID of the User", "string") ],
        responseMessages : [
                //swe("200", "Success"),
                //swe("500", "Internal Server Error")
                 ]
    }
};

exports.putUser = {
    'spec' : {
        description : "Updates User details",
        path : "/user/{id}",
        method : "PUT",
        summary : "Updates User details",
        notes : "Updates User details",
        nickname : "updateUser",
        produces : [ "application/json" ],
        parameters : [
            paramTypes.path("id",
                                "UserID of the User. \n Sample: neps",
                                "string"),
            paramTypes.body("body", "Sample: { "
                    + "\"name\": \"Neppoliyan\","
                    + "\"gender\": \"Male\", " + "\"height\": \"5.9\","
                    + "\"occupation\": \"full stack engineer\", " + "\"subscriptions\": ["
                    + "\"backend webservices\","
                    + "\"frontend angular, bootstap\"],"
                    + "\"description\": \"Good at coding and analysis\"" + "}", "User") ],
        responseMessages : [
        ]
    }
};

exports.postUser = {
    'spec' : {
        description : "Creates User details",
        path : "/user/{id}",
        method : "POST",
        summary : "Creates User details",
        notes : "Creates User details",
        nickname : "CreatesUser",
        produces : [ "application/json" ],
        parameters : [
            paramTypes.path("id",
                                "UserID of the User. \n Sample: neps",
                                "string"),
            paramTypes.body("body", "Sample: { "
                    + "\"name\": \"Neppoliyan\","
                    + "\"gender\": \"Male\", " + "\"height\": \"5.9\","
                    + "\"occupation\": \"full stack engineer\", " + "\"subscriptions\": ["
                    + "\"backend webservices\","
                    + "\"frontend angular, bootstap\"],"
                    + "\"description\": \"Good at coding and analysis\"" + "}", "User") ],
        responseMessages : [
        ]
    }
};

exports.deleteUser = {
    'spec' : {
        description : "User Services for Mobile Clients",
        path : "/user/{id}",
        method : "DELETE",
        summary : "delete user",
        notes : "delete user",
        nickname : "deleteUser",
        produces : [ "application/json" ],
        parameters : [
                paramTypes.path("id", "UserID of the User", "string")
                ],
        responseMessages : [
                 ]
    }
};

exports.getTracker = {
    'spec' : {
        description : "Get the track details for a user",
        path : "/tracker/{id}",
        method : "GET",
        summary : "Get the track details for a user",
        notes : "Returns the location details for a User",
        nickname : "getTacker",
        produces : [ "application/json" ],
        parameters : [
                paramTypes.path("id", "UserID of the User", "string") ],
        responseMessages : [
                //swe("200", "Success"),
                //swe("500", "Internal Server Error")
                 ]
    }
};

exports.putTracker = {
    'spec' : {
        description : "Updates location details for a user",
        path : "/tracker/{id}",
        method : "PUT",
        summary : "Updates location details for a user",
        notes : "Updates location details for a user",
        nickname : "updateTracker",
        produces : [ "application/json" ],
        parameters : [
            paramTypes.path("id",
                                "UserID of the User. \n Sample: neps",
                                "string"),
            paramTypes.body("body", "Sample: { "
                    + "\"name\": \"Neppoliyan\","
                    + "\"gender\": \"Male\", " + "\"height\": \"5.9\","
                    + "\"occupation\": \"full stack engineer\", " + "\"subscriptions\": ["
                    + "\"backend webservices\","
                    + "\"frontend angular, bootstap\"],"
                    + "\"description\": \"Good at coding and analysis\"" + "}", "User") ],
        responseMessages : [
        ]
    }
};