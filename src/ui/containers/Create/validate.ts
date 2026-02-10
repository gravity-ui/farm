import {z} from 'zod';

import {zodValidate} from '../../utils/validation';

import type {FormValue} from './types';

const schema = z
    .object({
        project: z.string(),
        vcs: z.string(),
        branch: z.string(),
        instanceHashLength: z.number().min(4).positive().optional(),
    })
    .required();

export const validate = zodValidate<FormValue>(schema);
