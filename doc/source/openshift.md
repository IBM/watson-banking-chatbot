# Run on RedHat OpenShift

This document shows how to run the `watson-assistant-slots-intro` application in a container running on RedHat OpenShift.

## Prerequisites

You will need a running OpenShift cluster, or OKD cluster. You can provision [OpenShift on the IBM Cloud](https://cloud.ibm.com/kubernetes/catalog/openshiftcluster).

## Steps

* In your cluster, open your project or click on `+ Create Project` to create one.
* In the `Overview` tab, click on `Browse Catalog`

![Browse Catalog](https://github.com/IBM/pattern-utils/blob/master/openshift/openshift-browse-catalog.png)

* Choose the `Node.js` app container and click `Next`.

![Choose Node.js](https://github.com/IBM/pattern-utils/blob/master/openshift/openshift-choose-nodejs.png)

* Give your app a name and add `https://github.com/IBM/watson-assistant-slots-intro` for the github repo, then click `Create`.

![Add github repo](https://github.com/IBM/pattern-utils/blob/master/openshift/openshift-add-github-repo.png)

* You will need to export the key/value pairs from [env.sample](../../env.sample) as a config map. The key would be the key in env.sample and values would be the credentials of each key.

* Also add key `PORT` with the value `8080`.

* Go to the `Applications` tab, choose `Deployments` and the `Environment` tab. Under `Environment From` `Config Map/Secret` choose the config map you just created [1]. Save the config [2]. The app will re-deploy automatically, or click `Deploy` to re-deploy manually [3]. To see the variables in the Config Map that will be exported in the app environment, click `View Details`.

![add config map to app](https://github.com/IBM/pattern-utils/blob/master/openshift/openshift-add-config-map-to-app.png)

* Under `Applications` -> `Routes` you will see your app. Click on the `Hostname` to see your Pizza ordering chat bot in action.

![pizza bot demo](images/pizza-bot-demo.png)

[![return](https://raw.githubusercontent.com/IBM/pattern-utils/master/deploy-buttons/return.png)](https://github.com/IBM/watson-assistant-slots-intro#deployment-options)
