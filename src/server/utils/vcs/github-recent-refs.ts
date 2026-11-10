import axios, {type AxiosResponse} from 'axios';
import {LRUCache} from 'lru-cache';

import type {ListBranchesRequest} from '../../../shared/api/listBranches';
import {farmAxios} from '../envAxios';

type RefOptions = Pick<ListBranchesRequest, 'refType' | 'query'>;
interface ListRecentRefsParams extends RefOptions {
    hostname?: string;
    repositoryPath: string;
    defaultBranch?: string;
    token: string;
}
interface PushActivity {
    timestamp: string;
    activity_type: string;
    ref: string;
}
interface GraphQLRepository {
    [key: string]: {name: string} | null | undefined;
}
interface GraphQLResponse<T> {
    errors?: unknown[];
    data?: {repository?: T};
}

const request = axios.create({
    httpsAgent: farmAxios.defaults.httpsAgent,
    timeout: 5000,
});

const cache = new LRUCache<string, string[], ListRecentRefsParams>({
    max: 150,
    ttl: 60_000,
    fetchMethod: async (_key, _value, {context}) => {
        const refs = await fetchGithubRecentRefs(context);
        return context.query && refs.length === 0 ? undefined : refs;
    },
});

export async function listGithubRecentRefs(params: ListRecentRefsParams): Promise<string[]> {
    const refType = params.refType === undefined ? 'branch' : params.refType;
    const queryName = params.query;
    if (
        !['branch', 'tag'].includes(refType) ||
        (queryName !== undefined && (typeof queryName !== 'string' || queryName.length > 1024))
    ) {
        throw new Error('Failed to list recent refs');
    }
    const hostname = params.hostname || 'github.com';
    const defaultBranch = params.defaultBranch || 'main';
    const key = JSON.stringify([
        hostname.toLowerCase(),
        params.repositoryPath.toLowerCase(),
        defaultBranch,
        refType,
        queryName || null,
    ]);
    return (await cache.fetch(key, {context: params}))?.slice() ?? [];
}

async function fetchGithubRecentRefs(params: ListRecentRefsParams): Promise<string[]> {
    const refType = params.refType ?? 'branch';
    const queryName = params.query;
    const hostname = params.hostname || 'github.com';
    const defaultBranch = params.defaultBranch || 'main';
    try {
        const headers = {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            Authorization: `Bearer ${params.token}`,
        };
        const baseUrl = `https://api.${hostname}`;
        const [owner, repository] = params.repositoryPath.split('/');
        const graphql = async <T = GraphQLRepository>(fields: string): Promise<T> => {
            const query = `query{repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(repository)}){${fields}}}`;
            const {data: response} = await request<GraphQLResponse<T>>({
                method: 'POST',
                url: `${baseUrl}/graphql`,
                headers,
                data: {query},
            });
            if (response?.errors?.length || !response?.data?.repository)
                throw new Error('GitHub GraphQL response failed');
            return response.data.repository;
        };
        if (queryName) {
            const qualifiedName = `refs/${refType === 'tag' ? 'tags' : 'heads'}/${queryName}`;
            const result = await graphql(
                `ref(qualifiedName:${JSON.stringify(qualifiedName)}){name}`,
            );
            return result.ref?.name === queryName ? [queryName] : [];
        }
        if (refType === 'tag') {
            const result = await graphql<{refs?: {nodes: {name: string}[]}}>(
                'refs(refPrefix:"refs/tags/",first:30,orderBy:{field:TAG_COMMIT_DATE,direction:DESC}){nodes{name}}',
            );
            if (
                !Array.isArray(result.refs?.nodes) ||
                result.refs.nodes.some((node) => typeof node?.name !== 'string')
            )
                throw new Error('Invalid GitHub response');
            return result.refs.nodes.slice(0, 30).map((node) => node.name);
        }
        let activityUrl: string | undefined =
            `${baseUrl}/repos/${params.repositoryPath}/activity?activity_type=push&direction=desc&per_page=100`;
        const activity: PushActivity[] = [];
        for (let page = 0; page < 3 && activityUrl; page++) {
            const response: AxiosResponse<PushActivity[]> = await request<PushActivity[]>({
                method: 'GET',
                url: activityUrl,
                headers,
            });
            if (!Array.isArray(response.data)) throw new Error('Invalid GitHub response');
            activity.push(...response.data.slice(0, 100));
            const next: RegExpMatchArray | undefined | null =
                response.headers?.link?.match(/<([^>]+)>;\s*rel="next"/);
            activityUrl = next?.[1];
            if (activityUrl && new URL(activityUrl).origin !== new URL(baseUrl).origin)
                throw new Error('Invalid GitHub response');
        }
        const names = [defaultBranch];
        const seen = new Set(names);
        for (const item of activity.sort(
            (a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0),
        )) {
            if (
                item.activity_type !== 'push' ||
                typeof item.ref !== 'string' ||
                !item.ref.startsWith('refs/heads/')
            )
                continue;
            const name = item.ref.slice('refs/heads/'.length);
            if (name && !seen.has(name)) {
                seen.add(name);
                names.push(name);
            }
        }
        const refs = names
            .map(
                (name, index) =>
                    `b${index}:ref(qualifiedName:${JSON.stringify(`refs/heads/${name}`)}){name}`,
            )
            .join(' ');
        const result = await graphql(refs);
        return names.filter((name, index) => result[`b${index}`]?.name === name).slice(0, 30);
    } catch (error) {
        let detail = '';
        if (axios.isAxiosError(error)) {
            if (typeof error.response?.status === 'number')
                detail = ` (HTTP ${error.response.status})`;
            else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
                detail = ' (timeout)';
        } else if (error instanceof Error && error.message === 'GitHub GraphQL response failed') {
            detail = ' (GraphQL)';
        }
        throw new Error(`Failed to list recent refs${detail}`);
    }
}
