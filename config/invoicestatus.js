var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var url=require('./database').url;

mongoose.createConnection(url);
var schema=new mongoose.Schema({
    invID:String,
    buyerID:String,
    supplierID:String,
    invoiceAmt:Number,
    discountRate:Number,
    discountAmt:Number,
    disburseAmount:Number,
    invStatus:String
});

var collection=mongoose.model('InvoiceStatus',schema);
 module.exports=collection;