import type {Request, Response} from '@gravity-ui/expresskit';

import apiActions from '../components/api-actions';
import type {Stats} from '../utils/stats';
import {sendStats} from '../utils/stats';

export default async (req: Request, res: Response) => {
    const {action} = req.params;

    const startTime = Date.now();

    const stats: Stats = {
        timestamp: Date.now(),
        action,
        requestId: req.id,
        requestTime: 0,
        requestMethod: req.method,
        requestUrl: req.url,
        hash: '',
        responseStatus: 200,
    };

    if (!apiActions || !apiActions[action]) {
        stats.responseStatus = 404;
        stats.action = 'UNKNOWN_ACTION';
        stats.requestTime = Date.now() - startTime;

        sendStats(stats, req.ctx);
        res.status(404).send({code: 'UNKNOWN_ACTION'});
        return;
    }

    const {
        ok,
        data,
        message,
        status = 500,
    } = await apiActions[action]({
        data: req.method === 'POST' ? req.body || {} : req.query || {},
        ctx: req.ctx,
        baseUrl: req.protocol + '://' + req.hostname,
    });

    if (ok) {
        res.status(200).send(data);
    } else {
        stats.responseStatus = status;
        res.status(status).send({data, message});
    }

    stats.requestTime = Date.now() - startTime;

    if (req.body.hash) {
        stats.hash = req.body.hash;
    }

    sendStats(stats, req.ctx);
};
