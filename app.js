var express = require('express');
var bodyParser = require('body-parser');
var mongo = require('mongodb').MongoClient;
var mongoose = require('mongoose');
var assert= require('assert');
var url=require('./config/database').url;
var cookieParser=require('cookie-parser');
var app = express();
var urlencodedParser=bodyParser.urlencoded({ extended: false });
mongoose.Promise = require('bluebird');
var cookieParser=require('cookie-parser');
var ChaincodeInfo=require('./models/chaincodeinfo');
var configData=require('./models/configData');
var chaincodedata=require('./config/chaincodedata').collection;
var crypto=require('crypto');
var chaincodeCalls=require('./chaincodeCalls/chaincodecalls');
var admin=require('./routes/admin');
var index=require('./routes/index');
var login=require('./routes/login');
var buyer=require('./routes/buyer');
var supplier=require('./routes/supplier');
var bank=require('./routes/bank');
var Client = require('node-rest-client').Client;
var schedule = require('node-schedule');
var client = new Client();
//const busboyBodyParser=require('busboy-body-parser');
const fileUpload = require('express-fileupload');
app.use(fileUpload());
app.set('view engine', 'ejs');
app.use(express.static("public"));
//pp.use(busboyBodyParser({ multi: true }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

var userCollection=require('./config/collection').collection;
var fileManagement=require('./config/fileManagement');
//
var notifications=require('./config/notifications').collection;
var invoiceStatus=require('./config/invoicestatus').collection;


/*
mongoose.createConnection(url);

var conn = mongoose.connection;
var fs = require('fs');

var Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;
var gfs;
conn.once('open', function () {
    console.log('open');
    gfs = Grid(conn.db);
 
    // streaming to gridfs
    //filename to store in mongodb
    var writestream = gfs.createWriteStream({
        filename: 'mongo_file.txt'
    });
    fs.createReadStream('./something.txt').pipe(writestream);
 
    writestream.on('close', function (file) {
        // do something with `file`
        console.log(file.filename + 'Written To DB');
    });
});

app.get('/readfile',function(req,res){
    //write content to file system
     gfs = Grid(conn.db);
var fs_write_stream = fs.createWriteStream('write.txt');
 
//read from mongodb
var readstream = gfs.createReadStream({
     filename: 'mongo_file.txt'
});
readstream.pipe(fs_write_stream);
fs_write_stream.on('close', function () {
     console.log('file has been written fully!');
     res.send('working');
});
});*/

app.post('/writeFile',function(req,res){
    console.log(req.files);
    fileManagement.writeFile(req,res);
});
app.post('/readFile',function(req,res){
    //fileManagement.readFile(req,res, "DevRules_For_Git.pdf");
    res.send('');
});


app.use('/admin',admin);
app.use('/',index);
app.use('/login',login);
app.use('/buyer',buyer);
app.use('/supplier',supplier);
app.use('/bank',bank);

chaincodeCalls.initInfoRegister();
    
app.get('/testcookies',function(req,res){
    res.json(req.cookies);
});
app.get('/check',function(req,res ){
    chaincodeCalls.getTransactionData(req,res,function(data) {
        res.json(data);
    });
});

app.get('/getBlockchainData',function(req,res){
    chaincodeCalls.getBlockchainData(req,res,function(data){
        console.log(data.height);
        chaincodeCalls.getBlockData(req,res,data.height-1,function(blockData){
            console.log(blockData);


            res.send(blockData);
        });
    });
});

app.get('/removeNotifications',function(req,res){
    notifications.findOneAndUpdate({userId:req.cookies.userId},{$set:{count:0}});
    res.send("1");
});

app.get('/testExistance',function(req,res){
    var id=req.query.id;
    console.log(id);
    fileManagement.existFile(id,function(f){
        if (!f||f==null){
            res.send('file does not exist');
        }else {
            res.send(f);
        }
    });
    
});

// var d = new Date(Date.now()+65000);
// console.log(d);
// var j = schedule.scheduleJob(d, function(){
//   console.log('The world is going to end today.');
//   console.log('000000000000000000000000000000000000000000000000000000000000000000000000000000000000');
// });

// let startTime = new Date(Date.now() + 70000);
// let endTime = new Date(startTime.getTime() + 70000);
// var j = schedule.scheduleJob({ start: startTime, end: endTime, rule: '*/1 * * * * *' }, function(){
//   console.log('Time for tea!');
// });

app.listen(3204);
