import React, {useState} from 'react';

import {CircleQuestion, ClockArrowRotateLeft, Gear, Plus as PlusIcon} from '@gravity-ui/icons';
import type {MenuItem} from '@gravity-ui/navigation';
import {FooterItem} from '@gravity-ui/navigation';
import {Avatar, Flex, Link, List, Text} from '@gravity-ui/uikit';
import {Link as RouterLink, generatePath, matchPath, useMatch} from 'react-router-dom';

import type {HelpListItem} from '../../../../shared/common';
import {uiRoutes} from '../../../../shared/uiRoutes';
import {generateSearchParams} from '../../../utils/common';

import {type I18nKey, i18n} from './i18n';
import type {AboutItemProps, ItemProps, SettingsItemProps} from './types';

import * as styles from './Navigation.module.css';

export const AboutItem = ({compact, asideRef}: AboutItemProps) => {
    const [visible, setVisible] = useState(false);

    const items: HelpListItem[] = [
        ...window.FM.navigationHelpMenuConfiguration,
        {
            text: i18n('version', {
                version: window.FM.version,
            }),
            disabled: true,
            view: 'secondary',
        },
    ];

    const renderItem = (item: HelpListItem) =>
        item.url ? (
            <Link view="primary" href={item.url} target="_blank" className={styles.helpItem}>
                {item.i18nTextKey ? i18n(item.i18nTextKey as I18nKey) : item.text}
            </Link>
        ) : (
            <Text color={item.view} className={styles.helpItem}>
                {item.text}
            </Text>
        );

    return window.FM.version ? (
        <FooterItem
            item={{
                id: i18n('help'),
                icon: CircleQuestion,
                title: i18n('help'),
                current: visible,
                onItemClick: () => setVisible((curr) => !curr),
            }}
            compact={compact}
            enableTooltip={!visible}
            popupVisible={visible}
            popupAnchor={asideRef}
            onClosePopup={() => setVisible(false)}
            renderPopupContent={() => (
                <List<HelpListItem>
                    items={items}
                    filterable={false}
                    virtualized={false}
                    renderItem={renderItem}
                />
            )}
        />
    ) : null;
};

export const UserItem = ({compact}: ItemProps) => {
    const {login} = window.FM.user;

    const avatar = React.useMemo(
        () => <Avatar size="m" title={login} imgUrl={window.FM.user.avatarUrl} />,
        [login],
    );

    if (window.FM.noAuth) {
        return null;
    }

    return (
        <Flex>
            <div className={styles.avatar}>{avatar}</div>
            {!compact && <Text className={styles.login}>{login}</Text>}
        </Flex>
    );
};

interface CustomMenuItem extends MenuItem {
    to: string;
}

const ItemWrapper: CustomMenuItem['itemWrapper'] = (params, renderNode, {item}) => {
    const {to} = item as CustomMenuItem;
    return (
        <RouterLink className={styles.link} to={to}>
            {renderNode(params)}
        </RouterLink>
    );
};

export const useMenuItems = () => {
    const match = useMatch(uiRoutes.project);
    const activeRoute = {
        queue: Boolean(matchPath({path: uiRoutes.queue}, location.pathname)),
    };

    return React.useMemo(() => {
        const CreateInstanceItem: CustomMenuItem = {
            id: 'create',
            title: i18n('new-instance'),
            tooltipText: i18n('new-instance'),
            icon: PlusIcon,
            afterMoreButton: true,
            type: 'action',
            to: (() => {
                const project = match?.params?.projectName || '';

                const pathname = generatePath(uiRoutes.instanceCreate);

                if (project) {
                    const search = generateSearchParams({project});
                    return pathname + search;
                }

                return pathname;
            })(),
        };

        const OpenQueueItem: CustomMenuItem = {
            id: 'queue',
            title: i18n('queue'),
            tooltipText: i18n('queue'),
            icon: ClockArrowRotateLeft,
            afterMoreButton: true,
            current: activeRoute.queue,
            to: generatePath(uiRoutes.queue),
        };

        return [OpenQueueItem, CreateInstanceItem].map((item) => ({
            ...item,
            itemWrapper: ItemWrapper,
        }));
    }, [match, activeRoute.queue]);
};

export const SettingsItem = ({
    compact,
    asideRef,
    openSettings,
    setOpenSettings,
}: SettingsItemProps) => {
    return (
        <FooterItem
            item={{
                id: 'settings',
                title: i18n('settings'),
                tooltipText: i18n('settings'),
                icon: Gear,
                current: openSettings,
                onItemClick: () => setOpenSettings((curr) => !curr),
            }}
            compact={compact}
            popupAnchor={asideRef}
            popupVisible={openSettings}
            onClosePopup={() => setOpenSettings(false)}
        />
    );
};
