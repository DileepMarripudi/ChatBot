const TelegramBot = require('node-telegram-bot-api');
const https = require('https');

const DICTIONARY_API_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

// Initialize bot with error handling
let bot;
try {
  bot = new TelegramBot('6566718121:AAFz45iQ6LXvnbSMYjq4E00epgXdRZ19nDY', { polling: true });
  console.log('Bot initialized successfully');
} catch (error) {
  console.error('Error initializing bot:', error);
  process.exit(1);
}

// Function to make HTTP requests using built-in https module
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  
  try {
    if (messageText.startsWith('/start')) {
      await bot.sendMessage(chatId, 'HELLO!! WELCOME TO WORD CHATBOT. PROVIDE ME A WORD.');
    } else if (messageText.startsWith('/history')) {
      await bot.sendMessage(chatId, 'History feature is not available in this version.');
    } else {
      if (typeof messageText === 'string') {
        const word = messageText.trim();
        const apiUrl = DICTIONARY_API_BASE_URL + encodeURIComponent(word);
        console.log('Searching for word:', word);
        
        try {
          const data = await makeRequest(apiUrl);
          
          if (data.title === "No Definitions Found") {
            await bot.sendMessage(chatId, 'PLEASE CHECK YOUR SPELLING OF YOUR WORD.');
          } else {
            const meanings = data[0].meanings;
            let responseText = `Definitions of ${word}:\n\n`;
            
            meanings.forEach((meaning) => {
              if (meaning.definitions && meaning.definitions.length > 0) {
                meaning.definitions.forEach((definition, index) => {
                  responseText += `${index + 1}. ${definition.definition}\n`;
                });
              }
            });

            const phonetic = Array.isArray(data[0].phonetics) && data[0].phonetics.length > 0 
              ? data[0].phonetics[0].text 
              : data[0].phonetic || 'No phonetic available';
            
            await bot.sendMessage(chatId, responseText);
            await bot.sendMessage(chatId, "Phonetic ==> " + phonetic);
          }
        } catch (error) {
          console.error('Error fetching word definition:', error);
          await bot.sendMessage(chatId, 'Oops! Something went wrong while fetching the definition.');
        }
      }
    }
  } catch (error) {
    console.error('Error in message handler:', error);
    try {
      await bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }
});

// Error handling for bot
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('Bot is running...'); 
