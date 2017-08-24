
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
var fileManagement=require('../config/fileManagement');

var Client = require('node-rest-client').Client;
var client = new Client();


//var yodlee = require('yodlee');



router.get('/',function(req,res,next){



    /*yodlee.use({
        username: 'sbCobashishphp2017',
        password: '5f5ce325-eae1-43cc-97c9-ab663c0fd9f2',
        sandbox: true
    });




    yodlee.getAccessToken({
        username: 'sbMemashishphp20171',
        password: 'sbMemashishphp20171#123'
    })
    .then(function(accessToken) {

        accessToken = accessToken;

        yodlee.getAccounts(accessToken)
            .then(function(response) { 
                
                console.log(response);
                console.log("------------------------------------");

                accessToken = accessToken;

                yodlee.getTransactions(accessToken, {
                    containerType: 'All',
                    higherFetchLimit: 500,
                    lowerFetchLimit: 1,
                    resultRangeEndNumber: 60,
                    resultRangeStartNumber: 1,
                    searchFilterCurrencyCode: 'GBP',
                    ignoreUserInput: true
                })
                .then(function(response) {
                    console.log(response);
                })
                .catch(function(error) {});





            })
            .catch(function(error) {});
    })
    .catch(function(error) {});*/







    res.render('index');
});

router.get('/comp-detail',function(req,res,next){
    res.render('supplier/comp-detail');
});

router.get('/owner-detail',function(req,res,next){
    res.render('supplier/owner-detail');
});

router.get('/document-detail',function(req,res,next){
    res.render('supplier/document-detail');
});

router.get('/download-file',function(req,res,next){    
    if (req.query.type){
        name="#"+req.query.name;
        console.log(name);
        fileManagement.existFile(name,function(f){
            if (!f||f==null){
            res.send('file does not exist');
            }else {
                fileManagement.readFile(req,res,name);
            }
            
        });
        
    }else {
        console.log(req.query.name);
        fileManagement.existFile(req.query.name,function(f){
            if (!f||f==null){
            res.send('file does not exist');
            }else {
                fileManagement.readFile(req,res,req.query.name);
            }
            
        });
    }
    
});









module.exports=router;
