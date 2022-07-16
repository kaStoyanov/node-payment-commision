const express = require('express')
const app = express()
const port = 5700
const axios = require('axios');
let fs = require('fs');


if (process.argv.length === 2) {
    console.error('Expected at least one argument!');
    process.exit(1);
}
app.get('/fees', async (req, res) => {
    await proccessPayments().then(()=>res.status(200).json(finalDataFees))
})



let NaturalPaymentFee_CashIn = ""
let NaturalPaymentLimit_CashOut = ""
let LegalPaymentFee_CashOut = ""
const args = process.argv.slice(2);
let rawdata;
if (process.env.IS_TEST_RUNNING){
    rawdata = fs.readFileSync(args[1]);
}else{
    rawdata = fs.readFileSync(args[0]);
}
let finalPayments = JSON.parse(rawdata);

let finalDataFees = [];
let freeOfChargePerUser=[];
app.listen(port, () => {})


proccessPayments()


 async function proccessPayments(){
       finalDataFees = []
       await getPaymentFees()
       await paymentsHandler()
}
function paymentsHandler(){
    for (let j = 0; j < finalPayments.length; j++) {
        finalPayments[j].id = j;
    }
    finalPayments.map(e=>checkPaymentsSameWeek(e))

    for (let i = 0; i <finalPayments.length ; i++) {
        proccesPaymentType(finalPayments[i])
    }
    if (!process.env.IS_TEST_RUNNING){
        for (let i = 0; i < finalDataFees.length ; i++) {
            let finalCommision = parseFloat(finalDataFees[i]);
            finalCommision =  Math.ceil10(finalDataFees[i],-2).toFixed(2);
            console.log(finalCommision)
        }
    }

}
function proccesPaymentType(payment){
   switch (payment.user_type){
       case "natural":
           naturalPaymetType(payment)
           break;
       case "juridical":
           legalPaymetType(payment)
           break;
   }
}
 function naturalPaymetType(payment){
    switch (payment.type){
        case "cash_in":
            CashIn(payment)
            break;
        case "cash_out":
             paymentsInSameWeek(payment)
            break;
    }
}

// Closure
(function() {
   //helper func to ceil commission fee 2 decimals
    function decimalAdjust(type, value, exp) {
        // If the exp is undefined or zero...
        if (typeof exp === 'undefined' || +exp === 0) {
            return Math[type](value);
        }
        value = +value;
        exp = +exp;
        // If the value is not a number or the exp is not an integer...
        if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
            return NaN;
        }
        // Shift
        value = value.toString().split('e');
        value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
        // Shift back
        value = value.toString().split('e');
        return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
    }

    // Decimal ceil
    if (!Math.ceil10) {
        Math.ceil10 = function(value, exp) {
            return decimalAdjust('ceil', value, exp);
        };
    }
})();
function legalPaymetType(payment){
    switch (payment.type){
        case "cash_in":
            CashIn(payment)
            break;
        case "cash_out":
            legalCashOut(payment)
            break;
    }
}
function legalCashOut(legPayment){
    const cashInAmount = legPayment.operation.amount;
    const fee = (cashInAmount /100)* LegalPaymentFee_CashOut.percents;
    let finalFee = 0;
    if (fee < LegalPaymentFee_CashOut.min.amount){
        finalFee = 0.50
    }else {
        finalFee = fee.toFixed(2)
    }
    finalDataFees.push(parseFloat(finalFee).toFixed(2))
}
function CashIn(naturalPayment){
    const cashInAmount = naturalPayment.operation.amount;
    const fee = (cashInAmount /100)* NaturalPaymentFee_CashIn.percents;
    let finalFee = 0;
    if (fee > NaturalPaymentFee_CashIn.max.amount){
        finalFee = 5.00
    }else {
        finalFee = fee
    }
    finalDataFees.push(parseFloat(finalFee).toFixed(2))
}

function paymentsInSameWeek(naturalPayment){
    let fee = 0;
    let totalPerWeek = 0;

    let sameUserPaymets = finalPayments.filter(pay => pay.user_id == naturalPayment.user_id && pay.type == "cash_out")

    handleFreeOfChargeAmount(naturalPayment)


    sameUserPaymets.map((pay, index)=>{
        if (pay.week == naturalPayment.week) {
            sameUserPaymets[index].total = pay.operation.amount;
            totalPerWeek += pay.operation.amount;
        }
    })

    if (totalPerWeek > NaturalPaymentLimit_CashOut.week_limit.amount ){
        const test = freeOfChargePerUser.filter(user => user.user_id === naturalPayment.user_id)
        if (test[0].totalFreeOfChargeAllowence > 0){
            fee = naturalExceededAmount(naturalPayment.operation.amount,NaturalPaymentLimit_CashOut.week_limit.amount);
        }else {
            fee = ((naturalPayment.operation.amount/100) * NaturalPaymentLimit_CashOut.percents).toFixed(2);
        }
    }else {

        fee = 0.00;
    }
    finalDataFees.push(parseFloat(fee).toFixed(2))
}

function naturalExceededAmount(totalAmount,deductableAmount){
     const overAllowance = totalAmount - deductableAmount;
     const commission = (overAllowance / 100) * NaturalPaymentLimit_CashOut.percents;
     return commission.toFixed(2);
}
function handleFreeOfChargeAmount(user){
    let isUserInArr = false;
    freeOfChargePerUser.map(u => {
        if (u.user_id == user.user_id){
            isUserInArr = true;
        }
    })
    if (isUserInArr){
        freeOfChargePerUser.map((e, index)=>{
            freeOfChargePerUser[index].totalFreeOfChargeAllowence -= user.operation.amount;
            if (freeOfChargePerUser[index].totalFreeOfChargeAllowence < 0){
                freeOfChargePerUser[index].totalFreeOfChargeAllowence = 0
            }
        })
    }else {
        freeOfChargePerUser.push({user_id : user.user_id,totalFreeOfChargeAllowence: NaturalPaymentLimit_CashOut.week_limit.amount})
    }
}


function checkPaymentsSameWeek(date) {
        let thisDate = date.date
         let dateParts = thisDate.split("-")
         let fullDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
         fullDate = new Date(fullDate).getWeek();
         const model = {
             week:fullDate,
             year:dateParts[0]
         }
         Object.assign(date,{week:dateParts[0] + "-" + fullDate})
    return date
}


 async function  getPaymentFees (){
    const DEV_API = "https://developers.paysera.com/tasks/api/"
    await axios
        .get(DEV_API +'cash-out-natural')
        .then(res => {
            NaturalPaymentLimit_CashOut = res.data
        })
        .catch(error => {
            console.error(error);
        });
     await axios
        .get(DEV_API + 'cash-in')
        .then(res => {
            NaturalPaymentFee_CashIn = res.data
        })
        .catch(error => {
            console.error(error);
        });
     await axios
        .get(DEV_API+ 'cash-out-juridical')
        .then(res => {
            LegalPaymentFee_CashOut = res.data
        })
        .catch(error => {
            console.error(error);
        });
}
Date.prototype.getWeek = function() {
    let date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    let week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
        - 3 + (week1.getDay() + 6) % 7) / 7);
}
module.exports = app;
