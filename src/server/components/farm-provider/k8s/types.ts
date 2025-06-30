import type * as k8s from '@kubernetes/client-node';

export type K8sLabels = Record<string, string>;

export interface K8sPodInfo {
    namespace: string;
    podName: string;
}

export interface K8sContainerInfo extends K8sPodInfo {
    containerName: string;
}

export interface K8sInstanceResourceNames {
    deploymentName: string;
    serviceName: string;
    ingressName: string;
}

export interface FarmK8sProviderConfig {
    // Global
    namespace?: string;
    targetRepository: string;
    dockerSocketHostPath?: string;
    dockerCredsHostPath?: string;
    ingressClassName?: string;
    ingressAnnotations?: Record<string, string> | null;
    ingressTlsSecretName?: string | null;

    // Instance defaults
    dockerfilePath?: string;
    builderImage: string;
    builderEnvSecretName?: string | null;
    instanceEnvSecretName?: string | null;
    instancePort?: number;
    instanceProbe?: k8s.V1Probe;
    startBuilderTimeout?: number;
    startInstanceTimeout?: number;
    buildTimeout?: number;
}
