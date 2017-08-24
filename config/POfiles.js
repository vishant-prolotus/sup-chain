var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var url=require('./database').url;

mongoose.createConnection(url);
var schema=new mongoose.Schema({
    id:String,
    name:String,
    buyer:String
});

var collection=mongoose.model('POfiles',schema);
 module.exports=collection;