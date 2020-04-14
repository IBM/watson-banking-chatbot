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

const chai = require('chai');
const sinon = require('sinon');
const sinonTest = require('sinon-test')(sinon, { useFakeTimers: false });
const AssistantV1 = require('ibm-watson/assistant/v1');

const expect = chai.expect;

const WatsonAssistantSetup = require('../../lib/watson-assistant-setup');
const { IamAuthenticator } = require('ibm-watson/auth');

describe('test watson-assistant-setup', function () {
  let c;
  beforeEach(function () {
    c = new AssistantV1({
      version: '2019-02-28',
      url: 'fake',
      authenticator: new IamAuthenticator({
        apikey: 'fake',
      }),
    });
  });

  it(
    'test create workspace',
    sinonTest(function (done) {
      const WS_NAME = 'watson-banking-chatbot';
      const WS_ID = 'ws-id-to-find';
      const WS_JSON = { fake: 'stuff' };
      const lw = sinon.stub(c, 'listWorkspaces');
      lw.yields(null, {
        result: {
          workspaces: [{ name: 'other' }],
        },
      });

      const cw = sinon.stub(c, 'createWorkspace');
      cw.yields(null, {
        result: {
          name: WS_NAME,
          workspace_id: WS_ID,
        },
      });

      const wcs = new WatsonAssistantSetup(c);
      process.env.SKILL_ID = '';

      wcs.setupAssistantWorkspace({ default_name: WS_NAME, skill_json: WS_JSON }, (err, data) => {
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
    sinonTest(function (done) {
      const WS_NAME = 'watson-banking-chatbot';
      const WS_JSON = { fake: 'stuff' };
      const ERROR_MSG = 'intentional test error';
      const lw = sinon.stub(c, 'listWorkspaces');
      lw.yields(null, {
        result: {
          workspaces: [{ workspaces: [] }],
        },
      });

      const cw = sinon.stub(c, 'createWorkspace');
      cw.yields(new Error(ERROR_MSG), null);

      const wcs = new WatsonAssistantSetup(c);

      wcs.setupAssistantWorkspace({ default_name: WS_NAME, skill_json: WS_JSON }, (err, data) => {
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
    sinonTest(function (done) {
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
    'test with SKILL_ID',
    sinonTest(function (done) {
      const WS_ID = 'ws-id-to-find';
      const lw = sinon.stub(c, 'listWorkspaces');
      lw.yields(null, {
        result: {
          workspaces: [{ workspace_id: WS_ID }],
        },
      });
      const cw = sinon.spy(c, 'createWorkspace');
      process.env.SKILL_ID = WS_ID;

      const was = new WatsonAssistantSetup(c);
      was.setupAssistantWorkspace({}, (err, data) => {
        if (err) {
          done(err);
        } else {
          sinon.assert.notCalled(lw);
          sinon.assert.notCalled(cw);
          done();
        }
      });
    })
  );
  it(
    'test with default workspace name found',
    sinonTest(function (done) {
      process.env = {};
      const WS_NAME = 'watson-banking-chatbot';
      const WS_ID = 'ws-id-to-find';
      const testParams = { default_name: WS_NAME };
      const lw = sinon.stub(c, 'listWorkspaces');
      lw.yields(null, {
        result: {
          workspaces: [
            {
              name: WS_NAME,
              workspace_id: WS_ID,
            },
          ],
        },
      });

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
