var ChaincodeInfo=require('../models/chaincodeinfo');
var Client = require('node-rest-client').Client;
var client = new Client();
var url=require('../config/database').url;
var crypto=require('crypto');
var mongoose=require('mongoose');
var userCollection=require('../config/collection').collection;
var chaincodedata=require('../config/chaincodedata').collection;
var blockchainlogs=require('../config/blockchainlogs').collection;
var fileManagement=require('../config/fileManagement');
var notifications=require('../config/notifications').collection;
var companyCollection=require('../config/companyDetailsCollection').collection;
var date = require('date-and-time');
var configData=require('../models/configData');
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');
var schedule = require('node-schedule');
module.exports={

    
    initInfoRegister: function (){
        console.log('Starting application.')
        chaincodedata.remove({},function(err,result){
            chaincodedata.insertOne(ChaincodeInfo,function(err,docs){
                chaincodedata.findOne({},function(err,result){
                initAdminandChain(result);
                initBuyer(result);
                initSupplier(result);
                initBanker(result);
                console.log(result);
                });
            });
        });


},

    initBuyer:function(req,res,func){
        chaincodedata.findOne({},function(err,doc){

            var hash=crypto.createHash('md5').update(req.body.name+req.body.password).digest('hex');

            console.log('buyer init called');
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "initBuyer",
                        args: [hash,req.body.name,req.body.email,"employee_name"]
                        },
                        secureContext: doc.buyerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            console.log(hash);
            client.post(doc.buyerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result&&data.result.status){
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.insertOne({userId:hash,notifications:[],count:0});
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'initialized buyer',id:req.body.name},function(err,log){
                    });
                    func(data);
                    //userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'buyer',status:req.body.status},function(err){
                      //  res.redirect('/admin/manage-buyer');
                    //});
                }}else{res.redirect('/');}
            });

        });

    },
        
    initSupplier:function(req,res,func){
        chaincodedata.findOne({},function(err,doc){

            var hash=crypto.createHash('md5').update(req.body.name+req.body.password).digest('hex');
            console.log('supplier init called');

            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "initSupplier",
                        args: [hash,req.body.name,req.body.employee,req.body.email]
                        },
                        secureContext: doc.supplierEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            console.log("supplier-"+hash);
            client.post(doc.supplierPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result&&data.result.status){
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.insertOne({userId:hash,notifications:[],count:0});
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'initializeed supplier account',id:req.body.name},function(err,log){});
                    func(data);
                    /*userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'supplier',status:req.body.status},function(err){
                        res.redirect('/admin/manage-supplier');
                    });*/
                }}else{res.redirect('/');}
            });

        });

    },

    readAllSuppliers: function(req,res,func) {
        chaincodedata.findOne({},function(err,result){
            var args = {
                data: {

                    jsonrpc: "2.0",
                    method: "query",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: result.chaincodeId
                        },
                        ctorMsg: {
                        function: "readAllSuppliers",
                        args: [
                       
                        ]
                        },
                        secureContext: result.webAppAdmin
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            };

            var peerUrl=result.buyerPeer;
            client.post(peerUrl+'/chaincode', args, function (data, response) {
                console.log('reading all suppliers-');
                console.log(data);
                var suppliers=[];
                if (data.result&&data.result.message){
                func(data);
                }else{res.redirect('back');}
                //return new Promise(function(resolve,reject){
                  //  resolve(data);
                //});
                
                //suppliers = JSON.parse(data.result.message);

                //res.render('buyer-po', {data: suppliers});
            });

        });

    },

    readAccount: function(req,res,func) {
        console.log(req.cookies.name);
        chaincodedata.findOne({},function(err,doc){
            userCollection.find({email:req.cookies.email}).toArray(function(err,result){
                console.log(result+' '+req.body.name);
                for (var i=0;i<result.length;i++){
                    if (req.cookies.password==result[i].password){
                        
                        
                        var args = {
                data: {

                    jsonrpc: "2.0",
                    method: "query",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "read",
                        args: [
                            result[i].userId
                        ]
                        },
                        secureContext: doc.webAppAdmin
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            };

            var peerUrl=doc.buyerPeer;
            console.log(doc.chaincodeId+' '+doc.webAppAdmin+' '+doc.buyerPeer+' '+result[i].userId);
            client.post(peerUrl+'/chaincode', args, function (data, response) {
                
                console.log(data);
                if (data.result&&data.result.message){
                func(data);
                }else{res.redirect('back');}
                /*if (type=='supplier'){
                    console.log('getting supplier');
                    res.send(data);
                } else if (type=='buyer') {
                    console.log('getting buyer');
                    res.render('buyer');
                    //res.send(data);
                }*/
                
            });
 

                   }
                }
            });
        });
        
    },
    readAccountByAdmin: function(key,func) {
       
        chaincodedata.findOne({},function(err,doc){
            
                        
                        
                        var args = {
                data: {

                    jsonrpc: "2.0",
                    method: "query",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "read",
                        args: [
                            key
                        ]
                        },
                        secureContext: doc.webAppAdmin
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            };

            var peerUrl=doc.buyerPeer;
            console.log(doc.chaincodeId+' '+doc.webAppAdmin+' '+doc.buyerPeer+' ');
            client.post(peerUrl+'/chaincode', args, function (data, response) {
                
                console.log(data);
                if (data.result&&data.result.message){
                func(data);
                }else{res.redirect('back');}
                /*if (type=='supplier'){
                    console.log('getting supplier');
                    res.send(data);
                } else if (type=='buyer') {
                    console.log('getting buyer');
                    res.render('buyer');
                    //res.send(data);
                }*/
                
            });
 

                   
                
            
        });
        
    },
    createPO: function(req,res,buyerInfo) {
        console.log('po file-');
        console.log(req.files);
        //fileManagement.writeFile(req,res);
        /*var form = new formidable.IncomingForm();
        form.uploadDir = path.join(__dirname, '/uploads');
        form.on('file', function(field, file) {
            console.log('files-');
            console.log(file);
            fs.rename(file.path, path.join(form.uploadDir, file.name));
        });*/
        console.log('show this--');
        console.log(req.body);
        var poNumber = "#" + req.body.poNumber;
        fileManagement.writeFile(req.files.file,poNumber);
        console.log(poNumber);
        var hash=crypto.createHash('md5').update(Date.now()+req.cookies.userId).digest('hex');
        chaincodedata.findOne({},function(err,doc){
            var arguments=[];
            console.log('here logging');
            prodName=req.body["productName[]"];
            console.log(prodName);
            prodQty=req.body["productQty[]"];
            console.log(prodQty);
            prodPrice=req.body["productPrice[]"];
            console.log(prodPrice);
            console.log(prodName[0]);
            if (req.body["productName[]"].constructor === Array){
            totLength=req.body["productName[]"].length;
            }else {totLength=1;}
            arguments.push(poNumber);
            arguments.push(''+totLength+'');
            if (req.body["productName[]"].constructor === Array){
            for (var i=0;i<totLength;i++) {

                prodValue = (prodQty[i] * prodPrice[i]);

                var arg={
                    "productName":prodName[i],
                    "quantity":prodQty[i],
                    "rate":prodPrice[i],
                    "value":prodValue
                }
                //arguments.push("{\"productName\":\"tyres\",\"quantity\":56,\"rate\":1200,\"value\":120000}");
                arguments.push('{\"productName\":\"'+prodName[i]+'\",\"quantity\":'+prodQty[i]+',\"rate\":'+prodPrice[i]+',\"value\":'+prodValue+'}');
            }
        }else {
            prodValue = (prodQty * prodPrice);
            arguments.push('{\"productName\":\"'+prodName+'\",\"quantity\":'+prodQty+',\"rate\":'+prodPrice+',\"value\":'+prodValue+'}');
        }
            arguments.push(req.body.supplier);
            arguments.push(req.body.creditDays);
            arguments.push(req.cookies.userId);
            console.log('arguments-');
            console.log(arguments);
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "createPO",
                        args: arguments
                        },
                        secureContext: doc.buyerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);

            client.post(doc.buyerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.findOne({userId:req.body.supplier},function(err,notifi){
                        notifications.findOneAndUpdate({userId:req.body.supplier},{$push:{notifications:'You have recieved a new PO.'},$set:{count:notifi.count+1}});
                    });
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'PO creation',id:poNumber},function(err,log){});
                    setTimeout(function(){
                        res.redirect('/buyer/manage-po');
                    },configData.invoiceStatusTimeout);
                    
                    //res.send(data);
                }
            });


        });
    },

    createInvoice: function(req,res){


        var hash=crypto.createHash('md5').update(Date.now()+req.cookies.password).digest('hex');
        chaincodedata.findOne({},function(err,doc){
            var arguments=[];
            arguments.push(req.body.invoiceNumber);
            arguments.push(req.body.purchaseId);
            //arguments.push(req.body.number);

            prodName=req.body["productName[]"];
            prodQty=req.body["productQty[]"];
            prodPrice=req.body["productPrice[]"];
            tax=configData.tax;
            //tax=req.body["txtTax"];
            console.log(prodName[0]);
            //writing file
            fileManagement.writeFile(req.files.file,req.body.invoiceNumber);
            if (req.body["productName[]"].constructor === Array){
            totLength=req.body["productName[]"].length;
            arguments.push(''+totLength+'');
            for (var i=0;i<totLength;i++) {

                prodValue = (prodQty[i] * prodPrice[i]);

                var arg={
                    "productName":prodName[i],
                    "quantity":prodQty[i],
                    "rate":prodPrice[i],
                    "value":prodValue
                }
                //arguments.push("{\"productName\":\"tyres\",\"quantity\":56,\"rate\":1200,\"value\":120000}");
                arguments.push('{\"productName\":\"'+prodName[i]+'\",\"quantity\":'+prodQty[i]+',\"rate\":'+prodPrice[i]+',\"value\":'+prodValue+'}');
            }
            }else {
                totLength=1;
                arguments.push(''+totLength+'');
                prodValue = (prodQty * prodPrice);
                arguments.push('{\"productName\":\"'+prodName+'\",\"quantity\":'+prodQty+',\"rate\":'+prodPrice+',\"value\":'+prodValue+'}');
            }


            //for (var i=0;i<req.body.number;i++) {
            //    arguments.push('{"productName":"tyres","quantity":56,"rate":1200,"value":120000}');
            //}
            arguments.push(req.cookies.userId);
            arguments.push(req.body.creditDays);
            arguments.push(req.body.buyerId);
            arguments.push(''+tax+'');
            console.log('arguments-');
            console.log(arguments);
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "generateInvoice",
                        args: arguments
                        },
                        secureContext: doc.supplierEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);

            client.post(doc.supplierPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.findOne({userId:req.body.buyerId},function(err,notifi){
                        notifications.findOneAndUpdate({userId:req.body.buyerId},{$push:{notifications:'You have recieved a new Inovoice.'},$set:{count:notifi.count+1}});
                    });
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'invoice creation',id:req.body.invoiceNumber},function(err,log){});
                    updatePOstatus(req,res,function(){
                        res.redirect('/supplier/manage-invoice');
                    });
                    
                }
            });


        });

    },

    updateInvoiceStatusbyPost: function(req,res,status,fun) {
         chaincodedata.findOne({},function(err,doc){
            console.log('args-');
            console.log(req.cookies.userId);
            console.log(status);
            var invoiceId=''+req.body.invID;
            console.log(invoiceId);
            var arg=[];
            arg.push(req.cookies.userId);
            //arg.push("#IN2017SAN0001");
            //arg.push("something")
            arg.push(""+invoiceId+"");
            arg.push(""+status+"");
            console.log(arg);
            //['"'+req.cookies.userId+'"','"'+invoiceId+'"','"'+status+'"']
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "updateInvoiceStatus",
                        args: arg
                        },
                        secureContext: doc.buyerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            client.post(doc.buyerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    var s="Your Invoice has been "+status;
                    notifications.findOne({userId:req.body.supplierId},function(err,notifi){
                        notifications.findOneAndUpdate({userId:req.query.supplier},{$push:{notifications:s},$set:{count:notifi.count+1}});
                    });
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'updating invoice status',id:invoiceId},function(err,log){});
                    setTimeout(function(){
                        fun(data);
                    },configData.invoiceStatusTimeout);
                    //res.send(data);
                }else {res.redirect('/buyer/manage-invoice');}
            });

        });
    },


    updateInvoiceStatus: function(req,res,status,fun) {
         chaincodedata.findOne({},function(err,doc){
            console.log('args-');
            console.log(req.cookies.userId);
            console.log(status);
            var invoiceId=''+req.query.invoiceId;
            console.log(invoiceId);
            var arg=[];
            arg.push(req.cookies.userId);
            //arg.push("#IN2017SAN0001");
            //arg.push("something")
            arg.push(""+invoiceId+"");
            arg.push(""+status+"");
            console.log(arg);
            //['"'+req.cookies.userId+'"','"'+invoiceId+'"','"'+status+'"']
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "updateInvoiceStatus",
                        args: arg
                        },
                        secureContext: doc.buyerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            client.post(doc.buyerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    var s="Your Invoice has been "+status;
                    notifications.findOne({userId:req.query.supplier},function(err,notifi){
                        notifications.findOneAndUpdate({userId:req.query.supplier},{$push:{notifications:s},$set:{count:notifi.count+1}});
                    });
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'updating invoice status',id:invoiceId},function(err,log){});
                    setTimeout(function(){
                        fun(data);
                    },configData.invoiceStatusTimeout);
                    //res.send(data);
                }else {res.redirect('/buyer/manage-invoice');}
            });

        });
    },
    markPayment: function(req,res,fun) {
         chaincodedata.findOne({},function(err,doc){
            console.log('args-');
            console.log(req.cookies.userId);
            var invoiceId=''+req.query.invoiceId;
            console.log(invoiceId);
            var arg=[];
            arg.push(req.cookies.userId);
           
            arg.push(""+invoiceId+"");
            console.log(arg);
            //['"'+req.cookies.userId+'"','"'+invoiceId+'"','"'+status+'"']
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "markRepayment",
                        args: arg
                        },
                        secureContext: doc.supplierEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            client.post(doc.supplierPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    var s="Your Invoice Payment is completed ";
                    notifications.findOne({userId:req.query.supplier},function(err,notifi){
                        notifications.findOneAndUpdate({userId:req.query.supplier},{$push:{notifications:s},$set:{count:notifi.count+1}});
                    });
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'marking repayment',id:invoiceId},function(err,log){});
                    setTimeout(function(){
                        fun(data);
                    },configData.invoiceStatusTimeout);
                    //res.send(data);
                }else {res.redirect('/bank/manage-invoice');}
            });

        });
    },

    getBlockchainData:function(req,res,func){ 
          chaincodedata.findOne({},function(err,doc){
            client.get(doc.buyerPeer+'/chain',function(data,response){
                console.log('this-');
                console.log(data);
                    
                    func(data);
                    /*userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'supplier',status:req.body.status},function(err){
                        res.redirect('/admin/manage-supplier');
                    });*/
                
            });
          });
    },
    getBlockData:function(req,res,blockNumber,func){
        
                  chaincodedata.findOne({},function(err,doc){
            client.get(doc.buyerPeer+'/chain/blocks/'+blockNumber,function(data,response){
                console.log('this-');
                console.log(data);

                    func(data);               
                    /*userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'supplier',status:req.body.status},function(err){
                        res.redirect('/admin/manage-supplier');
                    });*/
                
            });
          });
    },


    initBanker:function(req,res,func) {
                chaincodedata.findOne({},function(err,doc){

            var hash=crypto.createHash('md5').update(req.body.name+req.body.password).digest('hex');
            console.log('supplier init called');

            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "initBank",
                        args: [hash,req.body.name,req.body.email,req.body.employee]
                        },
                        secureContext: doc.bankerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            console.log("bank-"+hash);
            client.post(doc.bankerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.insertOne({userId:hash,notifications:[],count:0});
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'initialized bank account',id:req.body.name},function(err,log){});
                    func(data);
                    /*userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'supplier',status:req.body.status},function(err){
                        res.redirect('/admin/manage-supplier');
                    });*/
                }
            });

        });
    },

    readAllInvoices:function(req,res,func) {
        console.log(req.cookies.name);
        chaincodedata.findOne({},function(err,doc){
        
                        
            var args = {
                data: {

                    jsonrpc: "2.0",
                    method: "query",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "read",
                        args: [
                            'BankInvoices'
                        ]
                        },
                        secureContext: doc.webAppAdmin
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            };

            var peerUrl=doc.buyerPeer;
            client.post(peerUrl+'/chaincode', args, function (data, response) {
                
                console.log(data);
                if (data.result&&data.result.message){
                    func(data);
                    }else{res.redirect('back');}
                /*if (type=='supplier'){
                    console.log('getting supplier');
                    res.send(data);
                } else if (type=='buyer') {
                    console.log('getting buyer');
                    res.render('buyer');
                    //res.send(data);
                }*/
                
            });
 

                   
                
            
        });
    },

    MakeOffer: function(req,res,func){
        chaincodedata.findOne({},function(err,doc){
            var hash=crypto.createHash('md5').update(''+Date.now()).digest('hex');
            console.log('======================Creating Offer=======================================');
            var invoiceId=''+req.body.invID;
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "makeOffer",
                        args: [invoiceId,req.cookies.userId,req.body.noDays,req.body.discountRate,hash]
                        },
                        secureContext: doc.bankerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            client.post(doc.bankerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    
                    notifications.findOne({userId:req.body.supplier},function(err,notifi){
                        notifications.findOneAndUpdate({userId:req.body.supplier},{$push:{notifications:'Your have recieved a loan offer.'},$set:{count:notifi.count+1}});
                    });
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'loan offer',id:invoiceId},function(err,log){});
                    setTimeout(function(){
                        func(data);
                    },configData.invoiceStatusTimeout);
                    
                }
            });

        });
    },

    UpdateOfferStatus:function(req,res,func){
        chaincodedata.findOne({},function(err,doc){

            console.log('updating offer status');
            var offerId=''+req.query.offerId;
            var status=req.query.status;
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "updateOfferStatus",
                        args: [req.cookies.userId,offerId,status]
                        },
                        secureContext: doc.supplierEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            client.post(doc.supplierPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    
                    /*notifications.findOne({userId:req.body.supplier},function(err,notifi){
                        notifications.findOneAndUpdate({userId:req.body.supplier},{$push:{notifications:'Your have recieved a loan offer.'},$set:{count:notifi.count+1}});
                    });*/
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'changed offer status',id:offerId},function(err,log){});
                    setTimeout(function(){
                        func(data);
                    },configData.invoiceStatusTimeout);
                    
                    
                }
            });

        });
    },



    disburseInvoice:function(req,res,func){
        chaincodedata.findOne({},function(err,doc){

            console.log('disbursing invoice');
            var invoiceId=''+req.body.invID;
            var penaltyPerDay=req.body.penaltyPerDay;
            var recourse=req.body.recourse;
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "disburseInvoice",
                        args: [invoiceId,req.cookies.userId,req.body.noDays,req.body.discountRate,penaltyPerDay,recourse]
                        },
                        secureContext: doc.bankerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            client.post(doc.bankerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    
                    notifications.findOne({userId:req.body.buyer},function(err,notifi){
                        notifications.findOneAndUpdate({userId:req.body.buyer},{$push:{notifications:'Your invoice has been disbursed'},$set:{count:notifi.count+1}});
                    });
                    notifications.findOne({userId:req.body.supplier},function(err,notifi){
                        notifications.findOneAndUpdate({userId:req.body.supplier},{$push:{notifications:'Your invoice has been disbursed'},$set:{count:notifi.count+1}});
                    });
                    userCollection.findOne({userId:req.cookies.userId},function(err,record){
                        console.log("000000000000000000000000000000000000000000000000000000000000000000000");
                        console.log(record);
                        readAllInvoices(function(allInvoicesData){
                        for (var i=0;i<record.supplierLimits.length;i++){
                            
                            if (record.supplierLimits[i].supplierId==req.body.supplier){
                                console.log("reaching here supplier check");
                                
                                    var allInvoices = JSON.parse(allInvoicesData.result.message);
                                    console.log(allInvoices);
                                    var Rec=record;
                                    for (var j=0;j<allInvoices.length;j++){
                                        console.log(allInvoices[j].invoiceId,invoiceId);
                                        if (allInvoices[j].invoiceId==invoiceId){
                                            console.log(Number(Rec.supplierLimits[i].limit));
                                            console.log(Number(allInvoices[j].total));
                                            console.log(Rec.supplierLimits[i]);
                                            Rec.supplierLimits[i].limit=Number(Rec.supplierLimits[i].limit)-Number(allInvoices[j].total);
                                            var newSupplierLimits=Rec.supplierLimits;
                                            userCollection.findOneAndUpdate({userId:req.cookies.userId},{$set:{supplierLimits:newSupplierLimits}},function(){
                                                console.log("updated");
                                            });
                                        }
                                        
                                    }
                                    
                                
                                
                            }
                            
                        }
                    });
                        
                    });
                    


                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'disburse invoice',id:invoiceId},function(err,log){});
                    setTimeout(function(){
                        var invInfo={};
                        invInfo.disInvId=invoiceId;
                        invInfo.bankId=req.cookies.userId;
                        triggerForPaymentAlert(req.body.noDays,invInfo);
                        func(data);
                    },configData.invoiceStatusTimeout);
                    
                }
            });

        });
    },
    getTransactionData:function(req,res,func){
        chaincodedata.findOne({},function(err,result){
                var peerUrl=result.buyerPeer;
                client.get(peerUrl+'/transactions/'+req.query.Tid, function (data, response) {
                    // parsed response body as js object 
                    console.log(data);
                    
                    // raw response 
                    
                       
                        func(data);
                    
                });
        });
    },
    getBuyersForSupplier:function(supplierId,callBack){
    var buyers=[];
    console.log('getting all buyers');
    readAcc(supplierId,function(data){
        var supplierInfo = JSON.parse(data.result.message);
        if (!supplierInfo.purchaseOrders||supplierInfo.purchaseOrders==null||supplierInfo.purchaseOrders.length==0){
            console.log(buyers);
            callBack(buyers);
        }
        for (var i=0;i<supplierInfo.purchaseOrders.length;i++) {
            returnBuyer(supplierInfo.purchaseOrders[i].buyer,function(buyer){
            var count=0;    
                for (var j=0;j<buyers.length;j++){
                    if (buyers[j]==buyer.name) {
                        count++;
                    }
                }
                if (count==0){
                    buyers.push(buyer.name);
                }
                console.log(buyers);
                if (i==supplierInfo.purchaseOrders.length) {
                    callBack(buyers);
                }
            });
        }
    });
}


};

function readAllInvoices(func){
        chaincodedata.findOne({},function(err,doc){
        
                        
            var args = {
                data: {

                    jsonrpc: "2.0",
                    method: "query",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "read",
                        args: [
                            'BankInvoices'
                        ]
                        },
                        secureContext: doc.webAppAdmin
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            };

            var peerUrl=doc.buyerPeer;
            client.post(peerUrl+'/chaincode', args, function (data, response) {
                
                console.log(data);
                if (data.result&&data.result.message){
                    func(data);
                    }
                
                
            });
 
            
        });
}

function returnBuyer(id,func){
        userCollection.findOne({userId:id},function(err,buyer){
                    
                    console.log(buyer);
                    console.log('inside');
                    console.log(id);    
                    
                    func(buyer);                    
                });
                
}

function triggerForPaymentAlert(noDays,details){
    //var da = new Date(Date.now()+30000);
    var numOfdays;
    if (parseInt(noDays)>7){
        numOfdays=parseInt(noDays)-7;
    }else {
        numOfdays=parseInt(noDays)
    }
    var da = new Date(Date.now()+numOfdays*24*60*60000);
        console.log(da,parseInt(numOfdays));
        var j = schedule.scheduleJob(da, function(details){
            console.log(details);
            readAcc(details.bankId,function(data){
                var bankAcc = JSON.parse(data.result.message);
                console.log(bankAcc);
                for (var i=0;i<bankAcc.dInvoices.length;i++) {
                    console.log(bankAcc.dInvoices[i].details.invoiceId,"==== ",details.disInvId,"====",bankAcc.dInvoices[i].details.status);
                    if (bankAcc.dInvoices[i].details.invoiceId==details.disInvId&&bankAcc.dInvoices[i].details.status!='repayed') {
                        console.log('reaching in');
                        triggerForDuePaymentAlert("7",details);
                        var supplier=bankAcc.dInvoices[i].details.supplier;
                        notifications.findOne({userId:bankAcc.dInvoices[i].details.supplier},function(err,notifi){
                            
                            notifications.findOneAndUpdate({userId:supplier},{$push:{notifications:'Payment Reminder for invoice-'+details.disInvId},$set:{count:notifi.count+1}});
                        });
                        
                    }
                }
            });
        }.bind(null,details));
}

function triggerForDuePaymentAlert(noDays,details){
    //var da = new Date(Date.now()+5000);
    var da = new Date(Date.now()+parseInt(noDays)*24*60*60000);
        console.log(da,parseInt(noDays));
        var j = schedule.scheduleJob(da, function(details){
            console.log(details);
            readAcc(details.bankId,function(data){
                var bankAcc = JSON.parse(data.result.message);
                console.log(bankAcc);
                for (var i=0;i<bankAcc.dInvoices.length;i++) {
                    console.log(bankAcc.dInvoices[i].details.invoiceId,"==== ",details.disInvId,"====",bankAcc.dInvoices[i].details.status);
                    if (bankAcc.dInvoices[i].details.invoiceId==details.disInvId&&bankAcc.dInvoices[i].details.status!='repayed') {
                        console.log('reaching in');
                        triggerForIncreasedCharge(1,details);
                        var supplier=bankAcc.dInvoices[i].details.supplier;
                        notifications.findOne({userId:bankAcc.dInvoices[i].details.supplier},function(err,notifi){
                            
                            notifications.findOneAndUpdate({userId:supplier},{$push:{notifications:'Payment Due for invoice-'+details.disInvId},$set:{count:notifi.count+1}});
                        });
                        
                    }
                }
            });
        }.bind(null,details));
}

function triggerForIncreasedCharge(noDays,details){
    //var da = new Date(Date.now()+5000);
    var da = new Date(Date.now()+parseInt(noDays)*24*60*60000);
        console.log(da,parseInt(noDays));
        var j = schedule.scheduleJob(da, function(details){
            console.log(details);
            readAcc(details.bankId,function(data){
                var bankAcc = JSON.parse(data.result.message);
                console.log(bankAcc);
                for (var i=0;i<bankAcc.dInvoices.length;i++) {
                    console.log(bankAcc.dInvoices[i].details.invoiceId,"==== ",details.disInvId,"====",bankAcc.dInvoices[i].details.status);
                    if (bankAcc.dInvoices[i].details.invoiceId==details.disInvId&&bankAcc.dInvoices[i].details.status!='repayed') {
                        console.log('reaching in');
                        
                        var supplier=bankAcc.dInvoices[i].details.supplier;
                        notifications.findOne({userId:bankAcc.dInvoices[i].details.supplier},function(err,notifi){
                            
                            notifications.findOneAndUpdate({userId:supplier},{$push:{notifications:'Escalation charge rate for invoice-'+details.disInvId},$set:{count:notifi.count+1}});
                        });
                        
                    }
                }
            });
        }.bind(null,details));
}

function readAcc(key,func) {
       
        chaincodedata.findOne({},function(err,doc){
            
                        
                        
                        var args = {
                data: {

                    jsonrpc: "2.0",
                    method: "query",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "read",
                        args: [
                            key
                        ]
                        },
                        secureContext: doc.webAppAdmin
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            };

            var peerUrl=doc.buyerPeer;
            console.log(doc.chaincodeId+' '+doc.webAppAdmin+' '+doc.buyerPeer+' ');
            client.post(peerUrl+'/chaincode', args, function (data, response) {
                
                console.log(data);
                if (data.result&&data.result.message){
                func(data);
                }else{res.redirect('back');}
                /*if (type=='supplier'){
                    console.log('getting supplier');
                    res.send(data);
                } else if (type=='buyer') {
                    console.log('getting buyer');
                    res.render('buyer');
                    //res.send(data);
                }*/
                
            });
 

                   
                
            
        });
        
    }


function initAdminandChain(result){
                var args = {
                    data: {
                       enrollId: result.webAppAdmin,
                       enrollSecret: result.weAppSecret
                    },
                    headers: { "Content-Type": "application/json" }
                };
                var peerUrl=result.buyerPeer;
                client.post(peerUrl+'/registrar', args, function (data, response) {
                    // parsed response body as js object 
                    console.log(data);
                    
                    // raw response 
                    if (data.OK){
                        console.log(data.OK);
                        initializeChain(result);
                    }
                });

            console.log(result.buyerPeer); 
}


function initBuyer(result){
     var args = {
                    data: {
                       enrollId: result.buyerEnrollId,
                       enrollSecret: result.buyerSecret
                    },
                    headers: { "Content-Type": "application/json" }
                };
                var peerUrl=result.buyerPeer;
                client.post(peerUrl+'/registrar', args, function (data, response) {
                    // parsed response body as js object 
                    console.log(data);
                    
                    // raw response 
                    if (data.OK){
                        console.log(data.OK);
                        
                    }
                });

            console.log(result.buyerPeer); 
}

     function updatePOstatus(req,res,func) {
        
        chaincodedata.findOne({},function(err,doc){

            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "updatePOStatus",
                        args: [
                            req.body.purchaseId,
                            req.cookies.userId,
                            'Completed'
                        ]
                        },
                        secureContext: doc.supplierEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            
            client.post(doc.supplierPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'updating PO status',id:req.body.purchaseId},function(err,log){
                    });
                    setTimeout(function(){
                        func();
                    },configData.invoiceStatusTimeout);                
                }
            });

        });
    }




function initSupplier(result){
        var args = {
                    data: {
                       enrollId: result.supplierEnrollId,
                       enrollSecret: result.supplierSecret
                    },
                    headers: { "Content-Type": "application/json" }
                };
                var peerUrl=result.supplierPeer;
                client.post(peerUrl+'/registrar', args, function (data, response) {
                    // parsed response body as js object 
                    console.log(data);
                    
                    // raw response 
                    if (data.OK){
                        console.log(data.OK);
                        
                    }
                });

            console.log(result.supplierPeer); 
}


function initBanker(result){
    var args = {
                    data: {
                       enrollId: result.bankerEnrollId,
                       enrollSecret: result.bankerSecret
                    },
                    headers: { "Content-Type": "application/json" }
                };
                var peerUrl=result.bankerPeer;
                client.post(peerUrl+'/registrar', args, function (data, response) {
                    // parsed response body as js object 
                    console.log(data);
                    
                    // raw response 
                    if (data.OK){
                        console.log(data.OK);
                        
                    }
                });

            console.log(result.bankerPeer); 
}

////
function work(){
            chaincodedata.findOne({},function(err,doc){

            var hash=crypto.createHash('md5').update('supplier1').digest('hex');
            console.log('supplier init called');

            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "initSupplier",
                        args: [hash,'SMR Automotive System India Ltd.','Ravi','supplier@smr.com']
                        },
                        secureContext: doc.supplierEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            console.log("supplier-"+hash);
            client.post(doc.supplierPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.insertOne({userId:hash,notifications:[],count:0});
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'initialized supplier',id:'SMR Automotive System India Ltd.'},function(err,log){
                    });
                    userCollection.insertOne({name:'SMR Automotive System India Ltd.',email:'supplier@smr.com',password:'Password123',userId:hash,role:'supplier',status:'active',employeeName:'Ravi',phoneNumber:'9810406677',state:'Delhi'},function(err){
                        console.log('added');
                    });
                    //check push
                }
            });

        });
}

function worksupply2(){
            chaincodedata.findOne({},function(err,doc){

            var hash=crypto.createHash('md5').update('supplier2').digest('hex');
            console.log('supplier init called');

            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "initSupplier",
                        args: [hash,'Paramount Ltd.','Rishabh','supplier@paramount.com']
                        },
                        secureContext: doc.supplierEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            console.log("supplier-"+hash);
            client.post(doc.supplierPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.insertOne({userId:hash,notifications:[],count:0});
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'initialized supplier',id:'Paramount Ltd.'},function(err,log){
                    });
                    userCollection.insertOne({name:'Paramount Ltd.',email:'supplier@paramount.com',password:'Password123',userId:hash,role:'supplier',status:'active',employeeName:'Rishabh',phoneNumber:'9103445890',state:'Uttar Pradesh'},function(err){
                        console.log('added');
                    });
                }
            });

        });
}


function worksupply3(){
            chaincodedata.findOne({},function(err,doc){

            var hash=crypto.createHash('md5').update('supplier3').digest('hex');
            console.log('supplier init called');

            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "initSupplier",
                        args: [hash,'Galaxy Pvt Ltd.','Shikhar Juyal','supplier@galaxy.com']
                        },
                        secureContext: doc.supplierEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            console.log("supplier-"+hash);
            client.post(doc.supplierPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.insertOne({userId:hash,notifications:[],count:0});
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'initialized supplier',id:'Galaxy Pvt Ltd.'},function(err,log){
                    });
                    userCollection.insertOne({name:'Galaxy Pvt Ltd.',email:'supplier@galaxy.com',password:'Password123',userId:hash,role:'supplier',status:'active',employeeName:'Shikhar',phoneNumber:'9210588719',state:'Uttar Pradesh'},function(err){
                        console.log('added');
                    });
                    var owners=[];
                    var owner={
                        din:"41344",
                        aadhar:"34522345",
                        name:"Sankalp Sharma",
                        mobile:"97117762183",
                        email:"saan099@gmail.com",
                        dpan:"3442345",
                        cibil:"23",
                        landline:"0120-2504003",
                        employeeDocs:[{
                            docName:"pan",
                            fileName:"employee1_pan.pdf"
                        }]
                    };
                    var owner1={
                        din:"635663",
                        aadhar:"457211",
                        name:"Shikhar Juyal",
                        mobile:"8826456939",
                        email:"shekhu@ipec.org",
                        dpan:"45674",
                        cibil:"78",
                        landline:"0120-3535674",
                        employeeDocs:[{
                            docName:"pan",
                            fileName:"employee2_pan.pdf"
                        },{
                            docName:"address",
                            fileName:"employee2_address.pdf"
                        },{
                            docName:"photo",
                            fileName:"employee2_photo.jpeg"
                        }]
                    };
                    owners.push(owner);
                    owners.push(owner1);
                    companyCollection.insertOne({id:hash,CompanyName:'Galaxy Pvt Ltd.',IndustryType:'3',BusinessType:'Private Limited',Email:'supplier@galaxy.com',Mobile:'9210588719',Landline:'0120-2504424',CIN:'3713748101099419',registeredAddress:{address:'D-003 Galaxy Pvt. Ltd. Second floor Sector-3',City:'NOIDA',State:'Uttar Pradesh',PIN:'201301'},correspondenceAddress:{address:'D-003 Galaxy Pvt. Ltd. Second floor Sector-3',City:'NOIDA',State:'UTTAR PRADESH',PIN:'201301'},owners:owners,state:3},function(err){
                        
                    });
                }
            });

        });
}



/////

////
function work1(){
            chaincodedata.findOne({},function(err,doc){

            var hash=crypto.createHash('md5').update('buyer').digest('hex');
            console.log('buyer init called');

            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "initBuyer",
                        args: [hash,'Prolitus Motors','Tashish','buyer@prolitusMotors.com']
                        },
                        secureContext: doc.buyerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            console.log("buyer-"+hash);
            client.post(doc.buyerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.insertOne({userId:hash,notifications:[],count:0});
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'initialized buyer',id:'Prolitus Motors'},function(err,log){
                    });
                    userCollection.insertOne({name:'Prolitus Motors',email:'buyer@prolitusMotors.com',password:'Password123',userId:hash,role:'buyer',status:'active',employeeName:'Tashish Singh',phoneNumber:'9250238490',type:'maker'},function(err){
                        console.log('buyer added');
                        userCollection.insertOne({name:'Prolitus Motors',email:'verifier@prolitusMotors.com',password:'Password123',userId:hash,role:'buyer',status:'active',employeeName:'Pranshu Singh',phoneNumber:'9250238490',type:'verifier'},function(err){
                            makeUserCompanyRegistration(hash,function(){
                                console.log("done");
                            });
                        });

                        userCollection.insertOne({name:'Admin',email:'admin@admin.com',password:'Password123',userId:hash,role:'admin',status:'active',employeeName:'Admin DCB',phoneNumber:'9911245550',type:'admin'},function(err){
                        });


                        setTimeout(function() {
                            work2();
                            workPO2();
                            workPO3();
                            workPO4();

                        }, 3000);
                        
                    });
                }
            });

        });
}
// Buyer registration process
function makeUserCompanyRegistration(userId,callBack){
    console.log('============makeUserCompanyRegistration==========');
    
    userCollection.findOne({userId:userId},function(err,userDoc){
        companyCollection.insertOne({id:userId,CompanyName:'Prolitus Motors',Company_Desc:'Best of the best',Mobile:'9250238490',Email:'buyer@prolitusMotors.com',IndustryType:'Research & Development',BusinessType:'Private Held Company',Landline:'2507424',CIN:'2654829230',registeredAddress:{address:'A-83 sector-2',City:'NOIDA',State:'Uttar Pradesh',PIN:'201301'},correspondenceAddress:{address:'A-83 sector-2',City:'NOIDA',State:'Uttar Pradesh',PIN:'201301'},state:1},function(err){
            AddDirectorDetails(userId,function(){
                callBack();
            });
        });
    });
    
}

function AddDirectorDetails(userId,callBack){
    
    var employees=[];

    
        var docs=[];
        

        var employee={
            din:'2628192',
            aadhar:'8373920',
            name:'Tashish',
            mobile:'6493039303',
            email:'buyer@prolitusMotors.com',
            dpan:'6403830',
            cibil:'183048400',
            landline:'01202507424',
            employeeDocs:docs
        };
        companyCollection.findOneAndUpdate({id:userId},{$push:{owners:employee},$set:{state:2}},function(err){              
                callBack();        
        });
        
    
    
};
//

function work2() {
        console.log('show this--');
        
        var poNumber='#PO2017SMR0001';
        console.log(poNumber);
        //var hash=crypto.createHash('md5').update(Date.now()).digest('hex');
        chaincodedata.findOne({},function(err,doc){
            userCollection.findOne({name:'SMR Automotive System India Ltd.'},function(err,result){
            userCollection.findOne({name:'Prolitus Motors'},function(err,Bresult){
            var arguments=[];
            //prodName=req.body["productName[]"];
            //prodQty=req.body["productQty[]"];
            //prodPrice=req.body["productPrice[]"];
            //console.log(prodName[0]);
            //totLength=req.body["productName[]"].length;
           
            arguments.push(poNumber);
            arguments.push(''+'3'+'');

                //prodValue = (prodQty[i] * prodPrice[i]);


                arguments.push("{\"productName\":\"Shock Absorbers\",\"quantity\":24,\"rate\":6500,\"value\":816000}");
                //arguments.push('{\"productName\":\"'+prodName[i]+'\",\"quantity\":'+prodQty[i]+',\"rate\":'+prodPrice[i]+',\"value\":'+prodValue+'}');
                arguments.push("{\"productName\":\"Crank Shaft\",\"quantity\":12,\"rate\":5650,\"value\":67800}");
                arguments.push("{\"productName\":\"Connecting Rode\",\"quantity\":20,\"rate\":8500,\"value\":170000}");        

            arguments.push(result.userId);
            arguments.push('12');
            
            arguments.push(Bresult.userId);
            console.log('arguments-');
            console.log(arguments);
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "createPO",
                        args: arguments
                        },
                        secureContext: doc.buyerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);

            client.post(doc.buyerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.findOne({userId:result.userId},function(err,notifi){
                        notifications.findOneAndUpdate({userId:result.userId},{$push:{notifications:'You have recieved a new PO.'},$set:{count:notifi.count+1}});
                    });
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'PO Generation',id:poNumber},function(err,log){
                    });
                    //res.redirect('/buyer/manage-po');
                    //res.send(data);
                    console.log('created PO');
                }
            });
            });

            });



        });
}


function workPO2() {
        console.log('show this--');
        
        var poNumber='#PO2017SMR0002';
        console.log(poNumber);
        //var hash=crypto.createHash('md5').update(Date.now()).digest('hex');
        chaincodedata.findOne({},function(err,doc){
            userCollection.findOne({name:'SMR Automotive System India Ltd.'},function(err,result){
            userCollection.findOne({name:'Prolitus Motors'},function(err,Bresult){
            var arguments=[];
            //prodName=req.body["productName[]"];
            //prodQty=req.body["productQty[]"];
            //prodPrice=req.body["productPrice[]"];
            //console.log(prodName[0]);
            //totLength=req.body["productName[]"].length;
           
            arguments.push(poNumber);
            arguments.push(''+'3'+'');

                //prodValue = (prodQty[i] * prodPrice[i]);


                arguments.push("{\"productName\":\"Shock Absorbers\",\"quantity\":24,\"rate\":6500,\"value\":156000}");
                //arguments.push('{\"productName\":\"'+prodName[i]+'\",\"quantity\":'+prodQty[i]+',\"rate\":'+prodPrice[i]+',\"value\":'+prodValue+'}');
                arguments.push("{\"productName\":\"Crank Shaft\",\"quantity\":12,\"rate\":5650,\"value\":67800}");
                arguments.push("{\"productName\":\"Cylinder Liners\",\"quantity\":22,\"rate\":8400,\"value\":184800}");
            

            arguments.push(result.userId);
            arguments.push('60');
            
            arguments.push(Bresult.userId);
            console.log('arguments-');
            console.log(arguments);
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "createPO",
                        args: arguments
                        },
                        secureContext: doc.buyerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);

            client.post(doc.buyerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.findOne({userId:result.userId},function(err,notifi){
                        notifications.findOneAndUpdate({userId:result.userId},{$push:{notifications:'You have recieved a new PO.'},$set:{count:notifi.count+1}});
                    });
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'PO Generation',id:poNumber},function(err,log){
                    });
                    //res.redirect('/buyer/manage-po');
                    //res.send(data);
                    console.log('created PO');
                }
            });
            });

            });



        });
}


function workPO3() {
        console.log('show this--');
        
        var poNumber='#PO2017SMR0003';
        console.log(poNumber);
        //var hash=crypto.createHash('md5').update(Date.now()).digest('hex');
        chaincodedata.findOne({},function(err,doc){
            userCollection.findOne({name:'Galaxy Pvt Ltd.'},function(err,result){
            userCollection.findOne({name:'Prolitus Motors'},function(err,Bresult){
            var arguments=[];
            //prodName=req.body["productName[]"];
            //prodQty=req.body["productQty[]"];
            //prodPrice=req.body["productPrice[]"];
            //console.log(prodName[0]);
            //totLength=req.body["productName[]"].length;
           
            arguments.push(poNumber);
            arguments.push(''+'2'+'');

                //prodValue = (prodQty[i] * prodPrice[i]);


                arguments.push("{\"productName\":\"Shock Absorbers\",\"quantity\":6,\"rate\":6500,\"value\":39000}");
                //arguments.push('{\"productName\":\"'+prodName[i]+'\",\"quantity\":'+prodQty[i]+',\"rate\":'+prodPrice[i]+',\"value\":'+prodValue+'}');
                arguments.push("{\"productName\":\"Connecting Rode\",\"quantity\":8,\"rate\":8500,\"value\":68000}");
            

            arguments.push(result.userId);
            arguments.push('45');
            
            arguments.push(Bresult.userId);
            console.log('arguments-');
            console.log(arguments);
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "createPO",
                        args: arguments
                        },
                        secureContext: doc.buyerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);

            client.post(doc.buyerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.findOne({userId:result.userId},function(err,notifi){
                        notifications.findOneAndUpdate({userId:result.userId},{$push:{notifications:'You have recieved a new PO.'},$set:{count:notifi.count+1}});
                    });
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'PO Generation',id:poNumber},function(err,log){
                    });
                    //res.redirect('/buyer/manage-po');
                    //res.send(data);
                    console.log('created PO');
                }
            });
            });

            });



        });
}

function workPO4() {
        console.log('show this--');
        
        var poNumber='#PO2017SMR0004';
        console.log(poNumber);
        //var hash=crypto.createHash('md5').update(Date.now()).digest('hex');
        chaincodedata.findOne({},function(err,doc){
            userCollection.findOne({name:'Paramount Ltd.'},function(err,result){
            userCollection.findOne({name:'Prolitus Motors'},function(err,Bresult){
            var arguments=[];
            //prodName=req.body["productName[]"];
            //prodQty=req.body["productQty[]"];
            //prodPrice=req.body["productPrice[]"];
            //console.log(prodName[0]);
            //totLength=req.body["productName[]"].length;
           
            arguments.push(poNumber);
            arguments.push(''+'3'+'');

                //prodValue = (prodQty[i] * prodPrice[i]);


                arguments.push("{\"productName\":\"Crank Shaft\",\"quantity\":12,\"rate\":5650,\"value\":67800}");
                //arguments.push('{\"productName\":\"'+prodName[i]+'\",\"quantity\":'+prodQty[i]+',\"rate\":'+prodPrice[i]+',\"value\":'+prodValue+'}');
                arguments.push("{\"productName\":\"Connecting Rode\",\"quantity\":2,\"rate\":8500,\"value\":17000}");
                arguments.push("{\"productName\":\"Cylinder Liners\",\"quantity\":14,\"rate\":8400,\"value\":117600}");
            

            arguments.push(result.userId);
            arguments.push('20');
            
            arguments.push(Bresult.userId);
            console.log('arguments-');
            console.log(arguments);
            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "createPO",
                        args: arguments
                        },
                        secureContext: doc.buyerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);

            client.post(doc.buyerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.findOne({userId:result.userId},function(err,notifi){
                        notifications.findOneAndUpdate({userId:result.userId},{$push:{notifications:'You have recieved a new PO.'},$set:{count:notifi.count+1}});
                    });
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'PO Generation',id:poNumber},function(err,log){
                    });
                    //res.redirect('/buyer/manage-po');
                    //res.send(data);
                    console.log('created PO');
                }
            });
            });

            });



        });
}


function initializeChain(result){
    var args = {
            data: {
                jsonrpc: "2.0",
                method: "deploy",
                params: {
                type: 1,
                chaincodeID: {
                path: "https://github.com/saan099/SupplyChain-lenderFocussed"
                },
                ctorMsg: {
                function: "init",
                args: [

                ]
                },
                secureContext: result.webAppAdmin
                },
            id: 0
            },
           headers: { "Content-Type": "application/json" }
    };
     client.post(result.buyerPeer+'/chaincode', args, function (data, response) {
        // parsed response body as js object 
        console.log(data);
                    
        // raw response 
        if (data.result){
            chaincodedata.findOne({},function(err,doc){
                doc.chaincodeId=data.result.message;
                chaincodedata.save(doc);
                blockchainlogs.remove({},function(err,response){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    blockchainlogs.insertOne({transactionId:'Deployment',datetime:newDate,transaction:'deployment of chaincode',id:'chaincode'},function(err,log){
                    });
                });
                userCollection.remove({});
                notifications.remove({});
                companyCollection.remove({});
                
                console.log(doc);
                setTimeout(function() {
                    work();
                    work1();
                    work3();
                    worksupply2();
                    worksupply3();
                }, 45000);
               // setTimeout(work, 10000);
            });

            
        }
    });
}
function work3(){
            chaincodedata.findOne({},function(err,doc){

            var hash=crypto.createHash('md5').update('banker').digest('hex');
            console.log('supplier init called');

            invokeStructure= {
                data: {

                    jsonrpc: "2.0",
                    method: "invoke",
                    params: {
                        type: 1,
                        chaincodeID: {
                        name: doc.chaincodeId
                        },
                        ctorMsg: {
                        function: "initBank",
                        args: [hash,'ABC Bank',"Sankalp",'bank@abcBank.com']
                        },
                        secureContext: doc.bankerEnrollId
                    },
                    id: 0

                },
                headers: { "Content-Type": "application/json" }
            }
            console.log(invokeStructure);
            console.log("bank-"+hash);
            client.post(doc.bankerPeer+'/chaincode',invokeStructure,function(data,response){
                console.log('this-');
                console.log(data);
                if (data.result.status==='OK'){
                    var d=new Date(Date.now());
                    var newDate=date.format(d, 'YYYY/MM/DD HH:mm:ss');
                    notifications.insertOne({userId:hash,notifications:[],count:0});
                    blockchainlogs.insertOne({transactionId:data.result.message,datetime:newDate,transaction:'initialized bank account',id:'ABC Bank'},function(err,log){
                    });
                    userCollection.insertOne({name:'ABC Bank',email:'bank@abcBank.com',password:'Password123',userId:hash,role:'bank',status:'active',employeeName:'Sankalp',phone:'9717762183',minAge:3,minRevenue:250000,dser:'',geoFootprint:'',invoiceFunding:6,interestCharges:'Upfront',recourse:'none',supplierLimits:[],supplierInvoiceLimits:[]},function(err){
                        console.log('added bank');
                    });
                    
                    
                }
            });

        });
}



