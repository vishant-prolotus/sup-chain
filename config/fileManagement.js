//var busboyBodyParser=require('busboy-body-parser');
var express = require('express');
var bodyParser = require('body-parser');
var mongo = require('mongodb').MongoClient;
var mongoose = require('mongoose');
var assert= require('assert');
var url=require('../config/database').url;
var POfiles=require('../config/POfiles').collection;
var router=express.Router();

mongoose.createConnection(url);

var conn = mongoose.connection;
var fs = require('fs');

var Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;
var gfs;
conn.once('open', function () {
    console.log('open');
    gfs = Grid(conn.db);
});

module.exports={

    writeFile:function(file,hash) {

        //console.log(req.files);
        var f=file;
        console.log('po Number-');
        //console.log(req.body.poNumber);        
        //console.log('type-');
        //console.log(f.mimetype);
 
        // streaming to gridfs
        //filename to store in mongodb
        var writestream = gfs.createWriteStream({
            _id: hash,
            filename: f.name,
            mode:'w',
            content_type:f.mimetype
        });
        //fs.createReadStream('./something.txt').pipe(writestream);
 
        writestream.on('close', function (file) {
            // do something with `file`
            console.log(file.filename + 'Written To DB');
            console.log(file);
            
        });
        writestream.write(f.data);
        writestream.end();

    },
    readFile:function(req,res,filename) {
        //console.log(req.body.filename);
    //write content to file system
        //var fName=req.body.filename+'.pdf';
        var fName=''+filename;
        gfs = Grid(conn.db);
        console.log(__dirname+'/../tmp/'+fName);
        //var fs_write_stream = fs.createWriteStream(__dirname+'/../tmp/'+fName);
        
        //read from mongodb
        var readstream = gfs.createReadStream({
            _id: fName,
            mode:'r'
        });
        
        readstream.pipe(res);
        /*fs_write_stream.on('close', function () {
            console.log('read succesfully');
            res.sendFile(fName , { root : __dirname+'/../tmp/'},function(){
                fs.unlink(__dirname+'/../tmp/'+fName);
            });
            
            //res.send('reading worked');
        });*/

    },

    removeFile:function(id){
        var _id=''+id;
        gfs.remove({_id:_id}, function (err) {
            
            console.log('success deletion');
        });
    },

    existFile:function(id,callBack){
        var ID=""+id;
        mongo.connect(url,function(err,db){
            db.collection('fs.files').findOne({_id:ID},function(err,f){
                if (err!= null) {
                    console.log(err);
                }

                console.log("=====",f);
                callBack(f);
            });
        });
       
            
    }
    
};