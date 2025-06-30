import type {
    RestartInstanceRequest,
    RestartInstanceResponse,
} from '../../../shared/api/restartInstance';
import type {ApiAction} from '../../../shared/common';
import {getErrorMessage} from '../../utils/common';
import * as db from '../../utils/db';
import * as instanceUtils from '../../utils/instance';
import {RunningLimitsErrorMessage} from '../../utils/instance/limiter';

const restartInstance: ApiAction<RestartInstanceRequest, RestartInstanceResponse> = async ({
    data,
}) => {
    try {
        const instance = await db.getInstance(data.hash);
        if (!instance) {
            return {ok: false, message: 'Instance not found'};
        }

        if (instance.status !== 'generated') {
            return {
                ok: false,
                message: 'Instance cannot be restarted',
            };
        }

        await instanceUtils.restartInstance(instance);

        return {ok: true, data};
    } catch (error) {
        let errMsg = 'Failed to restart instance';
        if (getErrorMessage(error) === RunningLimitsErrorMessage) {
            errMsg = RunningLimitsErrorMessage;
        }

        return {ok: false, message: errMsg, error};
    }
};

export default restartInstance;
