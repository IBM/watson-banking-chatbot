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
 * Validate or create the Assistant workspace.
 * Sets the global workspaceID when done (or global setupError).
 *
 * If a SKILL_ID is specified in the runtime environment,
 * make sure that workspace exists. If no SKILL_ID is
 * specified then try to find it using a lookup by name.
 * Name will be taken from params.default_name unless overridden
 * using the WORKSPACE_NAME environment variable.
 *
 * If a workspace is not found by ID or name, then try to
 * create one from the JSON in the repository. Use the
 * name as mentioned above so future lookup will find what
 * was created.
 *
 * @param {Object} params - Parameter dictionary as follows.
 * @param {String} params.default_name - Name of app, used as default workspace name when needed
 *                                       to create/find (can be overriden by process.env.WORKSPACE_NAME).
 * @param {Object} params.workspace_json - The workspace JSON to import.
 * @param {function{Error,String}} callback - A callback to capture Error or workspace ID string.
 */
WatsonAssistantSetup.prototype.setupAssistantWorkspace = function(params, callback) {
  let workspaceID;

  this.assistantClient.listWorkspaces(null, (err, data) => {
    if (err) {
      console.error('Error during Assistant listWorkspaces(): ', err);
      callback(new Error('Error. Unable to list workspaces for Assistant: ' + err));
    } else {
      const workspaces = data.result['workspaces'];
      const validateID = process.env.SKILL_ID;
      let found = false;
      if (validateID) {
        console.log('Validating workspace ID: ', validateID);
        for (let i = 0, size = workspaces.length; i < size; i++) {
          if (workspaces[i]['workspace_id'] === validateID) {
            workspaceID = validateID;
            found = true;
            console.log('Found workspace: ', validateID);
            break;
          }
        }
        if (!found) {
          callback(new Error("Configured SKILL_ID '" + validateID + "' not found!"));
        } else {
          callback(null, workspaceID);
        }
      } else {
        // Find by name, because we probably created it earlier (in the if block) and want to use it on restarts.
        const workspaceName = process.env.WORKSPACE_NAME || params.default_name;
        console.log('Looking for workspace by name: ', workspaceName);
        for (let i = 0, size = workspaces.length; i < size; i++) {
          if (workspaces[i]['name'] === workspaceName) {
            console.log('Found workspace: ', workspaceName);
            workspaceID = workspaces[i]['workspace_id'];
            found = true;
            break;
          }
        }
        if (!found) {
          console.log('Creating Assistant workspace ', workspaceName);
          const ws = params.workspace_json;
          ws['name'] = workspaceName;
          this.assistantClient.createWorkspace(ws, function(err, ws) {
            if (err) {
              callback(new Error('Failed to create Assistant workspace: ' + err));
            } else {
              workspaceID = ws.result['workspace_id'];
              console.log('Successfully created Assistant workspace');
              console.log('  Name: ', ws.result['name']);
              console.log('  ID:', workspaceID);
              callback(null, workspaceID);
            }
          });
        } else {
          callback(null, workspaceID);
        }
      }
    }
  });
};

module.exports = WatsonAssistantSetup;
