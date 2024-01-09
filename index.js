const express = require('express')
const {createClient} = require('@supabase/supabase-js')
const bodyparser = require('body-parser')
const {config} = require('dotenv')
const cors = require('cors')
config()
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);
//supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)



//MiddleWare
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));


app.listen(process.env.PORT,()=>{
    console.log(`App is listening on port ${process.env.PORT}`)
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
    .then( async (message) => {console.log(message.sid)})

      const {error} = await supabase
      .from('ChatContext')
      .insert({
          PhoneNumber: user.wirelessPrimaryPhoneNum1,
          Conversations: [{
            msg: message,
            timestamp: Date.now(),
            user: "System"
          }],
          Summary: "Testing",
      });

      const test = await supabase
      .from('Customer')
      .insert({
          PhoneNumber: user.wirelessPrimaryPhoneNum1,
          Name: user.ownerName,
          Address: user.address,
          Price: user.price,
          Bedrooms: user.bedrooms,
          Bathrooms: user.bathrooms,
          ApproxSquare: user.approxSquare,
          DaysOnMarket: user.daysOnMarket     
      });
 
      console.log(test)
    }
    else {

    client.messages
    .create({
        body: message,
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:' + user.wirelessPrimaryPhoneNum2
    })
    .then(message => console.log(message.sid))


    const {error} = await supabase
    .from('ChatContext')
    .insert({
        PhoneNumber: user.wirelessPrimaryPhoneNum2,
        Conversations: [{
          msg: message,
          timestamp: Date.now(),
          user: "System"
        }],
        Summary: "Testing",
    });
    
    const test = await supabase
    .from('Customer')
    .insert({
        PhoneNumber: user.wirelessPrimaryPhoneNum2,
        Name: user.ownerName,
        Address: user.address,
        Price: user.price,
        Bedrooms: user.bedrooms,
        Bathrooms: user.bathrooms,
        ApproxSquare: user.approxSquare,
        DaysOnMarket: user.daysOnMarket     
    });

  console.log(test)
  }
  }));
 
 
  return res.status(200).json({text: "I got your request"})

})



app.post('/receive-msg', async (req,res)=>{


client.messages
.create({
    body: "g",
    from: 'whatsapp:+14155238886',
    to: req.body.From
})

const {data, error} = await supabase
        .from('ChatContext')
        .select()
        .eq('PhoneNumber', `${req.body.From.split(":")[1]}`)

data[0].Conversations.push({msg: req.body.Body, timestamp: Date.now(), user: "Client"})
data[0].Conversations.push({msg: "g", timestamp: Date.now(), user: "System"})

const { updateError } = await supabase
        .from('ChatContext')
        .update({ Conversations: data[0].Conversations})
        .eq('PhoneNumber', `${req.body.From.split(":")[1]}`)



 return res.status(200).json({msg: 'Successfully Replied'});

})

