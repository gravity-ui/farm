import React from 'react';

import {ActionBar} from '@gravity-ui/navigation';
import type {BreadcrumbsItemProps} from '@gravity-ui/uikit';
import {Breadcrumbs, Button} from '@gravity-ui/uikit';
import {generatePath, useHref, useLinkClickHandler} from 'react-router-dom';

import type {InstanceWithProviderStatus} from '../../../../shared/common';
import {uiRoutes} from '../../../../shared/uiRoutes';
import {useInstanceAvailableActions} from '../actions';

const RouterLink: React.FC<BreadcrumbsItemProps & {to: string}> = ({to, ...rest}) => {
    const href = useHref(to);
    const onClick = useLinkClickHandler(to);

    return <Breadcrumbs.Item {...rest} href={href} onClick={onClick} />;
};

export interface InstanceActionBarProps {
    instance: InstanceWithProviderStatus;
}

export const InstanceActionBar = ({instance}: InstanceActionBarProps) => {
    const {hash, project, vcs} = instance;
    const getActions = useInstanceAvailableActions();
    const actions = getActions(instance);

    return (
        <ActionBar>
            <ActionBar.Section type="primary">
                <ActionBar.Group pull="left" stretchContainer>
                    <ActionBar.Item pull="left-grow">
                        <Breadcrumbs itemComponent={RouterLink}>
                            <RouterLink
                                to={generatePath(uiRoutes.project, {
                                    projectName: project,
                                    vcs,
                                })}
                            >
                                {project}
                            </RouterLink>
                            <RouterLink to={generatePath(uiRoutes.instance, {hash})}>
                                {hash}
                            </RouterLink>
                        </Breadcrumbs>
                    </ActionBar.Item>
                </ActionBar.Group>
                <ActionBar.Group pull="right">
                    {actions.map((action) => (
                        <ActionBar.Item key={action.text}>
                            <Button
                                view={action.theme === 'danger' ? 'flat-danger' : 'flat'}
                                href={action.href}
                                onClick={action.handler}
                            >
                                {action.icon}
                                {action.text}
                            </Button>
                        </ActionBar.Item>
                    ))}
                </ActionBar.Group>
            </ActionBar.Section>
        </ActionBar>
    );
};

export interface InstanceSimpleActionBarProps {
    hash: string;
}

export const InstanceSimpleActionBar = ({hash}: InstanceSimpleActionBarProps) => {
    return (
        <ActionBar>
            <ActionBar.Section type="primary">
                <ActionBar.Group pull="left" stretchContainer>
                    <ActionBar.Item pull="left-grow">
                        <Breadcrumbs itemComponent={RouterLink}>
                            <RouterLink to={generatePath(uiRoutes.instance, {hash})}>
                                {hash}
                            </RouterLink>
                        </Breadcrumbs>
                    </ActionBar.Item>
                </ActionBar.Group>
            </ActionBar.Section>
        </ActionBar>
    );
};
