import React, {useEffect, useState} from 'react';

import {useDataManager} from '@gravity-ui/data-source';
import {House} from '@gravity-ui/icons';
import {matchPath, useSearchParams} from 'react-router-dom';

import type {InstanceWithProviderStatus} from '../../../../shared/common';
import {uiRoutes} from '../../../../shared/uiRoutes';
import {i18nInstanceActions} from '../../../i18n-common/i18nInstanceActions';
import {toaster} from '../../../services/toaster';
import {InstanceIconsMap} from '../../../utils/iconsMap';
import {useInstanceActions} from '../actions';

import {i18n} from './i18n';

const toastName = 'stop-instance-alert';
const autoStartToastName = 'auto-start-instance-alert';

export const useInstanceStopWarning = (instance?: InstanceWithProviderStatus) => {
    const {startInstance} = useInstanceActions();
    const [searchParams] = useSearchParams();
    const dataManager = useDataManager();
    const [isToastVisible, setIsToastVisible] = useState(false);
    const retpath = searchParams.get('retpath') ?? '';
    const autoStartEnable = Boolean(retpath);

    useEffect(() => {
        if (instance?.providerStatus === 'running' && autoStartEnable) {
            window.open(retpath, '_blank')?.focus();
        }

        if (
            instance?.providerStatus === 'stopped' &&
            !isToastVisible &&
            !toaster.has(autoStartToastName) &&
            autoStartEnable
        ) {
            setIsToastVisible(true); // so that the toast is not recreated with every render

            startInstance(instance).then(() => {
                toaster.add({
                    name: autoStartToastName,
                    title: i18nInstanceActions('starting'),
                    content: i18nInstanceActions('auto-start-instance-description'),
                    theme: 'info',
                    autoHiding: 4000,
                });
            });
        }

        if (
            instance?.providerStatus === 'stopped' &&
            !isToastVisible &&
            !toaster.has(toastName) &&
            !autoStartEnable
        ) {
            setIsToastVisible(true); // so that the toast is not recreated with every render

            toaster.add({
                name: toastName,
                title: i18nInstanceActions('stop-warning-title'),
                theme: 'warning',
                autoHiding: false,
                actions: [
                    {
                        label: i18nInstanceActions('start'),
                        onClick: () => {
                            startInstance(instance).then(() => {
                                setTimeout(() => {
                                    setIsToastVisible(false);
                                }, 1000);
                            });
                        },
                    },
                ],
            });
        }

        if (instance?.providerStatus !== 'stopped') {
            setIsToastVisible(false);
            toaster.remove(toastName);
            toaster.remove(autoStartToastName);
        }
    }, [instance, dataManager, isToastVisible, startInstance, autoStartEnable, retpath]);

    useEffect(() => {
        return () => {
            const isPathMatches = Boolean(
                matchPath(
                    {
                        path: uiRoutes.instance,
                        // if this option is enabled, the url may not completely match
                        end: false,
                    },
                    location.pathname,
                ),
            );

            if (!isPathMatches) {
                toaster.remove(toastName);
            }
        };
    }, []);
};

export const InstanceRoutes = [
    {
        icon: <House />,
        title: i18n('overview'),
        path: uiRoutes.instance,
    },
    {
        icon: <InstanceIconsMap.ViewBuildLogs />,
        title: i18n('build-logs'),
        path: uiRoutes.instanceBuildLogs,
    },
    {
        icon: <InstanceIconsMap.ViewInstanceLogs />,
        title: i18n('instance-logs'),
        path: uiRoutes.instanceRunLogs,
    },
];
