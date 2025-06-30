import React from 'react';

import {useQueryData} from '@gravity-ui/data-source';
import {CodeTrunk} from '@gravity-ui/icons';
import {Button, Icon} from '@gravity-ui/uikit';

import {getProjectRepoUrlSource} from '../../data-sources';

export interface ProjectLinkProps {
    project: string;
    vcs: string;
}

export function ProjectLink({project, vcs}: ProjectLinkProps) {
    const {data: url, isLoading} = useQueryData(getProjectRepoUrlSource, {project, vcs});
    const href = isLoading ? '' : url || '';

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={'project-link'}
            onClick={(evt) => {
                evt.stopPropagation();
                if (isLoading) {
                    evt.preventDefault();
                }
            }}
        >
            <Button view="outlined" size="l" loading={isLoading}>
                <Icon data={CodeTrunk} />
            </Button>
        </a>
    );
}
