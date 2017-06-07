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

const fs = require('fs');
const sinon = require('sinon');
const sinonTest = require('sinon-test');
const watson = require('watson-developer-cloud');

sinon.test = sinonTest.configureTest(sinon, { useFakeTimers: false }); // For using sinon.test with async.

const WatsonDiscoverySetup = require('../../lib/watson-discovery-setup');

const DEFAULT_NAME = 'test-default-name';

describe('test watson-discovery-setup', function() {
  beforeEach(function() {
    process.env = {};
  });
  afterEach(function() {
    process.env = {};
  });
  it(
    'test initial path',
    sinon.test(function(done) {
      const discoveryClient = watson.discovery({
        username: 'fake',
        password: 'fake',
        url: 'fake',
        version_date: '2016-07-11',
        version: 'v1'
      });
      const expectedCreateEnv = {
        description: 'Discovery environment created by ' + DEFAULT_NAME,
        name: DEFAULT_NAME,
        size: '0'
      };

      const fakeEvironment = { environment_id: 'fake-env-id' };
      const fakeConfiguration = {
        name: 'Default Configuration',
        configuration_id: 'fake-config-id'
      };

      // Stub the Watson SDK methods that need stubbing
      const getEnvironments = sinon.stub(discoveryClient, 'getEnvironments');
      const createEnvironment = sinon.stub(discoveryClient, 'createEnvironment');
      const getConfigurations = sinon.stub(discoveryClient, 'getConfigurations');
      const getCollections = sinon.stub(discoveryClient, 'getCollections');
      const createCollection = sinon.stub(discoveryClient, 'createCollection');
      const getCollection = sinon.stub(discoveryClient, 'getCollection');
      const addDocument = sinon.stub(discoveryClient, 'addDocument');

      // Make the callbacks yield with the test data.
      createEnvironment.yields(null, fakeEvironment);
      getEnvironments.yields(null, { environments: [] });
      getCollections.yields(null, { collections: [] });
      getConfigurations.yields(null, { configurations: [fakeConfiguration] });
      createCollection.yields(null, { collection_id: 'test-collection' });
      getCollection.yields(null, {
        collection_id: 'test-collection-id',
        document_counts: { available: 0, processing: 0, failed: 0 }
      });

      const discoverySetup = new WatsonDiscoverySetup(discoveryClient);
      // const testDocuments = ['d1', 'd2', 'd3', 'd4', 'd5', 'dSIX'];
      const testDocuments = [
        './data/Retrieve&Rank/RnRDocs&Questions/BankFaqRnR-DB-Failure - General.docx',
        './data/Retrieve&Rank/RnRDocs&Questions/BankFaqRnR-DB-Terms - General.docx',
        './data/Retrieve&Rank/RnRDocs&Questions/BankFaqRnR-e2eAO-Terms.docx',
        './data/Retrieve&Rank/RnRDocs&Questions/BankFaqRnR-e2ePL-Terms.docx',
        './data/Retrieve&Rank/RnRDocs&Questions/BankRnR-OMP - General.docx'
      ];
      discoverySetup.setupDiscovery(
        {
          default_name: 'test-default-name',
          documents: testDocuments
        },
        (err, data) => {
          if (err) {
            done(err);
          } else {
            sinon.assert.calledOnce(createEnvironment);
            sinon.assert.calledWith(createEnvironment, expectedCreateEnv);
            sinon.assert.calledOnce(getEnvironments);
            sinon.assert.calledOnce(createEnvironment);
            sinon.assert.calledOnce(getCollections);
            sinon.assert.calledOnce(createCollection);
            sinon.assert.callCount(addDocument, testDocuments.length);

            const partialMatch = {
              collection_id: 'test-collection',
              configuration_id: 'fake-config-id',
              environment_id: 'fake-env-id',
              file: sinon.match.instanceOf(fs.ReadStream)
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
    sinon.test(function(done) {
      const discoveryClient = watson.discovery({
        username: 'fake',
        password: 'fake',
        url: 'fake',
        version_date: '2016-07-11',
        version: 'v1'
      });

      const fakeCollection = { collection_id: 'fake-col-id', name: DEFAULT_NAME };
      const fakeEnvironment = { environment_id: 'fake-env-id', name: DEFAULT_NAME };
      const fakeConfiguration = {
        name: 'Default Configuration',
        configuration_id: 'fake-config-id'
      };

      // Stub the Watson SDK methods that need stubbing
      const getEnvironments = sinon.stub(discoveryClient, 'getEnvironments');
      const createEnvironment = sinon.stub(discoveryClient, 'createEnvironment');
      const getConfigurations = sinon.stub(discoveryClient, 'getConfigurations');
      const getCollections = sinon.stub(discoveryClient, 'getCollections');
      const createCollection = sinon.stub(discoveryClient, 'createCollection');
      const getCollection = sinon.stub(discoveryClient, 'getCollection');
      const addDocument = sinon.stub(discoveryClient, 'addDocument');

      // Make the callbacks yield with the test data.
      getEnvironments.yields(null, { environments: [fakeEnvironment] });
      getCollections.yields(null, { collections: [fakeCollection] });
      getConfigurations.yields(null, { configurations: [fakeConfiguration] });
      createCollection.yields(null, { collection_id: 'test-collection' });
      const testDocuments = ['d1', 'd2', 'd3', 'd4', 'd5', 'dSIX'];
      getCollection.yields(null, {
        collection_id: 'test-collection-id',
        document_counts: { available: testDocuments.length, processing: 0, failed: 0 }
      });

      const discoverySetup = new WatsonDiscoverySetup(discoveryClient);
      discoverySetup.setupDiscovery(
        {
          default_name: 'test-default-name',
          documents: testDocuments
        },
        (err, data) => {
          if (err) {
            done(err);
          } else {
            sinon.assert.notCalled(createEnvironment);
            sinon.assert.notCalled(createCollection);
            sinon.assert.notCalled(addDocument);
            sinon.assert.calledOnce(getEnvironments);
            sinon.assert.calledOnce(getCollections);
            done();
          }
        }
      );
    })
  );
  it(
    'test with ENVIRONMENT_ID to use',
    sinon.test(function(done) {
      const ENV_ID = 'env-id-to-find';
      process.env.DISCOVERY_ENVIRONMENT_ID = 'env-id-to-find';
      const testDocuments = ['test.docx'];

      const discoveryClient = watson.discovery({
        username: 'fake',
        password: 'fake',
        url: 'fake',
        version_date: '2016-07-11',
        version: 'v1'
      });

      const fakeEnvironment = { environment_id: ENV_ID };
      const fakeConfiguration = {
        name: 'Default Configuration',
        configuration_id: 'fake-config-id'
      };

      // Stub the Watson SDK methods that need stubbing
      const getEnvironments = sinon.stub(discoveryClient, 'getEnvironments');
      const createEnvironment = sinon.stub(discoveryClient, 'createEnvironment');
      const getConfigurations = sinon.stub(discoveryClient, 'getConfigurations');
      const getCollections = sinon.stub(discoveryClient, 'getCollections');
      const createCollection = sinon.stub(discoveryClient, 'createCollection');
      const getCollection = sinon.stub(discoveryClient, 'getCollection');
      const addDocument = sinon.stub(discoveryClient, 'addDocument');

      // Make the callbacks yield with the test data.
      getEnvironments.yields(null, { environments: [fakeEnvironment] });
      getCollections.yields(null, { collections: [] });
      getConfigurations.yields(null, { configurations: [fakeConfiguration] });
      createCollection.yields(null, { collection_id: 'test-collection' });
      getCollection.yields(null, {
        collection_id: 'test-collection-id',
        document_counts: { available: testDocuments.length, processing: 0, failed: 0 }
      });

      const discoverySetup = new WatsonDiscoverySetup(discoveryClient);
      discoverySetup.setupDiscovery(
        {
          default_name: 'test-default-name',
          documents: testDocuments
        },
        (err, data) => {
          if (err) {
            done(err);
          } else {
            sinon.assert.notCalled(createEnvironment);
            sinon.assert.notCalled(addDocument);
            sinon.assert.calledOnce(getEnvironments);
            sinon.assert.calledOnce(getCollections);
            sinon.assert.calledOnce(createCollection);
            done();
          }
        }
      );
    })
  );
  it(
    'test with ENVIRONMENT_ID to validate and fail',
    sinon.test(function(done) {
      process.env.DISCOVERY_ENVIRONMENT_ID = 'bogus';
      const discoveryClient = watson.discovery({
        username: 'fake',
        password: 'fake',
        url: 'fake',
        version_date: '2016-07-11',
        version: 'v1'
      });

      // Stub the Watson SDK methods that need stubbing
      const getEnvironments = sinon.stub(discoveryClient, 'getEnvironments');
      const createEnvironment = sinon.stub(discoveryClient, 'createEnvironment');

      // Make the callbacks yield with the test data.
      getEnvironments.yields(null, { environments: [{ environment_id: 'other' }] });

      const discoverySetup = new WatsonDiscoverySetup(discoveryClient);
      discoverySetup.setupDiscovery({}, (err, data) => {
        if (err) {
          sinon.assert.calledOnce(getEnvironments);
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
    sinon.test(function(done) {
      const COL_ID = 'col-id-to-find';
      const ENV_ID = 'env-id-to-find';
      process.env = {};
      process.env.DISCOVERY_ENVIRONMENT_ID = ENV_ID;
      process.env.DISCOVERY_COLLECTION_ID = COL_ID;
      const testDocuments = ['test.docx'];

      const discoveryClient = watson.discovery({
        username: 'fake',
        password: 'fake',
        url: 'fake',
        version_date: '2016-07-11',
        version: 'v1'
      });

      const fakeEnvironment = { environment_id: ENV_ID };
      const fakeCollections = { collection_id: COL_ID };
      const fakeConfiguration = {
        name: 'Default Configuration',
        configuration_id: 'fake-config-id'
      };

      // Stub the Watson SDK methods that need stubbing
      const getEnvironments = sinon.stub(discoveryClient, 'getEnvironments');
      const createEnvironment = sinon.stub(discoveryClient, 'createEnvironment');
      const getConfigurations = sinon.stub(discoveryClient, 'getConfigurations');
      const getCollections = sinon.stub(discoveryClient, 'getCollections');
      const createCollection = sinon.stub(discoveryClient, 'createCollection');
      const getCollection = sinon.stub(discoveryClient, 'getCollection');
      const addDocument = sinon.stub(discoveryClient, 'addDocument');

      // Make the callbacks yield with the test data.
      getEnvironments.yields(null, { environments: [fakeEnvironment] });
      getCollections.yields(null, { collections: [fakeCollections] });
      getConfigurations.yields(null, { configurations: [fakeConfiguration] });
      createCollection.yields(null, { collection_id: 'test-collection' });
      getCollection.yields(null, {
        collection_id: 'test-collection-id',
        document_counts: { available: testDocuments.length, processing: 0, failed: 0 }
      });

      const discoverySetup = new WatsonDiscoverySetup(discoveryClient);
      discoverySetup.setupDiscovery(
        {
          default_name: 'test-default-name',
          documents: testDocuments
        },
        (err, data) => {
          if (err) {
            done(err);
          } else {
            sinon.assert.notCalled(createEnvironment);
            sinon.assert.notCalled(addDocument);
            sinon.assert.calledOnce(getEnvironments);
            sinon.assert.calledOnce(getCollections);
            sinon.assert.notCalled(createCollection);
            done();
          }
        }
      );
    })
  );
});
