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

const express = require('express'); // app server
const bodyParser = require('body-parser'); // parser for post requests
const numeral = require('numeral');
const fs = require('fs'); // file system for loading JSON

const AssistantV1 = require('watson-developer-cloud/assistant/v1');
const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
const ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');

const assistant = new AssistantV1({ version: '2018-02-16' });
const discovery = new DiscoveryV1({ version: '2018-03-05' });
const nlu = new NaturalLanguageUnderstandingV1({ version: '2018-03-16' });
const toneAnalyzer = new ToneAnalyzerV3({ version: '2017-09-21' });

const bankingServices = require('./banking_services');
const WatsonDiscoverySetup = require('./lib/watson-discovery-setup');
const WatsonAssistantSetup = require('./lib/watson-assistant-setup');

const DEFAULT_NAME = 'watson-banking-chatbot';
const DISCOVERY_ACTION = 'rnr'; // Replaced RnR w/ Discovery but Assistant action is still 'rnr'.
const DISCOVERY_DOCS = [
  './data/discovery/docs/BankFaqRnR-DB-Failure-General.docx',
  './data/discovery/docs/BankFaqRnR-DB-Terms-General.docx',
  './data/discovery/docs/BankFaqRnR-e2eAO-Terms.docx',
  './data/discovery/docs/BankFaqRnR-e2ePL-Terms.docx',
  './data/discovery/docs/BankRnR-OMP-General.docx'
];

const LOOKUP_BALANCE = 'balance';
const LOOKUP_TRANSACTIONS = 'transactions';
const LOOKUP_5TRANSACTIONS = '5transactions';

const app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// setupError will be set to an error message if we cannot recover from service setup or init error.
let setupError = '';

let discoveryParams; // discoveryParams will be set after Discovery is validated and setup.
const discoverySetup = new WatsonDiscoverySetup(discovery);
const discoverySetupParams = { default_name: DEFAULT_NAME, documents: DISCOVERY_DOCS };
discoverySetup.setupDiscovery(discoverySetupParams, (err, data) => {
  if (err) {
    handleSetupError(err);
  } else {
    console.log('Discovery is ready!');
    discoveryParams = data;
  }
});

let workspaceID; // workspaceID will be set when the workspace is created or validated.
const assistantSetup = new WatsonAssistantSetup(assistant);
const workspaceJson = JSON.parse(fs.readFileSync('data/conversation/workspaces/banking.json'));
const assistantSetupParams = { default_name: DEFAULT_NAME, workspace_json: workspaceJson };
assistantSetup.setupAssistantWorkspace(assistantSetupParams, (err, data) => {
  if (err) {
    handleSetupError(err);
  } else {
    console.log('Watson Assistant is ready!');
    workspaceID = data;
  }
});

// Endpoint to be called from the client side
app.post('/api/message', function(req, res) {
  if (setupError) {
    return res.json({ output: { text: 'The app failed to initialize properly. Setup and restart needed.' + setupError } });
  }

  if (!workspaceID) {
    return res.json({
      output: {
        text: 'Assistant initialization in progress. Please try again.'
      }
    });
  }

  bankingServices.getPerson(7829706, function(err, person) {
    if (err) {
      console.log('Error occurred while getting person data ::', err);
      return res.status(err.code || 500).json(err);
    }

    const payload = {
      workspace_id: workspaceID,
      context: {
        person: person
      },
      input: {}
    };

    // common regex patterns
    const regpan = /^([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}?$/;
    // const regadhaar = /^\d{12}$/;
    // const regmobile = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/;
    if (req.body) {
      if (req.body.input) {
        let inputstring = req.body.input.text;
        console.log('input string ', inputstring);
        const words = inputstring.split(' ');
        console.log('words ', words);
        inputstring = '';
        for (let i = 0; i < words.length; i++) {
          if (regpan.test(words[i]) === true) {
            // const value = words[i];
            words[i] = '1111111111';
          }
          inputstring += words[i] + ' ';
        }
        // words.join(' ');
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

    callAssistant(payload);
  });

  /**
   * Send the input to the Assistant service.
   * @param payload
   */
  function callAssistant(payload) {
    const queryInput = JSON.stringify(payload.input);

    const toneParams = {
      tone_input: { text: queryInput },
      content_type: 'application/json'
    };
    toneAnalyzer.tone(toneParams, function(err, tone) {
      let toneAngerScore = '';
      if (err) {
        console.log('Error occurred while invoking Tone analyzer. ::', err);
      } else {
        console.log(JSON.stringify(tone, null, 2));
        const emotionTones = tone.document_tone.tones;

        const len = emotionTones.length;
        for (let i = 0; i < len; i++) {
          if (emotionTones[i].tone_id === 'anger') {
            console.log('Input = ', queryInput);
            console.log('emotion_anger score = ', 'Emotion_anger', emotionTones[i].score);
            toneAngerScore = emotionTones[i].score;
            break;
          }
        }
      }

      payload.context['tone_anger_score'] = toneAngerScore;

      if (payload.input.text != '') {
        // console.log('input text payload = ', payload.input.text);
        const parameters = {
          text: payload.input.text,
          features: {
            entities: {
              emotion: true,
              sentiment: true,
              limit: 2
            },
            keywords: {
              emotion: true,
              sentiment: true,
              limit: 2
            }
          }
        };

        nlu.analyze(parameters, function(err, response) {
          if (err) {
            console.log('error:', err);
          } else {
            const nluOutput = response;

            payload.context['nlu_output'] = nluOutput;
            // console.log('NLU = ', nlu_output);
            // identify location
            const entities = nluOutput.entities;
            let location = entities.map(function(entry) {
              if (entry.type == 'Location') {
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

            let company = entities.map(function(entry) {
              if (entry.type == 'Company') {
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

            let person = entities.map(function(entry) {
              if (entry.type == 'Person') {
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

            let vehicle = entities.map(function(entry) {
              if (entry.type == 'Vehicle') {
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

            let email = entities.map(function(entry) {
              if(entry.type == 'EmailAddress') {
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

          assistant.message(payload, function(err, data) {
            if (err) {
              return res.status(err.code || 500).json(err);
            } else {
              console.log('assistant.message :: ', JSON.stringify(data));
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
        assistant.message(payload, function(err, data) {
          if (err) {
            return res.status(err.code || 500).json(err);
          } else {
            console.log('assistant.message :: ', JSON.stringify(data));
            return res.json(data);
          }
        });
      }
    });
  }
});

/**
 * Looks for actions requested by Assistant service and provides the requested data.
 */
function checkForLookupRequests(data, callback) {
  console.log('checkForLookupRequests');

  if (data.context && data.context.action && data.context.action.lookup && data.context.action.lookup != 'complete') {
    const payload = {
      workspace_id: workspaceID,
      context: data.context,
      input: data.input
    };

    // Assistant requests a data lookup action
    if (data.context.action.lookup === LOOKUP_BALANCE) {
      console.log('Lookup Balance requested');
      // if account type is specified (checking, savings or credit card)
      if (data.context.action.account_type && data.context.action.account_type != '') {
        // lookup account information services and update context with account data
        bankingServices.getAccountInfo(7829706, data.context.action.account_type, function(err, accounts) {
          if (err) {
            console.log('Error while calling bankingServices.getAccountInfo ', err);
            callback(err, null);
            return;
          }
          const len = accounts ? accounts.length : 0;

          const appendAccountResponse = data.context.action.append_response && data.context.action.append_response === true ? true : false;

          let accountsResultText = '';

          for (let i = 0; i < len; i++) {
            accounts[i].balance = accounts[i].balance ? numeral(accounts[i].balance).format('INR 0,0.00') : '';

            if (accounts[i].available_credit)
              accounts[i].available_credit = accounts[i].available_credit ? numeral(accounts[i].available_credit).format('INR 0,0.00') : '';

            if (accounts[i].last_statement_balance)
              accounts[i].last_statement_balance = accounts[i].last_statement_balance ? numeral(accounts[i].last_statement_balance).format('INR 0,0.00') : '';

            if (appendAccountResponse === true) {
              accountsResultText += accounts[i].number + ' ' + accounts[i].type + ' Balance: ' + accounts[i].balance + '<br/>';
            }
          }

          payload.context['accounts'] = accounts;

          // clear the context's action since the lookup was completed.
          payload.context.action = {};

          if (!appendAccountResponse) {
            console.log('call assistant.message with lookup results.');
            assistant.message(payload, function(err, data) {
              if (err) {
                console.log('Error while calling assistant.message with lookup result', err);
                callback(err, null);
              } else {
                console.log('checkForLookupRequests assistant.message :: ', JSON.stringify(data));
                callback(null, data);
              }
            });
          } else {
            console.log('append lookup results to the output.');
            // append accounts list text to response array
            if (data.output.text) {
              data.output.text.push(accountsResultText);
            }
            // clear the context's action since the lookup and append was completed.
            data.context.action = {};

            callback(null, data);
          }
        });
      }
    } else if (data.context.action.lookup === LOOKUP_TRANSACTIONS) {
      console.log('Lookup Transactions requested');
      bankingServices.getTransactions(7829706, data.context.action.category, function(err, transactionResponse) {
        if (err) {
          console.log('Error while calling account services for transactions', err);
          callback(err, null);
        } else {
          let responseTxtAppend = '';
          if (data.context.action.append_total && data.context.action.append_total === true) {
            responseTxtAppend += 'Total = <b>' + numeral(transactionResponse.total).format('INR 0,0.00') + '</b>';
          }

          if (transactionResponse.transactions && transactionResponse.transactions.length > 0) {
            // append transactions
            const len = transactionResponse.transactions.length;
            const sDt = new Date(data.context.action.startdt);
            const eDt = new Date(data.context.action.enddt);
            if (sDt && eDt) {
              for (let i = 0; i < len; i++) {
                const transaction = transactionResponse.transactions[i];
                const tDt = new Date(transaction.date);
                if (tDt > sDt && tDt < eDt) {
                  if (data.context.action.append_response && data.context.action.append_response === true) {
                    responseTxtAppend +=
                      '<br/>' + transaction.date + ' &nbsp;' + numeral(transaction.amount).format('INR 0,0.00') + ' &nbsp;' + transaction.description;
                  }
                }
              }
            } else {
              for (let i = 0; i < len; i++) {
                const transaction1 = transactionResponse.transactions[i];
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
      bankingServices.getTransactions(7829706, data.context.action.category, function(err, transactionResponse) {
        if (err) {
          console.log('Error while calling account services for transactions', err);
          callback(err, null);
        } else {
          let responseTxtAppend = '';
          if (data.context.action.append_total && data.context.action.append_total === true) {
            responseTxtAppend += 'Total = <b>' + numeral(transactionResponse.total).format('INR 0,0.00') + '</b>';
          }

          transactionResponse.transactions.sort(function(a1, b1) {
            const a = new Date(a1.date);
            const b = new Date(b1.date);
            return a > b ? -1 : a < b ? 1 : 0;
          });

          if (transactionResponse.transactions && transactionResponse.transactions.length > 0) {
            // append transactions
            const len = 5; // transaction_response.transactions.length;
            for (let i = 0; i < len; i++) {
              const transaction = transactionResponse.transactions[i];
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
    } else if (data.context.action.lookup === 'branch') {
      console.log('************** Branch details *************** InputText : ' + payload.input.text);
      const loc = data.context.action.Location.toLowerCase();
      bankingServices.getBranchInfo(loc, function(err, branchMaster) {
        if (err) {
          console.log('Error while calling bankingServices.getAccountInfo ', err);
          callback(err, null);
          return;
        }

        const appendBranchResponse = data.context.action.append_response && data.context.action.append_response === true ? true : false;

        let branchText = '';

        if (appendBranchResponse === true) {
          if (branchMaster != null) {
            branchText =
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
            branchText = "Sorry currently we don't have branch details for " + data.context.action.Location;
          }
        }

        payload.context['branch'] = branchMaster;

        // clear the context's action since the lookup was completed.
        payload.context.action = {};

        if (!appendBranchResponse) {
          console.log('call assistant.message with lookup results.');
          assistant.message(payload, function(err, data) {
            if (err) {
              console.log('Error while calling assistant.message with lookup result', err);
              callback(err, null);
            } else {
              console.log('checkForLookupRequests assistant.message :: ', JSON.stringify(data));
              callback(null, data);
            }
          });
        } else {
          console.log('append lookup results to the output.');
          // append accounts list text to response array
          if (data.output.text) {
            data.output.text.push(branchText);
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
        const queryParams = {
          natural_language_query: payload.input.text,
          passages: true
        };
        Object.assign(queryParams, discoveryParams);
        discovery.query(queryParams, (err, searchResponse) => {
          discoveryResponse = 'Sorry, currently I do not have a response. Our Customer representative will get in touch with you shortly.';
          if (err) {
            console.error('Error searching for documents: ' + err);
          } else if (searchResponse.passages.length > 0) {
            const bestPassage = searchResponse.passages[0];
            console.log('Passage score: ', bestPassage.passage_score);
            console.log('Passage text: ', bestPassage.passage_text);

            // Trim the passage to try to get just the answer part of it.
            const lines = bestPassage.passage_text.split('\n');
            let bestLine;
            let questionFound = false;
            for (let i = 0, size = lines.length; i < size; i++) {
              const line = lines[i].trim();
              if (!line) {
                continue; // skip empty/blank lines
              }
              if (line.includes('?') || line.includes('<h1')) {
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
 * Handle setup errors by logging and appending to the global error text.
 * @param {String} reason - The error message for the setup error.
 */
function handleSetupError(reason) {
  setupError += ' ' + reason;
  console.error('The app failed to initialize properly. Setup and restart needed.' + setupError);
  // We could allow our chatbot to run. It would just report the above error.
  // Or we can add the following 2 lines to abort on a setup error allowing Bluemix to restart it.
  console.error('\nAborting due to setup error!');
  process.exit(1);
}

module.exports = app;
