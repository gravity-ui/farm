import type * as k8s from '@kubernetes/client-node';

export type K8sLabels = Record<string, string>;

export interface K8sPodInfo {
    namespace: string;
    podName: string;
}

export interface K8sContainerInfo extends K8sPodInfo {
    containerName: string;
}

export interface K8sBuilderPodSpec {
    image: string;
    envSecretName?: string;
    resources?: k8s.V1ResourceRequirements;
    containerName: string;
    envVariables?: Record<string, string>;
    commands: string[];
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
    disableCleaner?: boolean;
    cleanerNodesCountWatcherPeriodSeconds?: number;
    cleanerSchedule?: string;
    cleanerRandomDelayMinutes?: number;
    cleanerJobsHistoryLimit?: number;
    cleanerPruneFilter?: string;

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
    builderResources?: k8s.V1ResourceRequirements | null;
    instanceResources?: k8s.V1ResourceRequirements | null;
}
