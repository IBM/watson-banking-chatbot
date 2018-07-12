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

const chai = require('chai');
const sinon = require('sinon');
const sinonTest = require('sinon-test');
const AssistantV1 = require('watson-developer-cloud/assistant/v1');

sinon.test = sinonTest.configureTest(sinon, { useFakeTimers: false }); // For using sinon.test with async.
const expect = chai.expect;

const WatsonAssistantSetup = require('../../lib/watson-assistant-setup');

describe('test watson-assistant-setup', function() {
  let c;
  beforeEach(function() {
    c = new AssistantV1({
      username: 'fake',
      password: 'fake',
      url: 'fake',
      version_date: '2016-07-11',
      version: 'v1'
    });
  });

  it(
    'test create workspace',
    sinon.test(function(done) {
      const WS_NAME = 'test-default-name';
      const WS_ID = 'ws-id-to-find';
      const WS = {
        workspace_id: WS_ID,
        name: WS_NAME
      };
      const WS_JSON = { fake: 'stuff' };

      const lw = sinon.stub(c, 'listWorkspaces');
      lw.yields(null, { workspaces: [{ name: 'other' }] });
      const cw = sinon.stub(c, 'createWorkspace');
      cw.yields(null, WS);

      const wcs = new WatsonAssistantSetup(c);

      wcs.setupAssistantWorkspace({ default_name: WS_NAME, workspace_json: WS_JSON }, (err, data) => {
        if (err) {
          done(err);
        } else {
          expect(data).to.equal(WS_ID);
          sinon.assert.calledWithMatch(cw, WS_JSON);
          sinon.assert.calledWithMatch(cw, { name: WS_NAME });
          sinon.assert.calledWith(lw, null);
          done();
        }
      });
    })
  );
  it(
    'test create workspace error',
    sinon.test(function(done) {
      const WS_NAME = 'test-default-name';
      const WS_JSON = { fake: 'stuff' };
      const ERROR_MSG = 'intentional test error';
      const lw = sinon.stub(c, 'listWorkspaces');
      lw.yields(null, { workspaces: [] });
      const cw = sinon.stub(c, 'createWorkspace');
      cw.yields(new Error(ERROR_MSG), null);

      const wcs = new WatsonAssistantSetup(c);

      wcs.setupAssistantWorkspace({ default_name: WS_NAME, workspace_json: WS_JSON }, (err, data) => {
        if (err) {
          sinon.assert.calledWith(lw, null);
          sinon.assert.calledWithMatch(cw, WS_JSON);
          sinon.assert.calledWithMatch(cw, { name: WS_NAME });
          expect(err.message).to.contain(ERROR_MSG);
          done(); // expected
        } else {
          done(new Error('Failed to get expected error.'));
        }
      });
    })
  );
  it(
    'test list workspaces error',
    sinon.test(function(done) {
      const lw = sinon.stub(c, 'listWorkspaces');
      lw.yields(new Error('intentional test fail'), null);
      const cw = sinon.spy(c, 'createWorkspace');

      const was = new WatsonAssistantSetup(c);
      was.setupAssistantWorkspace({}, (err, data) => {
        sinon.assert.calledWith(lw, null);
        sinon.assert.notCalled(cw);
        if (err) {
          done(); // Expected this error.
        } else {
          done(new Error('Expected a listWorkspaces error'));
        }
      });
    })
  );
  it(
    'test with WORKSPACE_ID',
    sinon.test(function(done) {
      const WS_ID = 'ws-id-to-find';
      const lw = sinon.stub(c, 'listWorkspaces');
      lw.yields(null, { workspaces: [{ workspace_id: WS_ID }] });
      const cw = sinon.spy(c, 'createWorkspace');
      process.env.WORKSPACE_ID = WS_ID;

      const was = new WatsonAssistantSetup(c);
      was.setupAssistantWorkspace({}, (err, data) => {
        if (err) {
          done(err);
        } else {
          sinon.assert.calledWith(lw, null);
          sinon.assert.notCalled(cw);
          expect(data).to.equal(WS_ID);
          done();
        }
      });
    })
  );
  it(
    'test with WORKSPACE_ID not found',
    sinon.test(function(done) {
      const WS_ID = 'ws-id-to-find';
      const lw = sinon.stub(c, 'listWorkspaces');
      lw.yields(null, { workspaces: [{ workspace_id: 'other' }] });
      const cw = sinon.spy(c, 'createWorkspace');
      process.env.WORKSPACE_ID = WS_ID;

      const was = new WatsonAssistantSetup(c);
      was.setupAssistantWorkspace({}, (err, data) => {
        if (err) {
          sinon.assert.calledWith(lw, null);
          sinon.assert.notCalled(cw);
          done(); // Expected err
        } else {
          done(new Error('Expected error for WORKSPACE_ID not found'));
        }
      });
    })
  );
  it(
    'test with default workspace name found',
    sinon.test(function(done) {
      process.env = {};
      const WS_NAME = 'test-default-name';
      const WS_ID = 'ws-id-to-find';
      const WS = {
        workspace_id: WS_ID,
        name: WS_NAME
      };
      const testParams = { default_name: WS_NAME };
      const lw = sinon.stub(c, 'listWorkspaces');
      lw.yields(null, { workspaces: [{ name: 'other' }, WS] });
      const cw = sinon.spy(c, 'createWorkspace');

      const was = new WatsonAssistantSetup(c);
      was.setupAssistantWorkspace(testParams, (err, data) => {
        if (err) {
          done(err);
        } else {
          sinon.assert.calledWith(lw, null);
          sinon.assert.notCalled(cw);
          expect(data).to.equal(WS_ID);
          done();
        }
      });
    })
  );
});
