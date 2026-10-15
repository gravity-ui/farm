import React from 'react';

import {Lock} from '@gravity-ui/icons';
import {Icon, Tooltip} from '@gravity-ui/uikit';

import {ci18n} from '../../i18n-common/ci18n';

export const SecretEnvIcon = () => (
    <Tooltip content={ci18n('secret-variable')}>
        <span
            aria-label={ci18n('secret-variable')}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'middle',
                lineHeight: 0,
            }}
        >
            <Icon data={Lock} size={14} />
        </span>
    </Tooltip>
);
