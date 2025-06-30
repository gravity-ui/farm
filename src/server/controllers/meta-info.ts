import type {Request, Response} from '@gravity-ui/expresskit';

export default (req: Request, res: Response) => {
    const {appVersion} = req.ctx.config;

    if (!appVersion) {
        throw new Error('App version not found, use npm to start app');
    }

    res.json({appVersion});
};
