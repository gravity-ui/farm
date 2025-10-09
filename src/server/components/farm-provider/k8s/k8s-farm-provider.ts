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
import {generateInstanceHref, wrapInternalError} from '../../../utils/common';
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
    K8sBuilderPodSpec,
    K8sContainerInfo,
    K8sInstanceResourceNames,
    K8sLabels,
} from './types';
import {
    buildK8sEnvVariables,
    generateRandomString,
    getContainerExitCode,
    getContainerInfo,
    getContainerStatus,
    getLabelSelector,
    getPodStartTime,
    ignoreNotFound,
    isNodeActive,
    isNotFoundError,
} from './utils';

const MANAGER_NAME = 'Farm';

const CLEANER_JOB_NAME = 'farm-cleaner';

const BUILDER_CONTAINER_NAME = 'builder';
const CLEANER_CONTAINER_NAME = 'cleaner';
const INSTANCE_CONTAINER_NAME = 'application';

const FARM_LABELS: K8sLabels = {
    'app.kubernetes.io/managed-by': MANAGER_NAME,
};
const CLEANER_LABELS: K8sLabels = {
    ...FARM_LABELS,
    jobgroup: CLEANER_JOB_NAME,
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

const generateBuilderPodName = (hash: string): string => {
    // Generate random string to avoid conflicts with other builder pods,
    // use 5 characters like in k8s for deployment pods
    return `${hash}-builder-${generateRandomString(5)}`;
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
    declare protected k8sBatch: k8s.BatchV1Api;
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
            disableCleaner: config.disableCleaner ?? false,
            cleanerNodesCountWatcherPeriodSeconds:
                config.cleanerNodesCountWatcherPeriodSeconds ?? 60,
            cleanerSchedule: config.cleanerSchedule ?? '0 3 * * *',
            cleanerRandomDelayMinutes: config.cleanerRandomDelayMinutes ?? 2 * 60,
            cleanerJobsHistoryLimit: config.cleanerJobsHistoryLimit ?? 5,
            cleanerPruneFilter: config.cleanerPruneFilter ?? 'until=24h',
        };

        const kubeConfig = new k8s.KubeConfig();
        kubeConfig.loadFromDefault();

        this.k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
        this.k8sApps = kubeConfig.makeApiClient(k8s.AppsV1Api);
        this.k8sNetworking = kubeConfig.makeApiClient(k8s.NetworkingV1Api);
        this.k8sBatch = kubeConfig.makeApiClient(k8s.BatchV1Api);
        this.k8sLog = new k8s.Log(kubeConfig);
    }

    async startup(): Promise<void> {
        if (!this.config.disableCleaner) {
            this.startCleaner();
        }

        return Promise.resolve();
    }

    async buildInstance(
        generateData: GenerateInstanceData,
        observer: SubscriptionObserver<InstanceObservableEmitValue>,
    ): Promise<void> {
        let builderInfo: K8sContainerInfo | undefined;

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
                builderInfo = await this.runBuilderContainer(
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
            let normalizedError = error;

            if (error instanceof k8s.HttpError) {
                // If builder pod is not found, it means that a build process was stopped
                // and we don't need to throw an error, because it's expected
                if (
                    isNotFoundError(error) &&
                    error.body.details?.kind === 'pods' &&
                    error.body.details?.name === builderInfo?.podName
                ) {
                    return;
                }

                // k8s client has own error message in body
                if (typeof error.body.message === 'string') {
                    normalizedError = new Error(error.body.message);
                }
            }

            observer.next({config: {status: 'errored'}});
            throw normalizedError;
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
        await this.stopInstanceContainer(hash);
    }

    async restartInstance(instance: Instance): Promise<void> {
        await this.stopInstance(instance.hash);
        await this.startInstance(instance);
    }

    async deleteInstance(hash: string): Promise<void> {
        await this.deleteBuilderContainer(hash);
        await this.deleteInstanceContainer(hash);
    }

    async getInstanceStatus(instance: Instance): Promise<InstanceProviderStatus> {
        const [deployment] = await this.listDeployments({hash: instance.hash});

        if (!deployment) {
            return 'unknown';
        }

        const [pod] = await this.listDeploymentPods(deployment);

        // If pod is not found, it means that instance is stopped
        if (!pod) {
            return 'stopped';
        }

        return mapToFarmStatus(getContainerStatus(pod, INSTANCE_CONTAINER_NAME));
    }

    async getInstances(): Promise<InstanceProviderInfo[]> {
        const deployments = await this.listDeployments(FARM_LABELS);

        return Promise.all(
            deployments.map<Promise<InstanceProviderInfo>>(async (deployment) => {
                const hash = this.getInstanceHash(deployment);
                const [pod] = await this.listDeploymentPods(deployment);

                return {
                    hash,
                    // If pod is not found, it means that instance is stopped
                    status: pod
                        ? mapToFarmStatus(getContainerStatus(pod, INSTANCE_CONTAINER_NAME))
                        : 'stopped',
                    startTime: pod ? getPodStartTime(pod) : 0,
                };
            }),
        );
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
        const {namespace} = this.config;
        const {hash} = generateData;
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
        const buildArgs = Object.entries(buildEnvVariables)
            .map(([key, value]) => `--build-arg ${key}='${value.replace(/'/g, "\\'")}'`)
            .join(' ');

        let buildSecretEnvVariableKeys: string[] = [];

        if (builderEnvSecretName !== null) {
            const {body: secret} = await this.k8sApi.readNamespacedSecret(
                builderEnvSecretName,
                namespace,
            );

            if (secret.data) {
                buildSecretEnvVariableKeys = Object.keys(secret.data);
            }
        }

        const buildSecrets = buildSecretEnvVariableKeys
            .map((key) => `--secret id=${key},env=${key}`)
            .join(' ');

        const vcs = getVcs(generateData.vcs);

        const builderPodSpec = this.getBuilderPodSpec({
            image: builderImage,
            envSecretName: builderEnvSecretName ?? undefined,
            resources: builderResources ?? undefined,
            containerName: BUILDER_CONTAINER_NAME,
            envVariables: buildEnvVariables,
            commands: [
                ...vcs.getK8sCheckoutCommands(generateData),
                `docker build . -f '${dockerfilePath}' -t ${targetImage} --network host ${buildArgs} ${buildSecrets}`,
                `docker push ${targetImage}`,
            ],
        });

        const {body: pod} = await this.k8sApi.createNamespacedPod(namespace, {
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: {
                name: generateBuilderPodName(hash),
                labels: {
                    ...FARM_LABELS,
                    type: 'builder',
                    hash,
                },
            },
            spec: {
                ...builderPodSpec,
                restartPolicy: 'Never',
            },
        });

        return getContainerInfo(pod, BUILDER_CONTAINER_NAME);
    }

    protected async deleteBuilderContainer(hash: string): Promise<void> {
        await this.deletePods({type: 'builder', hash});
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

        // Because we run only one pod for instance using replicas option above
        const [pod] = await this.waitForDeploymentPods(deployment, DEPLOYMENT_CREATION_TIMEOUT);

        if (!pod) {
            throw new Error(`No pods found for instance "${hash}"`);
        }

        return getContainerInfo(pod, INSTANCE_CONTAINER_NAME);
    }

    protected async stopInstanceContainer(hash: string): Promise<void> {
        const {deploymentName} = getInstanceResourceNames(hash);

        // Scale down deployment to 0 replicas to remove all pods
        await this.k8sApps
            .patchNamespacedDeployment(
                deploymentName,
                this.config.namespace,
                {spec: {replicas: 0}},
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                {headers: {'Content-type': k8s.PatchUtils.PATCH_FORMAT_STRATEGIC_MERGE_PATCH}},
            )
            .catch(ignoreNotFound);
    }

    protected async deleteInstanceContainer(hash: string): Promise<void> {
        const {namespace} = this.config;
        const {deploymentName, serviceName, ingressName} = getInstanceResourceNames(hash);

        await this.k8sApps
            .deleteNamespacedDeployment(deploymentName, namespace)
            .catch(ignoreNotFound);
        await this.k8sApi.deleteNamespacedService(serviceName, namespace).catch(ignoreNotFound);
        await this.k8sNetworking
            .deleteNamespacedIngress(ingressName, namespace)
            .catch(ignoreNotFound);
    }

    protected getInstanceHash(deployment: k8s.V1Deployment): string {
        const hash = deployment.metadata?.labels?.hash;

        if (!hash) {
            throw new Error(`Deployment "${deployment.metadata?.name}" has no hash label`);
        }

        return hash;
    }

    protected async readInstancePod(hash: string): Promise<k8s.V1Pod> {
        const [pod] = await this.listPods({type: 'instance', hash});

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

    protected async listDeploymentPods(deployment: k8s.V1Deployment): Promise<k8s.V1Pod[]> {
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
            () => this.listDeploymentPods(deployment),
            (pods) => pods.length > 0,
            timeout,
            period,
        );

        if (timedOut) {
            throw new Error(`Deployment "${deployment.metadata?.name}" creation is timed out`);
        }

        return currentPods;
    }

    protected async listDeployments(labels: K8sLabels): Promise<k8s.V1Deployment[]> {
        const {body: deployments} = await this.k8sApps.listNamespacedDeployment(
            this.config.namespace,
            undefined,
            undefined,
            undefined,
            undefined,
            getLabelSelector(labels),
        );

        return deployments.items.filter((deployment) => !deployment.metadata?.deletionTimestamp);
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

    protected async deletePods(labels: K8sLabels): Promise<void> {
        await this.k8sApi.deleteCollectionNamespacedPod(
            this.config.namespace,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            getLabelSelector(labels),
        );
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

    protected startCleaner(): void {
        this.farmInternalApi.log('Start cleaner: start');

        const performNodesCount = async () => {
            try {
                this.farmInternalApi.log('Perform nodes count: start');

                const {body: nodes} = await this.k8sApi.listNode();
                const activeNodes = nodes.items.filter(isNodeActive);
                this.farmInternalApi.log('Perform nodes count: got nodes', {
                    totalNodesCount: nodes.items.length,
                    activeNodesCount: activeNodes.length,
                });

                this.farmInternalApi.log('Perform nodes count: update cleaner job');
                await this.updateCleanerJob(activeNodes.length);

                this.farmInternalApi.log('Perform nodes count: end');
            } catch (error) {
                this.farmInternalApi.logError(
                    'Perform nodes count: error',
                    wrapInternalError(error),
                );
            } finally {
                setTimeout(
                    performNodesCount,
                    this.config.cleanerNodesCountWatcherPeriodSeconds * 1000,
                );
                this.farmInternalApi.log('Perform nodes count: scheduled');
            }
        };

        performNodesCount().catch((error) => {
            this.farmInternalApi.logError('Start cleaner: error', wrapInternalError(error));
        });
        this.farmInternalApi.log('Start cleaner: end');
    }

    protected async updateCleanerJob(activeNodesCount: number): Promise<void> {
        const {
            namespace,
            cleanerSchedule,
            cleanerRandomDelayMinutes,
            cleanerJobsHistoryLimit,
            cleanerPruneFilter,
            builderImage,
        } = this.config;

        const randomDelay = Math.floor(Math.random() * cleanerRandomDelayMinutes * 60);

        const builderPodSpec = this.getBuilderPodSpec({
            image: builderImage,
            containerName: CLEANER_CONTAINER_NAME,
            commands: [
                `sleep ${randomDelay}`,
                `docker system prune --force --filter '${cleanerPruneFilter}'`,
            ],
        });

        const cronJob: k8s.V1CronJob = {
            apiVersion: 'batch/v1',
            kind: 'CronJob',
            metadata: {
                name: CLEANER_JOB_NAME,
                labels: CLEANER_LABELS,
            },
            spec: {
                schedule: cleanerSchedule,
                successfulJobsHistoryLimit: cleanerJobsHistoryLimit,
                failedJobsHistoryLimit: cleanerJobsHistoryLimit,
                jobTemplate: {
                    spec: {
                        template: {
                            metadata: {
                                labels: {
                                    ...CLEANER_LABELS,
                                    type: 'cleaner',
                                },
                            },
                            spec: {
                                ...builderPodSpec,
                                restartPolicy: 'Never',
                                terminationGracePeriodSeconds: 0,
                                // `topologySpreadConstraints` allows the cleanup job to be evenly distributed across the cluster nodes,
                                // the number of pods for the job is set by the `parallelism` setting,
                                // which equals the number of active nodes in the cluster.
                                // In combination, this ensures that the cleanup job runs on each node in the cluster.
                                topologySpreadConstraints: [
                                    {
                                        maxSkew: 1,
                                        topologyKey: 'kubernetes.io/hostname',
                                        whenUnsatisfiable: 'DoNotSchedule',
                                        labelSelector: {
                                            matchLabels: CLEANER_LABELS,
                                        },
                                    },
                                ],
                            },
                        },
                        parallelism: activeNodesCount,
                    },
                },
                // Prevents the simultaneous execution of multiple cleanup jobs at the same time
                concurrencyPolicy: 'Forbid',
            },
        };

        await this.k8sBatch.patchNamespacedCronJob(
            CLEANER_JOB_NAME,
            namespace,
            cronJob,
            undefined,
            undefined,
            MANAGER_NAME,
            undefined,
            true,
            // This makes the operation an upsert
            {headers: {'Content-type': k8s.PatchUtils.PATCH_FORMAT_APPLY_YAML}},
        );
    }

    protected getBuilderPodSpec(
        spec: K8sBuilderPodSpec,
    ): Pick<k8s.V1PodSpec, 'containers' | 'volumes'> {
        const {dockerSocketHostPath, dockerCredsHostPath} = this.config;
        const {containerName, image, envSecretName, resources, envVariables, commands} = spec;

        return {
            containers: [
                {
                    name: containerName,
                    image,
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
                    ...(envSecretName ? {envFrom: [{secretRef: {name: envSecretName}}]} : {}),
                    env: envVariables ? buildK8sEnvVariables(envVariables) : undefined,
                    command: ['/bin/sh', '-c'],
                    args: [['set -ex', ...commands].join('\n')],
                    resources,
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
        };
    }
}
