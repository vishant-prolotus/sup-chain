var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var url=require('./database').url;

mongoose.createConnection(url);
var schema=new mongoose.Schema({
    transactionId:String,
    datetime:String,
    transaction:String,
    id:String
});

var collection=mongoose.model('blockchainlogs',schema);
 module.exports=collection;