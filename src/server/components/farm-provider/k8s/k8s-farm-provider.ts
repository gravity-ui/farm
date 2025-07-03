import {Writable} from 'stream';

import * as k8s from '@kubernetes/client-node';
import type {SubscriptionObserver} from 'observable-fns';

import type {
    Instance,
    InstanceProviderInfo,
    InstanceProviderStatus,
} from '../../../../shared/common';
import type {GenerateInstanceData, InstanceObservableEmitValue} from '../../../models/common';
import {CommandError} from '../../../utils/command-error';
import {generateInstanceHref} from '../../../utils/common';
import {
    type FarmJsonConfig,
    fetchProjectConfig,
    getInstanceConfig,
} from '../../../utils/farmJsonConfig';
import {getVcs} from '../../../utils/vcs';
import {waitFor} from '../../../utils/wait-for';
import {wrapAsCommand} from '../../../utils/wrap-as-command';
import type {FarmInternalApi, LogParams} from '../base-provider';
import {BaseFarmProvider} from '../base-provider';

import {K8sContainerStatus} from './constants';
import type {
    FarmK8sProviderConfig,
    K8sContainerInfo,
    K8sInstanceResourceNames,
    K8sLabels,
} from './types';
import {
    buildK8sEnvVariables,
    getContainerExitCode,
    getContainerInfo,
    getContainerStatus,
    getLabelSelector,
    getPodStartTime,
    ignoreNotFound,
} from './utils';

const BUILDER_CONTAINER_NAME = 'builder';
const INSTANCE_CONTAINER_NAME = 'application';

const FARM_LABELS = {
    'app.kubernetes.io/managed-by': 'Farm',
};

const DEPLOYMENT_CREATION_TIMEOUT = 30 * 1000;

const containerStatusMap: Record<K8sContainerStatus, InstanceProviderStatus> = {
    // Custom container statuses
    Terminating: 'stopped',
    Ready: 'running',

    // Pod statuses
    Pending: 'starting',
    Running: 'starting',
    Succeeded: 'stopped',
    Failed: 'errored',

    // Container reasons (waiting)
    ContainerCreating: 'starting',
    CrashLoopBackOff: 'errored',
    ErrImagePull: 'errored',
    ImagePullBackOff: 'errored',
    CreateContainerConfigError: 'errored',
    InvalidImageName: 'errored',
    CreateContainerError: 'errored',

    // Container reasons (terminated)
    Completed: 'stopped',
    OOMKilled: 'errored',
    Error: 'errored',
    ContainerCannotRun: 'errored',
    DeadlineExceeded: 'errored',
};

const mapToFarmStatus = (containerStatus: K8sContainerStatus): InstanceProviderStatus => {
    return containerStatusMap[containerStatus] || 'unknown';
};

const getBuilderPodName = (hash: string): string => {
    return `${hash}-builder`;
};

const getInstanceResourceNames = (hash: string): K8sInstanceResourceNames => {
    return {
        deploymentName: `${hash}-deployment`,
        serviceName: `${hash}-service`,
        ingressName: `${hash}-ingress`,
    };
};

const getDefaultProbe = (port: number): k8s.V1Probe => {
    return {
        httpGet: {
            port,
            scheme: 'HTTP',
            path: '/ping',
        },
        initialDelaySeconds: 10,
        periodSeconds: 5,
        successThreshold: 1,
        failureThreshold: 3,
    };
};

export class K8sFarmProvider extends BaseFarmProvider {
    declare protected config: Required<FarmK8sProviderConfig>;

    declare protected k8sApi: k8s.CoreV1Api;
    declare protected k8sApps: k8s.AppsV1Api;
    declare protected k8sNetworking: k8s.NetworkingV1Api;
    declare protected k8sLog: k8s.Log;

    constructor(farmInternalApi: FarmInternalApi, config: FarmK8sProviderConfig) {
        super(farmInternalApi);

        const instancePort = config.instancePort ?? 8080;

        this.config = {
            namespace: config.namespace ?? 'farm',
            targetRepository: config.targetRepository,
            dockerSocketHostPath: config.dockerSocketHostPath ?? '/var/run/docker.sock',
            dockerCredsHostPath: config.dockerCredsHostPath ?? '/var/lib/kubelet/config.json',
            ingressClassName: config.ingressClassName ?? 'nginx',
            ingressAnnotations: config.ingressAnnotations ?? null,
            ingressTlsSecretName: config.ingressTlsSecretName ?? null,
            dockerfilePath: config.dockerfilePath ?? 'Dockerfile.farm',
            builderImage: config.builderImage,
            builderEnvSecretName: config.builderEnvSecretName ?? null,
            instanceEnvSecretName: config.instanceEnvSecretName ?? null,
            instancePort,
            instanceProbe: config.instanceProbe ?? getDefaultProbe(instancePort),
            startBuilderTimeout: config.startBuilderTimeout ?? 60 * 1000,
            startInstanceTimeout: config.startInstanceTimeout ?? 5 * 60 * 1000,
            buildTimeout: config.buildTimeout ?? 20 * 60 * 1000,
            builderResources: config.builderResources ?? null,
            instanceResources: config.instanceResources ?? null,
        };

        const kubeConfig = new k8s.KubeConfig();
        kubeConfig.loadFromDefault();

        this.k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
        this.k8sApps = kubeConfig.makeApiClient(k8s.AppsV1Api);
        this.k8sNetworking = kubeConfig.makeApiClient(k8s.NetworkingV1Api);
        this.k8sLog = new k8s.Log(kubeConfig);
    }

    async startup(): Promise<void> {
        return Promise.resolve();
    }

    async buildInstance(
        generateData: GenerateInstanceData,
        observer: SubscriptionObserver<InstanceObservableEmitValue>,
    ): Promise<void> {
        try {
            const {hash, vcs, project, branch, instanceConfigName} = generateData;

            const projectConfig = await fetchProjectConfig({
                vcs,
                project,
                branch,
            });

            const instanceConfig = getInstanceConfig(projectConfig, instanceConfigName).preview;
            if (!instanceConfig) {
                throw new Error(`Instance config not found for ${instanceConfigName}`);
            }

            const {
                buildTimeout = this.config.buildTimeout,
                startInstanceTimeout = this.config.startInstanceTimeout,
                k8sStartBuilderTimeout: startBuilderTimeout = this.config.startBuilderTimeout,
            } = instanceConfig;

            const instanceImage = this.getInstanceImage(project, hash);

            await wrapAsCommand(observer, 'Build image', async () => {
                await this.deleteBuilderContainer(hash);
                const builderInfo = await this.runBuilderContainer(
                    generateData,
                    instanceConfig,
                    instanceImage,
                );

                await this.waitForContainerStatus(
                    builderInfo,
                    K8sContainerStatus.Ready,
                    startBuilderTimeout,
                );

                await this.followContainerLogs(builderInfo, (log) => {
                    observer.next({
                        output: [
                            {stdout: log, code: null, command: null, stderr: null, duration: null},
                        ],
                    });
                });

                const builderStatus = await this.waitForContainerStatus(
                    builderInfo,
                    [K8sContainerStatus.Completed, K8sContainerStatus.Error],
                    buildTimeout,
                );
                const builderExitCode = await this.readContainerExitCode(builderInfo);

                await this.k8sApi.deleteNamespacedPod(builderInfo.podName, builderInfo.namespace);

                if (builderStatus === 'Error') {
                    throw new CommandError(builderExitCode);
                }
            });

            observer.next({config: {status: 'generated'}});

            await wrapAsCommand(observer, 'Run instance', async () => {
                await this.deleteInstanceContainer(hash);
                const instanceInfo = await this.runInstanceContainer(
                    generateData,
                    instanceConfig,
                    instanceImage,
                );
                await this.waitForContainerStatus(
                    instanceInfo,
                    K8sContainerStatus.Ready,
                    startInstanceTimeout,
                );
            });
        } catch (error) {
            observer.next({config: {status: 'errored'}});

            // k8s client has own error messages in body
            if (error instanceof k8s.HttpError && typeof error.body.message === 'string') {
                throw new Error(error.body.message);
            }

            throw error;
        }
    }

    async stopBuilder(hash: string): Promise<void> {
        await this.deleteBuilderContainer(hash);
    }

    async startInstance(instance: Instance): Promise<void> {
        const {vcs, project, branch, instanceConfigName, hash} = instance;

        const projectConfig = await fetchProjectConfig({
            vcs,
            project,
            branch,
        });
        const instanceConfig = getInstanceConfig(projectConfig, instanceConfigName).preview;

        if (!instanceConfig) {
            throw new Error(`Instance config not found for ${instanceConfigName}`);
        }

        const instanceImage = this.getInstanceImage(project, hash);

        await this.deleteInstanceContainer(hash);
        const instanceInfo = await this.runInstanceContainer(
            instance,
            instanceConfig,
            instanceImage,
        );
        await this.waitForContainerStatus(
            instanceInfo,
            K8sContainerStatus.Ready,
            this.config.startInstanceTimeout,
        );
    }

    async stopInstance(hash: string): Promise<void> {
        await this.deleteInstanceContainer(hash);
    }

    async restartInstance(instance: Instance): Promise<void> {
        await this.stopInstance(instance.hash);
        await this.startInstance(instance);
    }

    async deleteInstance(hash: string): Promise<void> {
        await this.deleteInstanceContainer(hash);
    }

    async getInstanceStatus(instance: Instance): Promise<InstanceProviderStatus> {
        const [pod] = await this.listPods({hash: instance.hash});

        if (!pod) {
            return 'unknown';
        }

        return mapToFarmStatus(getContainerStatus(pod, INSTANCE_CONTAINER_NAME));
    }

    async getInstances(): Promise<InstanceProviderInfo[]> {
        const pods = await this.listPods({
            ...FARM_LABELS,
            type: 'instance',
        });

        return pods.map<InstanceProviderInfo>((pod) => ({
            hash: this.getInstanceHash(pod),
            status: mapToFarmStatus(getContainerStatus(pod, INSTANCE_CONTAINER_NAME)),
            startTime: getPodStartTime(pod),
        }));
    }

    async getInstanceLogs(params: {
        hash: string;
        stdout?: LogParams | undefined;
        stderr?: LogParams | undefined;
    }): Promise<{stdout?: string | undefined; stderr?: string | undefined}> {
        const pod = await this.readInstancePod(params.hash);
        const instanceInfo = getContainerInfo(pod, INSTANCE_CONTAINER_NAME);

        const {body: out} = await this.k8sApi.readNamespacedPodLog(
            instanceInfo.podName,
            instanceInfo.namespace,
            instanceInfo.containerName,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            params.stdout?.maxLines,
        );

        // TODO(golbahsg): Think about removing stderr for k8s provider
        // out has merged stdout and stderr because of k8s architecture
        return {stdout: out};
    }

    protected getInstanceImage(project: string, hash: string): string {
        return `${this.config.targetRepository}/${project}:${hash}`;
    }

    protected async runBuilderContainer(
        generateData: GenerateInstanceData,
        instanceConfig: FarmJsonConfig,
        targetImage: string,
    ): Promise<K8sContainerInfo> {
        const {namespace, dockerSocketHostPath, dockerCredsHostPath} = this.config;
        const {vcs: projectVcs, hash} = generateData;
        const {
            env,
            dockerfilePath = this.config.dockerfilePath,
            k8sBuilderImage: builderImage = this.config.builderImage,
            k8sBuilderEnvSecretName: builderEnvSecretName = this.config.builderEnvSecretName,
            k8sBuilderResources: builderResources = this.config.builderResources,
        } = instanceConfig;

        const buildEnvVariables = {
            ...env,
            ...generateData.envVariables,
        };

        const vcs = getVcs(projectVcs);

        const commands = [
            'set -ex',
            ...vcs.getK8sCheckoutCommands(generateData),
            `docker build . -f '${dockerfilePath}' -t ${targetImage} --network host`,
            `docker push ${targetImage}`,
        ];

        const {body: pod} = await this.k8sApi.createNamespacedPod(namespace, {
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: {
                namespace,
                name: getBuilderPodName(hash),
                labels: {
                    ...FARM_LABELS,
                    type: 'builder',
                    hash,
                },
            },
            spec: {
                containers: [
                    {
                        name: BUILDER_CONTAINER_NAME,
                        image: builderImage,
                        imagePullPolicy: 'IfNotPresent',
                        volumeMounts: [
                            {
                                name: 'docker-socket',
                                mountPath: '/var/run/docker.sock',
                            },
                            {
                                name: 'docker-creds',
                                mountPath: '/root/.docker/config.json',
                            },
                        ],
                        ...(builderEnvSecretName
                            ? {envFrom: [{secretRef: {name: builderEnvSecretName}}]}
                            : {}),
                        env: buildK8sEnvVariables(buildEnvVariables),
                        command: ['/bin/sh', '-c'],
                        args: [commands.join('\n')],
                        resources: builderResources ?? undefined,
                    },
                ],
                volumes: [
                    {
                        name: 'docker-socket',
                        hostPath: {
                            path: dockerSocketHostPath,
                            type: 'Socket',
                        },
                    },
                    {
                        name: 'docker-creds',
                        hostPath: {
                            path: dockerCredsHostPath,
                            type: 'File',
                        },
                    },
                ],
                restartPolicy: 'Never',
            },
        });

        return getContainerInfo(pod, BUILDER_CONTAINER_NAME);
    }

    protected async deleteBuilderContainer(hash: string): Promise<void> {
        await this.k8sApi
            .deleteNamespacedPod(getBuilderPodName(hash), this.config.namespace)
            .catch(ignoreNotFound);
    }

    protected async runInstanceContainer(
        generateData: GenerateInstanceData,
        instanceConfig: FarmJsonConfig,
        instanceImage: string,
    ): Promise<K8sContainerInfo> {
        const {namespace, ingressClassName, ingressAnnotations, ingressTlsSecretName} = this.config;
        const {project, hash, urlTemplate: generateUrlTemplate} = generateData;
        const {
            urlTemplate: configUrlTemplate,
            env,
            runEnv,
            k8sInstanceEnvSecretName: instanceEnvSecretName = this.config.instanceEnvSecretName,
            k8sInstancePort: instancePort = this.config.instancePort,
            k8sInstanceProbe: instanceProbe = this.config.instanceProbe,
            k8sInstanceResources: instanceResources = this.config.instanceResources,
        } = instanceConfig;

        const {deploymentName, serviceName, ingressName} = getInstanceResourceNames(hash);

        const selectorLabels = {
            app: `${hash}-instance`,
        };
        const commonLabels = {
            ...FARM_LABELS,
            ...selectorLabels,
            hash,
        };

        const runEnvVariables = {
            ...env,
            ...generateData.envVariables,
            ...runEnv,
            ...generateData.runEnvVariables,
        };

        const instanceHost = new URL(
            generateInstanceHref({
                project,
                hash,
                // TODO(golbahsg): Do we need urlTemplate in generateData?
                urlTemplate: generateUrlTemplate || configUrlTemplate,
            }),
        ).host;

        // TODO(golbahsg, k8s): Add securityContext
        const {body: deployment} = await this.k8sApps.createNamespacedDeployment(namespace, {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: {
                namespace,
                name: deploymentName,
                labels: commonLabels,
            },
            spec: {
                selector: {
                    matchLabels: selectorLabels,
                },
                template: {
                    metadata: {
                        labels: {
                            ...commonLabels,
                            type: 'instance',
                        },
                    },
                    spec: {
                        containers: [
                            {
                                name: INSTANCE_CONTAINER_NAME,
                                image: instanceImage,
                                imagePullPolicy: 'Always',
                                ...(instanceEnvSecretName
                                    ? {envFrom: [{secretRef: {name: instanceEnvSecretName}}]}
                                    : {}),
                                env: buildK8sEnvVariables(runEnvVariables),
                                ports: [
                                    {
                                        name: 'app',
                                        protocol: 'TCP',
                                        containerPort: instancePort,
                                    },
                                ],
                                livenessProbe: instanceProbe,
                                readinessProbe: instanceProbe,
                                resources: instanceResources ?? undefined,
                            },
                        ],
                    },
                },
                replicas: 1,
            },
        });

        await this.k8sApi.createNamespacedService(namespace, {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
                namespace,
                name: serviceName,
                labels: commonLabels,
            },
            spec: {
                selector: selectorLabels,
                type: 'NodePort',
                ports: [
                    {
                        name: 'app',
                        protocol: 'TCP',
                        port: instancePort,
                        targetPort: instancePort,
                    },
                ],
                ipFamilies: ['IPv6', 'IPv4'],
                ipFamilyPolicy: 'PreferDualStack',
            },
        });

        await this.k8sNetworking.createNamespacedIngress(namespace, {
            apiVersion: 'networking.k8s.io/v1',
            kind: 'Ingress',
            metadata: {
                namespace,
                name: ingressName,
                labels: commonLabels,
                annotations: ingressAnnotations || undefined,
            },
            spec: {
                ingressClassName: ingressClassName || undefined,
                rules: [
                    {
                        host: instanceHost,
                        http: {
                            paths: [
                                {
                                    path: '/',
                                    pathType: 'Prefix',
                                    backend: {
                                        service: {
                                            name: serviceName,
                                            port: {number: instancePort},
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
                tls: ingressTlsSecretName
                    ? [{secretName: ingressTlsSecretName, hosts: [instanceHost]}]
                    : undefined,
            },
        });

        const pods = await this.waitForDeploymentPods(deployment, DEPLOYMENT_CREATION_TIMEOUT);

        if (pods.length === 0) {
            throw new Error(`No pods found for instance "${hash}"`);
        }

        // Because we run only one pod for instance using replicas option above
        return getContainerInfo(pods[0], INSTANCE_CONTAINER_NAME);
    }

    protected async deleteInstanceContainer(hash: string): Promise<void> {
        const {namespace} = this.config;
        const {deploymentName, serviceName, ingressName} = getInstanceResourceNames(hash);

        try {
            await this.k8sApps.deleteNamespacedDeployment(deploymentName, namespace);
            await this.k8sApi.deleteNamespacedService(serviceName, namespace);
            await this.k8sNetworking.deleteNamespacedIngress(ingressName, namespace);
        } catch (error) {
            ignoreNotFound(error);
        }
    }

    protected getInstanceHash(pod: k8s.V1Pod): string {
        const hash = pod.metadata?.labels?.hash;

        if (!hash) {
            throw new Error(`Pod "${pod.metadata?.name}" has no hash label`);
        }

        return hash;
    }

    protected async readInstancePod(hash: string): Promise<k8s.V1Pod> {
        const [pod] = await this.listPods({hash});

        if (!pod) {
            throw new Error(`Pod for instance "${hash}" not found`);
        }

        return pod;
    }

    protected async followContainerLogs(
        {namespace, podName, containerName}: K8sContainerInfo,
        onLog: (log: string) => void,
    ): Promise<void> {
        const logStream = new Writable({
            write(chunk, _encoding, next) {
                onLog(chunk.toString());
                next();
            },
        });

        await this.k8sLog.log(namespace, podName, containerName, logStream, {follow: true});
    }

    protected async readDeploymentPods(deployment: k8s.V1Deployment): Promise<k8s.V1Pod[]> {
        const labels = deployment.spec?.selector.matchLabels;

        if (!labels) {
            throw new Error('Deployment does not have matchLabels');
        }

        return this.listPods(labels);
    }

    protected async waitForDeploymentPods(
        deployment: k8s.V1Deployment,
        timeout?: number,
        period = 1000,
    ): Promise<k8s.V1Pod[]> {
        const {value: currentPods, timedOut} = await waitFor(
            () => this.readDeploymentPods(deployment),
            (pods) => pods.length > 0,
            timeout,
            period,
        );

        if (timedOut) {
            throw new Error(`Deployment "${deployment.metadata?.name}" creation is timed out`);
        }

        return currentPods;
    }

    protected async listPods(labels: K8sLabels): Promise<k8s.V1Pod[]> {
        const {body: pods} = await this.k8sApi.listNamespacedPod(
            this.config.namespace,
            undefined,
            undefined,
            undefined,
            undefined,
            getLabelSelector(labels),
        );

        return pods.items.filter((pod) => !pod.metadata?.deletionTimestamp);
    }

    protected async readContainerExitCode({
        namespace,
        podName,
        containerName,
    }: K8sContainerInfo): Promise<number> {
        const {body: pod} = await this.k8sApi.readNamespacedPod(podName, namespace);

        return getContainerExitCode(pod, containerName);
    }

    protected async readContainerStatus({
        namespace,
        podName,
        containerName,
    }: K8sContainerInfo): Promise<K8sContainerStatus> {
        const {body: pod} = await this.k8sApi.readNamespacedPod(podName, namespace);

        return getContainerStatus(pod, containerName);
    }

    protected async waitForContainerStatus(
        containerInfo: K8sContainerInfo,
        statuses: K8sContainerStatus | K8sContainerStatus[],
        timeout?: number,
        period = 1000,
    ): Promise<K8sContainerStatus> {
        const statusesSet = new Set(typeof statuses === 'string' ? [statuses] : statuses);

        const {value: currentStatus, timedOut} = await waitFor(
            () => this.readContainerStatus(containerInfo),
            (status) => statusesSet.has(status),
            timeout,
            period,
        );

        if (timedOut) {
            throw new Error(
                `Container "${containerInfo.podName}/${containerInfo.containerName}" is timed out, current status: ${currentStatus}, expected statuses: [${statuses}]`,
            );
        }

        return currentStatus;
    }
}
