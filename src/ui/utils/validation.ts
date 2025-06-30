import type {ValidationErrors} from 'final-form';
import {z} from 'zod';

export const flattenZodError = (err: z.ZodError): ValidationErrors => {
    return err.errors.reduce(
        (prev, e) => ({
            ...prev,
            [e.path.join('.')]: e.message,
        }),
        {} as ValidationErrors,
    );
};

export const zodValidate =
    <T>(schema: z.Schema) =>
    (values: T): ValidationErrors => {
        const res = schema.safeParse(values);
        if (!res.success) {
            return flattenZodError(res.error);
        }

        return {};
    };

export const makeFieldRequired = (value: string) => {
    const schema = z.string().nonempty({
        message: 'Required',
    });

    const res = schema.safeParse(value);
    if (!res.success) {
        return res.error.errors[0].message;
    }

    return undefined;
};
