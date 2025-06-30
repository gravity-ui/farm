import React, {useCallback} from 'react';

import type {AxiosError} from 'axios';
import arrayMutators from 'final-form-arrays';
import {isString} from 'lodash';
import {Form} from 'react-final-form';
import {useLocation, useNavigate} from 'react-router-dom';

import type {GenerateInstanceRequest, GenerateInstanceResponse} from '../../../shared/api/generate';
import type {
    GetInstanceConfigRequest,
    GetInstanceConfigResponse,
} from '../../../shared/api/getInstanceConfig';
import {ENV_PREFIX, RUN_ENV_PREFIX} from '../../../shared/constants';
import {Page} from '../../components/layouts/Page/Page';
import {ci18n} from '../../i18n-common/ci18n';
import api from '../../services/api';
import {handleRequestErrorWithToast, toaster} from '../../services/toaster';
import {getErrorMessageFromAxios, getProjectFarmConfig, omitNullable} from '../../utils/common';
import {DEFAULT_PROJECT} from '../../utils/constants';
import {prepareGenerateInstanceRequest} from '../../utils/prepareGenerateInstanceRequest';

import {CreateFormContent} from './CreateFormContent/CreateFormContent';
import {i18n} from './i18n';
import type {FormValue, QSVariables} from './types';
import {validate} from './validate';

export const Create = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleSubmit = useCallback(
        async (fv: FormValue) => {
            let urlTemplate = fv.urlTemplate;
            if (fv.instanceConfigName && !urlTemplate) {
                const config = await api
                    .request<GetInstanceConfigRequest, GetInstanceConfigResponse>({
                        action: 'getInstanceConfig',
                        data: {
                            project: fv.project,
                            branch: fv.branch,
                            vcs: fv.vcs,
                            instanceConfigName: fv.instanceConfigName,
                        },
                    })
                    .then((response) => response.config)
                    .catch((e) => {
                        toaster.add({
                            name: 'submit',
                            title: ci18n('error-title'),
                            content: getErrorMessageFromAxios(e as AxiosError<{message: string}>),
                            theme: 'danger',
                        });
                    });

                if (isString(config?.urlTemplate)) {
                    urlTemplate = config.urlTemplate;
                }
            }

            const data: GenerateInstanceRequest = {
                project: fv.project,
                branch: fv.branch,
                description: fv.description,
                urlTemplate,
                vcs: fv.vcs,
                instanceConfigName: fv.instanceConfigName,
                labels: {},
            };

            if (Array.isArray(fv.variables)) {
                fv.variables.forEach(({key, value}) => {
                    if (key && value) {
                        data[`${ENV_PREFIX}${key}`] = value;
                    }
                });
            }

            if (Array.isArray(fv.runVariables)) {
                fv.runVariables.forEach(({key, value}) => {
                    if (key && value) {
                        data[`${RUN_ENV_PREFIX}${key}`] = value;
                    }
                });
            }

            if (Array.isArray(fv.labels)) {
                fv.labels.forEach(({key, value}) => {
                    if (data.labels) {
                        data.labels[key] = value;
                    }
                });
            }

            try {
                const response = await api.request<
                    GenerateInstanceRequest,
                    GenerateInstanceResponse
                >({
                    action: 'generate',
                    data: prepareGenerateInstanceRequest(omitNullable(data)),
                });

                if (response.hash) {
                    const searchParams = new URLSearchParams({hash: response.hash});
                    navigate(`/api/logs?${searchParams.toString()}`);
                }
            } catch (e) {
                handleRequestErrorWithToast(e as AxiosError<{message: string}>);
            }
        },
        [navigate],
    );

    const [initialValues] = React.useState<FormValue>(() => {
        const params = new URLSearchParams(location.search);
        const project = params.get('project') || window.FM.defaultProject || DEFAULT_PROJECT;
        const projectFarmConfig = getProjectFarmConfig(project);

        const values: FormValue = {
            project,
            vcs: projectFarmConfig.vcs || 'git',
            branch:
                params.get('branch') ||
                projectFarmConfig.defaultBranch ||
                window.FM.defaultBranch ||
                'main',
            description: '',
            urlTemplate: '',
            instanceConfigName: '',
            variables: [
                {
                    key: '',
                    value: '',
                },
            ] as QSVariables[],
            runVariables: [
                {
                    key: '',
                    value: '',
                },
            ] as QSVariables[],
            labels: [
                {
                    key: '',
                    value: '',
                },
            ] as QSVariables[],
        };

        if (!location.search) {
            return values;
        }

        for (const [key, val] of params) {
            if (key.startsWith(ENV_PREFIX)) {
                values.variables.push({key: key.slice(ENV_PREFIX.length), value: val});
            }
            if (key.startsWith(RUN_ENV_PREFIX)) {
                values.runVariables.push({key: key.slice(RUN_ENV_PREFIX.length), value: val});
            }
        }

        return {
            ...values,
            description: params.get('description') ?? values.description,
        };
    });

    const [mutators] = React.useState(() => ({
        ...arrayMutators,
    }));

    return (
        <Page header={i18n('title')}>
            <Form
                initialValues={initialValues}
                onSubmit={handleSubmit}
                mutators={mutators}
                validate={validate}
                render={(props) => <CreateFormContent {...props} />}
            />
        </Page>
    );
};
