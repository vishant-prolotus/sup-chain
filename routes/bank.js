var express=require('express');
var router=express.Router();
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var url=require('../config/database').url;
var date = require('date-and-time');
var userCollection=require('../config/collection').collection;
var chaincodeCalls=require('../chaincodeCalls/chaincodecalls');
var blockchainlogs=require('../config/blockchainlogs').collection;
var notifications=require('../config/notifications').collection;
var invoiceStatus=require('../config/invoicestatus').collection;
var configData=require('../models/configData');
router.get('/',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function (accData){

        var bankInfo = JSON.parse(accData.result.message);

        chaincodeCalls.getBlockchainData(req,res,function(data){
                blockchainlogs.find({}).toArray(function(err,chaindata){
                    notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                        res.render('bank', {blockData: data, accData: bankInfo, chaindata: chaindata,notifydoc:notifydoc,configData:configData});
                    });
                });
            });
            
        
    });
});



router.get('/email',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function (accData){

        var bankInfo = JSON.parse(accData.result.message);

        chaincodeCalls.getBlockchainData(req,res,function(data){
                blockchainlogs.find({}).toArray(function(err,chaindata){
                    notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        res.render("bank/email", {blockData: data, accData: bankInfo, chaindata: chaindata,notifydoc:notifydoc,configData:configData});
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
                            res.render('view-disburse-invoice',{accData: bankInfo,notifydoc:notifydoc, invoice:inv,supplier:supplier.name,buyer:buyer.name,creditDate:newCreditDate,invoiceDate:d1,viewer:'banker',employee:req.cookies.employee,configData:configData});
                            });
                        });
                    });

                }
            }
        }
            
        
    });
});


router.post('/changeTotalInvoiceLimit',function(req,res){
    var supplierId=req.body.supplierId;
    var limit=req.body.limit;
    console.log(supplierId,limit);
    userCollection.findOne({userId:req.cookies.userId},function(err,doc){
        var count =0;
        console.log("========================================================");
        console.log("comming 4");
        console.log("length=",doc.supplierLimits.length);
        for (var i=0;i<doc.supplierLimits.length;i++){
            console.log("  i=",i);
            if (doc.supplierLimits[i].supplierId==supplierId){
                console.log("coming 1");
                doc.supplierLimits[i].limit=JSON.parse(limit);
                var newDoc=doc;
                var supplierLimits=doc.supplierLimits;
                userCollection.findOneAndUpdate({userId:req.cookies.userId},{$set:{supplierLimits:supplierLimits}},function(err,output){
                    res.redirect('back');
                });
                // userCollection.deleteOne({userId:req.cookies.userId},function(){
                //     userCollection.insertOne(newDoc,function(err,result){
                //         res.redirect('back');
                //     });
                // });
                count++;
            }else if (i==doc.supplierLimits.length-1&&count==0){
                var newSupplierLimit={
                    supplierId:supplierId,
                    limit:JSON.parse(limit)
                }
                console.log("coming 2");
                
                userCollection.findOneAndUpdate({userId:req.cookies.userId},{$push:{supplierLimits:newSupplierLimit}},function(err,output){
                    res.redirect('back');
                });
                // userCollection.deleteOne({userId:req.cookies.userId},function(){
                //     userCollection.insertOne(newDoc,function(err,result){
                //         res.redirect('back');
                //     });
                // });
            }
        } if (doc.supplierLimits.length==0){
            var newSupplierLimit={
                    supplierId:supplierId,
                    limit:JSON.parse(limit)
                }
                console.log("coming 3");
                doc.supplierLimits.push(newSupplierLimit);
                var newDoc=doc;
                userCollection.findOneAndUpdate({userId:req.cookies.userId},{$push:{supplierLimits:newSupplierLimit}},function(err,output){
                    res.redirect('back');
                });
                // userCollection.deleteOne({userId:req.cookies.userId},function(){
                //     userCollection.insertOne(newDoc,function(err,result){
                //         res.redirect('back');
                //     });
                // });
        }
    });

});

router.post('/changeInvoiceLimit',function(req,res){
    var supplierId=req.body.supplierId;
    var limit=req.body.limit;
    console.log(supplierId,limit);
    userCollection.findOne({userId:req.cookies.userId},function(err,doc){
        var count =0;
        console.log("========================================================");
        console.log("comming 4");
        console.log("length=",doc.supplierInvoiceLimits.length);
        for (var i=0;i<doc.supplierInvoiceLimits.length;i++){
            console.log("  i=",i);
            if (doc.supplierInvoiceLimits[i].supplierId==supplierId){
                console.log("coming 1");
                doc.supplierInvoiceLimits[i].limit=JSON.parse(limit);
                var newDoc=doc;
                var supplierInvoiceLimits=doc.supplierInvoiceLimits;
                userCollection.findOneAndUpdate({userId:req.cookies.userId},{$set:{supplierInvoiceLimits:supplierInvoiceLimits}},function(err,output){
                    res.redirect('back');
                });
                // userCollection.deleteOne({userId:req.cookies.userId},function(){
                //     userCollection.insertOne(newDoc,function(err,result){
                //         res.redirect('back');
                //     });
                // });
                count++;
            }else if (i==doc.supplierInvoiceLimits.length-1&&count==0){
                var newSupplierInvoiceLimits={
                    supplierId:supplierId,
                    limit:JSON.parse(limit)
                }
                console.log("coming 2");
                console.log(newSupplierInvoiceLimits);
                userCollection.findOneAndUpdate({userId:req.cookies.userId},{$push:{supplierInvoiceLimits:newSupplierInvoiceLimits}},function(err,output){
                    res.redirect('back');
                });
                // userCollection.deleteOne({userId:req.cookies.userId},function(){
                //     userCollection.insertOne(newDoc,function(err,result){
                //         res.redirect('back');
                //     });
                // });
            }
        } if (doc.supplierInvoiceLimits.length==0){
            var newSupplierInvoiceLimits={
                    supplierId:supplierId,
                    limit:JSON.parse(limit)
                }
                console.log("coming 3");
                doc.supplierInvoiceLimits.push(newSupplierInvoiceLimits);
                var newDoc=doc;
                userCollection.findOneAndUpdate({userId:req.cookies.userId},{$push:{supplierInvoiceLimits:newSupplierInvoiceLimits}},function(err,output){
                    res.redirect('back');
                });
                // userCollection.deleteOne({userId:req.cookies.userId},function(){
                //     userCollection.insertOne(newDoc,function(err,result){
                //         res.redirect('back');
                //     });
                // });
        }
    });

});

/*router.post('/offer-invoice',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function (accData) { 
        var invoiceID = req.body.invID;
        var buyerID = req.body.buyer;
        var supplierID = req.body.supplier;
        var invoiceAmt = req.body.invAmount;
        var discountRate = req.body.discountRate;
        var discountAmt = req.body.discountAmount;
        var disburseAmount = req.body.disburseAmount;



        blockchainlogs.insertOne({invID:invoiceID,
                                    buyerID:buyerID,
                                    supplierID:supplierID,
                                    invoiceAmt:invoiceAmt,
                                    discountRate:discountRate,
                                    discountAmt:discountAmt,
                                    disburseAmount:disburseAmount,
                                    invStatus: 'Offer Created'
                                },function(err,log){});



    });
});*/


function returnSupplier(id,func){
        userCollection.findOne({userId:id},function(err,supplier){   
                    
                    func(supplier);                    
                });
                
}

function returnBuyer(id,func){
        userCollection.findOne({userId:id},function(err,supplier){   
                    
                    func(supplier);                    
                });
                
}




router.get('/manage-invoice',function(req,res,next){

    //res.render('bank-invoice');
    chaincodeCalls.readAccount(req,res,function(Bankdata){
        var bankInfo = JSON.parse(Bankdata.result.message);
        chaincodeCalls.readAllInvoices(req,res,function(invoicesData){
            var invoices = JSON.parse(invoicesData.result.message);
            var buyerName=getBuyers(req,res,invoices,bankInfo);
            //var supplierName=getSuppliers(req,res,invoices,bankInfo,buyerName);
            console.log('check here');
            console.log(buyerName);
            //res.render("bank-invoice", {accData: bankInfo,invoices:invoices,buyers:buyerName,suppliers:supplierName});
        });
    });
});

router.get('/manage-supplier',function(req,res,next){
    
    chaincodeCalls.readAccount(req,res,function(accData){


        var bankInfo = JSON.parse(accData.result.message);
        userCollection.find({ role: 'supplier' }).toArray(function(err,suppliers) {  
                console.log(suppliers);
                notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                    userCollection.findOne({userId:req.cookies.userId},function(err,bankAcc){
                        res.render('bank/bank-supplier', {accData: bankInfo,notifydoc:notifydoc,suppliers:suppliers,bankAcc:bankAcc});
                    });
                    
                });

        });
        
        


    });
});


router.get('/manage-buyer',function(req,res,next) {
    
    chaincodeCalls.readAccount(req,res,function(accData){

        var bankInfo = JSON.parse(accData.result.message);

        userCollection.find({role:"buyer"}).toArray(function(err,result) {
            console.log(result);
            notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                res.render('bank/bank-buyer', {accData: bankInfo,notifydoc:notifydoc,buyers:result});
            });
        });
    });
});

router.post('/offer-invoice',function(req,res,next){
    chaincodeCalls.MakeOffer(req,res,function(result){
        res.redirect('/bank/manage-invoice');
    });
});

router.post('/disburseInvoice',function(req,res,next){
    chaincodeCalls.disburseInvoice(req,res,function(result){
        res.redirect('/bank/manage-invoice');
    });
});

router.get('/markRepayment',function(req,res){
    chaincodeCalls.markPayment(req,res,function(data){
        res.redirect('back');
    });
});


function getBuyers(req,res,invoices,bankInfo) {
    var buyerName=[];
            if (invoices!=null){
            console.log(invoices.length);
            for (var i=0;i<invoices.length;i++) {
                if (i==invoices.length-1){
                userCollection.findOne({userId:invoices[i].buyer},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    buyerName.push(result.name);
                    console.log(i);
                    console.log(invoices.length);
                    
                         console.log('buyers-')
                         console.log(buyerName);
                         getSuppliers(req,res,invoices,bankInfo,buyerName);
                         //return buyerName;
                    
                });    
                } else {
                userCollection.findOne({userId:invoices[i].buyer},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    buyerName.push(result.name);
                    console.log(i);
                    console.log(invoices.length);
                }); 
                }
            
            }
            } else {
                         //return buyerName;
                    notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                        userCollection.findOne({userId:req.cookies.userId},function(err,userRecord){
                            res.render("bank-invoice", {accData: bankInfo,notifydoc:notifydoc,invoices:invoices,configData:configData,userData:userRecord});
                        });
                    });
            }
}

function getSuppliers(req,res,invoices,bankInfo,buyerName) {
    var supplierName=[];
            if (invoices!=null){
            console.log(invoices.length);
            for (var i=0;i<invoices.length;i++) {
                if (i==invoices.length-1){
                userCollection.findOne({userId:invoices[i].supplier},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    supplierName.push(result.name);
                    console.log(i);
                    console.log(invoices.length);
                    
                         console.log('suppliers-')
                         console.log(supplierName);
                         //getDinvBuyerSupplier(req,res,bankInfo,invoices,buyerName,supplierName);
                         notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                            userCollection.findOne({userId:req.cookies.userId},function(err,userRecord){
                                res.render("bank-invoice", {accData: bankInfo,notifydoc:notifydoc,invoices:invoices,buyers:buyerName,suppliers:supplierName,configData:configData,userData:userRecord});
                            });                        
                        });
                         
                         
                         //return supplierName;
                    
                });    
                } else {
                userCollection.findOne({userId:invoices[i].supplier},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    supplierName.push(result.name);
                    console.log(i);
                    console.log(invoices.length);
                }); 
                }
            
            }
        } else {
                         //return supplierName;
                         notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                        userCollection.findOne({userId:req.cookies.userId},function(err,userRecord){
                                res.render("bank-invoice", {accData: bankInfo,notifydoc:notifydoc,invoices:invoices,configData:configData,userData:userRecord});
                                });
                            }); 
                         
            }
}

function getDinvBuyerSupplier(req,res,bankInfo,invoices,buyerName,SupplierName) {
    var DinvSuppliers=[];
    var DinvBuyers=[];
    if (bankInfo.dInvoices!=null){
        console.log('reaching yo yo');
        console.log(bankInfo.dInvoices.length);
        for (var i=0;i<bankInfo.dInvoices.length;i++) {

                if (i==bankInfo.dInvoices.length-1){
                userCollection.findOne({userId:bankInfo.dInvoices[i].supplier},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    DinvSuppliers.push(result.name);
                    console.log(i);
                    
                    userCollection.findOne({userId:bankInfo.dInvoices[i].buyer},function(err,buyerresult){
                        DinvBuyers.push(buyerresult.name);
                        console.log('suppliers-')
                         console.log(supplierName);
                        notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                            console.log(notifydoc);
                            userCollection.findOne({userId:req.cookies.userId},function(err,userRecord){
                                res.render("bank-invoice", {accData: bankInfo,notifydoc:notifydoc,invoices:invoices,buyers:buyerName,suppliers:supplierName,Dbuyers:DinvBuyers,Dsuppliers:DinvSuppliers,configData:configData,userData:userRecord});
                                });
                            }); 
                         
                         //return supplierName;
                    });
                         
                    
                });    
                } else {
                userCollection.findOne({userId:bankInfo.dInvoices[i].supplier},function(err,result){
                    console.log('result man-');
                    console.log(result);
                    DinvSuppliers.push(result.name);
                    userCollection.findOne({userId:bankInfo.dInvoices[i].buyer},function(err,buyerresult){
                        DinvBuyers.push(buyerresult.name);
                    });
                    console.log(i);
                    console.log(bankInfo.dInvoices.length);
                }); 
                }
            
            }

    } else {
        console.log(bankInfo);
        res.send('what');
    }


}

router.get('/view-invoice',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function (dataBank){
        chaincodeCalls.readAllInvoices(req,res,function(invoicesData){
            var invoices = JSON.parse(invoicesData.result.message);
        var invoiceId=''+req.query.poid;
        var BankInfo = JSON.parse(dataBank.result.message);
        console.log(BankInfo);
        if (invoices!=null){
        for (var i=0;i<invoices.length;i++){
            console.log('coming here');
            if (invoiceId==invoices[i].invoiceId){
                var inv=invoices[i];
                
                    var d=date.parse(inv.date,'DD-MM-YYYY');
                    d1=date.format(d,'MMMM DD YYYY');
                    creditDate=date.addDays(d,inv.purchaseOrders[0].creditPeriod);
                    newCreditDate=date.format(creditDate,'MMMM DD YYYY');
                    userCollection.findOne({userId:inv.buyer},function(err,document){
                        returnBuyer(req.cookies.userId,function(accData){
                            notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        console.log(notifydoc);
                            res.render('view-invoice',{invoice:inv,notifydoc:notifydoc,accData:accData,supplier:req.query.supplier,buyer:req.query.buyer,creditDate:newCreditDate,invoiceDate:d1,viewer:'banker',employee:document.employeeName,configData:configData});
                            });
                        });
                    
                });
                
                
                console.log('outside');
                console.log(invoices[i]); 
                //res.render('view-invoice',{invoice:BankInfo.invoices[i]});

           }
        }
    } else {
        console.log(invoices);
            res.render('view-invoice');
        }
        });
    });
});


router.get('/settings',function(req,res,next){
    chaincodeCalls.readAccount(req,res,function (accData){

        var bankInfo = JSON.parse(accData.result.message);

        chaincodeCalls.getBlockchainData(req,res,function(data){
                blockchainlogs.find({}).toArray(function(err,chaindata){
                    notifications.findOne({userId:req.cookies.userId},function(err,notifydoc){
                        userCollection.findOne({userId:req.cookies.userId},function(err,userCollectionData){
                            console.log(userCollectionData);
                            res.render('bank/settings', {blockData: data, accData: bankInfo, chaindata: chaindata,notifydoc:notifydoc,configData:configData,userData:userCollectionData});
                        });
                        
                    });
                });
            });
            
        
    });
});

router.post('/settings',function(req,res){
    console.log(req.body);
    userCollection.findOneAndUpdate({userId:req.cookies.userId},{$set:{minAge:req.body.minAge,minRevenue:req.body.minRevenue,dser:req.body.dser,geoFootprint:req.body.geoFootprint,invoiceFunding:req.body.fundRate,interestCharges:req.body.interestCharges,recourse:req.body.recourse}},function(err){
            console.log("done");
            res.redirect('/bank/settings');        
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


