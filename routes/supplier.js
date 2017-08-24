var express=require('express');
var router=express.Router();
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var crypto=require('crypto');
var url=require('../config/database').url;
var userCollection=require('../config/collection').collection;
var chaincodeCalls=require('../chaincodeCalls/chaincodecalls');
var notifications=require('../config/notifications').collection;
var supplierInfo;
var date = require('date-and-time');
var blockchainlogs=require('../config/blockchainlogs').collection;
var companyCollection=require('../config/companyDetailsCollection').collection;
var configData=require('../models/configData');
var fileManagement=require('../config/fileManagement');
var Client = require('node-rest-client').Client;

router.get('/',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function(data){

        companyCollection.findOne({id:req.cookies.userId},function(err,comDoc){
            if (!comDoc){
                supplierInfo = JSON.parse(data.result.message);
                userCollection.findOne({userId:req.cookies.userId},function(err,suppInfo){
                    res.render('supplier/comp-detail',{ accData: supplierInfo, accInfo: suppInfo});
                });
                //res.render('supplier/comp-detail',{ accData: supplierInfo});
                //res.redirect('/supplier/companyDetails');
            } else if(comDoc.state==1){
                supplierInfo = JSON.parse(data.result.message);
                userCollection.findOne({userId:req.cookies.userId},function(err,suppInfo){
                    res.render('supplier/owner-detail',{ accData: supplierInfo,accInfo:suppInfo});
                });
                //res.redirect('/supplier/ownerDetails');
            }else if (comDoc.state==2){
                supplierInfo = JSON.parse(data.result.message);
                userCollection.findOne({userId:req.cookies.userId},function(err,suppInfo){
                    res.render('supplier/document-detail',{ accData: supplierInfo,accInfo:suppInfo});
                });
                //res.redirect('/supplier/companyDocuments');
            }
            else {
                console.log(comDoc.state);
            supplierInfo = JSON.parse(data.result.message);
            chaincodeCalls.getBlockchainData(req,res,function(data){
                console.log('getting supplier');
                blockchainlogs.find({}).toArray(function(err,chaindata){
                
                    notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                        userCollection.findOne({userId:req.cookies.userId},function(err,supplierRecord){
                            if (supplierRecord.status=='active'){
                                res.render("supplier", {blockData: data, chaindata: chaindata, accData: supplierInfo,notifydoc:notifydoc,configData:configData});
                                
                            }else {
                                res.send('Please wait for admin\'s verification');
                            }
                        });
                    });
            
                });
            });

        }
        });
        


    });
});


router.get('/getAllBuyers',function(req,res){
    var buyers=[];
    console.log('getting all buyers');
    chaincodeCalls.readAccount(req,res,function(data){
        var supplierInfo = JSON.parse(data.result.message);
        if (!supplierInfo.purchaseOrders||supplierInfo.purchaseOrders==null||supplierInfo.purchaseOrders.length==0){
            console.log(buyers);
            res.json(buyers);
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
                    res.json(buyers);
                }
            });
        }
    });
});


router.get('/get-aadhaar',function(req,res,next) {

    res.render("supplier/aadhar");
});


router.post('/get-aadhaarauth',function(req,res,next) {

    varRequest = Math.floor((Math.random() * 1067646740) + 1);

    var createHash = require('sha.js');
 
    var sha256 = createHash('sha256');
    var sha512 = createHash('sha512');
    
    var h = sha256.update(req.body.saCode+"|"+req.body.aadhaarId+"|"+varRequest+"|0b72f86b62", 'utf8').digest('hex');

    res.cookie('aadharID',req.body.aadhaarId);

    res.render("supplier/aadharauth", {saCode:req.body.saCode,aadhaarId:req.body.aadhaarId,requestId:varRequest,hash:h});
});


router.get('/aadhaar-kyc/success',function(req,res,next) {
    
    var client = new Client();
    
    varHash = req.query.hash;
    varUUID = req.query.uuid;
    varRequestID = req.query.requestId;
    aadhaarId = req.cookies.aadharID;


    var createHash = require('sha.js');
 
    var sha256 = createHash('sha256');
    var sha512 = createHash('sha512');
    
    var h = sha256.update(varUUID+"|955d29|"+aadhaarId+"|"+varRequestID+"|0b72f86b62", 'utf8').digest('hex');


    invokeStructure= {
        data: {
            saCode: "955d29",
            uuid: varUUID,
            requestId: varRequestID,
            aadhaarId: aadhaarId,
            hash: h
        },
        headers: { "Content-Type": "application/json" }
    }

    /*client.post('https://api.aadhaarbridge.com/preprod/_kyc',invokeStructure,function(data,response) {

        console.log("Start Data------------------------------------");
        console.log(data);
        console.log("End Data------------------------------------");
        console.log("Start Response------------------------------------");
        console.log(response);
        console.log("End Response------------------------------------");
        
    });*/

    res.send('Aadhaar Verified');




    
    //res.render("supplier/aadharauth", {saCode:req.body.saCode,aadhaarId:req.body.aadhaarId,requestId:varRequest,hash:h});
});

router.get('/aadhaar-kyc/failed',function(req,res,next) {

    res.send('Invalid Aadhaar');

    //res.render("supplier/aadharauth", {saCode:req.body.saCode,aadhaarId:req.body.aadhaarId,requestId:varRequest,hash:h});
});





router.get('/companyDetails',function(req,res){
    res.render('supplier/comp-detail');
});

router.get('/ownerDetails',function(req,res){
    res.render('supplier/owner-detail');
});

router.get('/companyDocuments',function(req,res){
    res.render('supplier/document-detail');
});

router.post('/completeRegistration',function(req,res){
    userCollection.findOne({userId:req.cookies.userId},function(err,userDoc){
        companyCollection.insertOne({id:req.cookies.userId,CompanyName:req.body.companyName,Company_Desc:req.body.hCompany,Mobile:req.body.txtMobile,Email:req.body.txtEmail,IndustryType:req.body.industryType,BusinessType:req.body.businessType,Landline:req.body.landline,CIN:req.body.cin,registeredAddress:{address:req.body.street,City:req.body.city,State:req.body.state,PIN:req.body.pin},correspondenceAddress:{address:req.body.c_street,City:req.body.c_city,State:req.body.c_state,PIN:req.body.c_pin},state:1},function(err){
            res.redirect('/supplier');
        });
    });
    

});
router.post('/uploadEmployeeDocs',function(req,res){
    console.log(req.files);
    /*var fileNameArray=[];
    req.files.employeefile.forEach(function(file) {
        fileManagement.writeFile(file);
        fileNameArray.push(file.name);
    }, this);*/
    var employees=[];
        din=req.body["din[]"];
        console.log(din);
        aadhar=req.body["aadhar[]"];
        console.log(aadhar);
        dpan=req.body["dpan[]"];
        console.log(dpan);
        cibil=req.body["cibil[]"];
        console.log(cibil);
        name=req.body["name[]"];
        console.log(name);
        mobile=req.body["mobile[]"];
        console.log(mobile);
        email=req.body["email[]"];
        console.log(email);
        landline=req.body["landline[]"];
        console.log(landline);
        pan=req.files["Pan[]"];
        console.log(pan);
        address=req.files["Address[]"];
        console.log(address);
        photo=req.files["Photo[]"];
        console.log(photo);

    if (name.constructor===Array){
    for (var i=0;i<name.length;i++){
        var docs=[];
        
        var pan="Pan-"+i;
        console.log("going inside");
        console.log(req.files[pan]);
        if (req.files[pan]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'pan',
                fileName:req.files[pan].name
            }
            fileManagement.writeFile(req.files[pan],hash);
            docs.push(pandoc);
        }
        var address="Address-"+i;
        if (req.files[address]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'address',
                fileName:req.files[address].name
            }
            fileManagement.writeFile(req.files[address],hash);
            docs.push(pandoc);
        }
        var photo="Photo-"+i;
        if (req.files[photo]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'photo',
                fileName:req.files[photo].name
            }
            fileManagement.writeFile(req.files[photo],hash);
            docs.push(pandoc);
        }

        var employee={
            din:din[i],
            aadhar:aadhar[i],
            name:name[i],
            mobile:mobile[i],
            email:email[i],
            dpan:dpan[i],
            cibil:cibil[i],
            landline:landline[i],
            employeeDocs:docs
        };
        if (i==name.length-1){
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{owners:employee},$set:{state:2}},function(err){              
                res.redirect('/supplier');        
        });
        }else {
            companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{owners:employee},$set:{state:2}},function(err){   
            });
        }
    }
    }else {

    var docs=[];
        
        var pan="Pan-0";
        console.log("going outside");
        console.log(req.files[pan]);
        if (req.files[pan]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'pan',
                fileName:req.files[pan].name
            }
            fileManagement.writeFile(req.files[pan],hash);
            docs.push(pandoc);
        }
        var address="Address-0";
        if (req.files[address]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'address',
                fileName:req.files[address].name
            }
            fileManagement.writeFile(req.files[address],hash);
            docs.push(pandoc);
        }
        var photo="Photo-0";
        if (req.files[photo]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'photo',
                fileName:req.files[photo].name
            }
            fileManagement.writeFile(req.files[photo],hash);
            docs.push(pandoc);
        }

        var employee={
            din:din,
            aadhar:aadhar,
            name:name,
            mobile:mobile,
            email:email,
            dpan:dpan,
            cibil:cibil,
            landline:landline,
            employeeDocs:docs
        };
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{owners:employee},$set:{state:2}},function(err){              
                res.redirect('/supplier');        
        });
    }
    
});

router.post('/postCompanyDocs',function(req,res){
    console.log(req.files);
    if (req.files["Pan"]){
        var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
        var doc={
            id:''+hash,
            docName:"pan",
            fileName:req.files["Pan"].name
        }
        fileManagement.writeFile(req.files["Pan"],hash);
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
        });
    }

    if (req.files["Address"]){
        var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
        var doc={
            id:''+hash,
            docName:"address",
            fileName:req.files["Address"].name
        }
        fileManagement.writeFile(req.files["Address"],hash);
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
        });
    }

    if (req.files["Incorporation"]){
        var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
        var doc={
            id:''+hash,
            docName:"incorporation",
            fileName:req.files["Incorporation"].name
        }
        fileManagement.writeFile(req.files["Incorporation"],hash);
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
        });
    }

    if (req.files["MSME"]){
        var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
        var doc={
            id:''+hash,
            docName:"msme",
            fileName:req.files["MSME"].name
        }
        fileManagement.writeFile(req.files["MSME"],hash);
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
        });
    }

    if (req.files["Credit"]){
        var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
        var doc={
            id:''+hash,
            docName:"credit",
            fileName:req.files["Credit"].name
        }
        fileManagement.writeFile(req.files["Credit"],hash);
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
        });
    }

    if (req.files["BankStatement[]"]&&req.files["BankStatement[]"].constructor===Object){
        var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
        var doc={
            id:''+hash,
            docName:"bankStatement",
            fileName:req.files["BankStatement[]"].name
        }
        fileManagement.writeFile(req.files["BankStatement[]"],hash);
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
        });
    }else if (req.files["BankStatement[]"]){
        var files=req.files["BankStatement[]"];
        for (var i=0;i<req.files["BankStatement[]"].length;i++){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var doc={
                id:''+hash,
                docName:"bankStatement",
                fileName:files[i].name
            }
            fileManagement.writeFile(files[i],hash);
            companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
            });
        }
    }
    if (req.files["PL[]"]&&req.files["PL[]"].constructor===Object){
        var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
        var doc={
            id:''+hash,
            docName:"pl",
            fileName:req.files["PL[]"].name
        }
        fileManagement.writeFile(req.files["PL[]"],hash);
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
        });
    } else if (req.files["PL[]"]){
        var files=req.files["PL[]"];
        for (var i=0;i<req.files["PL[]"].length;i++){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var doc={
                id:''+hash,
                docName:"pl",
                fileName:files[i].name
            }
            fileManagement.writeFile(files[i],hash);
            companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
            });
        }
    }
    res.redirect('/supplier');
});

router.get('/editCompanyDocuments',function(req,res){
    chaincodeCalls.readAccount(req,res,function(data){
        supplierInfo = JSON.parse(data.result.message);
            userCollection.findOne({userId:req.cookies.userId},function(err,suppInfo){
                companyCollection.findOne({id:req.cookies.userId},function(err,compData){


                    notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(compData);
                        //res.render("supplier", {blockData: data, chaindata: chaindata, accData: supplierInfo,notifydoc:notifydoc,configData:configData});
                        res.render('supplier/edit-document-detail',{ accData: supplierInfo,accInfo:suppInfo,compData:compData,notifydoc:notifydoc});
                    });



                //res.render('supplier/edit-document-detail',{ accData: supplierInfo,accInfo:suppInfo,compData:compData});
           });     
        });
    });
});

router.get('/editCompanyDocuments/delete',function(req,res){
    var id=req.query.id;
        companyCollection.findOne({id:req.cookies.userId},function(err,compData){
            console.log(compData);
            for (i=0;i<compData.companyDocs.length;i++){
                if (id==compData.companyDocs[i].id){
                    console.log('coming to splice');
                    console.log(compData.companyDocs[i]);
                    compData.companyDocs.splice(i,1);
                }
            }
            console.log('showing after removing');
            var newCompData=compData;
            companyCollection.remove({id:req.cookies.userId},function(){
                fileManagement.removeFile(id);
                companyCollection.insertOne(newCompData);
                console.log('inserted updated');
            });
            /*compData.save(function(err,docSaved){
                if (!err){
                    console.log('succesfully updated ');
                    res.send(docSaved);
                }
            });*/   
            res.redirect('/supplier/editCompanyDocuments')
        });
});

router.post('/editOwners',function(req,res){
    companyCollection.findOneAndUpdate({id:req.cookies.userId},{$set:{owners:null}},function(err){ 

            });
    
    console.log(req.files);
    /*var fileNameArray=[];
    req.files.employeefile.forEach(function(file) {
        fileManagement.writeFile(file);
        fileNameArray.push(file.name);
    }, this);*/
    var employees=[];
        din=req.body["din[]"];
        console.log(din);
        aadhar=req.body["aadhar[]"];
        console.log(aadhar);
        dpan=req.body["dpan[]"];
        console.log(dpan);
        cibil=req.body["cibil[]"];
        console.log(cibil);
        name=req.body["name[]"];
        console.log(name);
        mobile=req.body["mobile[]"];
        console.log(mobile);
        email=req.body["email[]"];
        console.log(email);
        landline=req.body["landline[]"];
        console.log(landline);
        pan=req.files["Pan[]"];
        console.log(pan);
        address=req.files["Address[]"];
        console.log(address);
        photo=req.files["Photo[]"];
        console.log(photo);

    if (name.constructor===Array){
    for (var i=0;i<name.length;i++){
        var docs=[];
        
        var pan="Pan-"+i;
        console.log("going inside");
        console.log(req.files[pan]);
        if (req.files[pan]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'pan',
                fileName:req.files[pan].name
            }
            fileManagement.writeFile(req.files[pan],hash);
            docs.push(pandoc);
        }
        var address="Address-"+i;
        if (req.files[address]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'address',
                fileName:req.files[address].name
            }
            fileManagement.writeFile(req.files[address],hash);
            docs.push(pandoc);
        }
        var photo="Photo-"+i;
        if (req.files[photo]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'photo',
                fileName:req.files[photo].name
            }
            fileManagement.writeFile(req.files[photo],hash);
            docs.push(pandoc);
        }

        var employee={
            din:din[i],
            aadhar:aadhar[i],
            name:name[i],
            mobile:mobile[i],
            email:email[i],
            dpan:dpan[i],
            cibil:cibil[i],
            landline:landline[i],
            employeeDocs:docs
        };
        if (i==name.length-1){
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{owners:employee},$set:{state:2}},function(err){              
                res.redirect('/supplier');        
        });
        }else {
            companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{owners:employee},$set:{state:2}},function(err){   
            });
        }
    }
    }else {

    var docs=[];
        
        var pan="Pan-0";
        console.log("going outside");
        console.log(req.files[pan]);
        if (req.files[pan]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'pan',
                fileName:req.files[pan].name
            }
            fileManagement.writeFile(req.files[pan],hash);
            docs.push(pandoc);
        }
        var address="Address-0";
        if (req.files[address]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'address',
                fileName:req.files[address].name
            }
            fileManagement.writeFile(req.files[address],hash);
            docs.push(pandoc);
        }
        var photo="Photo-0";
        if (req.files[photo]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'photo',
                fileName:req.files[photo].name
            }
            fileManagement.writeFile(req.files[photo],hash);
            docs.push(pandoc);
        }

        var employee={
            din:din,
            aadhar:aadhar,
            name:name,
            mobile:mobile,
            email:email,
            dpan:dpan,
            cibil:cibil,
            landline:landline,
            employeeDocs:docs
        };
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{owners:employee},$set:{state:2}},function(err){              
                res.redirect('/supplier');        
        });
    }
});

router.get('/editOwnerDocuments/delete',function(req,res){
    var fileName=req.query.filename;
    var din=req.query.din;
        companyCollection.findOne({id:req.cookies.userId},function(err,compData){
            console.log(compData);
            for (i=0;i<compData.owners.length;i++){
                if (din==compData.owners[i].din){
                for (j=0;j<compData.owners[i].employeeDocs.length;j++){

                    if (fileName==compData.owners[i].employeeDocs[j].fileName){
                        console.log('coming to splice');
                        console.log(compData.owners[i].employeeDocs[j].fileName);
                        compData.owners[i].employeeDocs.splice(j,1);
                    }
                }
                }
            }
            console.log('showing after removing');
            var newCompData=compData;
            companyCollection.remove({id:req.cookies.userId},function(){
                companyCollection.insertOne(newCompData);
                console.log('inserted updated');
            });
            /*compData.save(function(err,docSaved){
                if (!err){
                    console.log('succesfully updated ');
                    res.send(docSaved);
                }
            });*/   
            res.redirect('/supplier//editOwnerDocuments')
        });
});

router.get('/editCompanyDetail',function(req,res){
    chaincodeCalls.readAccount(req,res,function(data) {

        supplierInfo = JSON.parse(data.result.message);

        companyCollection.findOne({id:req.cookies.userId},function(err,comDoc) {

            notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                res.render("supplier/edit-comp-detail", {accData: supplierInfo, comDoc: comDoc, notifydoc:notifydoc});
            });
        });
    });
});

router.get('/editCompanyOwner',function(req,res){
    chaincodeCalls.readAccount(req,res,function(data) {

        supplierInfo = JSON.parse(data.result.message);
        companyCollection.findOne({id:req.cookies.userId},function(err,comDoc) {
            notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                res.render('supplier/edit-owner', {accData: supplierInfo, comDoc: comDoc, notifydoc:notifydoc});
            });
        });
    });
});

router.get('/deleteowner',function(req,res){
    var pan=req.query.pan;
    companyCollection.findOne({id:req.cookies.userId},function(err,comDoc) {
        for (var i=0;i<comDoc.owners.length;i++){
            if (comDoc.owners[i].dpan==pan){
                comDoc.owners.splice(i,1);
            }
        }
       var newComDoc=comDoc;
       companyCollection.remove({id:req.cookies.userId},function(err){
           companyCollection.insertOne(newComDoc,function(err){
               res.send("1");
           });
       });
    });
});

router.post('/addOwners',function(req,res){
    

    console.log(req.files);
    /*var fileNameArray=[];
    req.files.employeefile.forEach(function(file) {
        fileManagement.writeFile(file);
        fileNameArray.push(file.name);
    }, this);*/
    var employees=[];
        din=req.body["din[]"];
        console.log(din);
        aadhar=req.body["aadhar[]"];
        console.log(aadhar);
        dpan=req.body["dpan[]"];
        console.log(dpan);
        cibil=req.body["cibil[]"];
        console.log(cibil);
        name=req.body["name[]"];
        console.log(name);
        mobile=req.body["mobile[]"];
        console.log(mobile);
        email=req.body["email[]"];
        console.log(email);
        landline=req.body["landline[]"];
        console.log(landline);
        pan=req.files["Pan[]"];
        console.log(pan);
        address=req.files["Address[]"];
        console.log(address);
        photo=req.files["Photo[]"];
        console.log(photo);

    if (name.constructor===Array){
    for (var i=0;i<name.length;i++){
        var docs=[];
        
        var pan="Pan-"+i;
        console.log("going inside");
        console.log(req.files[pan]);
        if (req.files[pan]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'pan',
                fileName:req.files[pan].name
            }
            fileManagement.writeFile(req.files[pan],hash);
            docs.push(pandoc);
        }
        var address="Address-"+i;
        if (req.files[address]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'address',
                fileName:req.files[address].name
            }
            fileManagement.writeFile(req.files[address],hash);
            docs.push(pandoc);
        }
        var photo="Photo-"+i;
        if (req.files[photo]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'photo',
                fileName:req.files[photo].name
            }
            fileManagement.writeFile(req.files[photo],hash);
            docs.push(pandoc);
        }

        var employee={
            din:din[i],
            aadhar:aadhar[i],
            name:name[i],
            mobile:mobile[i],
            email:email[i],
            dpan:dpan[i],
            cibil:cibil[i],
            landline:landline[i],
            employeeDocs:docs
        };
        if (i==name.length-1){
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{owners:employee}},function(err){              
                res.redirect('/supplier');        
        });
        }else {
            companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{owners:employee}},function(err){   
            });
        }
    }
    }else {

    var docs=[];
        
        var pan="Pan-0";
        console.log("going outside");
        console.log(req.files[pan]);
        if (req.files[pan]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'pan',
                fileName:req.files[pan].name
            }
            fileManagement.writeFile(req.files[pan],hash);
            docs.push(pandoc);
        }
        var address="Address-0";
        if (req.files[address]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'address',
                fileName:req.files[address].name
            }
            fileManagement.writeFile(req.files[address],hash);
            docs.push(pandoc);
        }
        var photo="Photo-0";
        if (req.files[photo]){
            var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
            var pandoc={
                id:''+hash,
                docName:'photo',
                fileName:req.files[photo].name
            }
            fileManagement.writeFile(req.files[photo],hash);
            docs.push(pandoc);
        }

        var employee={
            din:din,
            aadhar:aadhar,
            name:name,
            mobile:mobile,
            email:email,
            dpan:dpan,
            cibil:cibil,
            landline:landline,
            employeeDocs:docs
        };
        companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{owners:employee}},function(err){              
                res.redirect('/supplier');        
        });
    }

});

router.post('/editCompanyDetail',function(req,res){
    var companyName=req.body.companyName;
    var industryType=req.body.industryType;
    var businessType=req.body.businessType;
    var cin=req.body.cin;
    var landline=req.body.landline;
    var registeredAdress={
        address:req.body.address,
        City:req.body.city,
        State:req.body.state,
        PIN:req.body.pin
    };
    console.log(companyName);
    console.log(industryType);
    console.log(businessType);
    console.log(cin);
    console.log(landline);
    console.log(registeredAdress);
    var correspondenceAddress={
        address:req.body.c_address,
        City:req.body.c_city,
        State:req.body.c_state,
        PIN:req.body.c_pin
    };
     console.log(correspondenceAddress);
    //,$set:{IndustryType:industryType},$set:{BusinessType:businessType},$set:{CIN:cin},$set:{BusinessType:businessType},$set:{Landline:landline},$set:{registeredAddress:registeredAdress},$set:{correspondenceAddress:correspondenceAddress}
    companyCollection.findOneAndUpdate({id:req.cookies.userId},{$set:{CompanyName:companyName,IndustryType:industryType,BusinessType:businessType,CIN:cin,BusinessType:businessType,Landline:landline,registeredAddress:registeredAdress,correspondenceAddress:correspondenceAddress}},function(err){
        res.redirect('/supplier');
    });
});

router.post('/uploadDocs',function(req,res){
    console.log(req.files);
    var fileNameArray=[];
    req.files.employeefile.forEach(function(file) {
        fileManagement.writeFile(file);
        fileNameArray.push(file.name);
    }, this);
    console.log(fileNameArray);
    var fileNameArray1=[];
    req.files.companyfile.forEach(function(file) {
        fileManagement.writeFile(file);
        fileNameArray1.push(file.name);
    }, this);
    console.log(fileNameArray1);
    companyCollection.findOneAndUpdate({id:req.cookies.userId},{$push:{employeeDocs:fileNameArray},$push:{companyDocs:fileNameArray1}},function(err){
        res.redirect('/supplier');
    });
        
    
    /*companyCollection.insertOne({id:'abcd',CompanyName:req.body.companyName,IndustryType:req.body.Type,CIN:req.body.cin,registeredAddress:{Street:req.body.street,City:req.body.city,State:req.body.state,PIN:req.body.pin},employeeDocs:fileNameArray,companyDocs:fileNameArray1},function(err){
        res.send('done');
    });*/

});


router.get('/view-disburse-invoice',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function (accData){

        var invoiceId=''+req.query.poid;
        var bankInfo = JSON.parse(accData.result.message);
        console.log('coming 1');
        console.log(bankInfo);
        if (bankInfo.dInvoices!=null) {
            console.log('coming 2');
        console.log(bankInfo.dInvoices);
            for (var i=0;i<bankInfo.dInvoices.length;i++){
                if (invoiceId==bankInfo.dInvoices[i].details.invoiceId){
                    var inv=bankInfo.dInvoices[i];
                    console.log('coming 3');
                    console.log(inv);
                    returnSupplier(bankInfo.dInvoices[i].details.supplier,function(supplier){
                        console.log('coming 4');
                        console.log(inv.details.purchaseOrders[0]);    
                        var d=date.parse(inv.date,'DD-MM-YYYY');
                        d1=date.format(d,'MMMM DD YYYY');
                        creditDate=date.addDays(d,inv.days);
                        newCreditDate=date.format(creditDate,'MMMM DD YYYY');
                        console.log('coming 5');
                        console.log(inv.details.buyer);
                        returnBuyer(inv.details.buyer,function(buyer){
                            console.log('coming 6');
                            console.log(inv);
                            console.log(buyer.name);
                            console.log(supplier.name);
                            console.log(newCreditDate);
                            notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                                console.log(notifydoc);
                                res.render('view-disburse-invoice',{accData: bankInfo,notifydoc:notifydoc, invoice:inv,supplier:supplier.name,buyer:buyer.name,creditDate:newCreditDate,invoiceDate:d1,viewer:'supplier',employee:req.cookies.employee,configData:configData});
                            });    
                        });
                    });

                }
            }
        }
            
        
    });
});

function returnSupplier(id,func){
        userCollection.findOne({userId:id},function(err,supplier){
                    
                    console.log(supplier);
                    console.log('inside');
                    console.log(id);    
                    
                    func(supplier);                    
                });
                
}
router.get('/generate-invoice',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function(data){
        supplierInfo = JSON.parse(data.result.message);
            var invoiceNumber,num;
            if (supplierInfo.invoices!=null){
                if (supplierInfo.invoices.length<10){
                    num='000'+(supplierInfo.invoices.length+1);
                } else if (supplierInfo.invoices.length<100) {
                    num='00'+(supplierInfo.invoices.length+1);
                } else if (supplierInfo.invoices.length<1000) {
                    num='0'+(supplierInfo.invoices.length+1);
                } else {num=(supplierInfo.invoices.length+1);} 

                invoiceNumber='#IN'+'2017'+supplierInfo.supplierName.slice(0,3).toUpperCase()+num;
            }else {invoiceNumber='#IN'+'2017'+supplierInfo.supplierName.slice(0,3).toUpperCase()+'0001';}
        console.log(req.query);
        var poId='#'+req.query.poid;
        var order;
        for (var i=0;i<supplierInfo.purchaseOrders.length; i++) {
            if (supplierInfo.purchaseOrders[i].orderId==poId){
                order=supplierInfo.purchaseOrders[i];
            }
        }
        console.log(supplierInfo.purchaseOrders);
        console.log(order);
        
        returnSupplier(req.cookies.userId,function(accData){
            notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                    console.log(notifydoc);
            res.render("supplier-invoice", {supplierInfo: supplierInfo,notifydoc:notifydoc, order: order,invoiceNumber:invoiceNumber,accData:accData,configData:configData});
            });
        });
        
    });
});

router.post('/createInvoice',function(req,res,next){
    chaincodeCalls.createInvoice(req,res);
});

router.post('/updatePOstatus',function(req,res){
    chaincodeCalls.updatePOstatus(req,res);
});


router.get('/manage-po',function(req,res,next){



        chaincodeCalls.readAccount(req,res,function (dataSupplier){
            console.log('getting supplier');
            supplierInfo = JSON.parse(dataSupplier.result.message);
            /////
            var buyerName=[];
            if (supplierInfo.purchaseOrders!=null){
            console.log(supplierInfo.purchaseOrders.length);
            for (var i=0;i<supplierInfo.purchaseOrders.length;i++) {
                if (i==supplierInfo.purchaseOrders.length-1){
                userCollection.findOne({userId:supplierInfo.purchaseOrders[i].buyer},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    buyerName.push(result.name);
                    console.log(i);
                    console.log(supplierInfo.purchaseOrders.length);
                    
                         console.log('buyers-')
                         console.log(buyerName);
                         notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                         console.log(notifydoc);
                         res.render('supplier-po', {supplierInfo: supplierInfo,notifydoc:notifydoc,buyers:buyerName, accData: supplierInfo,configData:configData});
                         });
                });    
                } else {
                userCollection.findOne({userId:supplierInfo.purchaseOrders[i].buyer},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    buyerName.push(result.name);
                    console.log(i);
                    console.log(supplierInfo.purchaseOrders.length);
                }); 
                }
            
            }
        } else {
            notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                    console.log(notifydoc);
                res.render('supplier-po', {supplierInfo: supplierInfo,notifydoc:notifydoc,buyers:buyerName, accData: supplierInfo,configData:configData});
            });        
        }

            ////
            
            //console.log(supplierInfo);
            //res.render('supplier-po', {data: suppliers,supplierInfo: supplierInfo});
        });

  
    
});


router.get('/manage-invoice',function(req,res,next){
    
    chaincodeCalls.readAccount(req,res,function(data) {
        
        console.log('manage invoice starts here-')
        console.log(data);
        console.log('then-----')
        if (typeof data!= 'object'){
            console.log('problem');
            res.redirect('/supplier/manage-invoice');
        }else {
            if (data.result&&data.result.message){
        supplierInfo = JSON.parse(data.result.message);

            var buyerName=[];
            if (supplierInfo.invoices!=null){
            console.log(supplierInfo.invoices.length);
            for (var i=0;i<supplierInfo.invoices.length;i++) {
                if (i==supplierInfo.invoices.length-1){
                userCollection.findOne({userId:supplierInfo.invoices[i].buyer},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    buyerName.push(result.name);
                    console.log(i);
                    console.log(supplierInfo.invoices.length);
                    
                         console.log('buyers-')
                         console.log(buyerName);
                         notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                            console.log(notifydoc);
                            renderWithBank(req,res,supplierInfo,notifydoc,buyerName,configData);
                            //res.render('supplier-manage-invoice', {supplierInvoices: supplierInfo.invoices,notifydoc:notifydoc,buyers:buyerName,accData:supplierInfo,configData:configData});
                         });   
                });    
                } else {
                userCollection.findOne({userId:supplierInfo.invoices[i].buyer},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    buyerName.push(result.name);
                    console.log(i);
                    console.log(supplierInfo.invoices.length);
                }); 
                }
            
            }
        } else {
            notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                    console.log(notifydoc);
                res.render('supplier-manage-invoice', {supplierInvoices: supplierInfo.invoices,notifydoc:notifydoc,accData:supplierInfo,buyers:buyerName,configData:configData});
            });
        }



/////
       /* console.log(supplierInfo.invoices);
        userCollection.findOne({userId:supplier},function(err,result){
            console.log(result.name);
            res.render("supplier-manage-invoice", {supplierInvoices: supplierInfo.invoices});
        });*/

        //res.render("supplier-manage-invoice", {supplierInvoices: supplierInfo.invoices});
        }else{res.redirect('/supplier/manage-invoice');}}
    });
    
});


  function renderWithBank(req,res,supplierInfo,notifydoc,buyerName,configData) {
    var bankName=[];
    console.log('buyers rendering');
    console.log(buyerName);
            if (supplierInfo.offers!=null){
            console.log(supplierInfo.offers.length);
            for (var i=0;i<supplierInfo.offers.length;i++) {
                if (i==supplierInfo.offers.length-1){
                userCollection.findOne({userId:supplierInfo.offers[i].details.bank},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    bankName.push(result.name);
                    console.log(i);
                    console.log(supplierInfo.offers.length);
                    
                         console.log('bankers-');
                         console.log(bankName);
                         //getDinvBuyerSupplier(req,res,bankInfo,invoices,buyerName,supplierName);
                         notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                            console.log('again checking');
                            console.log(buyerName);
                            res.render('supplier-manage-invoice', {supplierInvoices: supplierInfo.invoices,notifydoc:notifydoc,buyers:buyerName,accData:supplierInfo,configData:configData,banks:bankName});
                         });
                         //return supplierName;
                    
                });    
                } else {
                userCollection.findOne({userId:supplierInfo.offers[i].details.bank},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    bankName.push(result.name);
                    console.log(i);
                    
                }); 
                }
            
            }
        } else {
                         //return supplierName;
                         notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                        console.log('again checking');
                        console.log(buyerName);
                            res.render('supplier-manage-invoice', {supplierInvoices: supplierInfo.invoices,notifydoc:notifydoc,buyers:buyerName,accData:supplierInfo,configData:configData});                         });
            }
  
}


router.get('/view-invoice',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function (dataSupplier){
        var invoiceId=''+req.query.poid;
        if (dataSupplier.result&&dataSupplier.result.message){
        var SupplierInfo = JSON.parse(dataSupplier.result.message);
        console.log(SupplierInfo);
        console.log('---------------------');
        console.log(invoiceId);
        console.log('---------------------');
        if (SupplierInfo.invoices!=null){
        for (var i=0;i<SupplierInfo.invoices.length;i++){
            console.log('coming here');
            if (invoiceId==SupplierInfo.invoices[i].invoiceId){
                console.log('coming here also');
                var inv=SupplierInfo.invoices[i];
                returnBuyer(SupplierInfo.invoices[i].buyer,function(buyer){
                    var d=date.parse(inv.date,'DD-MM-YYYY');
                    d1=date.format(d,'MMMM DD YYYY');
                    creditDate=date.addDays(d,inv.purchaseOrders[0].creditPeriod);
                    newCreditDate=date.format(creditDate,'MMMM DD YYYY');
                    returnSupplier(req.cookies.userId,function(accData){
                        notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                            console.log(notifydoc);
                            res.render('view-invoice',{invoice:inv,notifydoc:notifydoc,accData:accData,supplier:req.cookies.name,buyer:buyer.name,creditDate:newCreditDate,invoiceDate:d1,viewer:'supplier',employee:buyer.employeeName,configData:configData});
                        });
                    });
                });
                
                console.log('outside');
                console.log(SupplierInfo.invoices[i]); 
                //res.render('view-invoice',{invoice:SupplierInfo.invoices[i]});

           }
        }
    } else {
        console.log(SupplierInfo.invoices);
            res.render('view-invoice',{configData:configData});
        }
    }else {res.redirect('back');}
    });
    
});


router.get('/update-offer',function(req,res){
    chaincodeCalls.UpdateOfferStatus(req,res,function (dataSupplier){
        res.redirect('/supplier/manage-invoice');
    });
});

router.get('/view-po',function(req,res){
    chaincodeCalls.readAccount(req,res,function (dataSupplier){

        var invoiceId='#'+req.query.poid;
        var supplierInfo = JSON.parse(dataSupplier.result.message);
        if (supplierInfo.purchaseOrders!=null){
            for (var i=0;i<supplierInfo.purchaseOrders.length;i++){
                if (invoiceId==supplierInfo.purchaseOrders[i].orderId){
                    var inv=supplierInfo.purchaseOrders[i];
                    returnBuyer(supplierInfo.purchaseOrders[i].buyer,function(buyer){
                        var d=date.parse(inv.date,'DD-MM-YYYY');
                        d1=date.format(d,'MMMM DD YYYY');
                        creditDate=date.addDays(d,inv.creditPeriod);
                        newCreditDate=date.format(creditDate,'MMMM DD YYYY');
                        notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                            res.render('view-po',{invoice:inv,notifydoc:notifydoc,supplier:req.cookies.name,buyer:buyer.name,creditDate:newCreditDate,invoiceDate:d1,accData: supplierInfo,viewer:'supplier',configData:configData});
                        });
                    });
                }
            }
        }
        
    });
});


router.get('/supplier-detail',function(req,res){

    chaincodeCalls.readAccount(req,res,function(data){

        accData = JSON.parse(data.result.message);
        console.log(req.query.id);
        console.log(req.cookies.userId);
        var info={};
        companyCollection.findOne({id:req.query.id},function(err,result){
            
            console.log("Result" + result);

            userCollection.findOne({userId:req.query.id},function(err,doc){
                if (result&&result!=null){
                info=result;
                }else {
                    info.id=req.query.id;
                    info.CompanyName=doc.name;
                    info.IndustryType="not set";
                    info.BusinessType="not set";
                    info.CIN="not set";
                    info.Email=doc.email;
                    info.Mobile=doc.phoneNumber;
                    info.Landline=doc.phoneNumber;
                    info.Company_Desc="not set";
                    info.registeredAddress={
                        address:"not set",
                        City:"not set",
                        State:"not set",
                        PIN:"not set"
                    }
                    info.correspondenceAddress={
                        address:"not set",
                        City:"not set",
                        State:"not set",
                        PIN:"not set"
                    }
                    info.owners=[];
                    info.companyDocs=[];
                }
                console.log("User" + doc);

                notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                    chaincodeCalls.getBuyersForSupplier(req.query.id,function(buyersArray){
                        if (req.query.by=='bank'){
                            userCollection.findOne({userId:req.cookies.userId},function(err,bankAcc){
                                res.render('supplier/supplier-detail',{accData: accData, Info:info,data:doc,notifydoc:notifydoc,viewer:req.query.by,buyersArray:buyersArray,bankAcc:bankAcc});
                            });
                        }else {
                            res.render('supplier/supplier-detail',{accData: accData, Info:info,data:doc,notifydoc:notifydoc,viewer:req.query.by,buyersArray:buyersArray});
                        }
                    });
                    
                });
            });
            
        });

    });
    

});



router.get('/settings',function(req,res) {
    chaincodeCalls.readAccount(req,res,function(data){

        companyCollection.findOne({id:req.cookies.userId},function(err,comDoc){
            supplierInfo = JSON.parse(data.result.message);
            chaincodeCalls.getBlockchainData(req,res,function(data){
                blockchainlogs.find({}).toArray(function(err,chaindata){
                
                    notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                        res.render("supplier/settings", {blockData: data, chaindata: chaindata, accData: supplierInfo,notifydoc:notifydoc,configData:configData});
                    });
            
                });
            });
        });
    });
});





function returnBuyer(id,func){
        userCollection.findOne({userId:id},function(err,buyer){
                    
                    console.log(buyer);
                    console.log('inside');
                    console.log(id);    
                    
                    func(buyer);                    
                });
                
}
router.get('/logout',function(req,res,next){
    res.clearCookie('name');
    res.clearCookie('id');
    res.clearCookie('balance');
    res.clearCookie('orders');
    res.clearCookie('type');
    res.clearCookie('password');
    res.clearCookie('chaincodeinfo');
    res.redirect('/');

});




module.exports=router;