import fetchMock from 'fetch-mock';
import { FetchMockAdapter } from '../src';
import { data } from './data';
import { dataProvider as defaultDataProvider } from './dataProvider';
import { middlewares } from './middlewares';

export const initializeFetchMock = () => {
    const restServer = new FetchMockAdapter({
        baseUrl: 'http://localhost:3000',
        data,
        loggingEnabled: true,
        middlewares,
    });
    if (window) {
        // @ts-ignore
        window.restServer = restServer; // give way to update data in the console
    }

    fetchMock.mock('begin:http://localhost:3000', restServer.getHandler());
};

export const dataProvider = defaultDataProvider;
