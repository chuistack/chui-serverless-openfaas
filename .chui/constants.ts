import {Config} from "@pulumi/pulumi";
import {Chui} from "@chuistack/chui-lib";

const chui = Chui.Config.loadCurrentConfig();
const appName = Chui.Config.getCurrentAppName();

const config = new Config();

export const OPENFAAS_SYSTEM_NAMESPACE = 'openfaas';
export const OPENFAAS_FUNCTIONS_NAMESPACE = 'openfaas-fn';
export const OPENFAAS_ADMIN_PASSWORD = config.requireSecret("openFaasAdminPassword");
export const OPENFAAS_ADMIN_SECRET = 'basic-auth';

export const RELEASE_NAME = Chui.Resource.buildObjectName(chui.globalAppName, 'serverless', 'openfaas');
export const ENDPOINT = Chui.Resource.buildEndpoint(chui.rootDomain, appName);
export const TLS_SECRET = Chui.Resource.buildObjectName(chui.globalAppName, RELEASE_NAME, "tls-secret");

