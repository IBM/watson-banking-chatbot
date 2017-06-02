/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

'use strict';

require('dotenv').config({
  silent: true
});

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var watson = require('watson-developer-cloud'); // watson sdk
var fs = require('fs'); // file system for loading JSON
// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var url = require('url'), http = require('http'), https = require('https'), numeral = require('numeral');
var vcapServices = require('vcap_services');

var bankingServices = require('./banking_services');

const DEFAULT_NAME = "watson-banking-chatbot";
const DISCOVERY_ACTION = "rnr";  // Replaced RnR w/ Discovery but Conversation action is still "rnr".
// Discovery environment and collection are found by name if ID is not provided.
const DISCOVERY_ENVIRONMENT_NAME = process.env.DISCOVERY_ENVIRONMENT_NAME || DEFAULT_NAME;
const DISCOVERY_COLLECTION_NAME = process.env.DISCOVERY_COLLECTION_NAME || DEFAULT_NAME;
const DISCOVERY_DOCS = [
  "./data/Retrieve&Rank/RnRDocs&Questions/BankFaqRnR-DB-Failure - General.docx",
  "./data/Retrieve&Rank/RnRDocs&Questions/BankFaqRnR-DB-Terms - General.docx",
  "./data/Retrieve&Rank/RnRDocs&Questions/BankFaqRnR-e2eAO-Terms.docx",
  "./data/Retrieve&Rank/RnRDocs&Questions/BankFaqRnR-e2ePL-Terms.docx",
  "./data/Retrieve&Rank/RnRDocs&Questions/BankRnR-OMP - General.docx"
];

var LOOKUP_BALANCE = 'balance';
var LOOKUP_TRANSACTIONS = 'transactions';
var LOOKUP_5TRANSACTIONS = '5transactions';

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());
require("cf-deployment-tracker-client").track();

// setupError will be set to an error message if we cannot recover from service setup or init error.
var setupError = '';

// Credentials for services
var conversation_credentials = vcapServices.getCredentials('conversation');
var nlu_credentials = vcapServices.getCredentials('natural-language-understanding');
var tone_analyzer = vcapServices.getCredentials('tone_analyzer');
var discovery_credentials = vcapServices.getCredentials('discovery');

var discovery = watson.discovery({
  password: discovery_credentials.password,
  username: discovery_credentials.username,
  version_date: '2017-04-27',
  version: 'v1'
});
var discoveryParams; // discovery_params will be set after Discovery is validated and setup.
setupDiscovery();

// Create the service wrapper
var conversation = watson.conversation({
  url: 'https://gateway.watsonplatform.net/conversation/api',
  username: conversation_credentials.username || '',
  password: conversation_credentials.password || '',
  version_date: '2016-07-11',
  version: 'v1'
});
var workspace_id; // workspace_id will be set when the workspace is created or validated.
setupConversationWorkspace();

var tone_analyzer = watson.tone_analyzer({
  username: tone_analyzer.username || '',
  password: tone_analyzer.password || '',
  url: 'https://gateway.watsonplatform.net/tone-analyzer/api',
  version: 'v3',
  version_date: '2016-05-19'
});

/* ******** NLU ************ */
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
var nlu = new NaturalLanguageUnderstandingV1({
  username: nlu_credentials.username || '', // NLU Service username
  password: nlu_credentials.password || '', // NLU Service password
  version_date: '2017-02-27'
});

// Endpoint to be called from the client side
app.post('/api/message', function(req, res) {
  if (setupError) {
    return res.json({ 'output': { 'text': 'The app failed to initialize properly. Setup and restart needed.' + setupError } });
  }

  if (!workspace_id) {
    return res.json({
      'output': {
        'text': 'Conversation initialization in progress. Please try again.'
      }
    });
  }

  bankingServices.getPerson(7829706, function(err, person) {
    if (err) {
      console.log('Error occurred while getting person data ::', err);
      return res.status(err.code || 500).json(err);
    }

    var payload = {
      workspace_id: workspace_id,
      context: {
        'person' : person
      },
      input: {}
    };

    // common regex patterns
    var regpan = /^([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}?$/;
    var regadhaar = /^\d{12}$/;
    var regmobile = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/;
    var str = '';
    if (req.body) {
      if (req.body.input) {
        var inputstring = req.body.input.text;
        console.log('input string ',inputstring );
        var words = inputstring.split(" ");
        console.log('words ', words);
        inputstring = '';
        for (var i = 0; i < words.length; i++) {
          if (regpan.test(words[i]) === true) {
            var value = words[i];
            words[i] = '1111111111';
          }
          inputstring += words[i] + ' ';
        }
        // words.join(" ");
        inputstring = inputstring.trim();
        console.log('After inputstring ', inputstring);
        // payload.input = req.body.input;
        payload.input.text = inputstring;
      }
      if (req.body.context) {
        // The client must maintain context/state
        payload.context = req.body.context;
      }
    }

    /* if (req.body) {
        if (req.body.input) {
            payload.input = req.body.input;
                        }
        if (req.body.context) {
            // The client must maintain context/state
            payload.context = req.body.context;
        }

    } */

    callconversation(payload);
  });

  // Send the input to the conversation service
  function callconversation(payload) {
    var query_input = JSON.stringify(payload.input);
    var context_input = JSON.stringify(payload.context);

    tone_analyzer.tone(
      {
        text: query_input,
        tones: 'emotion'
      },
      function(err, tone) {
        var tone_anger_score = '';
        if (err) {
          console.log('Error occurred while invoking Tone analyzer. ::', err);
          // return res.status(err.code || 500).json(err);
        } else {
          var emotionTones = tone.document_tone.tone_categories[0].tones;

          var len = emotionTones.length;
          for (var i = 0; i < len; i++) {
            if (emotionTones[i].tone_id === 'anger') {
              console.log('Input = ', query_input);
              console.log('emotion_anger score = ', 'Emotion_anger', emotionTones[i].score);
              tone_anger_score = emotionTones[i].score;
              break;
            }
          }
        }

        payload.context['tone_anger_score'] = tone_anger_score;

        if (payload.input.text != '') {
          // console.log('input text payload = ', payload.input.text);
          var parameters = {
            'text': payload.input.text,
            'features': {
              'entities': {
                'emotion': true,
                'sentiment': true,
                'limit': 2
              },
              'keywords': {
                'emotion': true,
                'sentiment': true,
                'limit': 2
              }
            }
          };

          nlu.analyze(parameters, function(err, response) {
            if (err) {
              console.log('error:', err);
            } else {
              var nlu_output = response;

              payload.context['nlu_output'] = nlu_output;
              // console.log('NLU = ', nlu_output);
              // identify location
              var entities = nlu_output.entities;
              var location = entities.map(function(entry) {
                if (entry.type == "Location") {
                  return entry.text;
                }
              });
              location = location.filter(function(entry) {
                if (entry != null) {
                  return entry;
                }
              });
              if (location.length > 0) {
                payload.context['Location'] = location[0];
                console.log('Location = ', payload.context['Location']);
              } else {
                payload.context['Location'] = '';
              }

              /*
              // identify Company

              var company = entities.map(function(entry) {
                if (entry.type == "Company") {
                  return entry.text;
                }
              });
              company = company.filter(function(entry) {
                if (entry != null) {
                  return entry;
                }
              });
              if (company.length > 0) {
                payload.context.userCompany = company[0];
              } else {
                delete payload.context.userCompany;
              }

              // identify Person

              var person = entities.map(function(entry) {
                if (entry.type == "Person") {
                  return entry.text;
                }
              });
              person = person.filter(function(entry) {
                if (entry != null) {
                  return entry;
                }
              });
              if (person.length > 0) {
                payload.context.Person = person[0];
              } else {
                delete payload.context.Person;
              }

              // identify Vehicle

              var vehicle = entities.map(function(entry) {
                if (entry.type == "Vehicle") {
                  return entry.text;
                }
              });
              vehicle = vehicle.filter(function(entry) {
                if (entry != null) {
                  return entry;
                }
              });
              if (vehicle.length > 0) {
                payload.context.userVehicle = vehicle[0];
              } else {
                delete payload.context.userVehicle;
              }
              // identify Email

              var email = entities.map(function(entry) {
                if(entry.type == "EmailAddress") {
                  return(entry.text);
                }
              });
              email = email.filter(function(entry) {
                if(entry != null) {
                  return(entry);
                }
              });
              if(email.length > 0) {
                payload.context.userEmail = email[0];
              } else {
                delete payload.context.userEmail;
              }
              */
            }

            conversation.message(payload, function(err, data) {
              if (err) {
                return res.status(err.code || 500).json(err);
              } else {
                console.log('conversation.message :: ', JSON.stringify(data));
                // lookup actions
                checkForLookupRequests(data, function(err, data) {
                  if (err) {
                    return res.status(err.code || 500).json(err);
                  } else {
                    return res.json(data);
                  }
                });
              }
            });
          });
        } else {
          conversation.message(payload, function(err, data) {
            if (err) {
              return res.status(err.code || 500).json(err);
            } else {
              console.log('conversation.message :: ', JSON.stringify(data));
              return res.json(data);
            }
          });
        }
      }
    );
  }
});

/**
*
* Looks for actions requested by conversation service and provides the requested data.
*
**/
function checkForLookupRequests(data, callback) {
  console.log('checkForLookupRequests');

  if (data.context && data.context.action && data.context.action.lookup && data.context.action.lookup != 'complete') {
    var payload = {
      workspace_id: workspace_id,
      context: data.context,
      input: data.input
    };

    // conversation requests a data lookup action
    if (data.context.action.lookup === LOOKUP_BALANCE) {
      console.log('Lookup Balance requested');
      // if account type is specified (checking, savings or credit card)
      if (data.context.action.account_type && data.context.action.account_type != '') {
        // lookup account information services and update context with account data
        var accounts = bankingServices.getAccountInfo(7829706, data.context.action.account_type, function(err, accounts) {
          if (err) {
            console.log('Error while calling bankingServices.getAccountInfo ', err);
            callback(err, null);
            return;
          }
          var len = accounts ? accounts.length : 0;

          var append_account_response = data.context.action.append_response && data.context.action.append_response === true ? true : false;

          var accounts_result_text = '';

          for (var i = 0; i < len; i++) {
            accounts[i].balance = accounts[i].balance ? numeral(accounts[i].balance).format('INR 0,0.00') : '';

            if (accounts[i].available_credit)
              accounts[i].available_credit = accounts[i].available_credit ? numeral(accounts[i].available_credit).format('INR 0,0.00') : '';

            if (accounts[i].last_statement_balance)
              accounts[i].last_statement_balance = accounts[i].last_statement_balance ? numeral(accounts[i].last_statement_balance).format('INR 0,0.00') : '';

            if (append_account_response === true) {
              accounts_result_text += accounts[i].number + ' ' + accounts[i].type + ' Balance: ' + accounts[i].balance + '<br/>';
            }
          }

          payload.context['accounts'] = accounts;

          // clear the context's action since the lookup was completed.
          payload.context.action = {};

          if (!append_account_response) {
            console.log('call conversation.message with lookup results.');
            conversation.message(payload, function(err, data) {
              if (err) {
                console.log('Error while calling conversation.message with lookup result', err);
                callback(err, null);
              } else {
                console.log('checkForLookupRequests conversation.message :: ', JSON.stringify(data));
                callback(null, data);
              }
            });
          } else {
            console.log('append lookup results to the output.');
            // append accounts list text to response array
            if (data.output.text) {
              data.output.text.push(accounts_result_text);
            }
            // clear the context's action since the lookup and append was completed.
            data.context.action = {};

            callback(null, data);
          }
        });
      }
    } else if (data.context.action.lookup === LOOKUP_TRANSACTIONS) {
      console.log('Lookup Transactions requested');
      bankingServices.getTransactions(7829706, data.context.action.category, function(err, transaction_response) {
        if (err) {
          console.log('Error while calling account services for transactions', err);
          callback(err, null);
        } else {
          var responseTxtAppend = '';
          if (data.context.action.append_total && data.context.action.append_total === true) {
            responseTxtAppend += 'Total = <b>' + numeral(transaction_response.total).format('INR 0,0.00') + '</b>';
          }

          if (transaction_response.transactions && transaction_response.transactions.length > 0) {
            // append transactions
            var len = transaction_response.transactions.length;
            var sDt = new Date(data.context.action.startdt);
            var eDt = new Date(data.context.action.enddt);
            if (sDt && eDt) {
              for (var i = 0; i < len; i++) {
                var transaction = transaction_response.transactions[i];
                var tDt = new Date(transaction.date);
                if (tDt > sDt && tDt < eDt) {
                  if (data.context.action.append_response && data.context.action.append_response === true) {
                    responseTxtAppend +=
                      '<br/>' + transaction.date + ' &nbsp;' + numeral(transaction.amount).format('INR 0,0.00') + ' &nbsp;' + transaction.description;
                  }
                }
              }
            } else {
              for (var i = 0; i < len; i++) {
                var transaction1 = transaction_response.transactions[i];
                if (data.context.action.append_response && data.context.action.append_response === true) {
                  responseTxtAppend +=
                    '<br/>' + transaction1.date + ' &nbsp;' + numeral(transaction1.amount).format('INR 0,0.00') + ' &nbsp;' + transaction1.description;
                }
              }
            }

            if (responseTxtAppend != '') {
              console.log('append lookup transaction results to the output.');
              if (data.output.text) {
                data.output.text.push(responseTxtAppend);
              }
              // clear the context's action since the lookup and append was completed.
              data.context.action = {};
            }
            callback(null, data);

            // clear the context's action since the lookup was completed.
            payload.context.action = {};
            return;
          }
        }
      });
    } else if (data.context.action.lookup === LOOKUP_5TRANSACTIONS) {
      console.log('Lookup Transactions requested');
      bankingServices.getTransactions(7829706, data.context.action.category, function(err, transaction_response) {
        if (err) {
          console.log('Error while calling account services for transactions', err);
          callback(err, null);
        } else {
          var responseTxtAppend = '';
          if (data.context.action.append_total && data.context.action.append_total === true) {
            responseTxtAppend += 'Total = <b>' + numeral(transaction_response.total).format('INR 0,0.00') + '</b>';
          }

          transaction_response.transactions.sort(function(a1, b1) {
            var a = new Date(a1.date);
            var b = new Date(b1.date);
            return a > b ? -1 : a < b ? 1 : 0;
          });

          if (transaction_response.transactions && transaction_response.transactions.length > 0) {
            // append transactions
            var len = 5; // transaction_response.transactions.length;
            for (var i = 0; i < len; i++) {
              var transaction = transaction_response.transactions[i];
              if (data.context.action.append_response && data.context.action.append_response === true) {
                responseTxtAppend +=
                  '<br/>' + transaction.date + ' &nbsp;' + numeral(transaction.amount).format('INR 0,0.00') + ' &nbsp;' + transaction.description;
              }
            }
          }
          if (responseTxtAppend != '') {
            console.log('append lookup transaction results to the output.');
            if (data.output.text) {
              data.output.text.push(responseTxtAppend);
            }
            // clear the context's action since the lookup and append was completed.
            data.context.action = {};
          }
          callback(null, data);

          // clear the context's action since the lookup was completed.
          payload.context.action = {};
          return;
        }
      });
    } else if (data.context.action.lookup === "branch") {
      console.log('************** Branch details *************** InputText : ' + payload.input.text);
      var loc = data.context.action.Location.toLowerCase();
      bankingServices.getBranchInfo(loc, function(err, branchMaster) {
        if (err) {
          console.log('Error while calling bankingServices.getAccountInfo ', err);
          callback(err, null);
          return;
        }

        var append_branch_response = data.context.action.append_response && data.context.action.append_response === true ? true : false;

        var branch_text = '';

        if (append_branch_response === true) {
          if (branchMaster != null) {
            branch_text =
              'Here are the branch details at ' +
              branchMaster.location +
              ' <br/>Address: ' +
              branchMaster.address +
              '<br/>Phone: ' +
              branchMaster.phone +
              '<br/>Operation Hours: ' +
              branchMaster.hours +
              '<br/>';
          } else {
            branch_text = "Sorry currently we don't have branch details for" + data.context.action.Location;
          }
        }

        payload.context['branch'] = branchMaster;

        // clear the context's action since the lookup was completed.
        payload.context.action = {};

        if (!append_branch_response) {
          console.log('call conversation.message with lookup results.');
          conversation.message(payload, function(err, data) {
            if (err) {
              console.log('Error while calling conversation.message with lookup result', err);
              callback(err, null);
            } else {
              console.log('checkForLookupRequests conversation.message :: ', JSON.stringify(data));
              callback(null, data);
            }
          });
        } else {
          console.log('append lookup results to the output.');
          // append accounts list text to response array
          if (data.output.text) {
            data.output.text.push(branch_text);
          }
          // clear the context's action since the lookup and append was completed.
          data.context.action = {};

          callback(null, data);
        }
      });
    } else if (data.context.action.lookup === DISCOVERY_ACTION) {
      console.log('************** Discovery *************** InputText : ' + payload.input.text);
      let discoveryResponse = '';
      if (!discoveryParams) {
        console.log('Discovery is not ready for query.');
        discoveryResponse = 'Sorry, currently I do not have a response. Discovery initialization is in progress. Please try again later.';
        if (data.output.text) {
          data.output.text.push(discoveryResponse);
        }
        // Clear the context's action since the lookup and append was attempted.
        data.context.action = {};
        callback(null, data);
        // Clear the context's action since the lookup was attempted.
        payload.context.action = {};
      } else {
        let queryParams = {
          natural_language_query: payload.input.text,
          passages: true
        };
        Object.assign(queryParams, discoveryParams);
        discovery.query(queryParams, (err, searchResponse) => {
          discoveryResponse = 'Sorry, currently I do not have a response. Our Customer representative will get in touch with you shortly.';
          if (err) {
            console.error('Error searching for documents: ' + err);
          } else if (searchResponse.passages.length > 0) {
            let bestPassage = searchResponse.passages[0];
            console.log("Passage score: ", bestPassage.passage_score);
            console.log("Passage text: ", bestPassage.passage_text);

            // Trim the passage to try to get just the answer part of it.
            let lines = bestPassage.passage_text.split("\n");
            let bestLine;
            let questionFound = false;
            for (let i = 0, size = lines.length; i < size; i++) {
              let line = lines[i].trim();
              if (!line) {
                continue; // skip empty/blank lines
              }
              if (line.includes("?") || line.includes("<h1")) {
                // To get the answer we needed to know the Q/A format of the doc.
                // Skip questions which either have a '?' or are a header '<h1'...
                questionFound = true;
                continue;
              }
              bestLine = line; // Best so far, but can be tail of earlier answer.
              if (questionFound && bestLine) {
                // We found the first non-blank answer after the end of a question. Use it.
                break;
              }
            }
            discoveryResponse =
              bestLine || 'Sorry I currently do not have an appropriate response for your query. Our customer care executive will call you in 24 hours.';
          }

          if (data.output.text) {
            data.output.text.push(discoveryResponse);
          }
          // Clear the context's action since the lookup and append was completed.
          data.context.action = {};
          callback(null, data);
          // Clear the context's action since the lookup was completed.
          payload.context.action = {};
        });
      }
    } else {
      callback(null, data);
      return;
    }
  } else {
    callback(null, data);
    return;
  }
}

/**
 * Validate or create the Conversation workspace.
 * Sets the global workspace_id when done (or global setup_error).
 * 
 * If a WORKSPACE_ID is specified in the runtime environment,
 * make sure that workspace exists. If no WORKSTATION_ID is
 * specified then try to find it using a lookup by name.
 * Name will be 'watson-banking-chatbot' unless overridden
 * using the WORKSPACE_NAME environment variable.
 * 
 * If a workspace is not found by ID or name, then try to
 * create one from the JSON in the repository. Use the
 * name as mentioned above so future lookup will find what
 * was created.
 */
function setupConversationWorkspace() {
  conversation.listWorkspaces(null, function(err, data) {
    if (err) {
      console.error("Error during Conversation listWorkspaces(): ", err);
      handleSetupError("Error. Unable to list workspaces for Conversation: " + err);
    } else {
      let workspaces = data['workspaces'];
      let found = false;
      let validateID = process.env.WORKSPACE_ID;
      if (validateID) {
        console.log("Validating workspace ID: ", validateID);
        for (let i = 0, size = workspaces.length; i < size; i++) {
          if (workspaces[i]['workspace_id'] === validateID) {
            workspace_id = validateID;
            found = true;
            console.log("Found workspace: ", validateID);
            break;
          }
        }
        if (!found) {
          handleSetupError("Configured WORKSPACE_ID '" + validateID + "' not found!");
        }
      } else {
        // Find by name, because we probably created it earlier (in the if block) and want to use it on restarts.
        let workspaceName = process.env.WORKSPACE_NAME || DEFAULT_NAME;
        console.log("Looking for workspace by name: ", workspaceName);
        for (let i = 0, size = workspaces.length; i < size; i++) {
          if (workspaces[i]['name'] === workspaceName) {
            console.log("Found workspace: ", workspaceName);
            workspace_id = workspaces[i]['workspace_id'];
            found = true;
            break;
          }
        }
        if (!found) {
          console.log("Creating Conversation workspace ", workspaceName);
          let ws = JSON.parse(fs.readFileSync('data/WCS/workspace-ConversationalBanking.json'));
          ws['name'] = workspaceName;
          conversation.createWorkspace(ws, function(err, ws) {
            if (err) {
              handleSetupError("Failed to create Conversation workspace: " + err);
            } else {
              workspace_id = ws['workspace_id'];
              console.log('Successfully created Conversation workspace');
              console.log('  Name: ', ws['name']);
              console.log('  ID:', workspace_id);
            }
          });
        }
      }
    }
  });
}

/**
 * Get the default Discovery configuration.
 * @param {Object} params - Discovery params so far. Enough to get configurations.
 * @return {Promise} Promise with resolve({enhanced discovery params}) or reject(err).
 */
function getDiscoveryConfig(params) {
  return new Promise((resolve, reject) => {
    discovery.getConfigurations(params, (err, data) => {
      if (err) {
        console.error(err);
        return reject("Failed to get Discovery configurations.");
      } else {
        let configs = data.configurations;
        for (let i = 0, size = configs.length; i < size; i++) {
          var config = configs[i];
          if (config.name === "Default Configuration") {
            params.configuration_id = config.configuration_id;
            return resolve(params);
          }
        }
        return reject("Failed to get default Discovery configuration.");
      }
    });
  });
}

/**
 * Find the Discovery environment.
 * If a DISCOVERY_ENVIRONMENT_ID is set then validate it or error out.
 * Otherwise find it by name (DISCOVERY_ENVIRONMENT_NAME). The by name
 * search is used to find an environment that we created before a restart.
 * If we don't find an environment by ID or name, we'll use an existing one
 * if it is not read_only. This allows us to work in free trial environments.
 * @return {Promise} Promise with resolve({environment}) or reject(err).
 */
function findDiscoveryEnvironment() {
  return new Promise((resolve, reject) => {
    discovery.getEnvironments({}, (err, data) => {
      if (err) {
        console.error(err);
        return reject("Failed to get Discovery environments.");
      } else {
        let environments = data.environments;
        // If a DISCOVERY_ENVIRONMENT_ID is set, validate it and use it (or fail).
        let validateID = process.env.DISCOVERY_ENVIRONMENT_ID;
        // Otherwise, look (by name) for one that we already created.
        // Otherwise we'll reuse an existing environment, if we find a usable one.
        let reuseEnv;

        for (let i = 0, size = environments.length; i < size; i++) {
          let environment = environments[i];
          if (validateID) {
            if (validateID === environment.environment_id) {
              console.log("Found Discovery environment using DISCOVERY_ENVIRONMENT_ID.");
              console.log(environment);
              return resolve(environment);
            }
          } else {
            if (environment.name === DISCOVERY_ENVIRONMENT_NAME) {
              console.log("Found Discovery environment by name.");
              console.log(environment);
              return resolve(environment);
            } else if (!environment.read_only) {
              reuseEnv = environment.environment_id;
            }
          }
        }
        if (validateID) {
          return reject("Configured DISCOVERY_ENVIRONMENT_ID=" + validateID + " not found.");
        } else if (reuseEnv) {
          console.log("Found existing Discovery environment to use: ", reuseEnv);
          return resolve(reuseEnv);
        }
      }
      return resolve(null);
    });
  });
}

/**
 * Find the Discovery collection.
 * If a DISCOVERY_COLLECTION_ID is set then validate it or error out.
 * Otherwise find it by name (DISCOVERY_COLLECTION_NAME). The by name
 * search is used to find collections that we created before a restart.
 * @param {Object} environment - The existing environment.
 * @return {Promise} Promise with resolve({discovery params}) or reject(err).
 */
function findDiscoveryCollection(environment) {
  return new Promise((resolve, reject) => {
    let params = {
      environment_id: environment.environment_id
    };
    discovery.getCollections(params, (err, data) => {
      let collections = data.collections;
      if (err) {
        console.error(err);
        return reject("Failed to get Discovery collections.");
      } else {
        // If a DISCOVERY_COLLECTION_ID is set, validate it and use it (or fail).
        let validateID = process.env.DISCOVERY_COLLECTION_ID;
        // Otherwise, look (by name) for one that we already created.
        for (let i = 0, size = collections.length; i < size; i++) {
          let collection = collections[i];
          if (validateID) {
            if (validateID === collection.collection_id) {
              console.log("Found Discovery collection using DISCOVERY_COLLECTION_ID.");
              console.log(collection);
              params.collection_name = collection.name;
              params.collection_id = collection.collection_id;
              return resolve(params);
            }
          } else if (collection.name === DISCOVERY_COLLECTION_NAME) {
            console.log("Found Discovery collection by name.");
            console.log(collection);
            params.collection_name = collection.name;
            params.collection_id = collection.collection_id;
            return resolve(params);
          }
        }
        if (validateID) {
          return reject("Configured DISCOVERY_COLLECTION_ID=" + validateID + " not found.");
        }
      }
      // No collection_id added, but return params dict. Set the name to use to create a collection.
      params.collection_name = DISCOVERY_COLLECTION_NAME;
      return resolve(params);
    });
  });
}

/** Create a Discovery environment if we did not find one.
 * If an environment is passed in, then we already have one.
 * When we create one, we have to create it with our known name
 * so that we can find it later.
 * @param {Object} environment - The existing environment if we found it.
 * @return {Promise} Promise with resolve(environment) or reject(err).
 */
function createDiscoveryEnvironment(environment) {
  if (environment) {
    return Promise.resolve(environment);
  }
  return new Promise((resolve, reject) => {
    // No existing environment found, so create it.
    // NOTE: The number of environments that can be created
    // under a trial Bluemix account is limited to one per
    // organization. That is why have the "reuse" strategy above.
    console.log("Creating discovery environment...");
    let params = {
      name: DISCOVERY_ENVIRONMENT_NAME,
      description: "Discovery environment created by watson-banking-chatbot.",
      size: "0"  // Use string to avoid default of 1.
    };
    discovery.createEnvironment(params, (err, data) => {
      if (err) {
        console.error("Failed to create Discovery environment.");
        return reject(err);
      } else {
        console.log(data);
        resolve(data);
      }
    });
  });
}

/**
 * Create a Discovery collection if we did not find one.
 * If params include a collection_id, then we already have one.
 * When we create one, we have to create it with our known name
 * so that we can find it later.
 * @param {Object} params - All the params needed to use Discovery.
 * @return {Promise}
 */
function createDiscoveryCollection(params) {
  if (params.collection_id) {
    return Promise.resolve(params);
  }
  return new Promise((resolve, reject) => {
    // No existing environment found, so create it.
    console.log("Creating discovery collection...");
    let createCollectionParams = {
      name: params.collection_name,
      description: "Discovery collection created by watson-banking-chatbot.",
      language_code: "en_us"
    };
    Object.assign(createCollectionParams, params);
    discovery.createCollection(createCollectionParams, (err, data) => {
      if (err) {
        console.error("Failed to create Discovery collection.");
        return reject(err);
      } else {
        console.log("Created Discovery collection: ", data);
        params.collection_id = data.collection_id;
        resolve(params);
      }
    });
  });
}

/**
 * Load the Discovery collection if it is not already loaded.
 * The collection should already be created/validated.
 * Currently using lazy loading of docs and only logging problems.
 * @param {Object} params - All the params needed to use Discovery.
 * @return {Promise}
 */
function loadDiscoveryCollection(params) {
  console.log("Get collection to check its status.");
  discovery.getCollection(params, (err, data) => {
    if (err) {
      console.error(err);
    } else {
      console.log("Checking status of Discovery collection:", data);
      let docs = DISCOVERY_DOCS;
      let doc_count = docs.length;
      if (data.document_counts.available + data.document_counts.processing + data.document_counts.failed < doc_count) {
        console.log("Loading documents into Discovery collection.");
        for (let i = 0; i < doc_count; i++) {
          let doc = docs[i];
          let addDocParams = { file: fs.createReadStream(doc) };
          Object.assign(addDocParams, params);
          discovery.addDocument(addDocParams, (err, data) => {
            // Note: No promise. Just let these all run/log. Revisit this?
            if (err) {
              console.log("Add document error:");
              console.error(err);
            } else {
              console.log("Added document:")
              console.log(data);
            }
          });
        }
      } else {
        console.log("Collection is already loaded with docs.");
        /* For testing:
         discovery.deleteCollection(params, (err, data) => {
         console.log("Deleting collection for testing!!!!!!!!!!!!!!!!!!!!!!!!");
         if (err) {
         console.log(err);
         }
         });
         */
      }
    }
  });
  // Note: The collection was validated earlier and we are letting the docs lazy load.
  //       So this one will resolve fast, but might revisit that.
  return Promise.resolve(params);
}

/**
 * When Discovery is ready for use, set the global params.
 * @param {Object} params - All the params needed to use Discovery.
 */
function discoveryIsReady(params) {
  if (params) {
    // Set the global discoveryParams. We are good to go.
    discoveryParams = params;
    console.log("Discovery is ready!");
    console.log(params);
  } else {
    // This should not happen!
    console.error("discoveryIsReady() was called w/o params!");
  }
}

/**
 * Handle setup errors by logging and appending to the global error text.
 * @param {String} reason - The error message for the setup error.
 */
function handleSetupError(reason) {
  console.error(reason);
  setupError += ' ' + reason;
  // We could allow our chatbot to run. It would just report the above error.
  // Or we can add the following 2 lines to abort on a setup error allowing Bluemix to restart it.
  console.log("Aborting.");
  process.exit(1);
}

/**
 * Validate and setup the Discovery service.
 */
function setupDiscovery() {
  findDiscoveryEnvironment()
    .then(environment => createDiscoveryEnvironment(environment))
    .then(environment => findDiscoveryCollection(environment))
    .then(params => getDiscoveryConfig(params))
    .then(params => createDiscoveryCollection(params))
    .then(params => loadDiscoveryCollection(params))
    .then(params => discoveryIsReady(params))
    .catch(handleSetupError);
}

module.exports = app;
