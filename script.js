const { ipcRenderer } = require("electron");
const ipc=ipcRenderer; // just for shortened name

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

window.addEventListener('load', () => {

  document.querySelector("#minimize").addEventListener("click", () => {
    ipc.send("manualMinimize");
  });

  document.querySelector("#maximize").addEventListener("click", () => {
    ipc.send("manualMaximize");
  });

  document.querySelector("#close").addEventListener("click", () => {
    ipc.send("manualClose");
  });

  //Put App in the Background
  document.querySelector("#backgroundBtn").addEventListener("click", () => {
    ipc.send("voidApp");
  });

  var form = document.getElementById('form')
  console.log(form)
  form.addEventListener('submit', handleSubmit);
})

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

async function createEvent(auth, e) {

    var date = document.getElementById('date').value.toString()
    var newDate = date.split('-')
    var subject = document.getElementById('subject').value
    var assignmentType = document.getElementById('assignmentType').value
    var assignment = document.getElementById('textInput').value
    var output = document.getElementById('output')


    var colorId = '11';

    if (assignmentType == 'Klausur') {
      colorId = '2'
    } else if(assignmentType === 'Test') {
     colorId = '7' 
    }else {
      colorId = '11'
    }


    const event = {
        'summary': subject,
        'description': assignment,
        'colorId': colorId,
        'start': {
          'date': newDate[0]+'-'+newDate[1]+'-'+newDate[2],
          'timeZone': 'America/Los_Angeles',
        },
        'end': {
          'date': newDate[0]+'-'+newDate[1]+'-'+newDate[2],
          'timeZone': 'America/Los_Angeles',
        },
      };

      const calendar = google.calendar({version: 'v3', auth});
      calendar.events.insert({
        auth: auth,
        calendarId: 'c19e56b4fcb55b06b94172ebae7dceaca5f882eedb50c1e636b3bb80aaf49e6a@group.calendar.google.com',
        resource: event,
      }, function(err, event) {
        if (err) {
          output.classList.add('error')
          output.innerHTML = err
          console.log('Error: ' + err);
          return;
        }
        output.classList.add('success')
        output.innerHTML = 'Eintrag erfolgreich erstellt!'
        console.log(`Event created: ${event.htmlLink}`);
        document.getElementById('form').reset()
      });
}

function handleSubmit(e) {
  e.preventDefault()
  authorize().then(createEvent).catch(console.error);
}



