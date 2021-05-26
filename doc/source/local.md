# Run Locally

This document shows how to run the application using on your local machine.

## Steps

1. [Configure credentials](#1-configure-credentials)
1. [Run the application](#2-run-the-application)

### 1. Configure credentials

The following instructions will depend on if you are provisioning your services from IBM Cloud or from an IBM Cloud Pak for Data cluster. Choose one:

<details><summary>Provision on IBM Cloud Pak for Data</summary>
<p>

Collect the credentials for IBM Cloud Pak for Data provisioned services (Assistant, Discovery and Natural Language Understanding). For each of these services:

<h5>Gather service credentials</h5>
<p>
<ol>
    <li>For production use, create a user to use for authentication. From the main navigation menu (☰), select <b>Administer > Manage users</b> and then <b>+ New user</b>.</li>
    <li>From the main navigation menu (☰), select <b>My instances</b>.</li>
    <li>On the <b>Provisioned instances</b> tab, find your service instance, and then hover over the last column to find and click the ellipses icon. Choose <b>View details</b>.</li>
    <li>Copy the <b>URL</b> to use as the <b>{SERVICE_NAME}_URL</b> when you configure credentials.</li>
    <li><i>Optionally, copy the <b>Bearer token</b> to use in development testing only. It is not recommended to use the bearer token except during testing and development because that token does not expire.</i></li>
    <li>Use the <b>Menu</b> and select <b>Users</b> and <b>+ Add user</b> to grant your user access to this service instance. This is the user name (and password) you will use when you configure credentials to allow the Node.js server to authenticate.</li>
</ol>

The other settings for Assistant and Discovery (`SKILL_ID`, `DISCOVERY_ENVIRONMENT_ID`, and `DISCOVERY_COLLECTION_ID`) can be used to configure a specific skill or collection.

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

## CPD Cluster URL should be in the form:
## https://{cpd_cluster_host}{:port}
## Service URLs should be in the form:
## https://{cpd_cluster_host}{:port}/{service}/{release}/instances/{instance_id}/api

# ASSISTANT_AUTH_TYPE=cp4d
# ASSISTANT_AUTH_URL=<add_cpd_url>
# ASSISTANT_USERNAME=<add_cpd_username>
# ASSISTANT_PASSWORD=<add_cpd_password>
# ASSISTANT_URL=<add_assistant_instance_url>
# # If you use a self-signed certificate, you need to disable SSL verification.
# # This is not secure and not recommended.
## ASSISTANT_AUTH_DISABLE_SSL=true
## ASSISTANT_DISABLE_SSL=true
# Optionally, use a non-default skill by specifying your own skill ID.
# SKILL_ID=<add_assistant_skill_id>

# NATURAL_LANGUAGE_UNDERSTANDING_AUTH_TYPE=cp4d
# NATURAL_LANGUAGE_UNDERSTANDING_AUTH_URL=<add_cpd_url>
# NATURAL_LANGUAGE_UNDERSTANDING_USERNAME=<add_cpd_username>
# NATURAL_LANGUAGE_UNDERSTANDING_PASSWORD=<add_cpd_password>
# NATURAL_LANGUAGE_UNDERSTANDING_URL=<add_nlu_instance_url>
# # If you use a self-signed certificate, you need to disable SSL verification.
# # This is not secure and not recommended.
## NATURAL_LANGUAGE_UNDERSTANDING_AUTH_DISABLE_SSL=true
## NATURAL_LANGUAGE_UNDERSTANDING_DISABLE_SSL=true

# DISCOVERY_AUTH_TYPE=cp4d
# DISCOVERY_AUTH_URL=<add_cpd_url>
# DISCOVERY_USERNAME=<add_cpd_username>
# DISCOVERY_PASSWORD=<add_cpd_password>
# DISCOVERY_URL=<add_discovery_instance_url>
# # If you use a self-signed certificate, you need to disable SSL verification.
# # This is not secure and not recommended.
## DISCOVERY_AUTH_DISABLE_SSL=true
## DISCOVERY_DISABLE_SSL=true
# DISCOVERY_ENVIRONMENT_ID=default
# Optionally, use a non-default collection by specifying your ID.
# DISCOVERY_COLLECTION_ID=<add_discovery_collection_id>

# Run locally on a non-default port (default is 3000)
# PORT=3000

# Set LOCALE=en_IN for the original India bank version.
LOCALE=en_US
```

> Note: if you are trying to run this project as workshop in India then use `Locale=en_IN`

</p>
</details>

<details><summary>Provision on IBM Cloud</summary>
<p>

Collect the credentials for the IBM Cloud services (Assistant, Discovery and Natural Language Understanding). For each of these services:

<h5>Gather service credentials</h5>
  <ol>
    <li>From the main navigation menu (☰), select <b>Resource list</b> to find your services under <b>Services</b>.</li>
    <li>Click on each service to find the <b>Manage</b> view where you can collect the <b>API Key</b> and <b>URL</b> to use for each service when you configure credentials.
  </ol>

The other settings for Assistant and Discovery were collected during the
earlier setup steps detailed in the main [README](https://github.com/IBM/watson-banking-chatbot/blob/master/README.md) page. See the setup sections for each service to determine where to find `DISCOVERY_COLLECTION_ID`,  `DISCOVERY_ENVIRONMENT_ID` and Assistant `SKILL_ID`.

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
# ASSISTANT_AUTH_TYPE=iam
# ASSISTANT_APIKEY=<add_assistant_apikey>
# ASSISTANT_URL=<add_assistant_url>
# Optionally, use a non-default skill by specifying your own skill ID.
# SKILL_ID=<add_assistant_skill_id>

# Watson Natural Language Understanding
# NATURAL_LANGUAGE_UNDERSTANDING_AUTH_TYPE=iam
# NATURAL_LANGUAGE_UNDERSTANDING_APIKEY=<add_nlu_apikey>
# NATURAL_LANGUAGE_UNDERSTANDING_URL=<add_nlu_url>

# Watson Discovery
# DISCOVERY_AUTH_TYPE=iam
# DISCOVERY_APIKEY=<add_discovery_apikey>
# DISCOVERY_URL=<add_discovery_url>
# Optionally, use a non-default environment and collection by specifying your IDs.
# DISCOVERY_ENVIRONMENT_ID=<add_discovery_environment_id>
# DISCOVERY_COLLECTION_ID=<add_discovery_collection_id>

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
1. Go back to the README.md for instructions on how to use the web app.

> Note: server host can be changed as required in server.js and `PORT` can be set in `.env`.

[![return](https://raw.githubusercontent.com/IBM/pattern-utils/master/deploy-buttons/return.png)](../../README.md#4-use-the-web-app)
