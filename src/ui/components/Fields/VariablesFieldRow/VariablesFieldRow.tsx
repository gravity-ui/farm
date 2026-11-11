import React from 'react';

import {FormRow} from '@gravity-ui/components';
import {Plus, TrashBin} from '@gravity-ui/icons';
import {Button, Flex, Icon} from '@gravity-ui/uikit';
import {useField, useForm} from 'react-final-form';
import {FieldArray} from 'react-final-form-arrays';

import {MASKED_SECRET_VALUE, isSecretEnvKey} from '../../../../shared/secret-env';
import type {FormValue} from '../../../containers/Create/types';
import {ci18n} from '../../../i18n-common/ci18n';
import {SecretEnvIcon} from '../../SecretEnvIcon/SecretEnvIcon';
import {TextField} from '../TextField/TextField';

interface VariablesFieldRowProps {
    name: string;
    title: string;
}

export const VariableFields = ({name, secretEnabled}: {name: string; secretEnabled: boolean}) => {
    const form = useForm();
    const {input: keyInput} = useField<string>(`${name}.key`);
    const {input: valueInput} = useField<string>(`${name}.value`);
    const secret = secretEnabled && isSecretEnvKey(keyInput.value.trim());
    return (
        <React.Fragment>
            <TextField
                name={`${name}.key`}
                placeholder="key"
                startContent={secret ? <SecretEnvIcon /> : undefined}
                onSpyChange={(key) => {
                    if (key !== keyInput.value && valueInput.value === MASKED_SECRET_VALUE) {
                        form.change(`${name}.value`, '');
                    }
                }}
            />
            <TextField
                name={`${name}.value`}
                placeholder={
                    secret && valueInput.value === MASKED_SECRET_VALUE
                        ? ci18n('stored-secret-value')
                        : 'value'
                }
                fieldConfig={{
                    format: (value) => (secret && value === MASKED_SECRET_VALUE ? '' : value),
                }}
                type={secret ? 'password' : 'text'}
                autoComplete={secret ? 'new-password' : 'off'}
            />
        </React.Fragment>
    );
};

export function VariablesFieldRow(props: VariablesFieldRowProps) {
    const formApi = useForm<FormValue>();

    const addEnv = React.useCallback(() => {
        formApi.mutators.push(props.name, undefined);
    }, [formApi.mutators, props.name]);

    return (
        <FormRow label={props.title}>
            <Flex direction="column" gap={4}>
                <FieldArray name={props.name}>
                    {({fields}) =>
                        fields.map((name, index) => (
                            <Flex gap="2" key={name}>
                                <VariableFields
                                    name={name}
                                    secretEnabled={props.name !== 'labels'}
                                />

                                <Button
                                    view="flat-secondary"
                                    onClick={() => fields.remove(index)}
                                    qa={`${name}-remove-item`}
                                >
                                    <Icon data={TrashBin} size={16} />
                                </Button>
                            </Flex>
                        ))
                    }
                </FieldArray>

                <Button onClick={addEnv}>
                    <Icon data={Plus} size={14} />
                    {props.title}
                </Button>
            </Flex>
        </FormRow>
    );
}
