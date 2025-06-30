import type {
    GetInstancesConfigsRequest,
    GetInstancesConfigsResponse,
} from '../../../shared/api/getInstancesConfigs';
import type {ApiAction} from '../../../shared/common';
import {wrapInternalError} from '../../utils/common';
import {fetchProjectConfig} from '../../utils/farmJsonConfig';
import {getNodeKit} from '../node-kit';

const getInstancesConfigs: ApiAction<
    GetInstancesConfigsRequest,
    GetInstancesConfigsResponse
> = async ({data}) => {
    try {
        const configs = await fetchProjectConfig(data);
        const configNames = configs.preview.map((instanceConfig) => instanceConfig.name);

        return {ok: true, data: {configs: configNames}};
    } catch (e) {
        getNodeKit().ctx.logError('Error on fetch project config', wrapInternalError(e));
        return {ok: false, message: 'error happened trying to fetch config file'};
    }
};

export default getInstancesConfigs;
