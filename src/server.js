import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import botkit from 'botkit';
import yelp from 'yelp-fusion';

dotenv.config({ silent: true });

// initialize
const app = express();

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM((err) => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

controller.hears(['hello', 'hi', 'howdy', 'hey'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

// comment out if you don't want bot to be a meany pantz
controller.on('user_typing', (bot, message) => {
  bot.reply(message, 'stop typing!');
});

controller.hears(['sushi'], ['hungry'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  let yelpClient;
  yelp.accessToken(process.env.YELP_CLIENT_ID, process.env.YELP_CLIENT_SECRET)
    .then((res) => {
      yelpClient = yelp.client(res.jsonBody.access_token);
    });
  yelpClient.search({
    term: 'Sushi',
    location: 'hanover, nh',
  }).then((response) => {
    console.log(response.jsonBody.businesses[0].name);
  }).catch((e) => {
    console.log(e);
  });
});

controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'yeah yeah');
});

// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable only if you want templating
app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
app.set('views', path.join(__dirname, '../src/views'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
app.listen(port);

console.log(`listening on: ${port}`);
