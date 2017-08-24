var express=require('express');
var router=express.Router();
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var url=require('../config/database').url;
var userCollection=require('../config/collection').collection;
var chaincodeCalls=require('../chaincodeCalls/chaincodecalls');
var crypto=require('crypto');
var fileManagement=require('../config/fileManagement');
var companyCollection=require('../config/companyDetailsCollection').collection;
var notifications=require('../config/notifications').collection;
var blockchainlogs=require('../config/blockchainlogs').collection;
var date = require('date-and-time');
var configData=require('../models/configData');
mongoose.connect(url);


router.get('/',function(req,res,next){

    chaincodeCalls.getBlockchainData(req,res,function(data){
                console.log('getting supplier');
                blockchainlogs.find({}).toArray(function(err,chaindata){
                    res.render("admin", {blockData: data, chaindata: chaindata});
                });
            });
});

router.get('/email', function(req, res, next) {
    chaincodeCalls.getBlockchainData(req,res,function(data){
        console.log('getting supplier');
        blockchainlogs.find({}).toArray(function(err,chaindata){
            res.render("admin/email", {blockData: data, chaindata: chaindata});
        });
    });
});


router.post('/registerNewUser',function(req,res,next){
    if(req.body.role=='buyer') {
        chaincodeCalls.initBuyer(req,res,function(data){
            userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'buyer',status:req.body.status,phoneNumber:req.body.phone},function(err){
                res.redirect('/admin/manage-buyer');
            });
        });
    } else if (req.body.role=='supplier') {
        chaincodeCalls.initSupplier(req,res,function(data){
            userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'supplier',status:req.body.status,phoneNumber:req.body.phone},function(err){
                res.redirect('/admin/manage-supplier');
            });
        });
    }
});

router.get('/manage-buyer',function(req,res,next){
    
    userCollection.find({ role: 'buyer' }).toArray(function(err,result) {
        res.render('admin/admin-buyer',{data:result});
    });
   
    
});

router.get('/manage-supplier',function(req,res,next){
    
    userCollection.find({ role: 'supplier' }).toArray(function(err,result) {
        res.render('admin/admin-supplier',{data:result});
    });
    
});

router.get('/changeSupplierState',function(req,res){
    var supplierId=req.query.supplierId;
    userCollection.findOne({userId:supplierId},function(err,result){
        if (result.status=='active'){
            userCollection.findOneAndUpdate({userId:supplierId},{$set:{status:'inactive'}},function(err,doc){
                res.redirect('/admin/manage-supplier');
            });
        }else {
            userCollection.findOneAndUpdate({userId:supplierId},{$set:{status:'active'}},function(err,rec){
                res.redirect('/admin/manage-supplier');
            });
        }
    });
});

router.get('/addBuyer',function(req,res){
    res.render('admin/admin-add-buyer');
});

router.post('/manage-buyer',function(req,res,next){
    var hash=crypto.createHash('md5').update(req.body.name+req.body.password).digest('hex');

    chaincodeCalls.initBuyer(req,res,function(data){         
            userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'buyer',status:'active',employeeName:req.body.employee,phoneNumber:req.body.phone,type:'maker'},function(err){
                
                userCollection.insertOne({name:req.body.name,email:req.body.vemail,password:req.body.vpassword,userId:hash,role:'buyer',status:'active',employeeName:req.body.vemployee,phoneNumber:req.body.vphone,type:'verifier'},function(err){
                    makeUserCompanyRegistration(req,res,hash,function(){
                        console.log("done");
                        res.redirect('/admin/manage-buyer');
                    });
                });
            });
            
        });
       
});

router.post('/manage-bank',function(req,res){
    var hash=crypto.createHash('md5').update(req.body.name+req.body.password).digest('hex');
    chaincodeCalls.initBanker(req,res,function(data){
        userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'bank',status:'active',employeeName:req.body.employee,phone:req.body.phone,minAge:req.body.minAge,minRevenue:req.body.minRevenue,dser:req.body.dser,geoFootprint:req.body.geoFootprint,invoiceFunding:req.body.fundRate,interestCharges:req.body.interestCharges,recourse:req.body.recourse,supplierLimits:[],supplierInvoiceLimits:[]},function(err){
            console.log("done");
            res.redirect('/admin/manage-bank');        
        });
    }); 
});
router.get('/manage-bank',function(req,res){
    userCollection.find({ role: 'bank' }).toArray(function(err,result) {
        res.render('admin/admin-bank',{data:result});
    });
});

router.get('/add-bank',function(req,res){
    userCollection.find({ role: 'bank' }).toArray(function(err,result) {
        res.render('admin/admin-add-bank',{data:result});
    });
});
////////////////Supplier view & Edit
router.get('/getSupplier',function(req,res){
    var supplierId=req.query.supplierId;
    var tabID = req.query.tab;
    var buyerName=[];
    companyCollection.findOne({id:supplierId},function(err,Record){
        chaincodeCalls.readAccountByAdmin(supplierId,function(supplierData){
            var supplierInfo = JSON.parse(supplierData.result.message);
            console.log('=========here============');
            console.log(supplierInfo);
            var newRecord={};
            if (Record!=null){
                Record.invoices=supplierInfo.invoices;
                newRecord=Record;
            }else {
                newRecord.id=supplierId;
                newRecord.CompanyName=supplierInfo.supplierName;
                newRecord.IndustryType="";
                newRecord.BusinessType="";
                newRecord.CIN="";
                newRecord.Email=supplierInfo.emailId;
                newRecord.Mobile="";
                newRecord.Landline="";
                newRecord.Company_Desc="";
                newRecord.registeredAddress={
                    address:"",
                    City:"",
                    State:"",
                    PIN:""
                }
                newRecord.correspondenceAddress={
                    address:"",
                    City:"",
                    State:"",
                    PIN:""
                }
                newRecord.owners=[];
                newRecord.companyDocs=[];
                newRecord.invoices=[];

            }
            console.log(Record);
            // if (Record.invoices&&Record.invoices!=null&&Record.invoices.length>0){
            // console.log(Record.invoices[0].purchaseOrders);
            // }
            if (supplierInfo&&supplierInfo.invoices&&supplierInfo.invoices!=null&&supplierInfo.invoices.length>0){
            for (var i=0;i<supplierInfo.invoices.length;i++) {
                if (i==supplierInfo.invoices.length-1){
                userCollection.findOne({userId:supplierInfo.invoices[i].buyer},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    buyerName.push(result.name);
                    console.log(i);
                    console.log(supplierInfo.invoices.length);
                    
                         console.log('bankers-');
                         console.log(buyerName);
                         //getDinvBuyerSupplier(req,res,bankInfo,invoices,buyerName,supplierName);
                        chaincodeCalls.getBuyersForSupplier(supplierId,function(buyersArray){
                            res.render("admin/supplier-view", {supplierAcc: supplierInfo, Record: newRecord,buyers:buyerName,buyersArray:buyersArray, tabID: tabID});
                        });
                         //return supplierName;
                    
                });    
                } else {
                userCollection.findOne({userId:supplierInfo.invoices[i].buyer},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    buyerName.push(result.name);
                    console.log(i);
                    
                }); 
                }
            
            }
        }else {
                chaincodeCalls.getBuyersForSupplier(supplierId,function(buyersArray){
                    res.render("admin/supplier-view", {supplierAcc: supplierInfo, Record: newRecord,buyers:[],buyersArray:buyersArray, tabID: tabID});
                });
            }
            //////////////////////
            
        });
        
    });
});

router.get('/getInvoice',function(req,res){
    var supplierId=req.query.supplierId;
    var invoiceId=req.query.invoiceId;
    chaincodeCalls.readAccountByAdmin(supplierId,function(supplierData){
        var SupplierInfo = JSON.parse(supplierData.result.message);
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
                    var newCreditDate=date.format(creditDate,'MMMM DD YYYY');
                    returnSupplier(supplierId,function(accData){
                        
                            res.render('admin/admin-view-invoice',{invoice:inv,supplier:accData.name,buyer:buyer.name,creditDate:newCreditDate,invoiceDate:d1,viewer:'admin',employee:buyer.employeeName,configData:configData});
                        
                    });
                });
                
                console.log('outside');
                console.log(SupplierInfo.invoices[i]); 
                //res.render('view-invoice',{invoice:SupplierInfo.invoices[i]});

           }
        }
    } else {
        console.log(SupplierInfo.invoices);
            res.render('admin/admin-view-invoice',{configData:configData});
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

function returnBuyer(id,func){
        userCollection.findOne({userId:id},function(err,buyer){
                    
                    console.log(buyer);
                    console.log('inside');
                    console.log(id);    
                    
                    func(buyer);                    
                });
                
}

router.get('/editCompanyDocuments/delete',function(req,res){
    var id=req.query.id;
    var userId=req.query.userId;
        companyCollection.findOne({id:userId},function(err,compData){
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
            companyCollection.remove({id:userId},function(){
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
            res.redirect('back')
        });
});

router.post('/editOwners',function(req,res){
    var userId=req.body.userId;
    companyCollection.findOneAndUpdate({id:userId},{$set:{owners:null}},function(err){ 
    
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{owners:employee},$set:{state:2}},function(err){              
                res.redirect('back');        
        });
        }else {
            companyCollection.findOneAndUpdate({id:userId},{$push:{owners:employee},$set:{state:2}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{owners:employee},$set:{state:2}},function(err){              
                res.redirect('back');        
        });
    }
    });
});

router.get('/editOwnerDocuments/delete',function(req,res){
    var fileName=req.query.filename;
    var din=req.query.din;
    var userId=req.query.userId;
        companyCollection.findOne({id:userId},function(err,compData){
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
            companyCollection.remove({id:userId},function(){
                companyCollection.insertOne(newCompData);
                console.log('inserted updated');
            });
            /*compData.save(function(err,docSaved){
                if (!err){
                    console.log('succesfully updated ');
                    res.send(docSaved);
                }
            });*/   
            res.redirect('back')
        });
});


router.get('/deleteowner',function(req,res){
    var pan=req.query.pan;
    var userId=req.query.userId;
    companyCollection.findOne({id:userId},function(err,comDoc) {
        for (var i=0;i<comDoc.owners.length;i++){
            if (comDoc.owners[i].dpan==pan){
                comDoc.owners.splice(i,1);
            }
        }
       var newComDoc=comDoc;
       companyCollection.remove({id:userId},function(err){
           companyCollection.insertOne(newComDoc,function(err){
               res.send("1");
           });
       });
    });
});



router.post('/postCompanyDocs',function(req,res){
    console.log(req.files);
    var userId=req.body.userId;
    if (req.files["Pan"]){
        var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
        var doc={
            id:''+hash,
            docName:"pan",
            fileName:req.files["Pan"].name
        }
        fileManagement.writeFile(req.files["Pan"],hash);
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
            companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
            companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
            });
        }
    }
    res.redirect('back');
});

router.post('/editCompanyDetail',function(req,res){
    var userId=req.body.userId;
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
     console.log(req.body);
     console.log('=========================================');
     console.log(userId,companyName,industryType,businessType,cin,landline,registeredAdress,correspondenceAddress);
    //,$set:{IndustryType:industryType},$set:{BusinessType:businessType},$set:{CIN:cin},$set:{BusinessType:businessType},$set:{Landline:landline},$set:{registeredAddress:registeredAdress},$set:{correspondenceAddress:correspondenceAddress}
    companyCollection.findOneAndUpdate({id:userId},{$set:{CompanyName:companyName,IndustryType:industryType,BusinessType:businessType,CIN:cin,BusinessType:businessType,Landline:landline,registeredAddress:registeredAdress,correspondenceAddress:correspondenceAddress}},function(err){
        res.redirect('back');
    });
});

router.post('/addOwners',function(req,res){
    
    var userId=req.body.userId;
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{owners:employee}},function(err){              
                res.redirect('back');        
        });
        }else {
            companyCollection.findOneAndUpdate({id:userId},{$push:{owners:employee}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{owners:employee}},function(err){              
                res.redirect('back');        
        });
    }

});

//////////////////////////////////////////

function makeUserCompanyRegistration(req,res,userId,callBack){
    console.log('============makeUserCompanyRegistration==========');
    console.log(req.body);
    userCollection.findOne({userId:userId},function(err,userDoc){
        companyCollection.insertOne({id:userId,CompanyName:req.body.name,Company_Desc:req.body.hCompany,Mobile:req.body.txtMobile,Email:req.body.txtEmail,IndustryType:req.body.industryType,BusinessType:req.body.businessType,Landline:req.body.landline,CIN:req.body.cin,registeredAddress:{address:req.body.street,City:req.body.city,State:req.body.state,PIN:req.body.pin},correspondenceAddress:{address:req.body.c_street,City:req.body.c_city,State:req.body.c_state,PIN:req.body.c_pin},state:1},function(err){
            uploadDirector(req,res,userId,function(){
                callBack();
            });
        });
    });
    
}

function uploadDirector(req,res,userId,callBack){
    console.log('=====================All Files===============');
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{owners:employee},$set:{state:2}},function(err){              
                uploadCompanyDocs(req,res,userId,function(){
                    callBack();
                });
                        
        });
        }else {
            companyCollection.findOneAndUpdate({id:userId},{$push:{owners:employee},$set:{state:2}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{owners:employee},$set:{state:2}},function(err){              
                uploadCompanyDocs(req,res,userId,function(){
                    callBack();
                });    
        });
    }
    
};

function uploadCompanyDocs(req,res,userId,callBack){
    console.log(req.files);
    if (req.files["Pan"]){
        var hash=crypto.createHash('md5').update(''+Date.now()+Math.random()).digest('hex');
        var doc={
            id:''+hash,
            docName:"pan",
            fileName:req.files["Pan"].name
        }
        fileManagement.writeFile(req.files["Pan"],hash);
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:ruserId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
            companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
        companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
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
            companyCollection.findOneAndUpdate({id:userId},{$push:{companyDocs:doc},$set:{state:3}},function(err){   
            });
        }
    }
    callBack();
}

router.post('/manage-supplier',function(req,res,next){
    var hash=crypto.createHash('md5').update(req.body.name+req.body.password).digest('hex');
    userCollection.findOne({email:req.body.email},function(err,user){
        if (user!=null){
            console.log('user exists');
            res.redirect('/');
        } else {
            console.log('user does not exists');
            chaincodeCalls.initSupplier(req,res,function(data){
            userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'supplier',status:'inactive',employeeName:req.body.employee,phoneNumber:req.body.phone,state:req.body.state},function(err){
                //res.redirect('/login');
                res.clearCookie('name');
                res.clearCookie('password');
                res.clearCookie('role');
                res.clearCookie('userId');
                res.clearCookie('email');
                ////
                res.cookie('name',req.body.name);
                res.cookie('password',req.body.password);
                res.cookie('role','supplier');
                res.cookie('userId',hash);
                res.cookie('email',req.body.email);
                res.cookie('employee',req.body.employee);
                setTimeout(function(){
                    res.redirect('/supplier');
                },2000);
                
            });
        });
        }
    });
    
    
    
});

router.post('/manage-bank',function(req,res,next){
    var hash=crypto.createHash('md5').update(req.body.name+req.body.password).digest('hex');
    chaincodeCalls.initBanker(req,res,function(data){
            userCollection.insertOne({name:req.body.name,email:req.body.email,password:req.body.password,userId:hash,role:'bank',status:'active',employeeName:req.body.employee,phoneNumber:req.body.phone},function(err){
                res.redirect('/admin/manage-bank');
            });
        });
    
});

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