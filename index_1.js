// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
var Store = require('./store');
var spellService = require('./spell-service');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
// Create connector and listen for messages
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
    session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
});

// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/
var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
builder.LuisRecognizer.recognize("This is a test", process.env.LUIS_MODEL_URL, console.log);
bot.recognizer(recognizer);

bot.dialog('RaiseIncident', [
    function (session, args, next) {
        session.send('Welcome to the Incident raise service: \'%s\'', session.message.text);

        // try extracting entities
        var errorentity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Error');
        var machineentity = builder.EntityRecognizer.findEntity(args.intent.entities, 'machine');
        if (errorentity) {
			console.log("******error*******"+errorentity.entity);
            // error entity detected, continue to next step
            session.dialogData.searchType = 'Error';
            next({ response: errorentity.entity });
        } else if (machineentity) {
			console.log("error"+machineentity);
            // machine entity detected, continue to next step
            session.dialogData.searchType = 'Machine';
            next({ response: machineentity.entity });
        } else {
            // no entities detected, ask user 
            builder.Prompts.text(session, 'Please tell me about the issue ');
        }
     },
    function (session, results) {
       var response = results.response;

         var message = 'raising an incident';
       if (session.dialogData.searchType === 'Error') {
              message += ' for %s error...';
          } else {
              message += ' for %s machine...';
          }

        session.send(message, response);

        // // Async search
        // // Store
            // // .searchHotels(response)
            // // .then(function (hotels) {
                // // // args
                // // session.send('I found %d hotels:', hotels.length);

                // // var message = new builder.Message()
                    // // .attachmentLayout(builder.AttachmentLayout.carousel)
                    // // .attachments(hotels.map(hotelAsAttachment));

                // // session.send(message);

                // // // End
                // // session.endDialog();
            // // });
     }
]).triggerAction({
    matches: 'RaiseIncident',
    onInterrupted: function (session) {
        session.send('Please enter detail descriptiotn for the incident');
    }
});

bot.dialog('ShowHotelsReviews', function (session, args) {
    // retrieve hotel name from matched entities
    var hotelEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Hotel');
    if (hotelEntity) {
        session.send('Looking for reviews of \'%s\'...', hotelEntity.entity);
        Store.searchHotelReviews(hotelEntity.entity)
            .then(function (reviews) {
                var message = new builder.Message()
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(reviews.map(reviewAsAttachment));
                session.endDialog(message);
            });
    }
}).triggerAction({
    matches: 'ShowHotelsReviews'
});

bot.dialog('Help', function (session) {
    session.endDialog('Hi! Try asking me things like \'Raise an incident\', \'search hotels near LAX airport\' or \'show me the reviews of The Bot Resort\'');
}).triggerAction({
    matches: 'Help'
});

bot.dialog('Greetings', function (session) {
    session.endDialog('Hello! Try asking me things like \'raise an SR\', \'search hotels near LAX airport\' or \'show me the reviews of The Bot Resort\'');
}).triggerAction({
    matches: 'Greetings'
});

// Spell Check
if (process.env.IS_SPELL_CORRECTION_ENABLED === 'true') {
    bot.use({
        botbuilder: function (session, next) {
            spellService
                .getCorrectedText(session.message.text)
                .then(function (text) {
                    session.message.text = text;
                    next();
                })
                .catch(function (error) {
                    console.error(error);
                    next();
                });
        }
    });
}

// Helpers
function hotelAsAttachment(hotel) {
    return new builder.HeroCard()
        .title(hotel.name)
        .subtitle('%d stars. %d reviews. From $%d per night.', hotel.rating, hotel.numberOfReviews, hotel.priceStarting)
        .images([new builder.CardImage().url(hotel.image)])
        .buttons([
            new builder.CardAction()
                .title('More details')
                .type('openUrl')
                .value('https://www.bing.com/search?q=hotels+in+' + encodeURIComponent(hotel.location))
        ]);
}

function reviewAsAttachment(review) {
    return new builder.ThumbnailCard()
        .title(review.title)
        .text(review.text)
        .images([new builder.CardImage().url(review.image)]);
}


