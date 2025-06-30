import React from 'react';

import type {TextInputProps} from '@gravity-ui/uikit';
import {TextInput} from '@gravity-ui/uikit';
import {useField} from 'react-final-form';

import {defaultFieldErrorCondition, getErrorFromMeta} from '../ErrorField/utils';
import type {FieldBaseProps} from '../types';

export interface TextFieldProps<FieldValue = string>
    extends Omit<
            TextInputProps,
            'name' | 'value' | 'onChange' | 'onUpdate' | 'onBlur' | 'onFocus' | 'errorMessage'
        >,
        FieldBaseProps<FieldValue, string> {}

export function TextField<FieldValue = string>({
    name,
    fieldConfig,
    errorCondition = defaultFieldErrorCondition,
    onSpyChange,
    ...props
}: TextFieldProps<FieldValue>) {
    const {
        input: {value, onBlur, onFocus, onChange},
        meta,
    } = useField<FieldValue, HTMLElement, string>(name, fieldConfig);
    const resolvedError = errorCondition(meta) && getErrorFromMeta(meta);

    const handleUpdate = React.useCallback(
        (newValue: string) => {
            onChange(newValue);
            onSpyChange?.(newValue);
        },
        [onChange, onSpyChange],
    );

    return (
        <TextInput
            {...props}
            name={name}
            value={value}
            onUpdate={handleUpdate}
            onFocus={onFocus}
            onBlur={onBlur}
            errorMessage={resolvedError}
            hasClear={true}
            validationState={resolvedError ? 'invalid' : undefined}
        />
    );
}
