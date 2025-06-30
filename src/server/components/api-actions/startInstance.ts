import type {StartInstanceRequest, StartInstanceResponse} from '../../../shared/api/startInstance';
import type {ApiAction} from '../../../shared/common';
import {getInstance} from '../../utils/db';
import * as instanceUtils from '../../utils/instance';

const startInstance: ApiAction<StartInstanceRequest, StartInstanceResponse> = async ({data}) => {
    try {
        const instance = await getInstance(data.hash);
        if (!instance) {
            return {ok: false, message: 'Instance not found'};
        }

        if (instance.status !== 'generated') {
            return {
                ok: false,
                message: 'Instance cannot be started, use `deleteInstance` instead',
            };
        }

        await instanceUtils.startInstance(instance);
        return {ok: true};
    } catch (error) {
        return {
            ok: false,
            message: `Error occurred while starting ${data.hash}`,
            data: {error},
        };
    }
};

export default startInstance;
