import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = createRoot(document.getElementById('root'));

switch (import.meta.env.VITE_MOCK) {
    case 'fetch-mock':
        import('./fetchMock')
            .then(({ initializeFetchMock, dataProvider }) => {
                initializeFetchMock();
                return dataProvider;
            })
            .then((dataProvider) => {
                root.render(<App dataProvider={dataProvider} />);
            });
        break;
    case 'sinon':
        import('./sinon')
            .then(({ initializeSinon, dataProvider }) => {
                initializeSinon();
                return dataProvider;
            })
            .then((dataProvider) => {
                root.render(<App dataProvider={dataProvider} />);
            });
        break;
    default:
        import('./msw')
            .then(({ initializeMsw, dataProvider }) => {
                return initializeMsw().then(() => dataProvider);
            })
            .then((dataProvider) => {
                root.render(<App dataProvider={dataProvider} />);
            });
}
