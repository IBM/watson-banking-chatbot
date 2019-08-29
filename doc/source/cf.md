# Run on IBM Cloud with Cloud Foundry

This document shows how to run the application using Cloud Foundry on IBM Cloud.

## Steps

<p align="center">
    <a href="https://cloud.ibm.com/devops/setup/deploy?repository=https://github.com/IBM/watson-banking-chatbot">
    <img src="https://cloud.ibm.com/devops/setup/deploy/button_x2.png" alt="Deploy to IBM Cloud">
    </a>
</p>

1. Press the above `Deploy to IBM Cloud` button and then...

   * Click `Create+` to create an IBM Cloud API Key.
   * Select your region, organization, and space (or use the defaults).
   * Click `Deploy`.

2. In Toolchains, click on `Delivery Pipeline` to watch while the app is deployed. Once deployed, the app can be viewed by clicking `Visit App URL`.  Note: You may need to re-run the deploy stage (see [Troubleshooting](#Troubleshooting)).

   ![toolchain-pipeline](images/toolchain-pipeline.png)

3. To see the app and services created and configured for this code pattern, use the IBM Cloud dashboard. The app is named `watson-banking-chatbot` with a unique suffix. The following services are created and easily identified by the `wbc-` prefix:

    * `wbc-conversation-service`
    * `wbc-discovery-service`
    * `wbc-natural-language-understanding-service`
    * `wbc-tone-analyzer-service`

> NOTE: The dialog has been reduced to work with Lite plans. If you are looking for all of the previous functionality, you can manually import [`full_banking.json`](../../data/conversation/workspaces/full_banking.json). Follow the instructions in [3. Import the Watson Assistant skill](../../README.md#3-import-the-watson-assistant-skill) to import it, delete the Lite version that was automatically uploaded, and restart the app. The app will recognize the skill by name if only one is available.

[![return](https://raw.githubusercontent.com/IBM/pattern-utils/master/deploy-buttons/return.png)](https://github.com/IBM/watson-banking-chatbot#deployment-options)
