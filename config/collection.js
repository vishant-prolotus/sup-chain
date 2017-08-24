var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var url=require('./database').url;

mongoose.createConnection(url);
var schema=new mongoose.Schema({
    name:String,
    email:String,
    userId:String,
    password:String,
    role:String,
    status:String,
    employeeName:String,
    phoneNumber:String,
    state:String,
    type:String
});

var collection=mongoose.model('userCollections',schema);
 module.exports=collection;