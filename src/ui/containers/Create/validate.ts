import {z} from 'zod';

import {zodValidate} from '../../utils/validation';

import type {FormValue} from './types';

const schema = z
    .object({
        project: z.string(),
        vcs: z.string(),
        branch: z.string(),
    })
    .required();

export const validate = zodValidate<FormValue>(schema);
