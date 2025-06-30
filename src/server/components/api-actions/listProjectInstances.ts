import type {
    ListProjectInstancesRequest,
    ListProjectInstancesResponse,
} from '../../../shared/api/listProjectInstances';
import type {ApiAction} from '../../../shared/common';
import {generateInstanceHref, generateUIHref} from '../../utils/common';
import * as db from '../../utils/db';

const listProjectInstances: ApiAction<
    ListProjectInstancesRequest,
    ListProjectInstancesResponse
> = async ({data, baseUrl}) => {
    const instances = (await db.listInstances()).filter((instance) => {
        if (data.hash && instance.hash !== data.hash) {
            return false;
        }

        if (data.vcs && (instance.project !== data.projectName || instance.vcs !== data.vcs)) {
            return false;
        }

        if (
            data.labels &&
            Object.keys(data.labels).some((key) => instance.labels?.[key] !== data.labels?.[key])
        ) {
            return false;
        }

        return instance.project === data.projectName;
    });

    const urls = instances.reduce<Record<string, string>>((acc, instance) => {
        const url = generateInstanceHref({
            project: instance.project,
            hash: instance.hash,
            urlTemplate: instance.urlTemplate,
        });

        acc[instance.hash] = url;
        return acc;
    }, {});

    const buildLogsUrls = instances.reduce<Record<string, string>>((acc, instance) => {
        const url = generateUIHref({
            hash: instance.hash,
            baseUrl: baseUrl ?? '',
        });

        acc[instance.hash] = url.buildLogs;
        return acc;
    }, {});

    return {ok: true, data: {instances, urls, buildLogsUrls}};
};

export default listProjectInstances;
