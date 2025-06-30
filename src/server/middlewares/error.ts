import type {AppErrorHandler} from '@gravity-ui/expresskit/dist/types';

const errorFn: AppErrorHandler = async (_err, _req, res, _next) => {
    res.status(500).send('Custom error');
};

export default errorFn;
