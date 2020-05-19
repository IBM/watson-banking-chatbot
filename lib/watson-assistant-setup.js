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

/**
 * Setup for Watson Assistant.
 *
 * @param {Object} assistantClient - Assistant client
 * @constructor
 */
function WatsonAssistantSetup(assistantClient) {
  this.assistantClient = assistantClient;
}

/**
 * Automatically create the Assistant skill if not provided.
 * Returns the skillID or error.
 *
 * If a SKILL_ID is specified in the runtime environment,
 * just use it -- no validation because we might have auth issues.
 * If no SKILL_ID is specified then try to find it using a lookup by name.
 * Name will be taken from params.default_name unless overridden
 * using the SKILL_NAME environment variable.
 *
 * If a skill is not found by ID or name, then try to
 * create one from the JSON in the repository. Use the
 * name as mentioned above so future lookup will find what
 * was created. This requires a Manager role for the API Key
 * and no longer works w/ the CloudFoundry binding key.
 *
 * @param {Object} params - Parameter dictionary as follows.
 * @param {String} params.default_name - Name of app, used as default skill name when needed
 *                                       to create/find (can be overriden by process.env.SKILL_NAME).
 * @param {Object} params.skill_json - The skill JSON to import.
 * @param {function{Error,String}} callback - A callback to capture Error or skill ID string.
 */
WatsonAssistantSetup.prototype.setupAssistantWorkspace = function (params, callback) {
  let skillID = process.env.SKILL_ID;

  if (skillID) {
    console.log('Using configured SKILL_ID: ' + skillID);
    callback(null, skillID);
    return;
  }

  this.assistantClient.listWorkspaces(null, (err, data) => {
    if (err) {
      console.warn('Error during Watson Assistant listWorkspaces(): ', err);
      callback(new Error('Unable to list skills for Watson Assistant. ' + err));
    } else {
      const workspaces = data.result['workspaces'];

      // Find by name, because we probably created it earlier (below) and want to use it on restarts.
      const skillName = process.env.SKILL_NAME || params.default_name;
      console.log('Looking for Watson Assistant skill by name: ', skillName);
      for (let i = 0, size = workspaces.length; i < size; i++) {
        if (workspaces[i]['name'] === skillName) {
          console.log('Found Watson Assistant skill: ', skillName);
          skillID = workspaces[i]['workspace_id'];
          callback(null, skillID);
          return;
        }
      }

      console.log('Creating Watson Assistant skill ', skillName);
      const ws = params.skill_json;
      ws['name'] = skillName;
      this.assistantClient.createWorkspace(ws, function (err, ws) {
        if (err) {
          callback(new Error('Failed to create Watson Assistant skill: ' + err));
        } else {
          skillID = ws.result['workspace_id'];
          console.log('Successfully created Watson Assistant skill');
          console.log('  Name: ', ws.result['name']);
          console.log('  ID:', skillID);
          callback(null, skillID);
        }
      });
    }
  });
};

module.exports = WatsonAssistantSetup;
