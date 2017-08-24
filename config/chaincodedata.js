var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var url=require('./database').url;
var chaincodeInfo=require('../models/chaincodeinfo');
mongoose.createConnection(url);
var schema=new mongoose.Schema({
        buyerPeer:String,
        supplierPeer:String,
        bankerPeer:String,
        buyerEnrollId:String,
        buyerSecret:String,
        supplierEnrollId:String,
        supplierSecret:String,    
        bankerEnrollId:String,
        bankerSecret:String,
        webAppAdmin:String,
        weAppSecret:String,
        chaincodeId:String
});
//var collection=mongoose.model('chaincodeInfo');

var collection=mongoose.model('chaincodeinfo',schema);
 module.exports=collection;