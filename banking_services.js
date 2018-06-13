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

const bankingServices = {
  _person: {
    fname: 'John',
    lname: 'Doe',
    address: {
      line1: '3028 Austin st.',
      line2: 'Apt #7',
      city: 'Austin',
      state: 'TX',
      zip: 78759,
      country: 'USA'
    },
    customer_id: 7829706,
    tone_anger_threshold: 0.7
  },

  getPerson: function(customerId, callback) {
    callback(null, this._person);
  },

  _accounts: [
    {
      balance: 12800,
      number: 'xxx8990',
      type: 'savings'
    },
    {
      balance: 7600,
      number: 'xxx0744',
      type: 'current'
    },
    {
      balance: 550,
      number: 'xxx7685',
      type: 'CC',
      available_credit: 4450,
      payment_due_date: '25 March, 2016',
      last_statement_balance: 550
    },
    {
      balance: 50000,
      number: 'xxx7685',
      type: 'FD',
      maturity_date: '25 Nov, 2017'
    }
  ],

  getAccountInfo: function(customerId, accountType, callback) {
    // console.log('getAccountInfo :: start');
    let accounts = [];

    switch (accountType) {
      case 'savings':
        accounts.push(this._accounts[0]);
        break;
      case 'current':
        accounts.push(this._accounts[1]);
        break;
      case 'CC':
        accounts.push(this._accounts[2]);
        break;
      case 'FD':
        accounts.push(this._accounts[3]);
        break;
      default:
        accounts = this._accounts.slice();
    }

    // console.log('Returning account info ',
    // JSON.stringify(accounts,null,2));

    callback(null, accounts);
  },
  _beneficiary: [
    {
      name: 'David',
      number: 'xxx0744',
      type: 'savings',
      bank: 'Company A'
    },
    {
      name: 'Scott',
      number: 'xxx0744',
      type: 'savings',
      bank: 'Company B'
    },
    {
      name: 'Willie',
      number: 'xxx7685',
      type: 'savings',
      bank: 'Company C'
    }
  ],
  getBeneficiaryInfo: function(customerId, callback) {
    // console.log('getAccountInfo :: start');
    let beneficiaries = [];
    beneficiaries = this._beneficiary.slice();
    callback(null, beneficiaries);
  },
  getTransactions: function(customerId, category, callback) {
    const response = {
      total: '',
      category: 'all',
      transactions: []
    };

    const len = this._transactions ? this._transactions.length : 0;
    let total = 0;

    let categorySpecifiedBool = false;
    if (category && category !== '' && category !== 'all') {
      categorySpecifiedBool = true;
      response.category = category;
    }

    for (let i = 0; i < len; i++) {
      const transaction = this._transactions[i];
      if (categorySpecifiedBool && transaction.category === category) {
        response.transactions.push(transaction);
        total += transaction.amount;
      } else if (!categorySpecifiedBool) {
        total += transaction.amount;
      }
    }

    response.total = total;
    if (!categorySpecifiedBool) {
      response.transactions = this._transactions.slice();
    }

    callback(null, response);
  },

  _transactions: [
    {
      amount: 700.0,
      account_number: 'xxx7685',
      category: 'dining',
      description: 'Restaurant A',
      type: 'debit',
      date: '08-29-2016'
    },
    {
      amount: 500.0,
      account_number: 'xxx7685',
      category: 'dining',
      description: 'Restaurant B',
      type: 'debit',
      date: '08-27-2016'
    },
    {
      amount: 2000.9,
      account_number: 'xxx7685',
      category: 'grocery',
      description: 'Grocery Store A',
      type: 'debit',
      date: '08-26-2016'
    },
    {
      amount: 1500,
      account_number: 'xxx7685',
      category: 'grocery',
      description: 'Grocery Store B',
      type: 'debit',
      date: '08-24-2016'
    },
    {
      amount: 5000.0,
      account_number: 'xxx7685',
      category: 'travel',
      description: 'A Airways',
      type: 'debit',
      date: '08-24-2016'
    },
    {
      amount: 1000.0,
      account_number: 'xxx7685',
      category: 'fuel',
      description: 'Gas Company A',
      type: 'debit',
      date: '08-20-2016'
    },
    {
      amount: 800.0,
      account_number: 'xxx7685',
      category: 'utility',
      description: 'Utility Company A',
      type: 'debit',
      date: '09-16-2016'
    },
    {
      amount: 700.0,
      account_number: 'xxx7685',
      category: 'utility',
      description: 'Utility Company B',
      type: 'debit',
      date: '08-16-2016'
    },
    {
      amount: 500.0,
      account_number: 'xxx7685',
      category: 'utility',
      description: 'Energy Company A',
      type: 'debit',
      date: '08-16-2016'
    },
    {
      amount: 1000.0,
      account_number: 'xxx7685',
      category: 'utility',
      description: 'Energy Company B',
      type: 'debit',
      date: '09-16-2016'
    },
    {
      amount: 6000.0,
      account_number: 'xxx7685',
      category: 'investment',
      description: 'A Investment Firm',
      type: 'debit',
      date: '09-25-2016'
    },
    {
      amount: 10000.0,
      account_number: 'xxx7685',
      category: 'education',
      description: 'University A',
      type: 'debit',
      date: '08-15-2016'
    }
  ],

  _branchMaster: [
    {
      location: 'newyork',
      address: '460 Park Ave, New York, NY 10022, United States',
      phone: '+1 212-000-0000',
      hours: '10AM–4PM'
    },
    {
      location: 'ny',
      address: '460 Park Ave, New York, NY 10022, United States',
      phone: '+1 212-000-0000',
      hours: '10AM–4PM'
    },
    {
      location: 'new york',
      address: '460 Park Ave, New York, NY 10022, United States',
      phone: '+1 212-000-0000',
      hours: '10AM–4PM'
    },
    {
      location: 'Austin',
      address: '13501 Burned Rd, Austin, TX, 78759',
      phone: '512-347-1200',
      hours: '10AM–4PM'
    },
    {
      location: 'san fransisco',
      address: '413 Market St, San Fransisco, CA, 94105',
      phone: '415-213-4567',
      hours: '10AM–5PM'
    },
    {
      location: 'seattle',
      address: '1234 5th Ave, Seattle, WA',
      phone: '425-666-0000',
      hours: '10AM–5PM'
    },
    {
      location: 'florida',
      address: '112 Florida st, Miami, Fl, 12345',
      phone: '305-666-0000',
      hours: '10AM–5PM'
    },
    {
      location: 'boston',
      address: '1234 Boston St, Boston, MA 65320',
      phone: '523-666-0000',
      hours: '10AM–5PM'
    }
  ],
  getBranchInfo: function(location, callback) {
    for (let i = 0; i < this._branchMaster.length; i++) {
      if (this._branchMaster[i].location === location) {
        callback(null, this._branchMaster[i]);
        return;
      }
    }
    callback(null, null);
  }
};

module.exports = bankingServices;
