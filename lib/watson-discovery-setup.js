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

const fs = require('fs'); // file system for loading JSON

/**
 * Setup for Watson Discovery.
 *
 * @param {Object} params - Params needed to
 * @param {Object} callback - Discovery client
 * @constructor
 */
function WatsonDiscoverySetup(discoveryClient) {
  this.discoveryClient = discoveryClient;
}

/**
 * Get the default Discovery configuration.
 * @param {Object} params - Discovery params so far. Enough to get configurations.
 * @return {Promise} Promise with resolve({enhanced discovery params}) or reject(err).
 */
WatsonDiscoverySetup.prototype.getDiscoveryConfig = function(params) {
  return new Promise((resolve, reject) => {
    this.discoveryClient.listConfigurations(params, (err, data) => {
      if (err) {
        console.error(err);
        return reject(new Error('Failed to get Discovery configurations.'));
      } else {
        const configs = data.configurations;
        for (let i = 0, size = configs.length; i < size; i++) {
          const config = configs[i];
          if (config.name === 'Default Configuration') {
            params.configuration_id = config.configuration_id;
            return resolve(params);
          }
        }
        return reject(new Error('Failed to get default Discovery configuration.'));
      }
    });
  });
};

/**
 * Find the Discovery environment.
 * If a DISCOVERY_ENVIRONMENT_ID is set then validate it or error out.
 * Otherwise find it by name (DISCOVERY_ENVIRONMENT_NAME). The by name
 * search is used to find an environment that we created before a restart.
 * If we don't find an environment by ID or name, we'll use an existing one
 * if it is not read_only. This allows us to work in free trial environments.
 * @return {Promise} Promise with resolve({environment}) or reject(err).
 */
WatsonDiscoverySetup.prototype.findDiscoveryEnvironment = function(params) {
  return new Promise((resolve, reject) => {
    this.discoveryClient.listEnvironments(params, (err, data) => {
      if (err) {
        console.error(err);
        return reject(new Error('Failed to get Discovery environments.'));
      } else {
        const environments = data.environments;
        // If a DISCOVERY_ENVIRONMENT_ID is set, validate it and use it (or fail).
        const validateID = process.env.DISCOVERY_ENVIRONMENT_ID;
        // Otherwise, look (by name) for one that we already created.
        const DISCOVERY_ENVIRONMENT_NAME = process.env.DISCOVERY_ENVIRONMENT_NAME || params.default_name;
        // Otherwise we'll reuse an existing environment, if we find a usable one.
        let reuseEnv;

        for (let i = 0, size = environments.length; i < size; i++) {
          const environment = environments[i];
          if (validateID) {
            if (validateID === environment.environment_id) {
              console.log('Found Discovery environment using DISCOVERY_ENVIRONMENT_ID.');
              console.log(environment);
              params.environment_id = environment.environment_id;
              return resolve(params);
            }
          } else {
            if (environment.name === DISCOVERY_ENVIRONMENT_NAME) {
              console.log('Found Discovery environment by name.');
              console.log(environment);
              params.environment_id = environment.environment_id;
              return resolve(params);
            } else if (!environment.read_only) {
              reuseEnv = environment;
            }
          }
        }
        if (validateID) {
          return reject(new Error('Configured DISCOVERY_ENVIRONMENT_ID=' + validateID + ' not found.'));
        } else if (reuseEnv) {
          console.log('Found existing Discovery environment to use: ', reuseEnv);
          params.environment_id = reuseEnv.environment_id;
          return resolve(params);
        }
        // Not found by ID or name or reuse stategy.
        // Set the expected name, so when one is created we will find it.
        params.environment_name = DISCOVERY_ENVIRONMENT_NAME;
        return resolve(params);
      }
    });
  });
};

/**
 * Find the Discovery collection.
 * If a DISCOVERY_COLLECTION_ID is set then validate it or error out.
 * Otherwise find it by name (DISCOVERY_COLLECTION_NAME). The by name
 * search is used to find collections that we created before a restart.
 * @param {Object} params - Object discribing the existing environment.
 * @return {Promise} Promise with resolve({discovery params}) or reject(err).
 */
WatsonDiscoverySetup.prototype.findDiscoveryCollection = function(params) {
  return new Promise((resolve, reject) => {
    this.discoveryClient.listCollections(params, (err, data) => {
      if (err) {
        console.error(err);
        return reject(new Error('Failed to get Discovery collections.'));
      } else {
        // If a DISCOVERY_COLLECTION_ID is set, validate it and use it (or fail).
        // Otherwise, look (by name) for one that we already created.
        const validateID = process.env.DISCOVERY_COLLECTION_ID;
        const DISCOVERY_COLLECTION_NAME = process.env.DISCOVERY_COLLECTION_NAME || params.default_name;
        const collections = data.collections;
        for (let i = 0, size = collections.length; i < size; i++) {
          const collection = collections[i];
          if (validateID) {
            if (validateID === collection.collection_id) {
              console.log('Found Discovery collection using DISCOVERY_COLLECTION_ID.');
              console.log(collection);
              params.collection_name = collection.name;
              params.collection_id = collection.collection_id;
              return resolve(params);
            }
          } else if (collection.name === DISCOVERY_COLLECTION_NAME) {
            console.log('Found Discovery collection by name.');
            console.log(collection);
            params.collection_name = collection.name;
            params.collection_id = collection.collection_id;
            return resolve(params);
          }
        }
        if (validateID) {
          return reject(new Error('Configured DISCOVERY_COLLECTION_ID=' + validateID + ' not found.'));
        }
        // No collection_id added, but return params dict. Set the name to use to create a collection.
        params.collection_name = DISCOVERY_COLLECTION_NAME;
        return resolve(params);
      }
    });
  });
};

/** Create a Discovery environment if we did not find one.
 * If an environment is passed in, then we already have one.
 * When we create one, we have to create it with our known name
 * so that we can find it later.
 * @param {Object} params - Object describing the environment we found or need.
 * @return {Promise} Promise with resolve(environment) or reject(err).
 */
WatsonDiscoverySetup.prototype.createDiscoveryEnvironment = function(params) {
  if (params.environment_id) {
    return Promise.resolve(params); // If we have an ID, then the env must exist.
  }
  return new Promise((resolve, reject) => {
    // No existing environment found, so create it.
    // NOTE: The number of environments that can be created
    // under a trial Bluemix account is limited to one per
    // organization. That is why have the "reuse" strategy above.
    console.log('Creating discovery environment...');
    const createParams = {
      name: params.environment_name,
      description: 'Discovery environment created by ' + params.default_name,
      size: '0' // Use string to avoid default of 1.
    };
    this.discoveryClient.createEnvironment(createParams, (err, data) => {
      if (err) {
        console.error('Failed to create Discovery environment.');
        return reject(err);
      } else {
        console.log(data);
        params.environment_id = data.environment_id;
        resolve(params);
      }
    });
  });
};

/**
 * Create a Discovery collection if we did not find one.
 * If params include a collection_id, then we already have one.
 * When we create one, we have to create it with our known name
 * so that we can find it later.
 * @param {Object} params - All the params needed to use Discovery.
 * @return {Promise}
 */
WatsonDiscoverySetup.prototype.createDiscoveryCollection = function(params) {
  if (params.collection_id) {
    return Promise.resolve(params);
  }
  return new Promise((resolve, reject) => {
    // No existing environment found, so create it.
    console.log('Creating discovery collection...');
    const createCollectionParams = {
      name: params.collection_name,
      description: 'Discovery collection created by watson-banking-chatbot.',
      language_code: 'en_us'
    };
    Object.assign(createCollectionParams, params);
    this.discoveryClient.createCollection(createCollectionParams, (err, data) => {
      if (err) {
        console.error('Failed to create Discovery collection.');
        return reject(err);
      } else {
        console.log('Created Discovery collection: ', data);
        params.collection_id = data.collection_id;
        resolve(params);
      }
    });
  });
};

/**
 * Load the Discovery collection if it is not already loaded.
 * The collection should already be created/validated.
 * Currently using lazy loading of docs and only logging problems.
 * @param {Object} params - All the params needed to use Discovery.
 * @return {Promise}
 */
WatsonDiscoverySetup.prototype.loadDiscoveryCollection = function(params) {
  console.log('Get collection to check its status.');
  this.discoveryClient.getCollection(params, (err, data) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Checking status of Discovery collection:', data);
      const docs = params.documents;
      const docCount = docs.length;
      const loadedDocs = data.document_counts.available + data.document_counts.processing + data.document_counts.failed;
      if (!Number.isInteger(loadedDocs)) {
        throw Error('Unexpected Discovery document_counts resulted in an unusable not-a-number.');
      }
      if (loadedDocs < docCount) {
        console.log('Loading documents into Discovery collection.');
        for (let i = 0; i < docCount; i++) {
          const doc = docs[i];
          const addDocParams = { file: fs.createReadStream(doc) };
          Object.assign(addDocParams, params);
          this.discoveryClient.addDocument(addDocParams, (err, data) => {
            // Note: No promise. Just let these all run/log. Revisit this?
            if (err) {
              console.log('Add document error:');
              console.error(err);
            } else {
              console.log('Added document:');
              console.log(data);
            }
          });
        }
      } else {
        console.log('Collection is already loaded with docs.');
        /* For testing:
         discovery.deleteCollection(params, (err, data) => {
         console.log('Deleting collection for testing!!!!!!!!!!!!!!!!!!!!!!!!');
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
};

/**
 * Validate and setup the Discovery service.
 */
WatsonDiscoverySetup.prototype.setupDiscovery = function(setupParams, callback) {
  this.findDiscoveryEnvironment(setupParams)
    .then(params => this.createDiscoveryEnvironment(params))
    .then(environment => this.findDiscoveryCollection(environment))
    .then(params => this.getDiscoveryConfig(params))
    .then(params => this.createDiscoveryCollection(params))
    .then(params => this.loadDiscoveryCollection(params))
    .then(params => callback(null, params))
    .catch(callback);
};

module.exports = WatsonDiscoverySetup;
