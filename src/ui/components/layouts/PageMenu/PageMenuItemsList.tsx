import React from 'react';

import classNames from 'classnames';
import {Link, generatePath, matchPath, useParams} from 'react-router-dom';

import type {PageMenuItemNext} from './types';

import * as styles from './PageMenu.module.scss';

interface ItemContentProps {
    item: PageMenuItemNext;
}

const ItemContent: React.FC<ItemContentProps> = ({item: {icon, title}}) => {
    return (
        <React.Fragment>
            {icon && <div className={styles.itemIcon}>{icon}</div>}

            <div>
                <div className={styles.itemTitle}>{title}</div>
            </div>
        </React.Fragment>
    );
};

interface LinkItemViewProps {
    item: PageMenuItemNext;
    active?: boolean;
}

const LinkItemView: React.FC<LinkItemViewProps> = ({item, active}) => {
    const {title, path, externalHref, handler} = item;
    const className = classNames(styles.itemLink, {
        [styles.itemLinkActive]: active,
    });
    const params = useParams();

    if (!title) {
        return null;
    }

    if (externalHref) {
        return (
            <Link
                to={externalHref}
                className={className}
                target="_blank"
                rel="noopener"
                title={title}
            >
                <ItemContent item={item} />
            </Link>
        );
    }
    if (path) {
        return (
            <Link to={generatePath(path, params)} title={title} className={className}>
                <ItemContent item={item} />
            </Link>
        );
    }

    if (handler) {
        return (
            <div
                title={title}
                className={classNames(
                    styles.itemLink,
                    {[styles.itemLinkActive]: active},
                    {[styles.itemLinkPointer]: true},
                )}
                onClick={handler}
            >
                <ItemContent item={item} />
            </div>
        );
    }

    return null;
};

interface ItemViewProps {
    item: PageMenuItemNext;
    itemIndex: number;
}

const ItemView: React.FC<ItemViewProps> = ({item}) => {
    const {path, withNestedPages} = item;

    const isPathMatches = Boolean(
        path &&
            matchPath(
                {
                    path: path,
                    // если опция включена, то url может не полностью совпадать
                    end: !withNestedPages,
                },
                location.pathname,
            ),
    );

    const content = <LinkItemView item={item} active={isPathMatches} />;

    return <li>{content}</li>;
};

interface PageMenuItemsListProps {
    items: PageMenuItemNext[];
}

export const PageMenuItemsList: React.FC<PageMenuItemsListProps> = ({items}) => {
    return (
        <ul className={styles.items}>
            {items.map(
                (item, index) =>
                    !item.hide && <ItemView key={index} itemIndex={index} item={item} />,
            )}
        </ul>
    );
};
