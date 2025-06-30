import React from 'react';

import type {ErrorAction, ErrorViewProps} from '@gravity-ui/data-source';
import {NotFound} from '@gravity-ui/illustrations';
import {PlaceholderContainer, type PlaceholderContainerProps} from '@gravity-ui/uikit';
import {HttpStatusCode} from 'axios';

import type {QueryError} from '../../types';

import {i18n} from './i18n';

interface CustomAction extends ErrorAction {
    text?: string;
}

export type ErrorContainerProps = Omit<Partial<PlaceholderContainerProps>, 'action'> &
    Omit<ErrorViewProps<QueryError>, 'action'> & {
        action?: CustomAction;
    };

export const ErrorContainer = (props: ErrorContainerProps) => {
    const actions = React.useMemo(() => {
        const items = [];

        if (props.action) {
            items.push({
                text: props.action.text || i18n('try-again'),
                onClick: props.action.handler,
            });
        }

        return items;
    }, [props.action]);

    const {title, description} = React.useMemo(() => {
        const result = {
            title: props.title || props.error?.name,
            description: props.description || props.error?.message,
        };

        switch (props.error?.status) {
            case HttpStatusCode.NotFound:
                result.title = i18n('not-found');
                break;
            case HttpStatusCode.BadRequest:
                result.title = i18n('bad-request');
                break;
            case HttpStatusCode.InternalServerError:
                result.title = i18n('unexpected-error');
                break;
        }

        return result;
    }, [props.title, props.description, props.error]);

    return (
        <PlaceholderContainer
            {...props}
            title={title}
            description={description}
            actions={actions}
            image={<NotFound scale={160} />}
        />
    );
};
