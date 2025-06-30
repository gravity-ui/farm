import React from 'react';

import {Navigate, Route, Routes} from 'react-router-dom';

import {uiRoutes} from '../../../shared/uiRoutes';
import {Navigation} from '../../components/layouts/Navigation/Navigation';
import {Create} from '../Create/Create';
import {InstanceBuildLogsPage} from '../Instance/pages/BuildLogs/BuildLogs';
import {InstanceOverviewPage} from '../Instance/pages/Overview';
import {InstanceRunLogsPage} from '../Instance/pages/RunLogs/InstanceLogs';
import Project from '../Project/Project';
import Projects from '../Projects/Projects';
import {Queue} from '../Queue/Queue';

const NotFound = () => <Navigate replace to={uiRoutes.projects} />;

const App = () => {
    return (
        <Navigation>
            <main>
                <Routes>
                    <Route path={uiRoutes.instanceCreate} element={<Create />} />
                    <Route path={uiRoutes.queue} element={<Queue />} />
                    <Route path={uiRoutes.project} element={<Project />} />
                    <Route path={uiRoutes.instance} element={<InstanceOverviewPage />} />
                    <Route path={uiRoutes.instanceBuildLogs} element={<InstanceBuildLogsPage />} />
                    <Route path={uiRoutes.instanceRunLogs} element={<InstanceRunLogsPage />} />
                    <Route path={uiRoutes.projects} element={<Projects />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
        </Navigation>
    );
};

export default App;
