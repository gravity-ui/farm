import React, {useMemo} from 'react';

import transform from '@diplodoc/transform';
import {YfmStaticView} from '@gravity-ui/markdown-editor';

export interface YfmPreviewProps {
    value: string;
}

export function YfmPreview({value}: YfmPreviewProps) {
    const renderedValue = useMemo(() => {
        const {
            result: {html},
        } = transform(value);

        return html;
    }, [value]);

    return <YfmStaticView html={renderedValue} />;
}
