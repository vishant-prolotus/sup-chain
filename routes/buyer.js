var express=require('express');
var router=express.Router();
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var url=require('../config/database').url;
var date = require('date-and-time');
var fileManagement=require('../config/fileManagement');
var userCollection=require('../config/collection').collection;
var chaincodeCalls=require('../chaincodeCalls/chaincodecalls');
var blockchainlogs=require('../config/blockchainlogs').collection;
var notifications=require('../config/notifications').collection;
var companyCollection=require('../config/companyDetailsCollection').collection;
var buyerInfo;
var configData=require('../models/configData');

router.get('/',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function (accData){
        if (typeof accData == 'object'&&accData.result){
        var buyerInfo = JSON.parse(accData.result.message);

        chaincodeCalls.getBlockchainData(req,res,function(data){
                blockchainlogs.find({}).toArray(function(err,chaindata){
                    console.log('======================req.cookies.userId=====================');
                    console.log(req.cookies.userId);
                    notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log('---------------------------notifydoc---------------------------------');
                        console.log(notifydoc);
                        res.render('buyer', {blockData: data, accData: buyerInfo, chaindata: chaindata,notifydoc:notifydoc,configData:configData});
                    });
                });

        });
        }
    });
});



router.get('/buyer-detail',function(req,res) {

    chaincodeCalls.readAccount(req,res,function(data) {

        accData = JSON.parse(data.result.message);

        companyCollection.findOne({id:req.query.id},function(err,result){

            console.log("Result" + result);

            userCollection.findOne({userId:req.query.id},function(err,doc){

                console.log("User" + result);

                notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                    res.render('buyer/buyer-detail',{accData: accData, Info:result,data:doc,notifydoc:notifydoc,viewer:req.query.by});
                });
            });
            
        });

    });
    

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
                            res.render('view-disburse-invoice',{accData: bankInfo, notifydoc:notifydoc,invoice:inv,supplier:supplier.name,buyer:buyer.name,creditDate:newCreditDate,invoiceDate:d1,viewer:'buyer',employee:req.cookies.employee,configData:configData});
                            });
                        });
                    });

                }
            }
        }
            
        
    });
});


router.get('/view-invoice',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function (dataBuyer){
        var invoiceId = ''+req.query.poid;
        var buyerInfo = JSON.parse(dataBuyer.result.message);
        console.log(buyerInfo);
        console.log("=================================");
        console.log(invoiceId);
        console.log('==================================');
        if (buyerInfo.invoices!=null){
        for (var i=0;i<buyerInfo.invoices.length;i++){
            console.log('coming here');
            if (invoiceId==buyerInfo.invoices[i].invoiceId){
                var inv=buyerInfo.invoices[i];
                returnSupplier(buyerInfo.invoices[i].supplier,function(supplier){
                    var d=date.parse(inv.date,'DD-MM-YYYY');
                    d1=date.format(d,'MMMM DD YYYY');
                    creditDate=date.addDays(d,inv.purchaseOrders[0].creditPeriod);
                    newCreditDate=date.format(creditDate,'MMMM DD YYYY');
                    returnBuyerByemail(req.cookies.email,function(accData){
                        notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                        console.log('/////////////////////');
                        console.log(accData);
                        console.log('/////////////////////');
                        res.render('view-invoice',{invoice:inv,notifydoc:notifydoc,accData:accData,supplier:supplier.name,buyer:req.cookies.name,creditDate:newCreditDate,invoiceDate:d1,viewer:'buyer',employee:req.cookies.employee,configData:configData});
                        });
                    });
                });
                
                console.log('outside');
                console.log(buyerInfo.invoices[i]); 
                //res.render('view-invoice',{invoice:buyerInfo.invoices[i]});

           }
        }
    } else {
        console.log(buyerInfo.invoices);
            res.render('view-invoice',{configData:configData});
        }
    });
    
});



router.get('/approveInvoice',function(req,res,next){
    userCollection.findOne({email:req.cookies.email},function(doc){

        
        chaincodeCalls.updateInvoiceStatus(req,res,'approved',function(data){
            if (doc){
                res.redirect('/buyer/manage-invoice',{viewer:doc.type});
            }else {console.log('outside');
                res.redirect('/buyer/manage-invoice');}
        });
    });
});

router.get('/goodsRecieved',function(req,res,next){
    chaincodeCalls.updateInvoiceStatus(req,res,'Goods Recieved',function(data){
        res.redirect('/buyer/manage-invoice')
    });
});

router.get('/qualityCheck',function(req,res,next){
    chaincodeCalls.updateInvoiceStatus(req,res,'Quality Check',function(data){
        res.redirect('/buyer/manage-invoice')
    });
});
router.post('/qualityCheck',function(req,res){
    console.log(req.files);
    var GfileId='G'+req.body.invID;
    var QfileId='Q'+req.body.invID;
    console.log('==================');
    console.log(GfileId);
    console.log(QfileId);
    console.log('==================');
    chaincodeCalls.updateInvoiceStatusbyPost(req,res,'Quality Check',function(data){
        if (req.files.file_goods){
            fileManagement.writeFile(req.files.file_goods,GfileId);
        }
        if (req.files.file_quality){
            fileManagement.writeFile(req.files.file_quality,QfileId);
        }
        res.redirect('/buyer/manage-invoice')
    });
});

router.get('/rejectInvoice',function(req,res,next){
        chaincodeCalls.updateInvoiceStatus(req,res,'rejected',function(data){
        res.redirect('/buyer')
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

router.post('/purchaseOrder',function(req,res,next){        
    chaincodeCalls.createPO(req,res,buyerInfo);
});

router.get('/manage-po',function(req,res,next){
    chaincodeCalls.readAllSuppliers(req,res,function(data){
        if (data.result&&data.result.message){
        suppliers = JSON.parse(data.result.message);

        chaincodeCalls.readAccount(req,res,function (dataBuyer){
            console.log('getting buyer');

            buyerInfo = JSON.parse(dataBuyer.result.message);
            var poNumber,num;
            if (buyerInfo.purchaseOrders!=null){
                if (buyerInfo.purchaseOrders.length<10){
                    num='000'+(buyerInfo.purchaseOrders.length+1);
                } else if (buyerInfo.purchaseOrders.length<100) {
                    num='00'+(buyerInfo.purchaseOrders.length+1);
                } else if (buyerInfo.purchaseOrders.length<1000) {
                    num='0'+(buyerInfo.purchaseOrders.length+1);
                } else {num=(buyerInfo.purchaseOrders.length+1);} 

                poNumber='#PO'+'2017'+buyerInfo.buyerName.slice(0,3)+num;
            }else {poNumber='#PO'+'2017'+buyerInfo.buyerName.slice(0,3).toUpperCase()+'0001';}
            var supplierName=[];
            if (buyerInfo.purchaseOrders!=null){
            console.log(buyerInfo.purchaseOrders.length);
            for (var i=0;i<buyerInfo.purchaseOrders.length;i++) {
                if (i==buyerInfo.purchaseOrders.length-1){
                userCollection.findOne({userId:buyerInfo.purchaseOrders[i].supplier},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    supplierName.push(result.name);
                    console.log(i);
                    console.log(buyerInfo.purchaseOrders.length);
                    
                         console.log('suppliers-')
                         console.log(supplierName);
                         notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                         res.render('buyer-po', {data: suppliers,notifydoc:notifydoc,buyerInfo: buyerInfo,poNumber:poNumber,suppliers:supplierName, accData: buyerInfo,configData:configData});
                         });
                });    
                } else {
                userCollection.findOne({userId:buyerInfo.purchaseOrders[i].supplier},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    supplierName.push(result.name);
                    console.log(i);
                    console.log(buyerInfo.purchaseOrders.length);
                }); 
                }
            
            }
        } else {
            notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                res.render('buyer-po', {data: suppliers,notifydoc:notifydoc,buyerInfo: buyerInfo,poNumber:poNumber,suppliers:supplierName, accData: buyerInfo,configData:configData});
            });
        }
            //console.log('suppliers-')
            //console.log(supplierName);
            //res.render('buyer-po', {data: suppliers,buyerInfo: buyerInfo,poNumber:poNumber,suppliers:supplierName});
        });
        }else {
            res.redirect('/buyer/manage-po');
        }

    });
    
});

router.post('/manage-po/generatePO',function(req,res,next){
    chaincodeCalls.createPO(req,res);

    
});

router.get('/manage-invoice',function(req,res,next){
    
        chaincodeCalls.readAccount(req,res,function(data) {

        buyerInfo = JSON.parse(data.result.message);
/////

            /////
            var supplierName=[];
            if (buyerInfo.invoices!=null){
            console.log(buyerInfo.invoices.length);
            for (var i=0;i<buyerInfo.invoices.length;i++) {
                if (i==buyerInfo.invoices.length-1){
                userCollection.findOne({userId:buyerInfo.invoices[i].supplier},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    supplierName.push(result.name);
                    console.log(i);
                    console.log(buyerInfo.invoices.length);
                    
                         console.log('suppliers-')
                         console.log(supplierName);
                         notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                        
                         userCollection.findOne({email:req.cookies.email},function(err,buyerDoc){
                             console.log("---------------");
                            console.log(buyerDoc);
                            res.render('buyer-invoice', {buyerInvoice: buyerInfo.invoices,notifydoc:notifydoc,supplier:supplierName,accData: buyerInfo,configData:configData,viewer:buyerDoc.type});
                         });
                         
                         });
                });    
                } else {
                userCollection.findOne({userId:buyerInfo.invoices[i].supplier},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    supplierName.push(result.name);
                    console.log(i);
                    console.log(buyerInfo.invoices.length);
                }); 
                }
            
            }
        } else {
            notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                        userCollection.findOne({email:req.cookies.email},function(err,buyerDoc){
                            console.log("---------------");
                            console.log(buyerDoc);
                            res.render('buyer-invoice', {buyerInvoice: buyerInfo.invoices,notifydoc:notifydoc,supplier:supplierName,accData: buyerInfo,configData:configData,viewer:buyerDoc.type});
                });
            });
        }




    });
    
    /*chaincodeCalls.readAccount(req,res,function(data) {

        buyerInfo = JSON.parse(data.result.message);

        console.log(buyerInfo);


        res.render('buyer-invoice', { buyerInvoice: buyerInfo.invoices });

    });*/
    
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


router.get('/view-po',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function (dataBuyer){

        var invoiceId='#'+req.query.poid;
        //var invoiceId = req.query.poid;

        var buyerInfo = JSON.parse(dataBuyer.result.message);
        if (buyerInfo.purchaseOrders!=null){
            for (var i=0;i<buyerInfo.purchaseOrders.length;i++){
                if (invoiceId==buyerInfo.purchaseOrders[i].orderId){
                    var inv=buyerInfo.purchaseOrders[i];
                    returnSupplier(buyerInfo.purchaseOrders[i].supplier,function(supplier){
                        var d=date.parse(inv.date,'DD-MM-YYYY');
                        d1=date.format(d,'MMMM DD YYYY');
                        creditDate=date.addDays(d,inv.creditPeriod);
                        newCreditDate=date.format(creditDate,'MMMM DD YYYY');
                        notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                        res.render('view-po',{invoice:inv,notifydoc:notifydoc,supplier:supplier.name,buyer:req.cookies.name,creditDate:newCreditDate,invoiceDate:d1,accData: buyerInfo,viewer:'buyer',configData:configData});
                        });
                    });
                }
            }
        }







        
    });
});
function returnBuyer(id,func){
        userCollection.findOne({userId:id},function(err,supplier){   
                    
                    func(supplier);                    
                });
                
}

function returnBuyerByemail(email,func){
        userCollection.findOne({email:email},function(err,supplier){   
                    
                    func(supplier);                    
                });
                
}

module.exports=router;