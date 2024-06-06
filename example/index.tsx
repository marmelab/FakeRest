import React from 'react';
import ReactDom from 'react-dom';
import { App } from './App';

switch (import.meta.env.VITE_MOCK) {
    case 'fetch-mock':
        import('./fetchMock')
            .then(({ initializeFetchMock, dataProvider }) => {
                initializeFetchMock();
                return dataProvider;
            })
            .then((dataProvider) => {
                ReactDom.render(
                    <App dataProvider={dataProvider} />,
                    document.getElementById('root'),
                );
            });
        break;
    case 'sinon':
        import('./sinon')
            .then(({ initializeSinon, dataProvider }) => {
                initializeSinon();
                return dataProvider;
            })
            .then((dataProvider) => {
                ReactDom.render(
                    <App dataProvider={dataProvider} />,
                    document.getElementById('root'),
                );
            });
        break;
    default:
        import('./msw')
            .then(({ initializeMsw, dataProvider }) => {
                return initializeMsw().then(() => dataProvider);
            })
            .then((dataProvider) => {
                ReactDom.render(
                    <App dataProvider={dataProvider} />,
                    document.getElementById('root'),
                );
            });
}
