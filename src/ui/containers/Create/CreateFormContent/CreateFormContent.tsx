import React from 'react';

import {FormRow} from '@gravity-ui/components';
import {useQueryData} from '@gravity-ui/data-source';
import {Button, sp, spacing} from '@gravity-ui/uikit';
import type {AxiosError} from 'axios';
import {isEmpty} from 'lodash';
import type {FormRenderProps} from 'react-final-form';
import {useForm, useFormState} from 'react-final-form';

import {EditorField} from '../../../components/Fields/EditorField/EditorField';
import {SelectField} from '../../../components/Fields/SelectField/SelectField';
import {TextField} from '../../../components/Fields/TextField/TextField';
import {VariablesFieldRow} from '../../../components/Fields/VariablesFieldRow/VariablesFieldRow';
import {getInstancesConfigsSource, listBranchesSource} from '../../../data-sources';
import {useDebouncedValue} from '../../../hooks/useDebouncedValue';
import {ci18n} from '../../../i18n-common/ci18n';
import {toaster} from '../../../services/toaster';
import {
    getErrorMessageFromAxios,
    getGlobalFarmConfig,
    getProjectFarmConfig,
} from '../../../utils/common';
import {makeFieldRequired} from '../../../utils/validation';
import type {FormValue} from '../types';

import {i18n} from './i18n';

interface FormContentProps extends FormRenderProps<FormValue> {}

export const CreateFormContent = ({
    handleSubmit,
    submitting,
    hasSubmitErrors,
    hasValidationErrors,
}: FormContentProps) => {
    const formApi = useForm<FormValue>();
    const {
        values: {project, branch, vcs, instanceConfigName},
    } = useFormState<FormValue>({
        subscription: {
            values: true,
        },
    });
    const branchesParams = useDebouncedValue({project}, [project]);
    const instanceConfigsParams = useDebouncedValue(
        {
            project,
            branch,
            vcs,
        },
        [project, branch],
    );

    const branchesQuery = useQueryData(listBranchesSource, branchesParams);
    const instanceConfigsQuery = useQueryData(getInstancesConfigsSource, instanceConfigsParams);

    const branchesOptions = React.useMemo(
        () =>
            branchesQuery.data?.map((br) => ({
                value: br,
                content: br,
            })) ?? [],

        [branchesQuery.data],
    );

    const projectOptions = React.useMemo(() => {
        const projects = getGlobalFarmConfig().projects;
        if (!projects) {
            return [];
        }

        return Object.keys(projects).map((p) => ({
            value: p,
            content: p,
        }));
    }, []);

    const instanceConfigNameOptions = React.useMemo(
        () =>
            instanceConfigsQuery.data?.map((config) => ({
                value: config,
                content: config,
            })),
        [instanceConfigsQuery.data],
    );

    const instanceConfigNameRequired = React.useMemo(
        () => !isEmpty(instanceConfigNameOptions),
        [instanceConfigNameOptions],
    );

    React.useEffect(() => {
        if (branchesQuery.error) {
            toaster.add({
                name: 'branches-error',
                title: ci18n('error-title'),
                content: getErrorMessageFromAxios(
                    branchesQuery.error as AxiosError<{message?: string}>,
                ),
                theme: 'danger',
            });
        } else {
            toaster.remove('branches-error');
        }
    }, [branchesQuery.error]);

    React.useEffect(() => {
        if (instanceConfigsQuery.error) {
            toaster.add({
                name: 'instanceConfigs-error',
                title: ci18n('error-title'),
                content: getErrorMessageFromAxios(
                    instanceConfigsQuery.error as AxiosError<{message?: string}>,
                ),
                theme: 'danger',
            });
        } else {
            toaster.remove('instanceConfigs-error');
        }
    }, [instanceConfigsQuery.error]);

    React.useEffect(() => {
        let name = instanceConfigName;

        if (instanceConfigsQuery.data?.length) {
            if (!instanceConfigsQuery.data?.includes(instanceConfigName)) {
                name = instanceConfigsQuery.data[0];
            }
        }

        formApi.change('instanceConfigName', name);
        // should only be triggered by updating instanceConfigs.data
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instanceConfigsQuery.data]);

    const onProjectChange = React.useCallback(
        (newProject: string) => {
            const projectFarmConfig = getProjectFarmConfig(newProject);
            const projectVCS = projectFarmConfig.vcs;
            const projectBranch = projectFarmConfig.defaultBranch;

            formApi.batch(() => {
                if (projectVCS) {
                    formApi.change('vcs', projectVCS);
                }

                if (projectBranch) {
                    formApi.change('branch', projectBranch);
                }
            });
        },
        [formApi],
    );

    return (
        <form onSubmit={handleSubmit}>
            <div className={sp({mt: 8})} style={{width: '500px'}}>
                <FormRow label={i18n('project-name')} required>
                    <SelectField
                        name="project"
                        options={projectOptions}
                        onSpyChange={onProjectChange}
                    />
                </FormRow>

                <FormRow label={i18n('branch')} required>
                    {isEmpty(branchesOptions) ? (
                        <TextField name="branch" />
                    ) : (
                        <SelectField name="branch" options={branchesOptions} />
                    )}
                </FormRow>

                <FormRow label={i18n('description')}>
                    <EditorField name="description" />
                </FormRow>

                <FormRow label={i18n('url-template')}>
                    <TextField name="urlTemplate" />
                </FormRow>

                <FormRow label={i18n('instance-config')} required={instanceConfigNameRequired}>
                    {instanceConfigNameRequired ? (
                        <SelectField
                            name="instanceConfigName"
                            options={instanceConfigNameOptions}
                            fieldConfig={{validate: makeFieldRequired}}
                        />
                    ) : (
                        <TextField name="instanceConfigName" />
                    )}
                </FormRow>

                <VariablesFieldRow name="variables" title={i18n('variables')} />
                <VariablesFieldRow name="runVariables" title={i18n('run-variables')} />
                <VariablesFieldRow name="labels" title={i18n('labels')} />

                <Button
                    view="action"
                    size="l"
                    type="submit"
                    loading={
                        submitting || instanceConfigsQuery.isLoading || branchesQuery.isLoading
                    }
                    disabled={hasSubmitErrors || hasValidationErrors}
                    className={spacing({mt: 8})}
                >
                    {ci18n('create')}
                </Button>
            </div>
        </form>
    );
};
