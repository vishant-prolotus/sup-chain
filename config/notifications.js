var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var url=require('./database').url;

mongoose.createConnection(url);
var schema=new mongoose.Schema({
    userId:String,
    notifications: { type : Array , "default" : [] },
    count:Number 
});

var collection=mongoose.model('Notifications',schema);
 module.exports=collection;