import React from 'react';

import {useQueryData} from '@gravity-ui/data-source';
import {Flex, sp} from '@gravity-ui/uikit';
import {useParams} from 'react-router-dom';

import {EmptyPage} from '../../components/EmptyPage/EmptyPage';
import {ProjectLink} from '../../components/ProjectLink/ProjectLink';
import {DataLoader} from '../../components/data-source';
import {Page} from '../../components/layouts/Page/Page';
import {listInstancesSource} from '../../data-sources';

import Instances from './Instances';
import InstancesSkeleton from './InstancesSkeleton';
import {i18n} from './i18n';

type Params = {projectName: string; vcs: string};

interface InstancesHeaderProps {
    projectName: string;
    vcs: string;
}

function InstancesHeader({projectName, vcs}: InstancesHeaderProps) {
    return (
        <Flex alignItems="center">
            <ProjectLink project={projectName} vcs={vcs} />
            <span className={sp({ml: 2})}>{projectName}</span>
        </Flex>
    );
}

export default function Project() {
    const {projectName = '', vcs = window.FM.vcs} = useParams<Params>();

    const decodedProjectName = decodeURIComponent(projectName);

    const instancesQuery = useQueryData(listInstancesSource, {
        projectName: decodedProjectName,
        vcs: vcs,
    });

    return (
        <Page header={<InstancesHeader projectName={decodedProjectName} vcs={vcs} />}>
            <DataLoader
                status={instancesQuery.status}
                error={instancesQuery.error}
                LoadingView={InstancesSkeleton}
                errorAction={instancesQuery.refetch}
            >
                {instancesQuery.data?.length ? (
                    <Instances instances={instancesQuery.data} />
                ) : (
                    <EmptyPage message={i18n('no-instances')} />
                )}
            </DataLoader>
        </Page>
    );
}
