const express = require('express')
const {createClient} = require('@supabase/supabase-js')
const GPT3Tokenizer = require('gpt3-tokenizer').default;
const bodyparser = require('body-parser')
const {config} = require('dotenv')
const OpenAI = require('openai')
const { oneLine, stripIndent } = require('common-tags')
const cors = require('cors')
config()
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_ACCOUNT_AUTH_TOKEN);
//supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY
});
//System Message that tells the bot what it is supposed to act as
// const botSystemMessage = 
// `You are a chatbot which is acting as an real-estate agent.
// You are provided with the details of the property of the client.
// You are to convince them to sell their property at 70% of price by bargaining.
// 70% is not a hard threshold, but it is most optimal. Do not lose a deal if customer wants a 1-2% extra.
// You are given the summary of any conversation done uptil now, use them as context to reply any of client's receive message.
// If you are unsure what to say then answer the question intelligently by yourself.
// If they are interested and want to  talk to someone, to sell property at 70%, request a day and time that we can contact them and encourage them to book an appointment using this booking link.
// https://calendly.com/privatecall4u/3min?month=2023-12


// `
const botSystemMessage = 
`Your name is WE BUY HOUSES NOW,  Customers will contact us who want to sell there house now.
You will serve  as a helpful and very friendly assistant designed to convince them that we are very interested in buying there home for a cash price. 
You must ask them whats the address of the property that they wish to sell. 
You must ask them how much are they asking for the property.
Ask them what is the estimated value of the property if IT is totally remodeled or brand new.
Once they give this estimated value, apply the 70% ARV rule and present them an offer of this amount. 
convince them to accept 70% of the after repair value. You must convince them why its best to sell now for this cash offer. 
Please answer any questions the person has.
Keep the response under 50 words.
Provide answer only from the given knowledge.
- Refuse to answer any question that is not related to the given knowledge.

If they are interested and want to  talk to someone, to sell property at 70%, request a day and time that we can contact them and encourage them to book an appointment using this booking link.
https://calendly.com/privatecall4u/3min?month=2023-12


`

const botSummaryMessage = 
`You are a chatbot which is acting as an real-estate agent.
You are provided with previous summary, the message of client and your response to it.
You are to Create a summary of conversation uptil now.
keep in mind that you will need to use this summary when answering client next time.
`

const openAIQueryBotModel = 'gpt-3.5-turbo'



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
          Summary: "",
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
        Summary: "",
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

 
  }
  }));
 
 
  return res.status(200).json({text: "Request Successfully Completed"})

})



app.post('/receive-msg', async (req,res)=>{


      try 
      {
      
        //Fetching the Chat History Uptil now
        const {data, error} = await supabase
                .from('ChatContext')
                .select()
                .eq('PhoneNumber', `${req.body.From.split(":")[1]}`)

     
       //Fetching the Property Information corresponding that Phone Number
        const customerResponse = await supabase
        .from('Customer')
        .select()
        .eq('PhoneNumber', `${req.body.From.split(":")[1]}`)

        const houseData = customerResponse.data[0]
        
        //Generating System Message
        const prompt = stripIndent`${oneLine`
        ${botSystemMessage}`}
   
     
         Client Messaged: """
         ${req.body.Body}
         """

         Client's Property Information for your refernce: """
         House Owner Name: ${houseData.Name},
         Address: ${houseData.Address},
         Listed Price: ${houseData.Price},
         Bedrooms: ${houseData.Bedrooms},
         Bathrooms: ${houseData.Bathrooms},
         Approximate Size: ${houseData.ApproxSquare},
         Days on Market: ${houseData.daysOnMarket}

         
         """
     
         Summary of Conversation Uptil Now: """
         ${data[0].Summary}

         """
         Answer as you would reply in Whatsapp. In a single message.
       `
        console.log(`Bot Sending Prompt ${prompt}`)
         //We have the comeplete prompt and all of our embeddings, now we can use it to get answer from gpt
       const chatCompletion = await openai.chat.completions.create({
         model: openAIQueryBotModel,
         messages: [{ role: 'assistant', content: prompt }],
         max_tokens: 512, // Choose the max allowed tokens in completion
         temperature: 0, // Set to 0 for deterministic results
       });
      
       console.log(`Bot Response: 
       ${chatCompletion.choices[0].message.content}
       `)
       
      //Sending Reply Back to the Customer
       client.messages
       .create({
           body: `${chatCompletion.choices[0].message.content}`,
           from: 'whatsapp:+14155238886',
           to: req.body.From
       }).then(message => console.log(message.sid))


       //Storing the reply into database
       data[0].Conversations.push({msg: req.body.Body, timestamp: Date.now(), user: "Client"})
       data[0].Conversations.push({msg: chatCompletion.choices[0].message.content, timestamp: Date.now(), user: "System"})

       await supabase
               .from('ChatContext')
               .update({ Conversations: data[0].Conversations})
               .eq('PhoneNumber', `${req.body.From.split(":")[1]}`)


      //Creating summary of chat uptil now
       const summaryPrompt = stripIndent`${oneLine`
       ${botSummaryMessage}`}
  
    
        Client Messaged: """
        ${req.body.Body}
        """

        Chatbot Reply: """
        ${chatCompletion.choices[0].message.content}
        """

        Client's Property Information for your refernce: """
        House Owner Name: ${houseData.Name},
        Address: ${houseData.Address},
        Listed Price: ${houseData.Price},
        Bedrooms: ${houseData.Bedrooms},
        Bathrooms: ${houseData.Bathrooms},
        Approximate Size: ${houseData.ApproxSquare},
        Days on Market: ${houseData.daysOnMarket}
        
        """
    
        Create a summary that you can use as your context.
      `
      console.log(`Bot Summary Prompt 
      ${summaryPrompt}
      `)
      const summaryCompletion = await openai.chat.completions.create({
        model: openAIQueryBotModel,
        messages: [{ role: 'assistant', content: summaryPrompt }],
        max_tokens: 512, // Choose the max allowed tokens in completion
        temperature: 0, // Set to 0 for deterministic results
      });

      await supabase
      .from('ChatContext')
      .update({ Summary: summaryCompletion.choices[0].message.content})
      .eq('PhoneNumber', `${req.body.From.split(":")[1]}`)

       console.log(`
      Bot Summary Generate
       ${summaryCompletion.choices[0].message.content}`)
       

 return res.status(200).json({msg: 'Successfully Replied'});
    }
catch(e)
{

}
    
});

