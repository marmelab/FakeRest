import React from 'react';
import ReactDom from 'react-dom';
import { App } from './App';

switch (import.meta.env.VITE_MOCK) {
    case 'fetch-mock':
        import('./fetchMock')
            .then(({ initializeFetchMock }) => {
                initializeFetchMock();
            })
            .then(() => {
                ReactDom.render(<App />, document.getElementById('root'));
            });
        break;
    default:
        import('./msw')
            .then(({ worker }) => {
                return worker.start();
            })
            .then(() => {
                ReactDom.render(<App />, document.getElementById('root'));
            });
}
