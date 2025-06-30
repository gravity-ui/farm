import React from 'react';

import {FormRow} from '@gravity-ui/components';
import {Plus, TrashBin} from '@gravity-ui/icons';
import {Button, Flex, Icon} from '@gravity-ui/uikit';
import {useForm} from 'react-final-form';
import {FieldArray} from 'react-final-form-arrays';

import type {FormValue} from '../../../containers/Create/types';
import {TextField} from '../TextField/TextField';

interface VariablesFieldRowProps {
    name: string;
    title: string;
}

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
                                <TextField name={`${name}.key`} placeholder="key" />
                                <TextField name={`${name}.value`} placeholder="value" />

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
