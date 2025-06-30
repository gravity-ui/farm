import type {ErrorInfo} from 'react';
import React from 'react';

import {ErrorContainer} from '../data-source/components/ErrorContainer/ErrorContainer';

interface ErrorBoundaryProps extends React.PropsWithChildren {}

interface ErrorBoundaryState {
    error?: Error;
}

export class ErrorBoundary extends React.PureComponent<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {};

    componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
        this.setState({
            error,
        });
    }

    render() {
        const {children} = this.props;
        const {error} = this.state;

        if (error) {
            return this.renderError();
        }

        return children;
    }

    private renderError() {
        const {error} = this.state;

        if (!error) {
            return null;
        }

        return (
            <ErrorContainer
                error={error as any}
                action={{
                    handler: () => window.location.reload(),
                }}
            />
        );
    }
}
