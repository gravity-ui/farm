import React, {useState} from 'react';

import {Palette} from '@gravity-ui/icons';
import type {AsideHeaderProps} from '@gravity-ui/navigation';
import {AsideHeader, Settings} from '@gravity-ui/navigation';
import type {ThemeType} from '@gravity-ui/uikit';
import {Lang, SegmentedRadioGroup, useTheme} from '@gravity-ui/uikit';
import {Link, generatePath} from 'react-router-dom';

import {uiRoutes} from '../../../../shared/uiRoutes';
import {ci18n} from '../../../i18n-common/ci18n';
import {setAppLang, useLang} from '../../../services/language';
import {setAppTheme} from '../../../services/theme';

import {i18n} from './i18n';
import {AboutItem, SettingsItem, UserItem, useMenuItems} from './items';
import type {NavigationProps} from './types';

import farmIcon from '../../../assets/icons/goose.svg';

import * as styles from './Navigation.module.css';

export const Navigation = ({compact: initIsCompact = true, children}: NavigationProps) => {
    const [compact, setCompact] = useState(initIsCompact);
    const [openSettings, setOpenSettings] = useState(false);
    const menuItems = useMenuItems();
    const theme = useTheme();
    const lang = useLang();

    const renderFooter: AsideHeaderProps['renderFooter'] = ({asideRef, compact}) => (
        <React.Fragment>
            <AboutItem compact={compact} asideRef={asideRef} />
            <SettingsItem
                compact={compact}
                asideRef={asideRef}
                openSettings={openSettings}
                setOpenSettings={setOpenSettings}
            />
            <UserItem compact={compact} />
        </React.Fragment>
    );

    const panelItems = React.useMemo(() => {
        const items = [
            {
                id: 'settings',
                visible: openSettings,
                children: (
                    <Settings onClose={() => setOpenSettings(false)}>
                        <Settings.Page title={i18n('title')} icon={{data: Palette}}>
                            <Settings.Section title={i18n('customization-title')}>
                                <Settings.Item title={i18n('theme')}>
                                    <SegmentedRadioGroup
                                        value={theme}
                                        onChange={(event) => {
                                            setAppTheme(event.target.value as ThemeType);
                                        }}
                                    >
                                        <SegmentedRadioGroup.Option value="light">
                                            {i18n('light')}
                                        </SegmentedRadioGroup.Option>
                                        <SegmentedRadioGroup.Option value="dark">
                                            {i18n('dark')}
                                        </SegmentedRadioGroup.Option>
                                    </SegmentedRadioGroup>
                                </Settings.Item>

                                <Settings.Item title={i18n('language')}>
                                    <SegmentedRadioGroup
                                        value={lang}
                                        onChange={(event) => {
                                            setAppLang(event.target.value as Lang);
                                        }}
                                    >
                                        <SegmentedRadioGroup.Option value={Lang.Ru}>
                                            {i18n('russian')}
                                        </SegmentedRadioGroup.Option>
                                        <SegmentedRadioGroup.Option value={Lang.En}>
                                            {i18n('english')}
                                        </SegmentedRadioGroup.Option>
                                    </SegmentedRadioGroup>
                                </Settings.Item>
                            </Settings.Section>
                        </Settings.Page>
                    </Settings>
                ),
            },
        ];

        return items;
    }, [lang, openSettings, theme]);

    return (
        <AsideHeader
            logo={{
                text: ci18n('farm-name'),
                icon: farmIcon,
                iconSize: 32,
                wrapper: (node) => {
                    return (
                        <Link className={styles.link} to={generatePath(uiRoutes.projects)}>
                            {node}
                        </Link>
                    );
                },
            }}
            className={styles.nav}
            headerDecoration
            menuItems={menuItems}
            compact={compact}
            onChangeCompact={setCompact}
            onClosePanel={() => setOpenSettings(false)}
            renderContent={() => children}
            renderFooter={renderFooter}
            panelItems={panelItems}
            multipleTooltip
        />
    );
};
