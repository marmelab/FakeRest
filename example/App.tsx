import React from 'react';
import { Admin, ListGuesser, Resource } from 'react-admin';
import { dataProvider } from './dataProvider';

export const App = () => {
    return (
        <Admin dataProvider={dataProvider}>
            <Resource name="books" list={ListGuesser} />
            <Resource name="authors" list={ListGuesser} />
        </Admin>
    );
};
