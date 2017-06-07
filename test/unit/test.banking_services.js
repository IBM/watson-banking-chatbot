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

const chai = require('chai');
const expect = chai.expect;
const bankingServices = require('../../banking_services');

describe('banking_services', function() {
  it('#getPerson()', function(done) {
    bankingServices.getPerson(7829706, function(err, person) {
      if (err) done(err);
      expect(person.fname).to.equal('Krishna');
      done();
    });
  });

  it('#getAccountInfo()', function(done) {
    const customerID = 'ignored';
    const type = 'savings';
    bankingServices.getAccountInfo(customerID, type, function(err, account) {
      if (err) done(err);
      expect(account.length).to.equal(1);
      expect(account[0].type).to.equal('savings');
      done();
    });
  });

  it('#getBeneficiaryInfo()', function(done) {
    bankingServices.getBeneficiaryInfo('savings', function(err, beneficiary) {
      if (err) done(err);
      expect(beneficiary.length).to.equal(3);
      expect(beneficiary[0].name).to.equal('Saurav');
      expect(beneficiary[0].type).to.equal('savings');
      expect(beneficiary[1].type).to.equal('savings');
      expect(beneficiary[2].type).to.equal('savings');
      done();
    });
  });

  it('#getTransactions()', function(done) {
    const customerID = 'ignored';
    const category = 'dining';
    bankingServices.getTransactions(customerID, category, function(err, transactions) {
      if (err) done(err);
      expect(transactions.category).to.equal(category);
      expect(transactions.transactions.length).to.equal(2);
      expect(transactions.transactions[1].description).to.equal('McDonalds');
      expect(transactions.transactions[0].category).to.equal(category);
      expect(transactions.transactions[1].category).to.equal(category);
      done();
    });
  });

  it('#getBranchInfo()', function(done) {
    bankingServices.getBranchInfo('mumbai', function(err, location) {
      if (err) done(err);
      expect(location.phone).to.equal('022 1111 1111');
      done();
    });
  });
});
