import type {Request, Response} from '@gravity-ui/expresskit';

export default (_req: Request, res: Response) => {
    res.send({result: 'pong'});
};
