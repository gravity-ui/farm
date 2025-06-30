import {HttpStatusCode} from 'axios';

import type {GetInstanceRequest, GetInstanceResponse} from '../../../shared/api/getInstance';
import type {ApiAction} from '../../../shared/common';
import {generateInstanceHref} from '../../utils/common';
import * as db from '../../utils/db';

const getInstance: ApiAction<GetInstanceRequest, GetInstanceResponse> = async ({data}) => {
    try {
        const {hash} = data;

        if (!hash) {
            return {
                ok: false,
                status: HttpStatusCode.BadRequest,
                message: `Send hash to get instance`,
            };
        }

        const instance = await db.getInstance(hash);

        if (!instance) {
            return {
                ok: false,
                status: HttpStatusCode.NotFound,
                message: `Instance ${hash} not found`,
            };
        }

        const url = generateInstanceHref({
            project: instance.project,
            hash: instance.hash,
            urlTemplate: instance.urlTemplate,
        });

        return {
            ok: true,
            data: {
                instance,
                url,
            },
        };
    } catch (error) {
        return {
            ok: false,
            status: HttpStatusCode.InternalServerError,
            message: "Can't get instance",
            data: {
                error,
            },
        };
    }
};

export default getInstance;
