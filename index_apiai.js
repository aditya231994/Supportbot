// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
var Store = require('./store');
var spellService = require('./spell-service');
var https= require('https');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
// Create connector and listen for messages
// var connector = new builder.ChatConnector({
    // appId: process.env.MICROSOFT_APP_ID,
    // appPassword: process.env.MICROSOFT_APP_PASSWORD
// });
// server.post('/api/messages', connector.listen());
    var connector = new builder.ConsoleConnector().listen();

var bot = new builder.UniversalBot(connector, function (session) {
    session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
});
  

    var apiairecognizer = require('api-ai-recognizer');
    var recognizer = new apiairecognizer('af141d3ab3644850b56f8327ce27aea3');
	

// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/
// var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
// builder.LuisRecognizer.recognize("This is a test", process.env.LUIS_MODEL_URL, console.log);
bot.recognizer(recognizer);

bot.dialog('RaiseIncident', [
    function (session, args, next) {
        session.send('Welcome to the Incident raise service: \'%s\'', session.message.text);

        // try extracting entities
        var errorentity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Error');
        var machineentity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Machine');
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
              message += ' for %s error.... please wait!';
          } else {
              message += ' for %s .... Please wait!';
          }
		
        session.send(message, response);
		var bodyjson = {
			
				"Request":{
						"short_description":response,
						"comments":"These are my comments"
						 }
		};
		var options = {
		   host: 'dev31468.service-now.com',
		   body: bodyjson,
		   
		   path: 'https://dev31468.service-now.com/api/now/v1/table/incident',
		   // authentication headers
		   headers: {
			 
			  'Authorization': 'Basic YWRtaW46V2ViQDIwMTc='
		   }   
		};

//this is the call
request = https.get(options, function(res,body){
   var body = "";
   res.on('data', function(data) {
      body += data;
   });
   res.on('end', function() {
	   var snResponse = JSON.parse(body);
    //here we have the full response, html or json object
      console.log(snResponse.result[0].number+" incident has been raised. Please note it down for your reference");
	  console.log(snResponse.result[0].short_description+" description");
   })
   res.on('error', function(e) {
      onsole.log("Got error: " + e.message);
   });
	});
	}
	
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
     
]).triggerAction({
    matches: 'RaiseIncident',
    onInterrupted: function (session) {
        //session.send('Please enter detail descriptiotn for the incident');
    }
});
bot.dialog('RaiseSR', [
    function (session, args, next) {
        session.send('Welcome to the Service Request raise service: \'%s\'', session.message.text);

        // try extracting entities
        var accessEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Access');
        var projectEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'ProjectName');
		var InfoEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'Information');
        if (accessEntity) {
			console.log("******access*******"+accessEntity.entity);
            // access entity detected, continue to next step
            session.dialogData.searchType = 'Access';
			session.dialogData.ProjectName = projectEntity.entity;
            next({ response: accessEntity.entity });
        } else if (projectEntity) {
			console.log("project"+projectEntity.entity);
            // project entity detected, continue to next step
            session.dialogData.searchType = 'Project';
            next({ response: projectEntity.entity });
        } 
		else if (InfoEntity) {
			console.log("information"+InfoEntity.entity);
            // project entity detected, continue to next step
            session.dialogData.searchType = 'Information';
            next({ response: InfoEntity.entity });
        } else {
            // no entities detected, ask user 
            builder.Prompts.text(session, 'Please tell me about the where you want access?');
        }
     },
    function (session, results) {
       var response = results.response;

         var message = 'raising a Service Request';
       if (session.dialogData.searchType === 'Access') {
              message += ' for %s on '+ session.dialogData.ProjectName;

			  
          } 
		  
		  else {
              message += ' for getting information on %s...';
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
    matches: 'RaiseSR',
    onInterrupted: function (session) {
        session.send('Please enter detail description for the Service Request');
    }
});

bot.dialog('Help', function (session) {
    session.endDialog('Hey! Try asking me things like \'VDI machine is not working\', \'I need access on this Mercury(project name)\' or \'I am getting this error on my machine\'');
}).triggerAction({
    matches: 'Help'
});

bot.dialog('Greetings', function (session) {
    session.endDialog('Hello! Try asking me things like \'VDI machine is not working\', \'I need access on this Mercury(project name)\' or \'I am getting this error on my machine\'');
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
