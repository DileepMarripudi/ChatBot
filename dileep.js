const TelegramBot = require('node-telegram-bot-api');
const request = require('request');

const DICTIONARY_API_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

const bot = new TelegramBot('6566718121:AAFz45iQ6LXvnbSMYjq4E00epgXdRZ19nDY', { polling: true });
const admin = require('firebase-admin');
const serviceAccount = require('./key.json'); // Downloaded from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  if (messageText.startsWith('/start')) {
    bot.sendMessage(chatId, 'HELLO!! WELCOME TO WORD CHATBOT. PROVIDE ME A WORD.');
  } else if (messageText.startsWith('/history')) {
    getHistory(chatId).then(history => {
      if (history.length === 0) {
        bot.sendMessage(chatId, 'No search history found.');
      } else {
        bot.sendMessage(chatId, 'Your search history:\n\n' + history.join('\n'));
      }
    }).catch(error => {
      console.error('Error fetching history:', error);
      bot.sendMessage(chatId, 'Error fetching history.');
    });
  } else {
    if (typeof messageText === 'string') {
      const word = messageText.trim();
      const apiUrl = DICTIONARY_API_BASE_URL + encodeURIComponent(word);
      console.log(word);
      request(apiUrl, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const data = JSON.parse(body);
          if (data.title === "No Definitions Found") {
            bot.sendMessage(chatId, 'PLEASE CHECK YOUR SPELLING OF YOUR WORD.');
          } else {
            const meanings = data[0].meanings;
            let responseText = `Definitions of ${word}:\n\n`;
            meanings.forEach((meaning) => {
              meaning.definitions.forEach((definition, index) => {
                responseText += `${index + 1}. ${definition.definition}\n`;
              });
            });

            const phonetic = Array.isArray(data[0].phonetics) && data[0].phonetics.length > 0 ? data[0].phonetics[0].text : data[0].phonetic || 'No phonetic available';
            bot.sendMessage(chatId, responseText);
            bot.sendMessage(chatId, "Phonetic ==> " + phonetic);

            // Save search to history
            saveToHistory(chatId, word);
          }
        } else {
          bot.sendMessage(chatId, 'Oops! Something went wrong.');
        }
      });
    }
  }
});

// Function to save search query to Firebase
function saveToHistory(chatId, word) {
  const userHistoryRef = db.collection('searchHistory').doc(chatId.toString());
  userHistoryRef.set({
    history: admin.firestore.FieldValue.arrayUnion(word)
  }, { merge: true }).catch(error => {
    console.error('Error saving history:', error);
  });
}

// Function to get search history from Firebase
async function getHistory(chatId) {
  const userHistoryRef = db.collection('searchHistory').doc(chatId.toString());
  const doc = await userHistoryRef.get();
  if (!doc.exists) {
    return [];
  } else {
    return doc.data().history || [];
  }
} 
