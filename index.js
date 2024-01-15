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
const botSystemMessage = 
`You are a chatbot which is acting as an real-estate agent.
You are provided with the details of the property of the client.
You are to convince them to sell their property at 70% of price by bargaining.
70% is not a hard threshold, but it is most optimal. Do not lose a deal if customer wants a 1-2% extra.
You are given the summary of any conversation done uptil now, use them as context to reply any of client's receive message.
If you are unsure what to say then answer the question intelligently by yourself.
If they are interested and want to  talk to someone, to sell property at 70%, request a day and time that we can contact them and encourage them to book an appointment using this booking link.
https://calendly.com/privatecall4u/3min?month=2023-12


// `
// const botSystemMessage = 
// `Your name is WE BUY HOUSES NOW,  Customers will contact us who want to sell there house now.
// You will act as a real-estate agent. 
// You must use your conversation summary to answer the questions of client.
// You can skip the following questions if the client has already provided the information before.
// You must ask them whats the address of the property if they have not provided it yet. 
// You must ask them how much are they asking for the property if they have not provided it yet.
// You must ask them if the property is new or needs remodelling if they have not mentioned it yet
// If the property needs remodelling, ask them the price after ARV.
// Once they give this estimated value, apply the 70% ARV rule and present them an offer of this amount but you can skip this if property is new. 
// convince them to accept 70% of the after repair value.
// You must convince them why its best to sell now for this cash offer. 
// Please answer any questions the person has.
// Provide answer only from the given knowledge.

// - Refuse to answer any question that is not related to the given knowledge.

// If they are interested and want to  talk to someone, to sell property at 70%, request a day and time that we can contact them and encourage them to book an appointment using this booking link.
// https://calendly.com/privatecall4u/3min?month=2023-12


// `

// const botSystemMessage =
//  `You are operating as a virtual real-estate agent for "WE BUY HOUSES NOW".
//   Customers will reach out to you with the intent of selling their houses.
//    Your role involves gathering key information about their property and making a cash offer based on certain criteria.

// Use your provided Conversation Summary.
// Before posing any questions, refer to the Conversation summary provided to avoid repetition.
// Do not ask a question if the information already exists in the Conversation summary.

// Here are the key details you need to collect, if not already provided:

// Property Address: Ask for the address of the property they're selling.
// Asking Price: Inquire about their expected selling price.
// Property Condition: Determine if the property is new or requires remodeling.
// If it needs remodeling, ask for the estimated value after repairs (ARV).
// For properties requiring remodeling, calculate an offer at 70% of the ARV. Present this offer, but skip this step if the property is new.
// Convince for Immediate Sale: Persuade the client why accepting a cash offer at 70% ARV is beneficial and why selling now is a good decision.
// Answer any additional questions related to the property sale, using only the information provided. Avoid answering questions outside this scope.

// If a customer shows interest and agrees to sell at 70% ARV, or if the client wishes to meet, request a convenient day and time for further discussion.
// Encourage them to schedule an appointment using the provided booking link: https://calendly.com/privatecall4u/3min?month=2023-12.`


const botSummaryMessage = `In your role, you will receive three key pieces of information: the previous conversation summary, the latest message from the client, and your response to this message.
Your task is to integrate and update the conversation summary effectively. Follow these steps:
Review Previous Summary: Start by carefully reviewing the existing summary of the conversation.
This includes all key details already shared by the client, like property address, asking price, condition of the property, etc.
Incorporate New Client Information: Next, examine the latest message from the client.
Identify and extract any new information about the property that they provide. This could be additional details about the property's condition, changes in asking price, or other relevant information not previously mentioned.
Update Summary with Your Response: After responding to the client's latest message, reflect on your own response.
Add any clarifications or additional details you provided to the summary.
Maintain Comprehensive Details: Ensure that the updated summary is comprehensive.
It should include all pertinent details mentioned since the beginning of the conversation. Do not omit any crucial information.
Use Updated Summary for Future Responses: Remember to utilize this updated summary in your subsequent interactions with the client.
It will help you respond accurately and avoid asking for information that the client has already provided.
Create a Single Summary.
Your goal is to maintain a coherent and complete record of the conversation, which will assist you in making informed and relevant responses in the ongoing dialogue with the client.`
// const botSummaryMessage = 
// `
// You are provided with previous summary, the message of client and your response to it.
// Remember any information that the client provides like address or any price about property.
// Remember any information in the previous summary.
// Add any new information from the message of client and your response to the already made summary.
// Do not skip any important information.
// keep in mind that you will need to use this summary when answering client next time.
// `

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
          DaysOnMarket: user.daysOnMarket,
          LastMessage: message
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

console.log("Received Message:")
console.log(req.body);
  try {
    //Fetching the Chat History Uptil now
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

       //Fetching the Property Information corresponding that Phone Number
        // const customerResponse = await supabase
        // .from('Customer')
        // .select()
        // .eq('PhoneNumber', `${req.body.From.split(":")[1]}`)

        // const houseData = customerResponse.data[0]
        
        //Generating System Message
        const prompt = stripIndent`${oneLine`
        ${botSystemMessage}`}
   
     
         Client Messaged: """
         ${req.body.Body}
         """
         
         """
         Summary of Conversation Uptil Now: """
         ${data[0].Summary}

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
         Use your summary as reference to reply the client.
         Answer as you would reply in Whatsapp. In a casual manner.
       `
      
         //We have the comeplete prompt and all of our embeddings, now we can use it to get answer from gpt
       const chatCompletion = await openai.chat.completions.create({
         model: openAIQueryBotModel,
         messages: [{ role: 'assistant', content: prompt }],
         max_tokens: 512, // Choose the max allowed tokens in completion
         temperature: 0, // Set to 0 for deterministic results
       });
      

       
      //Sending Reply Back to the Customer
     client.messages
       .create({
           body: `${chatCompletion.choices[0].message.content}`,
           from: 'whatsapp:+14155238886',
           to: req.body.From
       }).then(message => console.log(message)).catch(message =>console.log(message))

   


       //Storing the reply into database
       data[0].Conversations.push({msg: req.body.Body, timestamp: Date.now(), user: "Client"})
       data[0].Conversations.push({msg: chatCompletion.choices[0].message.content, timestamp: Date.now(), user: "System"})



       await supabase
               .from('ChatContext')
               .update({ Conversations: data[0].Conversations})
               .eq('PhoneNumber', `${req.body.From.split(":")[1]}`)

       await supabase
               .from('Customer')
               .update({                 
                   LastMessage:  chatCompletion.choices[0].message.content
               })
               .eq('PhoneNumber', `${req.body.From.split(":")[1]}`);


      //Creating summary of chat uptil now
       const summaryPrompt = stripIndent`${oneLine`
       ${botSummaryMessage}`}
  
        Previous Summary: """

        ${data[0].Summary}

        """
        Client Message: """
        ${req.body.Body}
        """

        Chatbot Reply: """
        ${chatCompletion.choices[0].message.content}
        """
           
      `
     
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

      
       

 return res.status(200);
    }
catch(e)
{

}
    
});

