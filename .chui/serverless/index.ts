import * as k8s from "@pulumi/kubernetes";
import {
    OPENFAAS_ADMIN_PASSWORD,
    OPENFAAS_ADMIN_SECRET,
    OPENFAAS_FUNCTIONS_NAMESPACE,
    OPENFAAS_SYSTEM_NAMESPACE,
    ENDPOINT,
    RELEASE_NAME,
    TLS_SECRET,
} from "../constants";
import {getStack, StackReference} from "@pulumi/pulumi";
import {Namespace} from "@pulumi/kubernetes/core/v1";
import {Chui} from "@chuistack/chui-lib";

const chui = Chui.Config.loadCurrentConfig();
const core = new StackReference(`${chui.pulumiOrgName}/${chui.globalAppName}-core/${getStack()}`);

export const PRODUCTION_CLUSTER_ISSUER_ANNOTATION = core.getOutput('productionClusterIssuerAnnotation');
export const STAGING_CLUSTER_ISSUER_ANNOTATION = core.getOutput('stagingClusterIssuerAnnotation');
export const INGRESS_CLASS_ANNOTATION = core.getOutput('ingressClassAnnotation');


/**
 * Prepare the namespaces as described in this template:
 * https://raw.githubusercontent.com/openfaas/faas-netes/master/namespaces.yml
 */
const configureOpenFaasNamespaces = () => {
    const system = new k8s.core.v1.Namespace(
        OPENFAAS_SYSTEM_NAMESPACE,
        {
            "metadata": {
                "name": OPENFAAS_SYSTEM_NAMESPACE,
                "labels": {
                    "role": "openfaas-system",
                    "access": "openfaas-system",
                    "istio-injection": "enabled",
                }
            }
        }
    );

    const functions = new k8s.core.v1.Namespace(
        OPENFAAS_FUNCTIONS_NAMESPACE,
        {
            "metadata": {
                "name": OPENFAAS_FUNCTIONS_NAMESPACE,
                "labels": {
                    "role": "openfaas-fn",
                    "istio-injection": "enabled",
                }
            }
        }
    );

    return {system, functions}
};


/**
 * Prepare the secret to login to the OpenFaas dashboard.
 * @param namespace
 */
const configureOpenFaasSecret = (namespace: Namespace) => {
    return new k8s.core.v1.Secret(
        OPENFAAS_ADMIN_SECRET,
        {
            metadata: {
                name: OPENFAAS_ADMIN_SECRET,
                namespace: OPENFAAS_SYSTEM_NAMESPACE,
            },
            stringData: {
                "basic-auth-user": "chui-openfaas",
                "basic-auth-password": OPENFAAS_ADMIN_PASSWORD,
            }
        },
        {dependsOn: namespace}
    )
};


/**
 * Deploy OpenFaas.
 */
const configureOpenFaas = () => {
    const namespaces = configureOpenFaasNamespaces();
    const secret = configureOpenFaasSecret(namespaces.system);

    return new k8s.helm.v2.Chart(
        RELEASE_NAME,
        {
            "namespace": OPENFAAS_SYSTEM_NAMESPACE,
            "repo": "openfaas",
            "chart": "openfaas",
            "values": {
                "basic_auth": true,
                "functionNamespace": OPENFAAS_FUNCTIONS_NAMESPACE,
                "ingress": {
                    "enabled": true,
                    "annotations": {
                        ...INGRESS_CLASS_ANNOTATION,
                        ...(
                            chui.environment === "production" ?
                                PRODUCTION_CLUSTER_ISSUER_ANNOTATION :
                                STAGING_CLUSTER_ISSUER_ANNOTATION
                        )
                    },
                    "hosts": [
                        {
                            "host": ENDPOINT,
                            "serviceName": "gateway",
                            "servicePort": 8080,
                            "path": "/",
                        }
                    ],
                    "tls": [
                        {
                            "hosts": [
                                ENDPOINT
                            ],
                            "secretName": TLS_SECRET,
                        }
                    ]
                },
            },
        },
        {
            dependsOn: [namespaces.system, namespaces.functions, secret],
        }
    );
};


export const install = () => {
    return configureOpenFaas();
};