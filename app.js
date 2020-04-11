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
  silent: true,
});

const express = require('express'); // app server
const bodyParser = require('body-parser'); // parser for post requests
const numeral = require('numeral');
const fs = require('fs'); // file system for loading JSON

const AssistantV1 = require('ibm-watson/assistant/v1');
const DiscoveryV1 = require('ibm-watson/discovery/v1');
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1.js');
const { getAuthenticatorFromEnvironment } = require('ibm-watson/auth');

let auth;

// need to manually set url and disableSslVerification to get around
// current Cloud Pak for Data SDK issue IF user uses
// `CONVERSATION_` prefix in run-time environment.
let url;
let disableSSL = false;

try {
  // ASSISTANT should be used
  auth = getAuthenticatorFromEnvironment('ASSISTANT');
  url = process.env.ASSISTANT_URL;
  if (process.env.ASSISTANT_DISABLE_SSL == 'true') {
    disableSSL = true;
  }
} catch (e) {
  // but handle if alternate CONVERSATION is used
  auth = getAuthenticatorFromEnvironment('conversation');
  url = process.env.CONVERSATION_URL;
  if (process.env.CONVERSATION_DISABLE_SSL == 'true') {
    disableSSL = true;
  }
}

const assistant = new AssistantV1({
  version: '2019-02-28',
  authenticator: auth,
  url: url,
  disableSslVerification: disableSSL,
});

const discovery = new DiscoveryV1({
  version: '2019-04-30',
});

const nlu = new NaturalLanguageUnderstandingV1({
  version: '2019-07-12',
});

const bankingServicesIN = require('./banking_services');
const bankingServicesUS = require('./banking_services_us');
const WatsonDiscoverySetup = require('./lib/watson-discovery-setup');
const WatsonAssistantSetup = require('./lib/watson-assistant-setup');

const DEFAULT_NAME = 'watson-banking-chatbot';
const DISCOVERY_ACTION = 'disco';
const LOOKUP_BALANCE = 'balance';
const LOOKUP_TRANSACTIONS = 'transactions';
const LOOKUP_5TRANSACTIONS = '5transactions';

const SKILL_FILE_US = 'data/conversation/workspaces/banking_US.json';
const SKILL_FILE_IN = 'data/conversation/workspaces/banking_IN.json';

const DISCOVERY_DOCS_US = [
  './data/discovery/docs/en_US/BankFaqRnR-DB-Failure-General.docx',
  './data/discovery/docs/en_US/BankFaqRnR-DB-Terms-General.docx',
  './data/discovery/docs/en_US/BankFaqRnR-e2eAO-Terms.docx',
  './data/discovery/docs/en_US/BankFaqRnR-e2ePL-Terms.docx',
  './data/discovery/docs/en_US/BankRnR-OMP-General.docx',
];
const DISCOVERY_DOCS_IN = [
  './data/discovery/docs/en_IN/BankFaqRnR-DB-Failure-General.docx',
  './data/discovery/docs/en_IN/BankFaqRnR-DB-Terms-General.docx',
  './data/discovery/docs/en_IN/BankFaqRnR-e2eAO-Terms.docx',
  './data/discovery/docs/en_IN/BankFaqRnR-e2ePL-Terms.docx',
  './data/discovery/docs/en_IN/BankRnR-OMP-General.docx',
];

// TODO: Change default if we are mostly documenting US version.
// Default to the original India version.
const locale = process.env.LOCALE || 'EN_IN';
const EN_US = locale.toUpperCase() === 'EN_US';
const SKILL_FILE = EN_US ? SKILL_FILE_US : SKILL_FILE_IN;
const DISCOVERY_DOCS = EN_US ? DISCOVERY_DOCS_US : DISCOVERY_DOCS_IN;
const bankingServices = EN_US ? bankingServicesUS : bankingServicesIN;
const skillJson = JSON.parse(fs.readFileSync(SKILL_FILE));

// Exported JSON uses dialog_nodes but older SDK code wants dialogNodes.
if ('dialog_nodes' in skillJson && !('dialogNodes' in skillJson)) {
  skillJson.dialogNodes = skillJson.dialog_nodes;
}

console.log('locale = ' + locale);

const app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// setupError will be set to an error message if we cannot recover from service setup or init error.
let setupError = '';

let discoveryParams; // discoveryParams will be set after Discovery is validated and setup.
const discoverySetup = new WatsonDiscoverySetup(discovery);
const discoverySetupParams = {
  default_name: DEFAULT_NAME,
  documents: DISCOVERY_DOCS,
};
discoverySetup.setupDiscovery(discoverySetupParams, (err, data) => {
  if (err) {
    handleSetupError(err);
  } else {
    console.log('Discovery is ready!');
    discoveryParams = data;
  }
});

// Use Watson Assistant V1 to perform any authoring of the dialog components
let skillID; // skillID will be set when the skill is created or validated.
const assistantSetup = new WatsonAssistantSetup(assistant);
const assistantSetupParams = { default_name: DEFAULT_NAME, skill_json: skillJson };
assistantSetup.setupAssistantWorkspace(assistantSetupParams, (err, data) => {
  if (err) {
    handleSetupError(err);
  } else {
    console.log('Watson Assistant is ready!');
    skillID = data;
  }
});

// Endpoint to be called from the client side
app.post('/api/message', function (req, res) {
  if (setupError) {
    return res.json({ output: { text: 'The app failed to initialize properly. Setup and restart needed.' + setupError } });
  }

  if (!skillID) {
    return res.json({
      output: {
        text: 'Assistant initialization in progress. Please try again.',
      },
    });
  }

  bankingServices.getPerson(7829706, function (err, person) {
    if (err) {
      console.log('Error occurred while getting person data ::', err);
      return res.status(err.code || 500).json(err);
    }

    const payload = {
      workspaceId: skillID,
      context: {
        person: person,
      },
      input: {},
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

    callAssistant(payload);
  });

  /**
   * Send the input to the Assistant service.
   * @param payload
   */
  function callAssistant(payload) {
    if (!('text' in payload.input) || payload.input.text == '') {
      assistant.message(payload, function (err, data) {
        if (err) {
          return res.status(err.code || 500).json(err);
        } else {
          console.log('assistant.message1 :: ', JSON.stringify(data.result, null, 2));
          return res.json(data.result);
        }
      });
    } else {
      const queryInput = JSON.stringify(payload.input);
      console.log('queryInput: ' + queryInput);

      const parameters = {
        text: payload.input.text,
        language: 'en', // To avoid language detection errors
        features: {
          entities: {
            sentiment: true,
            limit: 2,
          },
          keywords: {
            sentiment: true,
            limit: 2,
          },
        },
      };

      // call NLU to check if location is included in request
      nlu
        .analyze(parameters)
        .then((response) => {
          const nluOutput = response.result;
          payload.context['nlu_output'] = nluOutput;
          // identify location
          const entities = nluOutput.entities;
          let location = entities.map(function (entry) {
            if (entry.type == 'Location') {
              return entry.text;
            }
          });
          location = location.filter(function (entry) {
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

          assistant.message(payload, function (err, data) {
            if (err) {
              return res.status(err.code || 500).json(err);
            } else {
              // lookup actions
              checkForLookupRequests(data, function (err, data) {
                if (err) {
                  console.log(err);
                  return res.status(err.code || 500).json(err);
                } else {
                  return res.json(data);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.log('error:', err);
        });
    }
  }
});

/**
 * Looks for actions requested by Assistant service and provides the requested data.
 */
function checkForLookupRequests(output, callback) {
  console.log('checkForLookupRequests');
  const data = output.result;
  console.log('Assistant result to act on: ' + JSON.stringify(data, null, 2));

  // The branchInfo intent is handled here to help keep our Assistant dialog
  // within the limits of the free plan. Could simplify this with more dialog.
  // For branchInfo intent, set the action/location
  if (data.intents.length > 0 && data.intents[0].intent === 'branchInfo') {
    if (data.context.Location) {
      // with Location we'll do a branch lookup
      data.context['action'] = { lookup: 'branch' };
    } else {
      // without a Location we'll just do Discovery for general branch question
      data.intents[0]['intent'] = DISCOVERY_ACTION;
    }
  }

  if (data.context && data.context.action && data.context.action.lookup && data.context.action.lookup != 'complete') {
    const payload = {
      workspaceId: skillID,
      context: data.context,
      input: data.input,
    };

    console.log('data.context.action.lookup: ' + data.context.action.lookup);
    // Assistant requests a data lookup action
    if (data.context.action.lookup === LOOKUP_BALANCE) {
      console.log('************** Lookup Balance requested **************');
      // if account type is specified (checking, savings or credit card)
      if (data.context.action.account_type && data.context.action.account_type != '') {
        // lookup account information services and update context with account data
        bankingServices.getAccountInfo(7829706, data.context.action.account_type, function (err, accounts) {
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
            assistant.message(payload, function (err, data) {
              if (err) {
                console.log('Error while calling assistant.message with lookup result', err);
                callback(err, null);
              } else {
                console.log('checkForLookupRequests assistant.message :: ', JSON.stringify(data));
                callback(null, data.result);
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
      console.log('************** Lookup Transactions requested **************');
      bankingServices.getTransactions(7829706, data.context.action.category, function (err, transactionResponse) {
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
      console.log('************** Lookup 5 Transactions requested **************');
      bankingServices.getTransactions(7829706, data.context.action.category, function (err, transactionResponse) {
        if (err) {
          console.log('Error while calling account services for transactions', err);
          callback(err, null);
        } else {
          let responseTxtAppend = '';
          if (data.context.action.append_total && data.context.action.append_total === true) {
            responseTxtAppend += 'Total = <b>' + numeral(transactionResponse.total).format('INR 0,0.00') + '</b>';
          }

          transactionResponse.transactions.sort(function (a1, b1) {
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
      const loc = data.context.Location.toLowerCase();
      // Use the master (India) lookup for getBranchInfo
      // It can return either India or US.
      bankingServicesIN.getBranchInfo(loc, function (err, branchMaster) {
        if (err) {
          console.log('Error while calling bankingServices.getAccountInfo ', err);
          callback(err, null);
          return;
        }

        let branchText = '';

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
          branchText = "Sorry currently we don't have branch details for " + data.context.Location;
        }

        payload.context['branch'] = branchMaster;

        // clear the context's action since the lookup was completed.
        payload.context.action = {};

        data.output.text = [branchText];
        // clear the context's action since the lookup and append was completed.
        data.context.action = {};

        callback(null, data);
      });
    } else if (data.context.action.lookup === DISCOVERY_ACTION) {
      // query to trigger this action - "can I use an atm in any city"
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
          naturalLanguageQuery: payload.input.text,
          passages: true,
        };
        Object.assign(queryParams, discoveryParams);
        discovery.query(queryParams, (err, searchResponse) => {
          discoveryResponse = 'Sorry, currently I do not have a response. Our Customer representative will get in touch with you shortly.';
          if (err) {
            console.error('Error searching for documents: ' + err);
          } else if (searchResponse.result.matching_results > 0) {
            // we have a valid response from Discovery
            // now check if we are using SDU or just a simple document query
            let bestLine;
            console.log('Disco result: ' + JSON.stringify(searchResponse, null, 2));
            if ('answer' in searchResponse.result.results[0]) {
              console.log('Using Discovery SDU');
              let bestScore = 0;
              for (let i = 0, size = searchResponse.result.results.length; i < size; i++) {
                if (searchResponse.result.results[i].result_metadata['confidence'] > bestScore) {
                  bestLine = searchResponse.result.results[i].answer[0];
                  bestScore = searchResponse.result.results[i].result_metadata['confidence'];
                }
              }
            } else if ('passages' in searchResponse.result) {
              console.log('Using Passage feature');
              // use Passage feature
              const bestPassage = searchResponse.result.passages[0];
              console.log('Passage score: ', bestPassage.passage_score);
              console.log('Passage text: ', bestPassage.passage_text);
              // set a default value
              bestLine = bestPassage.passage_text;

              // Trim the passage to try to get just the answer part of it.
              const lines = bestPassage.passage_text.split('.');

              // just use the first sentence in the response.
              // if it contains a question mark, use the portion after it
              const line = lines[0].trim();
              if (line.indexOf('?') > -1) {
                const subline = line.split('?');
                bestLine = subline[1];
              } else {
                bestLine = line;
              }
            } else {
              console.log('Using default response');
              // other formats, like from CPD (non-SDU)
              if ('text' in searchResponse.result.results[0]) {
                const lines = searchResponse.result.results[0].text.split('.');
                const line = lines[0].trim();
                if (line.indexOf('?') > -1) {
                  const subline = line.split('?');
                  bestLine = subline[1];
                } else {
                  bestLine = line;
                }
              }
            }
            discoveryResponse =
              bestLine || 'Sorry I currently do not have an appropriate response for your query. Our customer care executive will call you in 24 hours.';
          }

          if (data.output.text) {
            data.output.text.push(discoveryResponse);
          }
          console.log('Discovery response: ' + discoveryResponse);
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
