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


/*eslint-env browser */
/*globals CanvasJS */
'use strict';

require('dotenv').config({
	silent : true
});

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var watson = require('watson-developer-cloud'); // watson sdk
// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');


var url = require('url'), bodyParser = require('body-parser'), 
	http = require('http'), 
	https = require('https'),
	numeral = require('numeral');
var vcapServices = require( 'vcap_services' );

var bankingServices = require('./banking_services');


var LOOKUP_BALANCE = 'balance';
var LOOKUP_TRANSACTIONS = 'transactions';
var LOOKUP_5TRANSACTIONS = '5transactions';

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

var conversation_credentials = vcapServices.getCredentials('conversation');
var nlu_credentials = vcapServices.getCredentials('natural-language-understanding');
var tone_analyzer =vcapServices.getCredentials('tone_analyzer');
var rnr_cred =vcapServices.getCredentials('retrieve_and_rank');

// Create the service wrapper
var conversation = watson.conversation({
	url : 'https://gateway.watsonplatform.net/conversation/api',
	username : conversation_credentials.username || '',
	password : conversation_credentials.password || '',
	version_date : '2016-07-11',
	version : 'v1'
});

var tone_analyzer = watson.tone_analyzer({
	username : tone_analyzer.username || '',
	password : tone_analyzer.password || '',
	url : 'https://gateway.watsonplatform.net/tone-analyzer/api',
	version : 'v3',
	version_date : '2016-05-19'		
});

/********* NLU *************/
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
var nlu = new NaturalLanguageUnderstandingV1({
	username: nlu_credentials.username || '',									//NLU Service username
	password: nlu_credentials.password || '',									//NLU Service password
	version_date: '2017-02-27'
	});

/********* R&R *************/
var rnr= require('watson-developer-cloud/retrieve-and-rank/v1');

var retrieve = new rnr({
  password: rnr_cred.password || '',							//Retrieve & Rank Service password
  username: rnr_cred.username || ''  						//Retrieve & Rank Service username
});

var clusterid = vcapServices.CLUSTER_ID || '';
var collectionname= vcapServices.COLLECTION_NAME || '' ;
var ranker_id = vcapServices.RANKER_ID || '';

// Endpoint to be called from the client side
app.post('/api/message', function(req, res) {
	var workspace = vcapServices.WORKSPACE_ID || '';
	
	if ( !workspace || workspace === '<workspace-id>' ) {
		return res.json( {
		  'output': {
			'text': 'Your app is running but it is yet to be configured with a <b>WORKSPACE_ID</b> environment variable. '+
					'Please configure your Conversation service and update the WORKSPACE_ID in environment variables under Runtime section</b>'
			}
		} );
	}
	
	if (clusterid == '' || collectionname =='' )
		{
			return res.json( {
			  'output': {
				'text': 'Your app is running but it is yet to be configured with a <b>CLUSTER_ID</b> or <b>COLLECTION_ID</b>environment variable. '+
						'Please configure your Retrieve and Ranker service and update the CLUSTER_ID and COLLECTION_ID in environment variables under Runtime section</b>'
				}
			} );
		
		}
	var solrClient = retrieve.createSolrClient({
		  cluster_id: clusterid , 								//Retrieve & Rank Service Cluster_ID
		  collection_name: collectionname,						//Retrieve & Rank Service Collection_Name
		  wt: 'json'
		});
	
	bankingServices.getPerson(7829706, function(err, person){
		
		if(err){
			console.log('Error occurred while getting person data ::', err);
			return res.status(err.code || 500).json(err);
		}

		var payload = {
			workspace_id : workspace,
			context : {
				'person' : person
			},
			input : {}
		};
		
		//common regex patterns
		var regpan = /^([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}?$/;
		var regadhaar=/^\d{12}$/;
		var regmobile=/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/;	
		var str='';
		if (req.body) {
			if (req.body.input) {
				
				var inputstring= req.body.input.text;
				console.log('input string ',inputstring );
				var words = inputstring.split(" ");
				console.log('words ',words);
				inputstring='';
				for (var i = 0; i < words.length; i++) 
				{
					if (regpan.test(words[i]) === true)
						{
						var value=words[i];
						words[i]='1111111111';							
						}
					inputstring += words[i] + ' ';	
					
				}	
				//words.join(" ");
				inputstring=inputstring.trim();
				console.log('After inputstring ', inputstring);
				//payload.input = req.body.input;
				payload.input.text=inputstring;
				
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
		
		tone_analyzer.tone({
			text : query_input,
			tones : 'emotion'
		}, function(err, tone) {
			var tone_anger_score = '';
			if (err) {
				console.log('Error occurred while invoking Tone analyzer. ::', err);
				//return res.status(err.code || 500).json(err);
			} else {
				var emotionTones = tone.document_tone.tone_categories[0].tones;
				
				var len = emotionTones.length;
				for (var i = 0; i < len; i++) {
					if (emotionTones[i].tone_id === 'anger') {
						console.log('Input = ',query_input);
						console.log('emotion_anger score = ','Emotion_anger', emotionTones[i].score);
						tone_anger_score = emotionTones[i].score;
						break;
					}
				}
				
			}
			
			payload.context['tone_anger_score'] = tone_anger_score;	
			
			if (payload.input.text != '')
				{
				//console.log('input text payload = ', payload.input.text);
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
							}
			
			
			nlu.analyze(parameters, function(err, response) {
				  		if (err)
				  			{
					    console.log('error:', err);}
				  		else
				  		{	
						 var nlu_output=response;
				  
				  	payload.context['nlu_output']=nlu_output;
				  	//console.log('NLU = ',nlu_output);
					// identify location
					 var entities = nlu_output.entities;
			          var location = entities.map(function(entry) {
			                if(entry.type == "Location") {
			                 return(entry.text);
			                }
			          });
			          location = location.filter(function(entry) {
			        	  if(entry != null) {
			        		  return(entry);
			        	  }
			          	});
			          if(location.length > 0) {
			        	  payload.context['Location'] = location[0];
			        	  console.log('Location = ',payload.context['Location']);
			          					} else {
			          	  payload.context['Location']='';
			          						  }
			          
			          
			       // identify Company
						
				      /*    var company = entities.map(function(entry) {
				                if(entry.type == "Company") {
				                 return(entry.text);
				                }
				          });
				          company = company.filter(function(entry) {
				        	  if(entry != null) {
				        		  return(entry);
				        	  }
				          	});
				          if(company.length > 0) {
				        	  payload.context.userCompany = company[0];
				          					} else {
				          	  delete payload.context.userCompany;
				          						  }
				          
				       // identify Person
							 
					          var person = entities.map(function(entry) {
					                if(entry.type == "Person") {
					                 return(entry.text);
					                }
					          });
					          person = person.filter(function(entry) {
					        	  if(entry != null) {
					        		  return(entry);
					        	  }
					          	});
					          if(person.length > 0) {
					        	  payload.context.Person = person[0];
					          					} else {
					          	  delete payload.context.Person;
					          						  }
				          
					       // identify Vehicle
								 
						          var vehicle = entities.map(function(entry) {
						                if(entry.type == "Vehicle") {
						                 return(entry.text);
						                }
						          });
						          vehicle = vehicle.filter(function(entry) {
						        	  if(entry != null) {
						        		  return(entry);
						        	  }
						          	});
						          if(vehicle.length > 0) {
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
						          						  } */
				  				
				  				}
				  		
				  		     conversation.message(payload, function(err, data) {
							if (err) {
								return res.status(err.code || 500).json(err);
							}else{
								console.log('conversation.message :: ',JSON.stringify(data));
								//lookup actions 
								checkForLookupRequests(data, function(err, data){
									if (err) {
										return res.status(err.code || 500).json(err);
									}else{
										return res.json(data);
									}
								});
								
							}
						});
					});
					
				}
			else
				{
				conversation.message(payload, function(err, data) {
					if (err) {
						return res.status(err.code || 500).json(err);
					}else{
						console.log('conversation.message :: ',JSON.stringify(data));
						return res.json(data);						
					}
				});
				}
			
			});
			
		
	}

});

/**
*
* Looks for actions requested by conversation service and provides the requested data.
*
**/
function checkForLookupRequests(data, callback){
	console.log('checkForLookupRequests');
	
	if(data.context && data.context.action && data.context.action.lookup && data.context.action.lookup!= 'complete'){
		var workspace = process.env.WORKSPACE_ID || WORKSPACE_ID;
	    var payload = {
			workspace_id : workspace,
			context : data.context,
			input : data.input
		}
		
		//conversation requests a data lookup action
		if(data.context.action.lookup === LOOKUP_BALANCE){
			console.log('Lookup Balance requested');
			//if account type is specified (checking, savings or credit card)
			if(data.context.action.account_type && data.context.action.account_type!=''){
				
				//lookup account information services and update context with account data
				var accounts = bankingServices.getAccountInfo(7829706, data.context.action.account_type, function(err, accounts){
					
					if(err){
						console.log('Error while calling bankingServices.getAccountInfo ', err);
						callback(err,null);
						return;
					}
					var len = accounts ? accounts.length : 0;
				
					var append_account_response = (data.context.action.append_response && 
							data.context.action.append_response === true) ? true : false;
				
				
					var accounts_result_text = '';
				
					for(var i=0;i<len;i++){
						accounts[i].balance = accounts[i].balance ? numeral(accounts[i].balance).format('INR 0,0.00') : '';
					
						if(accounts[i].available_credit)
							accounts[i].available_credit = accounts[i].available_credit ? numeral(accounts[i].available_credit).format('INR 0,0.00') : '';
					
						if(accounts[i].last_statement_balance)
							accounts[i].last_statement_balance = accounts[i].last_statement_balance ? numeral(accounts[i].last_statement_balance).format('INR 0,0.00') : '';
				
						if(append_account_response===true){
							accounts_result_text += accounts[i].number + ' ' + accounts[i].type + ' Balance: '+accounts[i].balance +'<br/>';
						}
					}
				
					payload.context['accounts'] = accounts;
				
					//clear the context's action since the lookup was completed.
					payload.context.action = {};
				
					if(!append_account_response){
						console.log('call conversation.message with lookup results.');
						conversation.message(payload, function(err, data) {
							if (err) {
								console.log('Error while calling conversation.message with lookup result', err);
								callback(err,null);
							}else {
								console.log('checkForLookupRequests conversation.message :: ',JSON.stringify(data));
								callback(null, data);
							}
						});
					}else{
						console.log('append lookup results to the output.');
						//append accounts list text to response array
						if(data.output.text){
							data.output.text.push(accounts_result_text);
						}
						//clear the context's action since the lookup and append was completed.
						data.context.action = {};
						
						callback(null, data);
					
					}
					
				
				});
				
				
			}
			
		}else if(data.context.action.lookup === LOOKUP_TRANSACTIONS){
			console.log('Lookup Transactions requested');
			bankingServices.getTransactions(7829706, data.context.action.category,function(err, transaction_response){
			
				if(err){
					console.log('Error while calling account services for transactions', err);
					callback(err,null);
				}else{
				
					var responseTxtAppend = '';
					if(data.context.action.append_total && data.context.action.append_total === true){
						responseTxtAppend += 'Total = <b>'+ numeral(transaction_response.total).format('INR 0,0.00') + '</b>';		
					}
					
					if(transaction_response.transactions && transaction_response.transactions.length>0){
						//append transactions
						var len = transaction_response.transactions.length;
						var sDt=new Date(data.context.action.startdt);
						var eDt=new Date(data.context.action.enddt);
						if (sDt && eDt)
						{
						for(var i=0; i<len; i++){
							var transaction = transaction_response.transactions[i];
							var tDt= new Date(transaction.date);
							if ( tDt> sDt && tDt < eDt)
							{
							if(data.context.action.append_response && data.context.action.append_response===true)
							{
								responseTxtAppend += '<br/>'+transaction.date+' &nbsp;'+numeral(transaction.amount).format('INR 0,0.00')+' &nbsp;'+transaction.description;
							}
							
							}
							}
						}

							else
							{
								for(var i=0; i<len; i++){
									var transaction1 = transaction_response.transactions[i];
								if(data.context.action.append_response && data.context.action.append_response===true)
							{
								responseTxtAppend += '<br/>'+transaction1.date+' &nbsp;'+numeral(transaction1.amount).format('INR 0,0.00')+' &nbsp;'+transaction1.description;
							}
							
							}
							}
						

							
						if(responseTxtAppend != ''){
						console.log('append lookup transaction results to the output.');
						if(data.output.text){
							data.output.text.push(responseTxtAppend);
						}
						//clear the context's action since the lookup and append was completed.
						data.context.action = {};
					}
					callback(null, data);
					
					//clear the context's action since the lookup was completed.
					payload.context.action = {};
					return;
				}
			}

			});
			
		}else if(data.context.action.lookup === LOOKUP_5TRANSACTIONS){
			console.log('Lookup Transactions requested');
			bankingServices.getTransactions(7829706, data.context.action.category, function(err, transaction_response){
			
				if(err){
					console.log('Error while calling account services for transactions', err);
					callback(err,null);
				}else{
				
					var responseTxtAppend = '';
					if(data.context.action.append_total && data.context.action.append_total === true){
						responseTxtAppend += 'Total = <b>'+ numeral(transaction_response.total).format('INR 0,0.00') + '</b>';		
					}
					
					transaction_response.transactions.sort(function(a1, b1) {
						var a = new Date(a1.date);
    					var b = new Date(b1.date);
    					return a>b ? -1 : a<b ? 1 : 0;
						});
					
					if(transaction_response.transactions && transaction_response.transactions.length>0){
						//append transactions
						var len = 5;//transaction_response.transactions.length;
						for(var i=0; i<len; i++){
							var transaction = transaction_response.transactions[i];
							if(data.context.action.append_response && data.context.action.append_response===true){
								responseTxtAppend += '<br/>'+transaction.date+' &nbsp;'+numeral(transaction.amount).format('INR 0,0.00')+' &nbsp;'+transaction.description;
							}
						}
					}
					if(responseTxtAppend != ''){
						console.log('append lookup transaction results to the output.');
						if(data.output.text){
							data.output.text.push(responseTxtAppend);
						}
						//clear the context's action since the lookup and append was completed.
						data.context.action = {};
					}
					callback(null, data);
					
					//clear the context's action since the lookup was completed.
					payload.context.action = {};
					return;
				}
			
			});
			
		}
		else if (data.context.action.lookup === "branch")
			{
			console.log('************** Branch details *************** InputText : ' + payload.input.text);
			var loc=data.context.action.Location.toLowerCase();
			bankingServices.getBranchInfo(loc,function(err, branchMaster)
					{
							if(err)
							{
								console.log('Error while calling bankingServices.getAccountInfo ', err);
								callback(err,null);
								return;
							}
							
							var append_branch_response = (data.context.action.append_response && 
									data.context.action.append_response === true) ? true : false;
						
						
							var branch_text = '';
						
							
							if(append_branch_response===true){
								if (branchMaster !=null)
									{
								branch_text = 'Here are the branch details at ' + branchMaster.location + ' <br/>Address: ' + branchMaster.address + '<br/>Phone: ' + branchMaster.phone 
								+'<br/>Operation Hours: '+branchMaster.hours +'<br/>';
									}
								else
									{branch_text ='Sorry currently we dont have branch details for' + data.context.action.Location;
									}
								}
							
						
							payload.context['branch'] = branchMaster;
						
							//clear the context's action since the lookup was completed.
							payload.context.action = {};
						
							if(!append_branch_response){
								console.log('call conversation.message with lookup results.');
								conversation.message(payload, function(err, data) {
									if (err) {
										console.log('Error while calling conversation.message with lookup result', err);
										callback(err,null);
									}else {
										console.log('checkForLookupRequests conversation.message :: ',JSON.stringify(data)); 
										callback(null, data);
									}
								});
							}else{
								console.log('append lookup results to the output.');
								//append accounts list text to response array
								if(data.output.text){
									data.output.text.push(branch_text);
								}
								//clear the context's action since the lookup and append was completed.
								data.context.action = {};
								
								callback(null, data);
							
							}
				
					}
			)
			}
		else if(data.context.action.lookup === "rnr"){
			console.log('************** R&R *************** InputText : ' + payload.input.text);
			
			var responseTxtAppend = '';

			var qs = require('querystring');//require('./node_modules/qs/dist/qs');
			// search documents
			
			var question = payload.input.text; //Only the question is required from payload
			console.log('******' +JSON.stringify(question)+'*********');
			
			
			var query = qs.stringify({q: question, ranker_id: ranker_id, fl: 'id,title,contentHtml'});
			//query.q({ '*' : '*' });

			solrClient.get('fcselect', query, function(err, searchResponse) {
			  if(err) {
			    console.log('Error searching for documents: ' + err);
			    responseTxtAppend = 'Sorry, currently I am unable to respond for this.';
			  } else {
			    console.log('Found ' + searchResponse.response.numFound + ' document(s).');
			    console.log('Document(s): ' + JSON.stringify(searchResponse.response.docs, null, 2));
			    //responseTxtAppend = 'Here are some relevant information for your query.<br/>';
			    if(searchResponse.response.numFound > 0){
					responseTxtAppend  = searchResponse.response.docs[0].contentHtml;   //docs[0] returns the topmost ranked answer.
				}else{
					responseTxtAppend = 'Sorry, currently I am unable to respond for this.';
				}	
														
			  }
			  if(responseTxtAppend != ''){
					if(data.output.text){
						data.output.text.push(responseTxtAppend);
					}
					//clear the context's action since the lookup and append was completed.
					data.context.action = {};
				}
				callback(null, data);
				
				//clear the context's action since the lookup was completed.
				payload.context.action = {};
				return;
			});
		}
		
		else{
			callback(null, data);
			return;
		}
	}else{
		callback(null, data);
		return;
	}
	
}



  
	
module.exports = app;
