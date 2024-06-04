import fetchMock from 'fetch-mock';
import FakeRest from 'fakerest';
import { data } from './data';

export const initializeFetchMock = () => {
    const restServer = new FakeRest.FetchServer({
        baseUrl: 'http://localhost:3000',
    });
    if (window) {
        // @ts-ignore
        window.restServer = restServer; // give way to update data in the console
    }
    restServer.init(data);
    restServer.toggleLogging(); // logging is off by default, enable it
    fetchMock.mock('begin:http://localhost:3000', restServer.getHandler());
};
