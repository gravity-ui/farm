import React from 'react';

import type {SelectProps} from '@gravity-ui/uikit';
import {Select} from '@gravity-ui/uikit';
import {useField} from 'react-final-form';

import {ErrorField} from '../ErrorField/ErrorField';
import type {FieldBaseProps} from '../types';

export interface SelectFieldProps<T, InputValue extends string | string[], FieldValue = InputValue>
    extends Omit<SelectProps<T>, 'value' | 'onChange' | 'onUpdate' | 'onFocus' | 'onBlur' | 'name'>,
        FieldBaseProps<FieldValue, InputValue> {
    value?: InputValue;
    onUpdate?(nextValue: InputValue): void;
}

const useArrayValue = <T extends string | string[]>({
    value: propsValue,
    multiple,
    onUpdate: propsOnUpdate,
}: {
    value: T;
    multiple?: boolean;
    onUpdate(nextValue: T): void;
}) => {
    const value = React.useMemo<string[]>(
        () => (Array.isArray(propsValue) ? propsValue : propsValue ? [propsValue] : []),
        [propsValue],
    );

    const onUpdate = (v: string[]) => {
        const newValue = multiple ? v : v[0];

        propsOnUpdate(newValue as T);
    };

    return {value, onUpdate};
};

export function SelectField<T, InputValue extends string | string[], FieldValue = InputValue>({
    name,
    fieldConfig,
    errorCondition,
    width = 'max',
    onSpyChange,
    ...props
}: SelectFieldProps<T, InputValue, FieldValue>) {
    const {
        input: {value: rawValue, onBlur, onFocus, onChange},
    } = useField<FieldValue, HTMLElement, InputValue>(name, fieldConfig);

    const handleRawUpdate = React.useCallback(
        (newValue: InputValue) => {
            onChange(newValue);
            onSpyChange?.(newValue);
        },
        [onChange, onSpyChange],
    );

    const {value, onUpdate} = useArrayValue({
        value: rawValue,
        multiple: props.multiple,
        onUpdate: handleRawUpdate,
    });

    return (
        <ErrorField name={name} errorCondition={errorCondition}>
            <Select
                {...props}
                width={width}
                value={value}
                onUpdate={onUpdate}
                onBlur={onBlur as SelectProps<InputValue>['onBlur']}
                onFocus={onFocus as SelectProps<InputValue>['onFocus']}
            />
        </ErrorField>
    );
}
