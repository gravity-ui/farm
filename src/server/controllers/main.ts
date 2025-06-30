import type {Request, Response} from '@gravity-ui/expresskit';

import {createLayout} from '../utils/create-layout';

export default async (req: Request, res: Response) => {
    res.send(await createLayout('main', req, res));
};
