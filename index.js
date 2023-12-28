const express = require('express')
const bodyparser = require('body-parser')
const {config} = require('dotenv')
const cors = require('cors')
const { Vonage } = require('@vonage/server-sdk')
config()

const app = express()
const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET
})

app.use(cors())
app.use(
    bodyparser.urlencoded({
      extended: true,
      limit: '50mb',
      parameterLimit: 50000,
    }),
  );
app.use(bodyparser.json({limit: '50mb'}))
app.use(express.json({limit:'50mb'}));
app.use(express.raw({ type: "application/json", limit: "50mb" }));
app.use(express.raw({ type: "application/pdf", limit: "10mb" }));

app.listen(process.env.PORT,()=>{
    console.log("App is listening on port 3001")
})

app.post('/send-new-sms', async (req,res)=>{

   await Promise.all(req.body.data.map(async (user) => { 
    let to = user.to
    let text = user.text
    let from = 'Vonage APIs'
  await vonage.sms.send({to, from, text})
        .then(resp => { console.log('Message sent successfully'); console.log(resp); })
        .catch(err => { console.log('There was an error sending the messages.'); console.error(err); });

  }));
 
 
  return res.status(200).json({text:"I got your request"})

})

