import type {
    GetInstanceConfigRequest,
    GetInstanceConfigResponse,
} from '../../../shared/api/getInstanceConfig';
import type {ApiAction} from '../../../shared/common';
import {wrapInternalError} from '../../utils/common';
import {fetchProjectConfig} from '../../utils/farmJsonConfig';
import {getNodeKit} from '../node-kit';

const getInstanceConfig: ApiAction<GetInstanceConfigRequest, GetInstanceConfigResponse> = async ({
    data,
}) => {
    try {
        const configs = await fetchProjectConfig(data);
        const config = configs.preview.find(
            (instanceConfig) => instanceConfig.name === data.instanceConfigName,
        );

        return {ok: true, data: {config}};
    } catch (e) {
        getNodeKit().ctx.logError('Error on fetch project config', wrapInternalError(e));
        return {ok: false, message: 'error happened trying to fetch config file'};
    }
};

export default getInstanceConfig;
