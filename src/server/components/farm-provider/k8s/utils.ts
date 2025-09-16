import * as k8s from '@kubernetes/client-node';

import type {K8sContainerStatus, K8sPodStatus} from './constants';
import type {K8sContainerInfo, K8sLabels, K8sPodInfo} from './types';

export const getPodInfo = (pod: k8s.V1Pod): K8sPodInfo => {
    if (!pod.metadata || !pod.metadata.namespace || !pod.metadata.name) {
        throw new Error('Pod does not have metadata');
    }

    return {
        namespace: pod.metadata.namespace,
        podName: pod.metadata.name,
    };
};

export const getContainerInfo = (pod: k8s.V1Pod, containerName: string): K8sContainerInfo => {
    const podInfo = getPodInfo(pod);
    const container = pod.spec?.containers.find(({name}) => name === containerName);

    if (!container) {
        throw new Error(`Pod "${podInfo.podName}" does not have "${containerName}" container`);
    }

    return {
        ...podInfo,
        containerName: container.name,
    };
};

export const getPodStatus = (pod: k8s.V1Pod): K8sPodStatus => {
    const status = pod.status?.phase;

    if (!status) {
        throw new Error(`Pod "${pod.metadata?.name}" does not have status`);
    }

    return status as K8sPodStatus;
};

// This logic is inspired by this code https://github.com/kubernetes/kubernetes/blob/v1.17.3/pkg/printers/internalversion/printers.go#L624
export const getContainerStatus = (pod: k8s.V1Pod, containerName: string): K8sContainerStatus => {
    let status: string = getPodStatus(pod);

    const containerStatus = pod.status?.containerStatuses?.find(({name}) => name === containerName);

    if (containerStatus?.state?.waiting?.reason) {
        status = containerStatus?.state.waiting.reason;
    } else if (containerStatus?.state?.running && containerStatus.ready) {
        status = 'Ready';
    } else if (containerStatus?.state?.terminated?.reason) {
        status = containerStatus?.state?.terminated.reason;
    }

    if (pod.metadata?.deletionTimestamp) {
        status = 'Terminating';
    }

    return status as K8sContainerStatus;
};

export const getContainerExitCode = (pod: k8s.V1Pod, containerName: string) => {
    const containerStatus = pod.status?.containerStatuses?.find(({name}) => name === containerName);

    if (!containerStatus?.state?.terminated) {
        throw new Error(`Exit code not found for "${containerName}" container`);
    }

    return containerStatus.state.terminated.exitCode;
};

export const getPodStartTime = (pod: k8s.V1Pod) => {
    if (!pod.status?.startTime) {
        throw new Error('Pod does not have startTime');
    }

    return pod.status.startTime.getTime();
};

export const getLabelSelector = (labels: K8sLabels): string => {
    return Object.entries(labels)
        .map((entry) => entry.join('='))
        .join(',');
};

export const buildK8sEnvVariables = (env: Record<string, string>): k8s.V1EnvVar[] => {
    return Object.entries(env).map(([name, value]) => ({
        name,
        value,
    }));
};

export const isNotFoundError = (error: k8s.HttpError): boolean => {
    return error.statusCode === 404;
};

export const ignoreNotFound = (error: unknown): void => {
    if (error instanceof k8s.HttpError && isNotFoundError(error)) {
        return;
    }

    throw error;
};

export const generateRandomString = (length: number): string => {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let result = '';
    for (let i = 0; i < length; ++i) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const BLOCKING_TAINTS = ['NoSchedule', 'NoExecute'];

export const isNodeActive = (node: k8s.V1Node): boolean => {
    const readyCondition = node.status?.conditions?.find((condition) => condition.type === 'Ready');

    const isReady = readyCondition?.status === 'True';
    const isSchedulable = !node.spec?.unschedulable;
    const hasBlockingTaints =
        node.spec?.taints?.some((taint) => BLOCKING_TAINTS.includes(taint.effect)) ?? false;

    return isReady && isSchedulable && !hasBlockingTaints;
};
