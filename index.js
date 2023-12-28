const express = require('express')
const bodyparser = require('body-parser')
const {config} = require('dotenv')
const cors = require('cors')
config()
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);




//MiddleWare
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));


app.listen(process.env.PORT,()=>{
    console.log("App is listening on port 3001")
})

app.post('/send-new-sms', async (req,res)=>{


   await Promise.all(req.body.data.map(async (user) => { 
    let message = "Hello, we are interested in buying your property at " + user.address + " listed for $" + user.price + ". We hope to negotiate a price that is suitable for both parties.";
    if(user.wirelessPrimaryPhoneNum1 == "" && user.wirelessPrimaryPhoneNum2=="" )
    {
      return;
    }
    else if(user.wirelessPrimaryPhoneNum1 != "")
    {
      client.messages
    .create({
        body: message,
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:' + user.wirelessPrimaryPhoneNum1
    })
    .then(message => console.log(message.sid))
    
    }
    else {

    client.messages
    .create({
        body: message,
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:' + user.wirelessPrimaryPhoneNum2
    })
    .then(message => console.log(message.sid))
  }

  

  }));
 
 
  return res.status(200).json({text:"I got your request"})

})

