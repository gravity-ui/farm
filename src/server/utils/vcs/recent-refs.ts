import type {AxiosInstance, AxiosResponse} from 'axios';

import type {ListBranchesRequest} from '../../../shared/api/listBranches';

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

const cache = new Map<string, {expires: number; branches: string[]}>();
const inFlight = new Map<string, Promise<string[]>>();
const cacheLifetime = 60_000;

export async function listRecentRefs(
    params: ListRecentRefsParams,
    request: AxiosInstance,
): Promise<string[]> {
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
    for (const [entryKey, entry] of cache) {
        if (entry.expires <= Date.now()) cache.delete(entryKey);
    }
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.branches.slice();
    const existingRequest = inFlight.get(key);
    if (existingRequest) return (await existingRequest).slice();

    const pending = (async () => {
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
                    timeout: 5000,
                    data: {query},
                });
                if (response?.errors?.length || !response?.data?.repository) throw new Error();
                return response.data.repository;
            };
            const remember = (branches: string[]) => {
                while (cache.size >= 150) cache.delete(cache.keys().next().value!);
                cache.set(key, {expires: Date.now() + cacheLifetime, branches});
                return branches;
            };
            if (queryName) {
                const qualifiedName = `refs/${refType === 'tag' ? 'tags' : 'heads'}/${queryName}`;
                const result = await graphql(
                    `ref(qualifiedName:${JSON.stringify(qualifiedName)}){name}`,
                );
                return remember(result.ref?.name === queryName ? [queryName] : []);
            }
            if (refType === 'tag') {
                const result = await graphql<{refs?: {nodes: {name: string}[]}}>(
                    'refs(refPrefix:"refs/tags/",first:30,orderBy:{field:TAG_COMMIT_DATE,direction:DESC}){nodes{name}}',
                );
                if (
                    !Array.isArray(result.refs?.nodes) ||
                    result.refs.nodes.some((node) => typeof node?.name !== 'string')
                )
                    throw new Error();
                return remember(result.refs.nodes.slice(0, 30).map((node) => node.name));
            }
            let activityUrl: string | undefined =
                `${baseUrl}/repos/${params.repositoryPath}/activity?activity_type=push&direction=desc&per_page=100`;
            const activity: PushActivity[] = [];
            for (let page = 0; page < 3 && activityUrl; page++) {
                const response: AxiosResponse<PushActivity[]> = await request<PushActivity[]>({
                    method: 'GET',
                    url: activityUrl,
                    headers,
                    timeout: 5000,
                });
                if (!Array.isArray(response.data)) throw new Error();
                activity.push(...response.data.slice(0, 100));
                const next: RegExpMatchArray | undefined | null =
                    response.headers?.link?.match(/<([^>]+)>;\s*rel="next"/);
                activityUrl = next?.[1];
                if (activityUrl && new URL(activityUrl).origin !== new URL(baseUrl).origin)
                    throw new Error();
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
            return remember(
                names.filter((name, index) => result[`b${index}`]?.name === name).slice(0, 30),
            );
        } catch {
            throw new Error('Failed to list recent refs');
        }
    })();
    inFlight.set(key, pending);
    try {
        return (await pending).slice();
    } finally {
        inFlight.delete(key);
    }
}
