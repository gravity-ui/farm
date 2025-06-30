import type {FieldMetaState, UseFieldConfig} from 'react-final-form';

export interface FieldBaseProps<FieldValue, InputValue> {
    /**
     * The name of the field.
     */
    name: string;

    /**
     * Determines when the error will be displayed.
     */
    errorCondition?(meta: FieldMetaState<FieldValue>): boolean;

    /**
     * Object for configure final-form field
     */
    fieldConfig?: UseFieldConfig<FieldValue, InputValue>;

    /**
     * Function, that will be called only when input was changed by user.
     */
    onSpyChange?: (inputValue: InputValue) => void;
}
