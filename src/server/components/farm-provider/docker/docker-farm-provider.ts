import nodeFs from 'node:fs';
import nodePath from 'node:path';

import Docker, {type RegistryConfig} from 'dockerode';
import type {SubscriptionObserver} from 'observable-fns';

import type {
    Instance,
    InstanceProviderInfo,
    InstanceProviderStatus,
    Output,
} from '../../../../shared/common';
import {WORKDIR_PATH} from '../../../constants';
import type {GenerateInstanceData, InstanceObservableEmitValue} from '../../../models/common';
import {generateInstanceHref, getProjectFarmConfig, sleep} from '../../../utils/common';
import {buildEnvVariablesStrPairArr, buildInheritedEnv} from '../../../utils/envHelpers';
import {getInstanceConfig, readConfigFile} from '../../../utils/farmJsonConfig';
import {removeDirectory} from '../../../utils/files';
import {type HealthcheckInstance, HealthcheckManager} from '../../../utils/healthcheck';
import {ping} from '../../../utils/ping';
import {normalizeInstanceProviderStatus} from '../../../utils/status';
import {getVcs} from '../../../utils/vcs';
import type {FarmInternalApi, LogParams} from '../base-provider';
import {BaseFarmProvider} from '../base-provider';

import {
    DOCKER_PROXY_HOST,
    DOCKER_PROXY_PORT,
    DockerContainerState,
    FARM_DOCKER_ENTITY_PREFIX,
} from './constants';
import type {FarmDockerProviderConfig} from './types';
import {CronJob, validateCronExpression} from 'cron';

const DockerStateToInstanceStatusMap: Record<DockerContainerState, InstanceProviderStatus> = {
    created: 'starting',
    restarting: 'starting',
    running: 'running',
    removing: 'stopped',
    paused: 'stopped',
    exited: 'stopped',
    dead: 'errored',
};

export class DockerFarmProvider extends BaseFarmProvider {
    declare protected config: Required<FarmDockerProviderConfig>;

    protected docker: Docker | null = null;
    declare protected healthcheckManager: HealthcheckManager;

    declare protected buildingInstances: Map<string, AbortController>;

    constructor(farmInternalApi: FarmInternalApi, config: FarmDockerProviderConfig) {
        super(farmInternalApi);

        this.buildingInstances = new Map();

        this.config = {
            network: config.network,
            socketPath: config?.socketPath ?? '/var/run/docker.sock',
            instanceHealthcheck: {
                port: config?.instanceHealthcheck?.port ?? 80,
                path: config?.instanceHealthcheck?.path ?? '/',
            },
            imageBuildVersion: config?.imageBuildVersion ?? '1',
            maintenanceCronTime: this.parseMaintenanceCronTime(config?.maintenanceCronTime),
        };

        this.healthcheckManager = new HealthcheckManager({
            checkHealth: this.checkHealth.bind(this),
            getInstances: this.getHealthcheckInstances.bind(this),
            log: this.farmInternalApi.log,
            logError: this.farmInternalApi.logError,
        });
    }

    startup(): Promise<void> {
        this.healthcheckManager.startup();
        this.scheduleMaintenance();

        return Promise.resolve();
    }

    private parseMaintenanceCronTime(expression?: string): string {
        const defaultMaintenanceCronTime = '0 3 * * *'; // everyday in 3 am
        if (!expression) {
            return defaultMaintenanceCronTime;
        }

        const validationResult = validateCronExpression(expression);
        if (!validationResult.valid) {
            this.farmInternalApi.logError(
                'maintenanceCronTime validation error, using default expression',
                validationResult.error,
            );
            return defaultMaintenanceCronTime;
        }

        return expression;
    }

    private scheduleMaintenance(): void {
        const logScheduleDateTime = () =>
            this.farmInternalApi.log(`next maintenance scheduled on ${job.nextDate().toString()}`);
        const job = CronJob.from({
            cronTime: this.config.maintenanceCronTime,
            onTick: async () => {
                this.farmInternalApi.log('maintenance started');

                await this.pruneDanglingImages();
                logScheduleDateTime();
            },
            waitForCompletion: true,
            start: true,
        });

        logScheduleDateTime();
    }

    private async pruneDanglingImages(): Promise<void> {
        try {
            this.farmInternalApi.log('pruning dangling images');
            const docker = this.getDocker();
            const {ImagesDeleted} = await docker.pruneImages({
                filter: {
                    until: '24h',
                },
            });
            if (Array.isArray(ImagesDeleted) && ImagesDeleted.length > 0) {
                this.farmInternalApi.log(
                    `pruning complete, removed ${ImagesDeleted.length} dangling images`,
                    {imageIds: ImagesDeleted.map(({Deleted}) => Deleted)},
                );
            } else {
                this.farmInternalApi.log('pruning complete, dangling images not found');
            }
        } catch (error) {
            this.farmInternalApi.logError(
                'unexpected error on attempt to prune dangling images',
                error,
            );
        }
    }

    protected async checkHealth(hash: string, signal: AbortSignal): Promise<boolean> {
        const instance = await this.farmInternalApi.getExternalInstance(hash);

        if (!instance) {
            throw new Error(`Instance with hash "${hash}" not found`);
        }

        const instancePath = this.getInstanceFullPath(hash, instance.project);
        const projectConfig = await readConfigFile(instancePath);

        if (!projectConfig) {
            throw new Error('config file not found');
        }

        const instanceConfig = getInstanceConfig(
            projectConfig,
            instance.instanceConfigName,
        ).preview!;

        const {dockerInstanceHealthcheck = this.config.instanceHealthcheck} = instanceConfig;

        if (process.env.APP_DEV_MODE) {
            const instanceHost = new URL(
                generateInstanceHref({
                    project: instance.project,
                    hash,
                    urlTemplate: instance.urlTemplate,
                }),
            ).host;

            return ping({
                signal,
                host: DOCKER_PROXY_HOST,
                port: DOCKER_PROXY_PORT,
                headers: {
                    host: instanceHost,
                },
                path: dockerInstanceHealthcheck.path,
            });
        }

        return ping({
            signal,
            host: this.getEntityName(hash),
            port: dockerInstanceHealthcheck.port,
            path: dockerInstanceHealthcheck.path,
        });
    }

    // TODO(golbahsg, hc): Try to merge with getInstances method
    protected async getHealthcheckInstances(): Promise<HealthcheckInstance[]> {
        const docker = this.getDocker();
        const containers = await docker.listContainers({all: true});

        return containers
            .map((container) => {
                const containerName = container.Names[0].substring(1);

                if (!this.isEntityName(containerName)) {
                    return null;
                }

                const status = this.mapDockerStatusToInternal(
                    container.State as DockerContainerState,
                );

                const hash = this.getHashFromEntityName(containerName);

                // skip docker proxy container to healthcheck
                // allow "unsafe" comparing
                // eslint-disable-next-line security/detect-possible-timing-attacks
                if (hash === 'proxy') {
                    return null;
                }

                return {
                    key: hash,
                    isRunning: status === 'running',
                    // TODO(golbahsg, hc): Add config from farm.json
                    config: this.config.instanceHealthcheck,
                };
            })
            .filter((item) => item !== null);
    }

    protected getDocker(): Docker {
        if (this.docker) {
            return this.docker;
        }

        this.docker = new Docker({
            socketPath: this.config.socketPath,
        });

        return this.docker;
    }

    protected getRegistryConfig(): RegistryConfig | undefined {
        const dockerAuthConfigPath =
            process.env.DOCKER_AUTH_CONFIG_FILE_PATH ??
            nodePath.join(process.env.HOME ?? '/root', './.docker/config.json');
        const configFileString = nodeFs.readFileSync(dockerAuthConfigPath, 'utf-8');
        const configFile: {auths?: Record<string, {auth: string} | undefined>} =
            JSON.parse(configFileString);
        if (!configFile.auths) {
            return undefined;
        }

        let registry: string | undefined;
        let username: string | undefined;
        let password: string | undefined;

        Object.entries(configFile.auths).forEach(([registryHost, tokenData]) => {
            if (tokenData?.auth && !registry) {
                registry = registryHost;
                [username, password] = Buffer.from(tokenData.auth, 'base64').toString().split(':');
            }
        });

        if (registry && username && password) {
            return {
                [registry]: {
                    username,
                    password,
                },
            };
        }

        return undefined;
    }

    protected mapStreamResToOutput(
        res: {stream?: string; error?: string; id?: string; aux?: string}[],
    ): Output[] {
        return res.map((o) => ({
            stdout:
                o.stream ||
                (o.id === 'moby.buildkit.trace' && o.aux
                    ? Buffer.from(o.aux, 'base64').toString('utf8')
                    : undefined) ||
                JSON.stringify(o),
            code: null,
            command: null,
            stderr: o.error ?? null,
            duration: null,
        }));
    }

    /**
     * @param hash - instance hash
     * @returns Path to instance root directory (**mono repo excluded**)
     */
    protected getInstanceRootPath(hash: string): string {
        return `${WORKDIR_PATH}/${hash}`;
    }

    /**
     * @param hash - instance hash
     * @param project - instance project
     * @returns Path to instance directory **with mono repo**
     */
    protected getInstanceFullPath(hash: string, project: string): string {
        const projectFarmConfig = getProjectFarmConfig(project);
        let instancePath = this.getInstanceRootPath(hash);

        if (projectFarmConfig.monoRepoPath) {
            instancePath = nodePath.join(instancePath, projectFarmConfig.monoRepoPath);
        }

        return instancePath;
    }

    async buildInstance(
        instance: GenerateInstanceData,
        observer: SubscriptionObserver<InstanceObservableEmitValue>,
    ): Promise<void> {
        const {
            project,
            vcs: projectVcs,
            branch,
            envVariables,
            runEnvVariables,
            hash,
            instanceConfigName,
        } = instance;

        const vcs = getVcs(projectVcs);

        const instancePath = this.getInstanceFullPath(hash, project);

        const handleOutput = (output: Output) => {
            observer.next({output: [output]});
        };

        const saveCurrentTaskPid = (pid: number) => {
            observer.next({pid});
        };

        try {
            const containerNetwork = this.config.network;
            if (!containerNetwork) {
                const err = new Error('Docker network is not defined! Stop build...');
                observer.next({
                    output: [
                        {
                            stdout: err.message,
                            code: null,
                            command: null,
                            stderr: null,
                            duration: null,
                        },
                    ],
                });
                throw err;
            }

            observer.next({
                output: [
                    {stdout: 'Prepare...', code: null, command: null, stderr: null, duration: null},
                ],
            });

            // 0. Remove instance directory if it already exists
            // deleting instance root directory
            await removeDirectory(this.getInstanceRootPath(hash), handleOutput, saveCurrentTaskPid);
            await this.deleteInstance(hash);

            // creating new abort controller for building instance
            const abortController = new AbortController();
            this.buildingInstances.set(hash, abortController);

            observer.next({
                output: [
                    {
                        stdout: 'Fetch code...',
                        code: null,
                        command: null,
                        stderr: null,
                        duration: null,
                    },
                ],
            });
            // 1. Clone repository
            const cloneOutput = await vcs.checkout({
                instanceDir: hash,
                project,
                branch,
            });
            observer.next({output: cloneOutput});

            const farmConfig = await readConfigFile(instancePath);
            if (!farmConfig) {
                throw new Error('config file not found');
            }

            const farmInstanceConfig = getInstanceConfig(farmConfig, instanceConfigName);

            const {command: startCommand, args: startCommandArgs} =
                farmInstanceConfig.preview?.start || {};

            const envSpec = farmInstanceConfig.preview?.env ?? {};
            const runEnvSpec = farmInstanceConfig.preview?.runEnv ?? {};
            const inheritedEnv = farmInstanceConfig.preview?.envInheritance
                ? buildInheritedEnv(farmInstanceConfig.preview?.envInheritance)
                : {};
            const buildEnv = {...inheritedEnv, ...envSpec, ...envVariables};
            const runEnv = {...buildEnv, ...runEnvSpec, ...runEnvVariables};

            const containerRunEnvArray = buildEnvVariablesStrPairArr(runEnv, {
                noWrap: true,
            });
            const dockerFilePath = farmInstanceConfig.preview?.dockerfilePath;
            const dockerFileContextPath = farmInstanceConfig?.preview?.dockerfileContextPath ?? '.';

            if (!dockerFilePath) {
                throw new Error('dockerfile path not found');
            }

            const dockerFileContextFullPath = nodePath.join(instancePath, dockerFileContextPath);

            const docker = this.getDocker();
            const contextFiles = nodeFs.readdirSync(dockerFileContextFullPath);

            const entityName = this.getEntityName(hash);

            observer.next({
                output: [
                    {
                        stdout: 'Building docker image...',
                        code: null,
                        command: null,
                        stderr: null,
                        duration: null,
                    },
                ],
            });

            if (farmInstanceConfig.preview?.buildTimeout) {
                sleep(farmInstanceConfig.preview?.buildTimeout).then(() => {
                    abortController.abort();
                });
            }

            const buildStream = await docker.buildImage(
                {
                    context: dockerFileContextFullPath,
                    src: [dockerFilePath, ...contextFiles],
                },
                {
                    t: entityName,
                    dockerfile: dockerFilePath,
                    buildargs: buildEnv,
                    networkmode: 'host',
                    forcerm: true,
                    registryconfig: this.getRegistryConfig(),
                    abortSignal: abortController.signal,
                    version: this.config.imageBuildVersion,
                },
            );

            await new Promise<void>((resolve, reject) => {
                docker.modem.followProgress(
                    buildStream,
                    (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    },
                    (result: {stream: string; error?: string}) => {
                        observer.next({output: this.mapStreamResToOutput([result])});
                        if (result.error) {
                            reject(result.error);
                        }
                    },
                );
            });

            // check finished image, cuz docker modem do not reject on failed build
            await docker
                .getImage(entityName)
                .inspect()
                .catch((err) => {
                    if (err instanceof Error && err.message.includes('No such image')) {
                        throw new Error('Image build failed? Image not found...');
                    }
                    throw err;
                });

            observer.next({
                output: [
                    {
                        stdout: 'Running docker container...',
                        code: null,
                        command: null,
                        stderr: null,
                        duration: null,
                    },
                ],
                config: {status: 'generated'},
            });
            const cmd = [];
            if (startCommand) {
                cmd.push(startCommand);
            }
            if (startCommandArgs) {
                cmd.push(startCommandArgs);
            }
            const containerCmd = cmd.length ? cmd : undefined;

            const startAbortController = new AbortController();

            if (farmInstanceConfig.preview?.startInstanceTimeout) {
                sleep(farmInstanceConfig.preview.startInstanceTimeout).then(() => {
                    startAbortController.abort();
                });
            }

            const container = await docker.createContainer({
                Image: entityName,
                name: entityName,
                NetworkingConfig: {
                    EndpointsConfig: {
                        farm: {
                            NetworkID: containerNetwork,
                        },
                    },
                },
                Env: containerRunEnvArray,
                Cmd: containerCmd,
                abortSignal: startAbortController.signal,
            });
            await container.start();

            observer.next({
                output: [
                    {stdout: 'Done!', code: null, command: null, stderr: null, duration: null},
                ],
            });
        } catch (error) {
            observer.next({config: {status: 'errored'}});

            throw error;
        } finally {
            // removing AbortController for build process
            this.buildingInstances.delete(hash);
        }
    }

    async stopBuilder(hash: string) {
        if (this.buildingInstances.has(hash)) {
            this.buildingInstances.get(hash)?.abort();
            this.buildingInstances.delete(hash);
        }

        return Promise.resolve();
    }

    async startInstance(instance: Pick<Instance, 'hash'>): Promise<void> {
        const docker = this.getDocker();
        const container = docker.getContainer(this.getEntityName(instance.hash));
        await container.start();
    }

    async stopInstance(hash: string): Promise<void> {
        try {
            const docker = this.getDocker();
            const container = docker.getContainer(this.getEntityName(hash));
            await container.stop();
        } catch {}
    }

    async deleteInstance(hash: string): Promise<void> {
        try {
            await this.stopBuilder(hash);

            const docker = this.getDocker();
            const container = docker.getContainer(this.getEntityName(hash));
            try {
                const containerInspection = await container.inspect();
                if (containerInspection.State.Status === DockerContainerState.Running) {
                    await container.stop();
                }
            } catch (err) {
                console.log('container stopping error', {
                    err,
                });
            }
            await container.remove({force: true});
            await docker.getImage(this.getEntityName(hash)).remove();

            try {
                const instancePath = this.getInstanceRootPath(hash);
                await removeDirectory(instancePath);
            } catch (err) {
                console.log('instance folder deleting err', {
                    err,
                });
            }
        } catch (err) {
            console.log('container deleting err', {
                err,
            });
        }
    }

    async restartInstance(instance: Pick<Instance, 'hash'>): Promise<void> {
        await this.stopInstance(instance.hash);
        await this.startInstance(instance);
    }

    async getInstanceLogs(params: {
        hash: string;
        stdout?: LogParams | undefined;
        stderr?: LogParams | undefined;
    }): Promise<{stdout?: string | undefined; stderr?: string | undefined}> {
        const docker = this.getDocker();
        const {
            hash,
            stdout: {
                disabled: stdoutDisabled = false,
                filter: stdoutFilter,
                maxLines: stdoutLimit,
            } = {},
            stderr: {
                disabled: stderrDisabled = false,
                filter: stderrFilter,
                maxLines: stderrLimit,
            } = {},
        } = params;

        const stdoutEnabled = !stdoutDisabled;
        const stderrEnabled = !stderrDisabled;

        let stdout: string | undefined;
        let stderr: string | undefined;

        const container = docker.getContainer(this.getEntityName(hash));

        if (stdoutEnabled) {
            const buffer = await container.logs({
                stdout: true,
                stderr: false,
                timestamps: true,
                tail: stdoutLimit,
            });

            stdout = buffer.toString('utf-8');
            if (stdoutFilter) {
                stdout = this.filterLogs(stdout, stdoutFilter);
            }
        }

        if (stderrEnabled) {
            const buffer = await container.logs({
                stdout: false,
                stderr: true,
                timestamps: true,
                tail: stderrLimit,
            });

            stderr = buffer.toString('utf-8');
            if (stderrFilter) {
                stderr = this.filterLogs(stderr, stderrFilter);
            }
        }

        return {stderr, stdout};
    }

    protected filterLogs(logs: string, filter: string): string {
        return logs
            .split('\n')
            .filter((line) => line.includes(filter))
            .join('\n');
    }

    async getInstanceStatus(instance: Instance): Promise<InstanceProviderStatus> {
        const docker = this.getDocker();
        const [container] = await docker.listContainers({
            all: true,
            filters: {name: [this.getEntityName(instance.hash)]},
            limit: 1,
        });

        if (!container) {
            return 'unknown';
        }

        return normalizeInstanceProviderStatus(
            this.mapDockerStatusToInternal(container.State as DockerContainerState),
            this.healthcheckManager.getStatus(instance.hash),
        );
    }

    async getInstances(): Promise<InstanceProviderInfo[]> {
        const docker = this.getDocker();
        const list = await docker.listContainers({all: true});

        const statusList = await Promise.all(
            list.map((container) => {
                const containerName = container.Names[0].substring(1);

                if (!this.isEntityName(containerName)) {
                    return null;
                }

                const info: InstanceProviderInfo = {
                    hash: this.getHashFromEntityName(containerName),
                    status: this.mapDockerStatusToInternal(container.State as DockerContainerState),
                    // will be got further
                    startTime: 0,
                };

                // skip inspection for non-running
                // skip inspection for docker proxy
                if (info.status !== 'running' || info.hash === 'proxy') {
                    return info;
                }

                // inspect container to get launch time
                return docker
                    .getContainer(containerName)
                    .inspect()
                    .then((inspection) => {
                        const startedAt = new Date(inspection.State.StartedAt);

                        return {
                            ...info,
                            status: normalizeInstanceProviderStatus(
                                info.status,
                                this.healthcheckManager.getStatus(info.hash),
                            ),
                            startTime: startedAt.getTime(),
                        } satisfies typeof info;
                    });
            }),
        );

        return statusList.filter((status) => status !== null);
    }

    protected mapDockerStatusToInternal(state: DockerContainerState): InstanceProviderStatus {
        return DockerStateToInstanceStatusMap[state] ?? 'unknown';
    }

    protected getEntityName(hash: string) {
        return `${FARM_DOCKER_ENTITY_PREFIX}${hash}`;
    }

    protected isEntityName(name: string) {
        return name.startsWith(FARM_DOCKER_ENTITY_PREFIX);
    }

    protected getHashFromEntityName(name: string) {
        return name.substring(FARM_DOCKER_ENTITY_PREFIX.length);
    }
}
