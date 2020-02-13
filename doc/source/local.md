# Run Locally

This document shows how to run the application using on your local machine.

## Steps

1. [Configure credentials](#1-configure-credentials)
1. [Run the application](#2-run-the-application)

### 1. Configure credentials

The following instructions will depend on if you are provisioning your services from IBM Cloud or from an IBM Cloud Pak for Data cluster. Choose one:

<details><summary>Provision on IBM Cloud</summary>
<p>

Collect the credentials for the IBM Cloud services (Assistant, Discovery and Natural Language Understanding). For each of these services:

* Find the service in your IBM Cloud Dashboard.
* Click on the service.
* Hit `Manage` in the left sidebar menu.
* Copy the `API Key` and `URL`.

The other settings for Assistant and Discovery were collected during the
earlier setup steps (`DISCOVERY_COLLECTION_ID`, `DISCOVERY_ENVIRONMENT_ID` and
`SKILL_ID`).

Copy the [`env.sample`](../../env.sample) to `.env`.

```bash
cp env.sample .env
```

Edit the `.env` file with the necessary credentials and settings.

#### `env.sample:`

```bash
# Copy this file to .env and replace the credentials with
# your own before starting the app.

#----------------------------------------------------------
# IBM Cloud
#
# If your services are running on IBM Cloud,
# uncomment and configure these.
# Remove or comment out the IBM Cloud Pak for Data sections.
#----------------------------------------------------------

# Watson Assistant
ASSISTANT_AUTH_TYPE=iam
ASSISTANT_APIKEY=zzZzzABCsU8DBrvi123HLZwVyHbRlBFf_97n9O123ABC
ASSISTANT_URL=https://gateway.watsonplatform.net/assistant/api
# Optionally, use a non-default skill by specifying your own Skill ID.
SKILL_ID=<add_assistant_skill_id>

# Watson Natural Language Understanding
NATURAL_LANGUAGE_UNDERSTANDING_AUTH_TYPE=iam
NATURAL_LANGUAGE_UNDERSTANDING_APIKEY=A1zzzzzz5E8yFG1t9H9kFeCBR_Lq123pWj7abcdFCE11
NATURAL_LANGUAGE_UNDERSTANDING_URL=<https://gateway.watsonplatform.net/natural-language-understanding/api

# Watson Discovery
DISCOVERY_AUTH_TYPE=iam
DISCOVERY_APIKEY=a1b2c3JZmZZZZSq3NYabckevKa123AwqD9HlWIUvabCd
DISCOVERY_URL=https://gateway.watsonplatform.net/discovery/api
# Optionally, use a non-default environment and collection by specifying your IDs.
DISCOVERY_ENVIRONMENT_ID=<add_discovery_environment_id>
DISCOVERY_COLLECTION_ID=<add_discovery_collection_id>

# Run locally on a non-default port (default is 3000)
# PORT=3000

# Set LOCALE=en_IN for the original India bank version.
LOCALE=en_US
```

> Note: if you are trying to run this project as workshop in India then use `Locale=en_IN`

</p>
</details>

<details><summary>Provision on IBM Cloud Pak for Data</summary>
<p>

Collect the credentials for IBM Cloud Pak for Data provisioned services (Assistant, Discovery and Natural Language Understanding). For each of these services:

* Hit `My instances` in the left sidebar menu of the IBM Cloud Pak for Data dashboard.
* Click on `Provisioned Instances`.
* For each provisioned service row, click in the far right column to display the popup menu.
* Click`View details`.
* From the details panel, copy the `URL`.

The other settings for Assistant and Discovery were collected during the
earlier setup steps (`DISCOVERY_COLLECTION_ID` and `SKILL_ID`).

Copy the [`env.sample`](../../env.sample) to `.env`.

```bash
cp env.sample .env
```

Edit the `.env` file with the necessary credentials and settings.

#### `env.sample:`

```bash
# Copy this file to .env and replace the credentials with
# your own before starting the app.

#----------------------------------------------------------
# IBM Cloud Pak for Data (username and password)
#
# If your services are running on IBM Cloud Pak for Data,
# uncomment and configure these.
# Remove or comment out the IBM Cloud section.
#----------------------------------------------------------

ASSISTANT_AUTH_TYPE=cp4d
ASSISTANT_AUTH_URL=https://my-cpd-cluster.ibmcodetest.us
ASSISTANT_USERNAME=my-username
ASSISTANT_PASSWORD=my-password
ASSISTANT_URL=https://my-cpd-cluster.ibmcodetest.us/assistant/assistant/instances/1576274722862/api
# # If you use a self-signed certificate, you need to disable SSL verification.
# # This is not secure and not recommended.
## ASSISTANT_AUTH_DISABLE_SSL=true
## ASSISTANT_DISABLE_SSL=true
# Optionally, use a non-default skill by specifying your own Skill ID.
SKILL_ID=<add_assistant_skill_id>

NATURAL_LANGUAGE_UNDERSTANDING_AUTH_TYPE=cp4d
NATURAL_LANGUAGE_UNDERSTANDING_AUTH_URL=https://my-cpd-cluster.ibmcodetest.us
NATURAL_LANGUAGE_UNDERSTANDING_USERNAME=my-username
NATURAL_LANGUAGE_UNDERSTANDING_PASSWORD=my-password
NATURAL_LANGUAGE_UNDERSTANDING_URL=https://my-cpd-cluster.ibmcodetest.us/natural-language-understanding/nlu/instances/1580832150084/api
# # If you use a self-signed certificate, you need to disable SSL verification.
# # This is not secure and not recommended.
## NATURAL_LANGUAGE_UNDERSTANDING_AUTH_DISABLE_SSL=true
## NATURAL_LANGUAGE_UNDERSTANDING_DISABLE_SSL=true

DISCOVERY_AUTH_TYPE=cp4d
DISCOVERY_AUTH_URL=https://my-cpd-cluster.ibmcodetest.us
DISCOVERY_USERNAME=my-username
DISCOVERY_PASSWORD=my-password
DISCOVERY_URL=https://my-cpd-cluster.ibmcodetest.us/discovery/disco/instances/1576022362055/api
# # If you use a self-signed certificate, you need to disable SSL verification.
# # This is not secure and not recommended.
## DISCOVERY_AUTH_DISABLE_SSL=true
## DISCOVERY_DISABLE_SSL=true
DISCOVERY_ENVIRONMENT_ID=default
# Optionally, use a non-default collection by specifying your ID.
DISCOVERY_COLLECTION_ID=<add_discovery_collection_id>

# Run locally on a non-default port (default is 3000)
# PORT=3000

# Set LOCALE=en_IN for the original India bank version.
LOCALE=en_US
```

> Note: if you are trying to run this project as workshop in India then use `Locale=en_IN`

</p>
</details>

### 2. Run the application

1. Install [Node.js](https://nodejs.org/en/) runtime or NPM.
1. Start the app by running `npm install`, followed by `npm start`.
1. Use the chatbot at `localhost:3000`.

> Note: server host can be changed as required in server.js and `PORT` can be set in `.env`.

[![return](https://raw.githubusercontent.com/IBM/pattern-utils/master/deploy-buttons/return.png)](https://github.com/IBM/watson-banking-chatbot#sample-output)
