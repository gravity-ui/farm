import type {ExpressCSPParams} from 'express-csp-header';
import {INLINE, NONCE, SELF} from 'express-csp-header';

/**
 * @description Get final configuration from core registry
 */
export function getDefaultCspDirectives(): ExpressCSPParams['directives'] {
    return {
        'default-src': [SELF, "'unsafe-eval'", "'unsafe-inline'", '%nonce%'],
        'script-src': [SELF, INLINE, NONCE, "'unsafe-inline'", 'blob:'],
        'style-src': [SELF, INLINE, 'data:'],
        'style-src-attr': [INLINE],
        'script-src-elem': [SELF, INLINE],
        'img-src': [SELF, 'data:'],
        'font-src': [SELF, 'data:'],
        'connect-src': [SELF, 'wss:'],
        'frame-src': [SELF],
        'frame-ancestors': [SELF],
        'child-src': [SELF],
    };
}
