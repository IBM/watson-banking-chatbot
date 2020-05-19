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

const fs = require('fs');
const sinon = require('sinon');
const sinonTest = require('sinon-test')(sinon, { useFakeTimers: false });
const DiscoveryV1 = require('ibm-watson/discovery/v1');

const WatsonDiscoverySetup = require('../../lib/watson-discovery-setup');
const { IamAuthenticator } = require('ibm-watson/auth');

const DEFAULT_NAME = 'test-default-name';

describe('test watson-discovery-setup', function () {
  beforeEach(function () {
    process.env = {};
  });
  afterEach(function () {
    process.env = {};
  });
  it(
    'test initial path',
    sinonTest(function (done) {
      const discoveryClient = new DiscoveryV1({
        authenticator: new IamAuthenticator({
          apikey: 'fake',
        }),
        url: 'fake',
        version: '2019-04-30',
      });
      const expectedCreateEnv = {
        description: 'Discovery environment created by ' + DEFAULT_NAME,
        name: DEFAULT_NAME,
        size: 'LT',
      };

      const fakeEnvironment = { environment_id: 'fake-env-id', read_only: true };
      const fakeConfiguration = {
        name: 'Default Configuration',
        configuration_id: 'fake-config-id',
      };

      // Stub the Watson SDK methods that need stubbing
      const listEnvironments = sinon.stub(discoveryClient, 'listEnvironments');
      const createEnvironment = sinon.stub(discoveryClient, 'createEnvironment');
      const listConfigurations = sinon.stub(discoveryClient, 'listConfigurations');
      const listCollections = sinon.stub(discoveryClient, 'listCollections');
      const createCollection = sinon.stub(discoveryClient, 'createCollection');
      const getCollection = sinon.stub(discoveryClient, 'getCollection');
      const addDocument = sinon.stub(discoveryClient, 'addDocument');

      // Make the callbacks yield with the test data.
      createEnvironment.yields(null, fakeEnvironment);
      listEnvironments.yields(null, {
        result: {
          environments: [fakeEnvironment],
        },
      });
      listCollections.yields(null, {
        result: {
          collections: [],
        },
      });
      listConfigurations.yields(null, {
        result: {
          configurations: [fakeConfiguration],
        },
      });
      createCollection.yields(null, {
        result: {
          collection_id: 'test-collection',
        },
      });
      getCollection.yields(null, {
        result: {
          collection_id: 'test-collection-id',
          document_counts: { available: 0, processing: 0, failed: 0 },
        },
      });

      const discoverySetup = new WatsonDiscoverySetup(discoveryClient);
      // const testDocuments = ['d1', 'd2', 'd3', 'd4', 'd5', 'dSIX'];
      const testDocuments = [
        './data/discovery/docs/en_IN/BankFaqRnR-DB-Failure-General.docx',
        './data/discovery/docs/en_IN/BankFaqRnR-DB-Terms-General.docx',
        './data/discovery/docs/en_IN/BankFaqRnR-e2eAO-Terms.docx',
        './data/discovery/docs/en_IN/BankFaqRnR-e2ePL-Terms.docx',
        './data/discovery/docs/en_IN/BankRnR-OMP-General.docx',
      ];
      discoverySetup.setupDiscovery(
        {
          default_name: 'test-default-name',
          documents: testDocuments,
        },
        (err, data) => {
          if (err) {
            done(err);
          } else {
            sinon.assert.calledOnce(createEnvironment);
            sinon.assert.calledWith(createEnvironment, expectedCreateEnv);
            sinon.assert.calledOnce(listEnvironments);
            sinon.assert.calledOnce(createEnvironment);
            sinon.assert.calledOnce(listCollections);
            sinon.assert.calledOnce(createCollection);
            sinon.assert.callCount(addDocument, testDocuments.length);

            const partialMatch = {
              collectionId: 'test-collection',
              environmentId: 'fake-env-id',
              file: sinon.match.instanceOf(fs.ReadStream),
            };
            sinon.assert.calledWithMatch(addDocument, partialMatch);
            done();
          }
        }
      );
    })
  );
  it(
    'test restart path',
    sinonTest(function (done) {
      const discoveryClient = new DiscoveryV1({
        authenticator: new IamAuthenticator({
          apikey: 'fake',
        }),
        url: 'fake',
        version: '2019-04-30',
      });

      const fakeCollection = {
        collection_id: 'fake-col-id',
        name: DEFAULT_NAME,
      };
      const fakeEnvironment = {
        environment_id: 'fake-env-id',
        name: DEFAULT_NAME,
      };
      const fakeConfiguration = {
        name: 'Default Configuration',
        configuration_id: 'fake-config-id',
      };

      // Stub the Watson SDK methods that need stubbing
      const listEnvironments = sinon.stub(discoveryClient, 'listEnvironments');
      const createEnvironment = sinon.stub(discoveryClient, 'createEnvironment');
      const listConfigurations = sinon.stub(discoveryClient, 'listConfigurations');
      const listCollections = sinon.stub(discoveryClient, 'listCollections');
      const createCollection = sinon.stub(discoveryClient, 'createCollection');
      const getCollection = sinon.stub(discoveryClient, 'getCollection');
      const addDocument = sinon.stub(discoveryClient, 'addDocument');

      // Make the callbacks yield with the test data.
      listEnvironments.yields(null, {
        result: {
          environments: [fakeEnvironment],
        },
      });
      listCollections.yields(null, {
        result: {
          collections: [fakeCollection],
        },
      });
      listConfigurations.yields(null, {
        result: {
          configurations: [fakeConfiguration],
        },
      });
      createCollection.yields(null, {
        result: {
          collection_id: 'test-collection',
        },
      });
      const testDocuments = ['d1', 'd2', 'd3', 'd4', 'd5', 'dSIX'];
      getCollection.yields(null, {
        result: {
          collection_id: 'test-collection-id',
          document_counts: { available: testDocuments.length, processing: 0, failed: 0 },
        },
      });

      const discoverySetup = new WatsonDiscoverySetup(discoveryClient);
      discoverySetup.setupDiscovery(
        {
          default_name: 'test-default-name',
          documents: testDocuments,
        },
        (err, data) => {
          if (err) {
            done(err);
          } else {
            sinon.assert.notCalled(createEnvironment);
            sinon.assert.notCalled(createCollection);
            sinon.assert.notCalled(addDocument);
            sinon.assert.calledOnce(listEnvironments);
            sinon.assert.calledOnce(listCollections);
            done();
          }
        }
      );
    })
  );
  it(
    'test with ENVIRONMENT_ID to use',
    sinonTest(function (done) {
      const ENV_ID = 'env-id-to-find';
      process.env.DISCOVERY_ENVIRONMENT_ID = 'env-id-to-find';
      const testDocuments = ['test.docx'];

      const discoveryClient = new DiscoveryV1({
        authenticator: new IamAuthenticator({
          apikey: 'fake',
        }),
        url: 'fake',
        version: '2019-04-30',
      });

      const fakeEnvironment = { environment_id: ENV_ID };
      const fakeConfiguration = {
        name: 'Default Configuration',
        configuration_id: 'fake-config-id',
      };

      // Stub the Watson SDK methods that need stubbing
      const listEnvironments = sinon.stub(discoveryClient, 'listEnvironments');
      const createEnvironment = sinon.stub(discoveryClient, 'createEnvironment');
      const listConfigurations = sinon.stub(discoveryClient, 'listConfigurations');
      const listCollections = sinon.stub(discoveryClient, 'listCollections');
      const createCollection = sinon.stub(discoveryClient, 'createCollection');
      const getCollection = sinon.stub(discoveryClient, 'getCollection');
      const addDocument = sinon.stub(discoveryClient, 'addDocument');

      // Make the callbacks yield with the test data.
      listEnvironments.yields(null, {
        result: {
          environments: [fakeEnvironment],
        },
      });
      listCollections.yields(null, {
        result: {
          collections: [],
        },
      });
      listConfigurations.yields(null, {
        result: {
          configurations: [fakeConfiguration],
        },
      });
      createCollection.yields(null, {
        result: {
          collection_id: 'test-collection',
        },
      });
      getCollection.yields(null, {
        result: {
          collection_id: 'test-collection-id',
          document_counts: { available: testDocuments.length, processing: 0, failed: 0 },
        },
      });

      const discoverySetup = new WatsonDiscoverySetup(discoveryClient);
      discoverySetup.setupDiscovery(
        {
          default_name: 'test-default-name',
          documents: testDocuments,
        },
        (err, data) => {
          if (err) {
            done(err);
          } else {
            sinon.assert.notCalled(createEnvironment);
            sinon.assert.notCalled(addDocument);
            sinon.assert.calledOnce(listEnvironments);
            sinon.assert.calledOnce(listCollections);
            sinon.assert.calledOnce(createCollection);
            done();
          }
        }
      );
    })
  );
  it(
    'test with ENVIRONMENT_ID to validate and fail',
    sinonTest(function (done) {
      process.env.DISCOVERY_ENVIRONMENT_ID = 'bogus';
      const discoveryClient = new DiscoveryV1({
        authenticator: new IamAuthenticator({
          apikey: 'fake',
        }),
        url: 'fake',
        version: '2019-04-30',
      });

      // Stub the Watson SDK methods that need stubbing
      const listEnvironments = sinon.stub(discoveryClient, 'listEnvironments');
      const createEnvironment = sinon.stub(discoveryClient, 'createEnvironment');

      // Make the callbacks yield with the test data.
      listEnvironments.yields(null, { environments: [{ environment_id: 'other' }] });

      const discoverySetup = new WatsonDiscoverySetup(discoveryClient);
      discoverySetup.setupDiscovery({}, (err, data) => {
        if (err) {
          sinon.assert.calledOnce(listEnvironments);
          sinon.assert.notCalled(createEnvironment);
          done(); // Expected this error.
        } else {
          done(new Error('Expected to fail to validate environment ID.'));
        }
      });
    })
  );
  it(
    'test finding collection by ENVIRONMENT_ID',
    sinonTest(function (done) {
      const COL_ID = 'col-id-to-find';
      const ENV_ID = 'env-id-to-find';
      process.env = {};
      process.env.DISCOVERY_ENVIRONMENT_ID = ENV_ID;
      process.env.DISCOVERY_COLLECTION_ID = COL_ID;
      const testDocuments = ['test.docx'];

      const discoveryClient = new DiscoveryV1({
        authenticator: new IamAuthenticator({
          apikey: 'fake',
        }),
        url: 'fake',
        version: '2019-04-30',
      });

      const fakeEnvironment = { environment_id: ENV_ID };
      const fakeCollections = { collection_id: COL_ID };
      const fakeConfiguration = {
        name: 'Default Configuration',
        configuration_id: 'fake-config-id',
      };

      // Stub the Watson SDK methods that need stubbing
      const listEnvironments = sinon.stub(discoveryClient, 'listEnvironments');
      const createEnvironment = sinon.stub(discoveryClient, 'createEnvironment');
      const listConfigurations = sinon.stub(discoveryClient, 'listConfigurations');
      const listCollections = sinon.stub(discoveryClient, 'listCollections');
      const createCollection = sinon.stub(discoveryClient, 'createCollection');
      const getCollection = sinon.stub(discoveryClient, 'getCollection');
      const addDocument = sinon.stub(discoveryClient, 'addDocument');

      // Make the callbacks yield with the test data.
      listEnvironments.yields(null, {
        result: {
          environments: [fakeEnvironment],
        },
      });
      listCollections.yields(null, {
        result: {
          collections: [fakeCollections],
        },
      });
      listConfigurations.yields(null, {
        result: {
          configurations: [fakeConfiguration],
        },
      });
      createCollection.yields(null, {
        result: {
          collection_id: 'test-collection',
        },
      });
      getCollection.yields(null, {
        result: {
          collection_id: 'test-collection-id',
          document_counts: { available: testDocuments.length, processing: 0, failed: 0 },
        },
      });

      const discoverySetup = new WatsonDiscoverySetup(discoveryClient);
      discoverySetup.setupDiscovery(
        {
          default_name: 'test-default-name',
          documents: testDocuments,
        },
        (err, data) => {
          if (err) {
            done(err);
          } else {
            sinon.assert.notCalled(createEnvironment);
            sinon.assert.notCalled(addDocument);
            sinon.assert.calledOnce(listEnvironments);
            sinon.assert.calledOnce(listCollections);
            sinon.assert.notCalled(createCollection);
            done();
          }
        }
      );
    })
  );
});
