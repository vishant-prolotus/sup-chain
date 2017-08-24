var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var url=require('./database').url;

mongoose.createConnection(url);
var schema=new mongoose.Schema({
    id:String,
    CompanyName:String,
    IndustryType:String,
    BusinessType:String,
    CIN:String,
    Email:String,
    Mobile:String,
    Landline:Number,
    Company_Desc:String,
    registeredAddress:{
        address:String,
        City:String,
        State:String,
        PIN:Number
    },
    correspondenceAddress:{
        address:String,
        City:String,
        State:String,
        PIN:Number
    },
    owners:[{
        din:String,
        aadhar:String,
        name:String,
        mobile:Number,
        email:String,
        dpan:String,
        cibil:String,
        landline:Number,
        employeeDocs:[{
            id:String,
            docName:String,
            fileName:String
        }],
    }],
    companyDocs:[{
            id:String,
            docName:String,
            fileName:String
        }],
    state:Number
});

var collection=mongoose.model('companycollection',schema);
 module.exports=collection;