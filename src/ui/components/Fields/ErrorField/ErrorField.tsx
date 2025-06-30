import React from 'react';

import {Flex, Text} from '@gravity-ui/uikit';
import {useField} from 'react-final-form';

import type {FieldBaseProps} from '../types';

import {defaultFieldErrorCondition, getErrorFromMeta} from './utils';

import * as styles from './ErrorField.module.css';

export interface ErrorFieldProps<T>
    extends Pick<FieldBaseProps<T, unknown>, 'name' | 'errorCondition'> {
    children?: React.ReactNode;
}

/**
 * - standalone variant:
 * ```tsx
 * <Flex direction="column" gap="1">
 *      <SomeInputField name="same-field" />
 *      <ErrorField name="same-field" />
 * </Flex>
 * ```
 * - wrapper variant:
 * ```tsx
 * <ErrorField name="same-field">
 *      <SomeInputField name="same-field">
 * </ErrorField>
 * ```
 */
export function ErrorField<T>({
    name,
    children,
    errorCondition = defaultFieldErrorCondition,
}: ErrorFieldProps<T>): React.ReactElement | null {
    const {meta} = useField<T>(name);
    const resolvedError = errorCondition(meta) && getErrorFromMeta(meta);

    if (!resolvedError) {
        return children ? <React.Fragment>{children}</React.Fragment> : null;
    }

    let content = (
        <Text as="div" color="danger" variant="body-1">
            {resolvedError}
        </Text>
    );

    if (children) {
        content = (
            <Flex direction="column" gap="0.5" className={styles.fullWidth}>
                {children}
                {content}
            </Flex>
        );
    }

    return content;
}
