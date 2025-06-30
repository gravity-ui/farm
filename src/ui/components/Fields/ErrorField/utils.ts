import {FORM_ERROR} from 'final-form';
import type {FieldMetaState} from 'react-final-form';

export function defaultFieldErrorCondition<T>({
    touched,
    dirty,
    error,
    dirtySinceLastSubmit,
    submitError,
}: FieldMetaState<T>): boolean {
    return ((touched || dirty) && error) || (!dirtySinceLastSubmit && submitError);
}

export function getErrorFromMeta<T>({error, submitError}: FieldMetaState<T>) {
    const resolvedError = error?.[FORM_ERROR] || error;

    if (resolvedError && typeof resolvedError === 'string') {
        return resolvedError;
    }

    return typeof submitError === 'string' ? submitError : undefined;
}
