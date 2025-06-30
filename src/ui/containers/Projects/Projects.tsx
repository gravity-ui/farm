import React from 'react';

import {useQueryData} from '@gravity-ui/data-source';
import {Star, StarFill} from '@gravity-ui/icons';
import {NoSearchResults} from '@gravity-ui/illustrations';
import {
    ActionTooltip,
    Button,
    Card,
    Flex,
    Icon,
    PlaceholderContainer,
    Text,
    sp,
} from '@gravity-ui/uikit';
import classNames from 'classnames';
import {generatePath, useNavigate} from 'react-router';

import type {Project} from '../../../shared/api/listProjects';
import {uiRoutes} from '../../../shared/uiRoutes';
import {ProjectLink} from '../../components/ProjectLink/ProjectLink';
import {DataLoader} from '../../components/data-source';
import {InstanceCount} from '../../components/instance/InstanceCount/InstanceCount';
import {Page} from '../../components/layouts/Page/Page';
import {listProjectsSource} from '../../data-sources';

import {useFavoriteProjects} from './hooks';
import {i18n} from './i18n';

import * as styles from './Projects.module.scss';

function ProjectCard({
    project,
    onToggleFavorite,
    isFavorite,
}: {
    project: Project;
    onToggleFavorite: (projectKey: string) => void;
    isFavorite: boolean;
}) {
    const navigate = useNavigate();
    const projectKey = `${project.name}-${project.vcs}`;

    const onClick = React.useCallback(() => {
        const href = generatePath(uiRoutes.project, {projectName: project.name, vcs: project.vcs});
        navigate(href);
    }, [navigate, project.name, project.vcs]);

    const onFavoriteClick = React.useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleFavorite(projectKey);
        },
        [onToggleFavorite, projectKey],
    );

    return (
        <Card type="action" onClick={onClick} className={classNames(styles.card, sp({p: 4}))}>
            <Flex direction="column" alignItems="flex-start" height="100px">
                <Flex justifyContent="space-between" alignItems="center" width="100%">
                    <Text variant="header-2">{project.name}</Text>
                    <Flex alignItems="center" gap={2}>
                        <ActionTooltip
                            title={
                                isFavorite
                                    ? i18n('remove-from-favorites')
                                    : i18n('add-to-favorites')
                            }
                        >
                            <Button
                                onClick={onFavoriteClick}
                                size="s"
                                view="flat"
                                className={classNames(styles.favoriteButton, {
                                    [styles.favorite]: isFavorite,
                                })}
                            >
                                <Icon data={isFavorite ? StarFill : Star} size={16} />
                            </Button>
                        </ActionTooltip>
                        <ProjectLink project={project.name} vcs={project.vcs} />
                    </Flex>
                </Flex>
                <InstanceCount
                    className={styles.instanceCount}
                    count={project?.items.length || 0}
                />
            </Flex>
        </Card>
    );
}

function ProjectsList({projects}: {projects: Project[] | undefined}) {
    const {favoriteProjects, regularProjects, toggleFavorite} = useFavoriteProjects(projects);

    if (!projects || projects.length === 0) {
        return <PlaceholderContainer title={i18n('empty-list')} image={<NoSearchResults />} />;
    }

    return (
        <Flex direction="column" gap={4}>
            {favoriteProjects.length > 0 && (
                <div className={styles.list}>
                    {favoriteProjects.map((project) => (
                        <ProjectCard
                            project={project}
                            key={project.name + project.vcs}
                            onToggleFavorite={toggleFavorite}
                            isFavorite={true}
                        />
                    ))}
                </div>
            )}

            {favoriteProjects.length > 0 && regularProjects.length > 0 && (
                <div className={styles.divider} />
            )}

            {regularProjects.length > 0 && (
                <div className={styles.list}>
                    {regularProjects.map((project, i) => (
                        <ProjectCard
                            project={project}
                            key={project.name + i}
                            onToggleFavorite={toggleFavorite}
                            isFavorite={false}
                        />
                    ))}
                </div>
            )}
        </Flex>
    );
}

export default function Projects() {
    const projectsQuery = useQueryData(listProjectsSource, {});

    return (
        <DataLoader
            status={projectsQuery.status}
            error={projectsQuery.error}
            errorAction={projectsQuery.refetch}
        >
            <Page header={i18n('title')}>
                <ProjectsList projects={projectsQuery.data} />
            </Page>
        </DataLoader>
    );
}
