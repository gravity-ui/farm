export const uiRoutes = {
    project: '/project/:vcs/:projectName',
    queue: '/queue',
    instance: '/instance/:hash',
    instanceBuildLogs: '/instance/:hash/build-logs',
    instanceRunLogs: '/instance/:hash/run-logs',
    instanceCreate: '/instance/create',
    projects: '/',
} as const;
