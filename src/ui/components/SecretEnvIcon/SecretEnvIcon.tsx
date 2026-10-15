import React from 'react';

import {Lock} from '@gravity-ui/icons';
import {Icon, Tooltip} from '@gravity-ui/uikit';

import {ci18n} from '../../i18n-common/ci18n';

export const SecretEnvIcon = () => (
    <Tooltip content={ci18n('secret-variable')}>
        <span aria-label={ci18n('secret-variable')}>
            <Icon data={Lock} size={14} />
        </span>
    </Tooltip>
);
