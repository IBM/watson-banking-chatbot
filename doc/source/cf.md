# Run on IBM Cloud with Cloud Foundry

This document shows how to run the application using Cloud Foundry on IBM Cloud.

## Steps

<p align="center">
    <a href="https://cloud.ibm.com/devops/setup/deploy?repository=https://github.com/IBM/watson-banking-chatbot">
    <img src="https://cloud.ibm.com/devops/setup/deploy/button_x2.png" alt="Deploy to IBM Cloud">
    </a>
</p>

1. Press the above `Deploy to IBM Cloud` button and then...

   ![cf-deploy](images/cf_deploy.png)

   * Create an API key by pressing the `Create+` button located next to the `IBM Cloud API key` field and then `Create` in the pop-up.
   * Select your region, organization, and space (or use the defaults).
   * Click `Create` at the top of the panel to start the deployment process.

2. From the Toolchains view, click on the `Delivery Pipeline` to watch while the app is deployed. Here you'll be able to see logs about the deployment. Once deployed, the app can be viewed by clicking `Visit App URL`.  Note: You may need to re-run the deploy stage (see [Troubleshooting](https://github.com/IBM/watson-banking-chatbot#Troubleshooting)).

   ![toolchain-pipeline](images/toolchain-pipeline.png)

3. To see the app and services created and configured for this code pattern, use the IBM Cloud dashboard. The app is named `watson-banking-chatbot` with a unique suffix. The following services are created and easily identified by the `wbc-` prefix:

    * `wbc-assistant-service`
    * `wbc-discovery-service`
    * `wbc-natural-language-understanding-service`

4. Run the web app

* Go back to `Applications` ▷ `Routes`. You will see your app.
* Click your app's `Hostname`. This will open the Watson Banking Chatbot web app in your browser.
* Go back to the README.md for instructions on how to use the app.

> NOTE: The Watson Assistant dialog has been reduced to work with Lite plans. If you are looking for all of the previous functionality, you can manually import [`full_banking.json`](../../data/conversation/workspaces/full_banking.json). Follow the instructions in [3. Import the Watson Assistant skill](../../README.md#3-import-the-watson-assistant-skill) to import it, delete the Lite version that was automatically uploaded, and restart the app. The app will recognize the skill by name if only one is available.

[![return](https://raw.githubusercontent.com/IBM/pattern-utils/master/deploy-buttons/return.png)](https://github.com/IBM/watson-banking-chatbot#sample-output)
