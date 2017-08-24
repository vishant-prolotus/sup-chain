
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var assert= require('assert');
var url=require('../config/database').url;
var cookieParser=require('cookie-parser');
var chaincodeCalls=require('../chaincodeCalls/chaincodecalls');
var app = express();
var router=express.Router();
var userCollection=require('../config/collection').collection;


var Client = require('node-rest-client').Client;
var client = new Client();


router.get('/',function(req,res,next){
    res.render('login');
});


router.post('/',function(req,res,next){    
    console.log(req.body.name+' '+req.body.password);
    res.clearCookie('name');
    res.clearCookie('password');
    res.clearCookie('role');
    res.clearCookie('userId');
    userCollection.find({email:req.body.name}).toArray(function(err,result){
        if (result.length==0) {
            console.log('wrong credentials');
            res.redirect('/');
        }

        for (var i=0;i<result.length;i++){

            if (result[i].password===req.body.password){
                console.log(result[i]);
                res.cookie('name',result[i].name);
                res.cookie('password',result[i].password);
                res.cookie('role',result[i].role);
                res.cookie('userId',result[i].userId);
                res.cookie('employee',result[i].employeeName);
                res.cookie('email',result[i].email);
                console.log(result[i].role);
                if (result[i].role=='buyer'){
                    res.redirect('/buyer');
                } else if(result[i].role=='supplier'){
                    res.redirect('/supplier');
                } else if(result[i].role=='bank'){
                    res.redirect('/bank');
                } else if(result[i].role=='admin'){
                    res.redirect('/admin');
                }

            }else {
                console.log('wrong credentials');
                res.redirect('/');
            }  
        }
    });
    
});

module.exports=router;
