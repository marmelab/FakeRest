import { http } from 'msw';
import { setupWorker } from 'msw/browser';
import { getMswHandler } from '../src';
import { data } from './data';
import { dataProvider as defaultDataProvider } from './dataProvider';
import { middlewares } from './middlewares';

export const initializeMsw = async () => {
    const handler = getMswHandler({
        baseUrl: 'http://localhost:3000',
        data,
        middlewares,
    });
    const worker = setupWorker(http.all(/http:\/\/localhost:3000/, handler));
    return worker.start({
        quiet: true, // Instruct MSW to not log requests in the console
        onUnhandledRequest: 'bypass', // Instruct MSW to ignore requests we don't handle
    });
};

export const dataProvider = defaultDataProvider;
