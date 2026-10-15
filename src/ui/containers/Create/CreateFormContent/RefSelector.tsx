import React from 'react';

import {useQueryData} from '@gravity-ui/data-source';
import {BranchesRight, Tag} from '@gravity-ui/icons';
import {Button, Icon, Loader, Select, sp} from '@gravity-ui/uikit';
import type {AxiosError} from 'axios';
import {useField} from 'react-final-form';

import type {ListBranchesRequest, ListBranchesResponse} from '../../../../shared/api/listBranches';
import type {ProjectFarmConfig} from '../../../../shared/common';
import {SelectField} from '../../../components/Fields/SelectField/SelectField';
import {TextField} from '../../../components/Fields/TextField/TextField';
import {listBranchesSource} from '../../../data-sources';
import {ci18n} from '../../../i18n-common/ci18n';
import api from '../../../services/api';
import {toaster} from '../../../services/toaster';
import {getErrorMessageFromAxios, getProjectFarmConfig} from '../../../utils/common';

import {i18n} from './i18n';

type RefType = 'branch' | 'tag';

export const supportsRefSelector = (config: ProjectFarmConfig) =>
    config.vcs === 'git' &&
    (config.vcsCredentials?.git?.hostname || 'github.com').includes('github');

export const LegacyBranchSelector = ({project}: {project: string}) => {
    const query = useQueryData(listBranchesSource, {project});
    React.useEffect(() => {
        if (query.error) {
            toaster.add({
                name: 'branches-error',
                title: ci18n('error-title'),
                content: getErrorMessageFromAxios(query.error as AxiosError<{message?: string}>),
                theme: 'danger',
            });
        } else {
            toaster.remove('branches-error');
        }
        return () => {
            toaster.remove('branches-error');
        };
    }, [query.error]);
    const options = query.data?.map((name) => ({value: name, content: name})) || [];
    return options.length ? (
        <SelectField name="branch" options={options} loading={query.isLoading} />
    ) : (
        <TextField name="branch" />
    );
};

export const encodeBranchRef = (name: string) =>
    /^refs\/(tags|heads)\//.test(name) ? `refs/heads/${name}` : name;

const decodeRef = (value: string) => value.replace(/^refs\/(tags|heads)\//, '');

interface RefSelectorProps {
    project: string;
    onReadyChange(ready: boolean): void;
}

export const RefSelector = ({project, onReadyChange}: RefSelectorProps) => {
    const {input} = useField<string>('branch');
    const [refType, setRefType] = React.useState<RefType>(() =>
        input.value.startsWith('refs/tags/') ? 'tag' : 'branch',
    );
    const [filter, setFilter] = React.useState('');
    const [state, setState] = React.useState({
        scope: '',
        query: '',
        names: [] as string[],
        loading: true,
        error: false,
    });
    const scope = `${project}:${refType}`;
    const latestValue = React.useRef(input.value);
    latestValue.current = input.value;
    const previousProject = React.useRef(project);
    const sequence = React.useRef(0);
    const current = state.scope === scope && state.query === filter;
    const value = decodeRef(input.value);
    const validType =
        refType === 'tag'
            ? input.value.startsWith('refs/tags/')
            : !input.value.startsWith('refs/tags/');
    const loading = !current || state.loading;
    const ready =
        current && !state.loading && !state.error && validType && state.names.includes(value);

    React.useEffect(() => {
        onReadyChange(ready);
    }, [ready, onReadyChange]);

    React.useEffect(() => {
        if (previousProject.current !== project) {
            previousProject.current = project;
            setRefType('branch');
            setFilter('');
        }
    }, [project]);

    React.useEffect(() => {
        const request = ++sequence.current;
        let active = true;
        setState((previous) => ({
            scope,
            query: filter,
            names: previous.scope === scope && previous.query === filter ? previous.names : [],
            loading: true,
            error: false,
        }));
        const timer = setTimeout(
            async () => {
                try {
                    const fetchNames = async (query?: string) => {
                        const response = await api.request<
                            ListBranchesRequest,
                            ListBranchesResponse
                        >({
                            action: 'listBranches',
                            data: {project, refType, query},
                        });
                        return response.branches;
                    };
                    const names = await fetchNames(filter || undefined);
                    const selected = latestValue.current;
                    const selectedName = decodeRef(selected);
                    if (!filter && selectedName && !names.includes(selectedName)) {
                        names.push(...(await fetchNames(selectedName)));
                    }
                    if (active && sequence.current === request) {
                        setState({
                            scope,
                            query: filter,
                            names: Array.from(new Set(names)),
                            loading: false,
                            error: false,
                        });
                    }
                } catch {
                    if (active && sequence.current === request) {
                        setState({scope, query: filter, names: [], loading: false, error: true});
                    }
                }
            },
            filter ? 300 : 0,
        );
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [project, refType, filter, scope]);

    const switchType = (nextType: RefType) => {
        if (nextType === refType) {
            return;
        }
        setRefType(nextType);
        setFilter('');
        input.onChange(
            nextType === 'branch'
                ? encodeBranchRef(getProjectFarmConfig(project).defaultBranch || '')
                : '',
        );
        onReadyChange(false);
    };

    return (
        <div style={{display: 'flex', gap: 'var(--g-spacing-2)', minWidth: 0}}>
            <div style={{flex: 1, minWidth: 0}} aria-busy={loading}>
                <Select
                    width="max"
                    aria-label={i18n(refType === 'branch' ? 'branches' : 'tags')}
                    value={input.value ? [input.value] : []}
                    options={(current ? state.names : []).map((name) => ({
                        value: refType === 'tag' ? `refs/tags/${name}` : encodeBranchRef(name),
                        content: name,
                    }))}
                    placeholder={loading ? <Loader size="s" /> : undefined}
                    renderSelectedOption={(option) => (
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--g-spacing-2)',
                            }}
                        >
                            {loading && <Loader size="s" />}
                            <span>{option.content ?? decodeRef(option.value)}</span>
                        </span>
                    )}
                    filterable
                    filter={filter}
                    onFilterChange={(nextFilter) => {
                        if (nextFilter !== filter) {
                            setFilter(nextFilter);
                            onReadyChange(false);
                        }
                    }}
                    filterOption={(option, query) => !query || option.content === query}
                    filterPlaceholder={i18n('ref-search')}
                    loading={loading}
                    errorMessage={state.error && current ? i18n('ref-error') : undefined}
                    validationState={state.error && current ? 'invalid' : undefined}
                    renderEmptyOptions={() => <div className={sp({p: 3})}>{i18n('ref-empty')}</div>}
                    onUpdate={(values) => input.onChange(values[0] || '')}
                    onFocus={() => input.onFocus()}
                    onBlur={() => input.onBlur()}
                />
            </div>
            {(['branch', 'tag'] as const).map((type) => (
                <Button
                    key={type}
                    type="button"
                    view="outlined"
                    selected={refType === type}
                    aria-pressed={refType === type}
                    aria-label={i18n(type === 'branch' ? 'branches' : 'tags')}
                    title={i18n(type === 'branch' ? 'branches' : 'tags')}
                    onClick={() => switchType(type)}
                >
                    <Icon data={type === 'branch' ? BranchesRight : Tag} />
                </Button>
            ))}
        </div>
    );
};
