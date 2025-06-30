import React from 'react';

import {NotFound} from '@gravity-ui/illustrations';
import {PlaceholderContainer} from '@gravity-ui/uikit';

export const EmptyPage = ({message}: {message: string}) => {
    return <PlaceholderContainer image={<NotFound />} title={message} />;
};
