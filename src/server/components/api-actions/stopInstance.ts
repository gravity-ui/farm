import type {StopInstanceRequest, StopInstanceResponse} from '../../../shared/api/stopInstance';
import type {ApiAction} from '../../../shared/common';
import {getInstance} from '../../utils/db';
import * as instanceUtils from '../../utils/instance';

const stopInstance: ApiAction<StopInstanceRequest, StopInstanceResponse> = async ({data}) => {
    try {
        const instance = await getInstance(data.hash);
        if (!instance) {
            return {ok: false, message: 'Instance not found'};
        }

        if (instance.status !== 'generated') {
            return {
                ok: false,
                message: 'Instance cannot be stopped, use `deleteInstance` instead',
            };
        }

        await instanceUtils.stopInstance(instance.hash);
        return {ok: true};
    } catch (error) {
        return {
            ok: false,
            message: `Error occured while stopping ${data.hash}`,
            data: {error},
        };
    }
};

export default stopInstance;
