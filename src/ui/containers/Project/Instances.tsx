import React, {useCallback, useMemo, useState} from 'react';

import {dateTimeParse} from '@gravity-ui/date-utils';
import {LongValue} from '@gravity-ui/dynamic-forms';
import type {TableColumnConfig, TableSettingsData} from '@gravity-ui/uikit';
import {
    Checkbox,
    Flex,
    Label,
    Popover,
    Table,
    TextInput,
    sp,
    spacing,
    withTableActions,
    withTableCopy,
    withTableSelection,
    withTableSettings,
    withTableSorting,
} from '@gravity-ui/uikit';
import _ from 'lodash';
import {generatePath, useNavigate, useSearchParams} from 'react-router-dom';

import type {QueuedInstance} from '../../../shared/common';
import {uiRoutes} from '../../../shared/uiRoutes';
import {dataManager} from '../../components/data-source';
import {InstanceCount} from '../../components/instance/InstanceCount/InstanceCount';
import {InstanceHash} from '../../components/instance/InstanceHash/InstanceHash';
import InstanceStatusLabel, {
    getInstanceStatus,
} from '../../components/instance/InstanceStatusLabel/InstanceStatusLabel';
import {InstancesGroupActions} from '../../components/instance/InstancesGroupActions/InstancesGroupActions';
import {listInstancesSource} from '../../data-sources';
import {i18nInstance} from '../../i18n-common/i18nInstance';
import {generateInstanceHref} from '../../utils/common';
import {TABLE_ACTION_SIZE} from '../../utils/constants';
import {
    compareStrings,
    sortDateFactory,
    sortNumbersFactory,
    sortStringsFactory,
} from '../../utils/sort';
import {useInstanceAvailableActions} from '../Instance/actions';

import {InstanceBranch} from './components/InstanceBranch/InstanceBranch';
import {i18n} from './i18n';

import * as styles from './Project.module.css';

const InstanceTable = withTableSettings(
    withTableSelection(withTableSorting(withTableCopy(withTableActions<QueuedInstance>(Table)))),
);
const EMPTY_SYMBOL = '\u2014';
const columns: TableColumnConfig<QueuedInstance>[] = [
    {
        id: 'branch',
        name: i18nInstance('branch'),
        template: (instance) => (
            <InstanceBranch
                instance={instance}
                url={generateInstanceHref({
                    project: instance.project,
                    hash: instance.hash,
                    urlTemplate: instance.urlTemplate,
                })}
            />
        ),
        primary: true,
        meta: {
            copy: ({hash, branch}: QueuedInstance) => {
                if (!hash) {
                    throw new Error('hash is not defined');
                }

                return branch;
            },
            meta: {
                sort: sortStringsFactory('branch'),
            },
        },
    },
    {
        id: 'hash',
        name: i18nInstance('hash'),
        template: ({hash}) => <InstanceHash hash={hash} />,
        meta: {
            copy: ({hash}: QueuedInstance) => {
                if (!hash) {
                    throw new Error('hash is not defined');
                }

                return hash;
            },
            meta: {
                sort: sortStringsFactory('hash'),
            },
        },
    },
    {
        id: 'labels',
        name: i18nInstance('labels'),
        className: styles.envCells,
        template: ({labels}) => {
            if (_.isEmpty(labels)) {
                return EMPTY_SYMBOL;
            }

            // Sort labels by length for smaller column width
            const labelsList = Object.entries(labels).sort(
                (a, b) => a[0].length + a[1].length - b[0].length - b[1].length,
            );

            return (
                <Flex gap={2} onClick={(e) => e.stopPropagation()}>
                    <Label value={labelsList[0][1]}>{labelsList[0][0]}</Label>
                    {labelsList.length > 1 && (
                        <Popover
                            hasArrow
                            className={styles.labelCell}
                            content={
                                <Flex gap={2} direction="column" inline>
                                    {labelsList.slice(1).map(([key, value]) => (
                                        <div key={key}>
                                            <Label value={value}>{key}</Label>
                                        </div>
                                    ))}
                                </Flex>
                            }
                        >
                            <Label interactive>+{labelsList.length - 1}</Label>
                        </Popover>
                    )}
                </Flex>
            );
        },
        meta: {
            copy: ({labels}: QueuedInstance) => {
                if (_.isEmpty(labels)) {
                    return undefined;
                }

                const labelsList = Object.entries(labels).map(([key, value]) => `${key}=${value}`);
                return labelsList.join(' ');
            },
        },
    },
    {
        id: 'status',
        name: i18nInstance('status'),
        template: (instance) => <InstanceStatusLabel instance={instance} />,
        meta: {
            sort: (left: QueuedInstance, right: QueuedInstance) =>
                compareStrings(getInstanceStatus(left).text, getInstanceStatus(right).text),
        },
    },
    {
        id: 'startTime',
        name: i18nInstance('last-changes'),
        template: ({startTime}) =>
            dateTimeParse(Number(startTime) || 'now')?.format('DD.MM.YYYY HH:mm'),
        meta: {
            sort: sortDateFactory('startTime'),
        },
    },
    {
        id: 'queuePosition',
        name: i18nInstance('queue-position'),
        template: ({queuePosition}) => (queuePosition > -1 ? queuePosition : EMPTY_SYMBOL),
        meta: {
            sort: sortNumbersFactory('queuePosition'),
        },
    },
    {
        id: 'envVariables',
        name: i18nInstance('env-variables'),
        className: styles.envCells,
        template: ({envVariables}) => {
            if (_.isEmpty(envVariables)) {
                return EMPTY_SYMBOL;
            }

            const envs = Object.entries(envVariables).map(([key, value]) => `${key}=${value}`);

            return (
                <LongValue
                    onClick={(e) => e.stopPropagation()}
                    className={spacing({m: '0'})}
                    value={envs.join('\n')}
                    color="secondary"
                />
            );
        },
        meta: {
            copy: ({envVariables}: QueuedInstance) => {
                if (_.isEmpty(envVariables)) {
                    return '';
                }

                const envs = Object.entries(envVariables).map(([key, value]) => `${key}=${value}`);
                return envs.join(' ');
            },
        },
    },
    {
        id: 'runEnvVariables',
        name: i18nInstance('run-env-variables'),
        className: styles.envCells,
        template: ({runEnvVariables}) => {
            if (_.isEmpty(runEnvVariables)) {
                return EMPTY_SYMBOL;
            }

            const envs = Object.entries(runEnvVariables).map(([key, value]) => `${key}=${value}`);
            return (
                <LongValue
                    onClick={(e) => e.stopPropagation()}
                    className={spacing({m: '0'})}
                    value={envs.join('\n')}
                    color="secondary"
                />
            );
        },
        meta: {
            copy: ({runEnvVariables}: QueuedInstance) => {
                if (_.isEmpty(runEnvVariables)) {
                    return '';
                }

                const vars = runEnvVariables as Record<string, string>;
                const envs = Object.entries(vars).map(([key, value]) => `${key}=${value}`);

                return envs.join(' ');
            },
        },
    },
];

const initTableSettings: TableSettingsData = columns.map((c) => ({
    id: c.id,
    isSelected: true,
}));

const includesQuery = (text: string, pattern: string) => {
    const str = text.toLowerCase().trim();
    const query = pattern.toLowerCase().trim();

    return str.includes(query);
};

const fzf = (searchQuery: string, instances: QueuedInstance[]) => {
    return instances.filter((instance) => {
        const branch = instance.branch?.replace(/^users\//, ''); // TODO: should be moved to config? (arc-specified branch prefix)

        const containsBranch = Boolean(branch && includesQuery(branch, searchQuery));
        const containsHash = includesQuery(instance.hash, searchQuery);
        const containsLabels = Boolean(
            instance.labels &&
                Object.values(instance.labels).some((label) => includesQuery(label, searchQuery)),
        );

        return containsBranch || containsHash || containsLabels;
    });
};

export default function Instances({instances}: {instances: QueuedInstance[]}) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [settings, setSettings] = useState(initTableSettings);
    const [selectedInstances, setSelectedInstances] = useState<string[]>([]);

    const isMine = searchParams.get('mine') === 'true';
    const [query, setQuery] = useState(searchParams.get('query') || '');

    const filteredInstances = useMemo(() => {
        if (isMine) {
            const user = window.FM.user.login;
            return fzf(user, instances);
        }

        return query ? fzf(query, instances) : instances;
    }, [isMine, query, instances]);

    const invalidateInstances = React.useCallback(() => {
        dataManager.invalidateSource(listInstancesSource).catch(() => {});
    }, []);

    const getRowActions = useInstanceAvailableActions({
        iconSize: TABLE_ACTION_SIZE,
    });

    const onQueryUpdate = useCallback(
        (val: string) => {
            setQuery(val);
            setSearchParams((prev) => {
                prev.set('query', val);
                return prev;
            });
        },
        [setSearchParams],
    );

    const onMineUpdate = useCallback(
        (val: boolean) => {
            setSearchParams((prev) => {
                prev.set('mine', val ? 'true' : 'false');
                return prev;
            });
        },
        [setSearchParams],
    );

    const onBatchDelete = useCallback(() => {
        setSelectedInstances([]);
        invalidateInstances();
    }, [invalidateInstances]);

    const getRowDescriptor = useCallback(
        (row: QueuedInstance) => ({
            id: row.hash,
        }),
        [],
    );

    const onRowClick = useCallback(
        (instance: QueuedInstance) => {
            navigate(generatePath(uiRoutes.instance, {hash: instance.hash}));
        },
        [navigate],
    );

    return (
        <div>
            <InstanceCount className={sp({mb: 4, mt: 4})} count={instances.length} />

            {instances.length && (
                <Flex
                    justifyContent="flex-start"
                    gap={4}
                    alignItems="center"
                    className={sp({mb: 4, mt: 4})}
                >
                    <TextInput
                        autoFocus
                        value={isMine ? window.FM.user?.login : query}
                        onUpdate={onQueryUpdate}
                        placeholder={i18n('filter-placeholder')}
                        className={styles.controlsSearch}
                        disabled={isMine}
                        hasClear
                    />

                    {window.FM.user?.login && (
                        <Checkbox
                            size="l"
                            checked={isMine}
                            content={i18n('my-branches')}
                            onUpdate={onMineUpdate}
                        />
                    )}
                </Flex>
            )}

            <InstanceTable
                rowActionsSize="s"
                columns={columns}
                data={filteredInstances}
                settings={settings}
                updateSettings={setSettings}
                getRowActions={getRowActions}
                onRowClick={onRowClick}
                onSelectionChange={setSelectedInstances}
                selectedIds={selectedInstances}
                getRowDescriptor={getRowDescriptor}
            />

            {selectedInstances.length > 0 && (
                <InstancesGroupActions
                    instances={selectedInstances}
                    onDelete={onBatchDelete}
                    clearInstances={() => setSelectedInstances([])}
                />
            )}
        </div>
    );
}
