import React, {useCallback, useMemo, useState} from 'react';

import type {SelectOption} from '@gravity-ui/uikit';
import {Label, List, Select, TextInput} from '@gravity-ui/uikit';

import {LogText} from '../../../../../components/LogText/LogText';

import {i18n} from './i18n';

import * as styles from './LogViewer.module.scss';

type LogViewerProps = {
    name?: string;
    logs?: string;
    delimiter?: string;
    expanded?: string;
    changeNumItems?: (n: number) => void;
};

const logSizeItems: {content: string; value: number}[] = [
    {content: '100', value: 100},
    {content: '300', value: 300},
    {content: '500', value: 500},
    {content: '1000', value: 1000},
    {content: '5000', value: 5000},
];

function validateRegex(pattern: string) {
    const parts = pattern.split('/');
    let regex = pattern,
        options = '';
    if (parts.length > 1) {
        regex = parts[1];
        options = parts[2];
    }
    try {
        // eslint-disable-next-line no-new
        new RegExp(regex, options);
        return true;
    } catch (_err) {
        return false;
    }
}

export default function LogViewer(props: LogViewerProps) {
    const {name = '', logs = '', delimiter = '\n', changeNumItems} = props;

    const [filter, setFilter] = useState('');
    const [logSizeItem, setLogSizeItem] = useState(logSizeItems[1].content);

    const updateLogSizeItem = useCallback(
        ([s]: string[]) => {
            if (changeNumItems) {
                changeNumItems(Number(s));
            }
            setLogSizeItem(s);
        },
        [changeNumItems],
    );

    const splitLogs = useMemo(() => {
        const ret = logs.split(delimiter);
        if (filter) {
            const reMatch = filter.match(/^\/(.*)\/(g?i?)$/);
            if (reMatch && validateRegex(filter)) {
                const re = new RegExp(reMatch[1], reMatch[2] || undefined);
                const filterFn = (str: string) => Boolean(str.match(re));
                return ret.filter(filterFn);
            } else {
                const filterFn = (str: string) => str.indexOf(filter) !== -1;
                return ret.filter(filterFn);
            }
        }
        return ret;
    }, [logs, delimiter, filter]);

    return (
        <div className={styles.logViewer}>
            <div>
                <div className={styles.fields}>
                    <Label theme={name === 'stderr' ? 'danger' : 'info'} size="m">
                        {name}
                    </Label>
                    <span className={styles.filterGroup}>
                        <span className={styles.label}>{i18n('filter')}</span>
                        <span className={styles.filterControl}>
                            <TextInput
                                placeholder={i18n('filter-placeholder')}
                                onUpdate={setFilter}
                                value={filter}
                            />
                        </span>
                    </span>
                    <span className={styles.sizeGroup}>
                        <span className={styles.label}>{i18n('number-of-lines')}</span>
                        <span className={styles.control}>
                            <Select
                                placeholder={logSizeItems[1].content}
                                options={logSizeItems as unknown as SelectOption[]}
                                value={[logSizeItem]}
                                onUpdate={updateLogSizeItem}
                            />
                        </span>
                    </span>
                </div>
            </div>
            <div className={styles.logs}>
                <List
                    filterable={false}
                    items={splitLogs}
                    renderItem={(item) => {
                        return (
                            <pre className={styles.logItem}>
                                <LogText text={item} />
                            </pre>
                        );
                    }}
                    itemHeight={24}
                    virtualized={false}
                ></List>
            </div>
        </div>
    );
}
