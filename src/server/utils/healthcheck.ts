import {pick} from 'lodash';
import defaults from 'lodash/defaults';

import {type ErrLogger, type Logger} from '../components/node-kit';

import {wrapInternalError} from './common';

export type HealthcheckStatus = 'healthy' | 'unhealthy' | 'unknown';

export interface HealthcheckConfig {
    initialDelaySeconds?: number;
    periodSeconds?: number;
    timeoutSeconds?: number;
    successThreshold?: number;
    failureThreshold?: number;
}

interface HealthcheckState {
    currentTimer: ReturnType<typeof setTimeout> | null;
    consecutiveSuccess: number;
    consecutiveFailure: number;
}

interface HealthcheckEntry {
    config: Required<HealthcheckConfig>;
    state: HealthcheckState;
}

export interface HealthcheckInstance {
    key: string;
    config?: HealthcheckConfig;
    isRunning: boolean;
}

export interface GetHealthcheckInstances {
    (): Promise<HealthcheckInstance[]>;
}

export interface HealthcheckManagerConfig {
    checkHealth: (key: string, signal: AbortSignal) => Promise<boolean>;
    getInstances: GetHealthcheckInstances;
    log: Logger;
    logError: ErrLogger;
    performInstancesPeriodSeconds?: number;
}

const DEFAULT_HEALTHCHECK_CONFIG = {
    initialDelaySeconds: 10,
    periodSeconds: 10,
    timeoutSeconds: 3,
    successThreshold: 1,
    failureThreshold: 3,
} satisfies HealthcheckConfig;

const createHealthCheckState = (): HealthcheckState => {
    return {
        currentTimer: null,
        consecutiveSuccess: 0,
        consecutiveFailure: 0,
    };
};

export class HealthcheckManager {
    declare private config: Required<HealthcheckManagerConfig>;

    declare private entries: Map<string, HealthcheckEntry>;

    declare private log: HealthcheckManagerConfig['log'];

    declare private logError: HealthcheckManagerConfig['logError'];

    constructor(config: HealthcheckManagerConfig) {
        this.config = {
            checkHealth: config.checkHealth,
            getInstances: config.getInstances,
            log: config.log,
            logError: config.logError,
            performInstancesPeriodSeconds: config.performInstancesPeriodSeconds ?? 10,
        };

        this.log = config.log;
        this.logError = config.logError;

        this.entries = new Map();
    }

    startup() {
        this.log('Healthcheck Manager startup');
        const performInstances = async () => {
            try {
                this.log('healthcheck perform instances start');
                const instances = await this.config.getInstances();
                this.log('healthcheck perform instances end', {
                    count: instances.length,
                    instances: instances.map((instance) => pick(instance, ['key', 'isRunning'])),
                });
                instances.forEach((instance) => {
                    if (instance.isRunning) {
                        this.register(instance.key, instance.config);
                    } else {
                        this.log('healthcheck: instance is not running', {
                            instance,
                        });
                        this.unregister(instance.key);
                    }
                });
            } catch (err) {
                this.logError('healthcheck performInstances err', wrapInternalError(err));
            } finally {
                setTimeout(performInstances, this.config.performInstancesPeriodSeconds * 1000);
                this.log('healthcheck perform instances scheduled');
            }
        };

        performInstances().catch((err) => {
            this.logError(
                'healthcheck startup: unexpected error from perform instances',
                wrapInternalError(err),
            );
        });
    }

    getStatus(key: string): HealthcheckStatus {
        const entry = this.entries.get(key);

        if (!entry) {
            return 'unknown';
        }

        const {config, state} = entry;

        if (state.consecutiveSuccess >= config.successThreshold) {
            return 'healthy';
        }

        if (state.consecutiveFailure >= config.failureThreshold) {
            return 'unhealthy';
        }

        return 'unknown';
    }

    private register(key: string, config?: HealthcheckConfig): void {
        const prevEntry = this.entries.get(key);

        this.entries.set(key, {
            config: defaults(config, DEFAULT_HEALTHCHECK_CONFIG),
            state: prevEntry ? prevEntry.state : createHealthCheckState(),
        });

        if (!prevEntry) {
            this.startHealthcheck(key);
        }
    }

    private unregister(key: string): void {
        this.stopHealthcheck(key);
        this.entries.delete(key);
    }

    private startHealthcheck(key: string): void {
        let entry: HealthcheckEntry | undefined = this.entries.get(key);

        if (!entry) {
            return;
        }

        const performHealthcheck = async () => {
            entry = this.entries.get(key);

            if (!entry) {
                return;
            }

            entry.state.currentTimer = null;

            this.log('healthcheck perform healthcheck: start', {
                key,
            });

            try {
                const isHealthy = await this.config.checkHealth(
                    key,
                    AbortSignal.timeout(entry.config.timeoutSeconds * 1000),
                );

                this.log('healthcheck perform healthcheck: done', {
                    key,
                    isHealthy,
                });
                this.updateState(key, isHealthy);
            } catch (err) {
                this.logError('healthcheck perform err', wrapInternalError(err), {
                    key,
                });
                this.updateState(key, false);
            } finally {
                entry = this.entries.get(key);

                if (entry) {
                    entry.state.currentTimer = setTimeout(
                        performHealthcheck,
                        entry.config.periodSeconds * 1000,
                    );
                }
            }
        };

        entry.state.currentTimer = setTimeout(
            performHealthcheck,
            entry.config.initialDelaySeconds * 1000,
        );
    }

    private stopHealthcheck(key: string): void {
        const entry = this.entries.get(key);

        if (entry?.state.currentTimer) {
            clearTimeout(entry.state.currentTimer);
            entry.state.currentTimer = null;
        }
    }

    private updateState(key: string, isHealthy: boolean): void {
        const entry = this.entries.get(key);

        if (!entry) {
            return;
        }

        const {config, state} = entry;

        if (isHealthy) {
            state.consecutiveSuccess = Math.min(
                state.consecutiveSuccess + 1,
                config.successThreshold,
            );
            state.consecutiveFailure = 0;
        } else {
            state.consecutiveFailure = Math.min(
                state.consecutiveFailure + 1,
                config.failureThreshold,
            );
            state.consecutiveSuccess = 0;
        }
    }
}
