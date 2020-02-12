# Run on Red Hat OpenShift

This document shows how to run the `Watson Banking Chatbot` application in a container running on Red Hat OpenShift.

## Prerequisites

You will need a running OpenShift cluster, or OKD cluster. You can provision [OpenShift on the IBM Cloud](https://cloud.ibm.com/kubernetes/catalog/openshiftcluster).

## Steps

1. [Create Watson services](#1-create-watson-services)
1. [Create an OpenShift project](#2-create-an-openshift-project)
1. [Create the config map](#3-create-the-config-map)
1. [Run the web app](#4-run-the-web-app)

## 1. Create Watson services

Create the following services:

* **Watson Assistant**
* **Watson Discovery**
* **Watson Natural Language Understanding**

Use the instructions found for [Deploying Locally](local.md) to provision your services from IBM Cloud or from an IBM Cloud Pak for Data cluster. Once you have created the services and collected all of the service credential data, return to this page and complete the remaining steps.

## 2. Create an OpenShift project

* Using the OpenShift web console, select the `Application Console` view.

  ![console-options](https://raw.githubusercontent.com/IBM/pattern-utils/master/openshift/openshift-app-console-option.png)

* Use the `+Create Project` button to create a new project, then click on your project to open it.

* In the `Overview` tab, click on `Browse Catalog`.

  ![Browse Catalog](https://raw.githubusercontent.com/IBM/pattern-utils/master/openshift/openshift-browse-catalog.png)

* Choose the `Node.js` app container and click `Next`.

  ![Choose Node.js](https://raw.githubusercontent.com/IBM/pattern-utils/master/openshift/openshift-choose-nodejs.png)

* Give your app a name and add `https://github.com/IBM/watson-banking-chatbot` for the github repo, then click `Create`.

  ![Add github repo](https://raw.githubusercontent.com/IBM/pattern-utils/master/openshift/openshift-add-github-repo.png)

## 3. Create the config map

* Click on the `Resources` tab and choose `Config Maps` and then click the `Create Config Map` button.
  * Provide a `Name` for the config map.
  * Add a key named `PORT` and paste in the `8080` under `Enter a value...`.
  * For each of the following key/value pairs, click `Add Item` to add the key, and then paste the value in the `Enter a value...` field. The list will depend on where you provisioned your Watson services, similar to how you would update your `.env` file.
    * For IBM Cloud, the required keys are:
      * `CONVERSATION_APIKEY`
      * `CONVERSATION_URL`
      * `WORKSPACE_ID`
      * `DISCOVERY_APIKEY`
      * `DISCOVERY_URL`
      * `DISCOVERY_ENVIRONMENT_ID`
      * `DISCOVERY_COLLECTION_ID`
      * `NATURAL_LANGUAGE_UNDERSTANDING_APIKEY`
      * `NATURAL_LANGUAGE_UNDERSTANDING_URL`

    * For IBM Cloud Pak for Data, the required keys are:
      * `CONVERSATION_AUTH_TYPE` with value `cp4d`
      * `CONVERSATION_AUTH_URL`
      * `CONVERSATION_APIKEY`
      * `CONVERSATION_URL`
      * `WORKSPACE_ID`
      * `DISCOVERY_AUTH_TYPE` with value `cp4d`
      * `DISCOVERY_AUTH_URL`
      * `DISCOVERY_APIKEY`
      * `DISCOVERY_URL`
      * `DISCOVERY_ENVIRONMENT_ID`
      * `DISCOVERY_COLLECTION_ID`
      * `NATURAL_LANGUAGE_UNDERSTANDING_AUTH_TYPE` with value `cp4d`
      * `NATURAL_LANGUAGE_UNDERSTANDING_AUTH_URL`
      * `NATURAL_LANGUAGE_UNDERSTANDING_APIKEY`
      * `NATURAL_LANGUAGE_UNDERSTANDING_URL`

  * Hit the `Create` button.
  * Click on your new Config Map's name.
  * Click the `Add to Application` button.
  * Select your application from the pulldown.
  * Click `Save`.

  ![config_map.png](images/config_map.png)

* Go to the `Applications` tab, choose `Deployments` to view the status of your application.

## 4. Run the web app

* Under `Applications` ▷ `Routes` you will see your app. Click on the `Hostname` to see your Watson banking chatbot in action.
* Go back to the README to see an example using the bot.

[![return](https://raw.githubusercontent.com/IBM/pattern-utils/master/deploy-buttons/return.png)](https://github.com/IBM/watson-banking-chatbot#sample-output)
