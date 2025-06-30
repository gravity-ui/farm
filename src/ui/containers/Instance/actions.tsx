import React, {useCallback} from 'react';

import {useDataManager} from '@gravity-ui/data-source';
import {Icon} from '@gravity-ui/uikit';
import type {AxiosError} from 'axios';

import type {
    DeleteInstanceRequest,
    DeleteInstanceResponse,
} from '../../../shared/api/deleteInstance';
import type {GenerateInstanceRequest, GenerateInstanceResponse} from '../../../shared/api/generate';
import type {
    GetInstanceProviderStatusRequest,
    GetInstanceProviderStatusResponse,
} from '../../../shared/api/getInstanceProviderStatus';
import type {
    RestartInstanceRequest,
    RestartInstanceResponse,
} from '../../../shared/api/restartInstance';
import type {StartInstanceRequest, StartInstanceResponse} from '../../../shared/api/startInstance';
import type {StopInstanceRequest, StopInstanceResponse} from '../../../shared/api/stopInstance';
import type {Instance, InstanceWithProviderStatus} from '../../../shared/common';
import {getInstanceSource, listInstancesSource} from '../../data-sources';
import api from '../../services/api';
import {handleRequestErrorWithToast, toaster} from '../../services/toaster';
import {
    generateInstanceHref,
    getProjectFarmConfig,
    omitNullable,
    prepareEnvVariables,
    sleep,
} from '../../utils/common';
import {InstanceIconsMap} from '../../utils/iconsMap';
import {prepareGenerateInstanceRequest} from '../../utils/prepareGenerateInstanceRequest';

import {i18n} from './i18n';

export const waitForRunning = async (hash: string) => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const result = await api.request<
                GetInstanceProviderStatusRequest,
                GetInstanceProviderStatusResponse
            >({
                action: 'getInstanceProviderStatus',
                data: {hash},
            });
            const status = result?.status || 'unknown';

            if (status === 'running') {
                return;
            }
        } catch {}
        await sleep(1000);
    }
};

const DEFAULT_START_DELAY = 3000; // 3 seconds;

const toast = (props: {title?: string; content?: string; theme?: 'danger' | 'success'}) => {
    toaster.add({
        name: 'action-notification',
        ...props,
        theme: props.theme || 'success',
    });
};

export const useInstanceActions = () => {
    const dataManager = useDataManager();
    const invalidateInstances = useCallback(() => {
        dataManager.invalidateSource(listInstancesSource).catch(() => {});
        dataManager.invalidateSource(getInstanceSource).catch(() => {});
    }, [dataManager]);

    const stopInstance = async (instance: Instance) => {
        const {hash} = instance;
        await api.request<StopInstanceRequest, StopInstanceResponse>({
            action: 'stopInstance',
            data: {hash},
        });

        toast({title: i18n('stopping')});
        invalidateInstances();
    };

    const startInstance = async (instance: Instance, restart = false) => {
        const {hash, project} = instance;
        const action = restart ? 'restartInstance' : 'startInstance';
        if (restart && !window.confirm(i18n('restart-confirm'))) {
            return;
        }

        await api
            .request<
                StartInstanceRequest | RestartInstanceRequest,
                StartInstanceResponse | RestartInstanceResponse
            >({action, data: {hash}})
            .catch((error) => {
                handleRequestErrorWithToast(error);
                throw error;
            })
            .then(() => {
                toast({
                    title: restart ? i18n('restarting') : i18n('starting'),
                });
            });

        const delay = getProjectFarmConfig(project).autoStartDelay || DEFAULT_START_DELAY;
        await Promise.race([sleep(delay), waitForRunning(hash)]);

        invalidateInstances();
    };

    const deleteInstance = async (instance: Instance) => {
        if (!window.confirm(i18n('delete-confirm'))) {
            return;
        }

        const {hash} = instance;

        await api.request<DeleteInstanceRequest, DeleteInstanceResponse>({
            action: 'deleteInstance',
            data: {hash},
        });

        toast({title: i18n('deleting')});
        invalidateInstances();
    };

    const rebuildInstance = async (data: Instance) => {
        if (!window.confirm(i18n('rebuild-confirm'))) {
            return;
        }

        const request = {
            ...omitNullable(data),
            ...prepareEnvVariables(data.envVariables, data.runEnvVariables),
        };

        try {
            await api.request<GenerateInstanceRequest, GenerateInstanceResponse>({
                action: 'generate',
                data: prepareGenerateInstanceRequest(request),
            });

            toast({title: i18n('rebuilding')});
            invalidateInstances();
        } catch (e) {
            handleRequestErrorWithToast(e as AxiosError<{message: string}>);
        }
    };

    return {
        stopInstance,
        startInstance,
        deleteInstance,
        rebuildInstance,
    };
};

export type InstanceAvailableAction = {
    icon: React.ReactNode;
    text: string;
    theme?: 'danger';
    handler: () => void;
    href?: string;
};

interface UseInstanceAvailableActionsProps {
    iconSize?: number;
}

export const useInstanceAvailableActions = ({iconSize}: UseInstanceAvailableActionsProps = {}): ((
    instance: InstanceWithProviderStatus,
) => InstanceAvailableAction[]) => {
    const {stopInstance, startInstance, deleteInstance, rebuildInstance} = useInstanceActions();

    const getActions = useCallback(
        (instance: InstanceWithProviderStatus) => {
            const actions: InstanceAvailableAction[] = [];
            const isStopped = instance.providerStatus === 'stopped';

            if (instance.status === 'generated') {
                if (!isStopped) {
                    actions.push({
                        text: i18n('go-to-instance'),
                        href: generateInstanceHref({
                            project: instance.project,
                            hash: instance.hash,
                            urlTemplate: instance.urlTemplate,
                        }),
                        handler: () => {},
                        icon: <Icon data={InstanceIconsMap.GoToInstance} size={iconSize} />,
                    });
                    actions.push({
                        text: i18n('stop'),
                        handler: () => stopInstance(instance),
                        icon: <Icon data={InstanceIconsMap.StopInstance} size={iconSize} />,
                    });
                }

                actions.push({
                    text: isStopped ? i18n('start') : i18n('restart'),
                    handler: () => startInstance(instance, !isStopped),
                    icon: isStopped ? (
                        <Icon data={InstanceIconsMap.RunInstance} size={iconSize} />
                    ) : (
                        <Icon data={InstanceIconsMap.RestartInstance} size={iconSize} />
                    ),
                });
            }

            actions.push(
                {
                    text: i18n('rebuild'),
                    handler: () => rebuildInstance(instance),
                    icon: <Icon data={InstanceIconsMap.RebuildInstance} size={iconSize} />,
                },
                {
                    text: i18n('delete'),
                    theme: 'danger' as const,
                    handler: () => deleteInstance(instance),
                    icon: <Icon data={InstanceIconsMap.DeleteInstance} size={iconSize} />,
                },
            );

            return actions;
        },
        [iconSize, stopInstance, startInstance, rebuildInstance, deleteInstance],
    );

    return getActions;
};
