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
    if (!data.projectName) {
        return {ok: true, data: {instances: [], urls: {}, buildLogsUrls: {}}};
    }

    const instances = (
        await db.listInstances({
            project: data.projectName,
            vcs: data.vcs || undefined,
            hash: data.hash || undefined,
        })
    ).filter((instance) => {
        if (
            data.labels &&
            Object.keys(data.labels).some((key) => instance.labels?.[key] !== data.labels?.[key])
        ) {
            return false;
        }

        return true;
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
