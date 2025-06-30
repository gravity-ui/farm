import type {HttpStatusCode} from 'axios';

export interface QueryError {
    name?: string;
    message?: string;
    status?: HttpStatusCode;
}
