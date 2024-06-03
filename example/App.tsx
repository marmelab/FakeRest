import React from 'react';
import {
    Admin,
    Create,
    EditGuesser,
    ListGuesser,
    Resource,
    ShowGuesser,
} from 'react-admin';
import { dataProvider } from './dataProvider';

export const App = () => {
    return (
        <Admin dataProvider={dataProvider}>
            <Resource
                name="books"
                list={ListGuesser}
                create={BookCreate}
                edit={EditGuesser}
                show={ShowGuesser}
            />
            <Resource
                name="authors"
                list={ListGuesser}
                edit={EditGuesser}
                show={ShowGuesser}
            />
        </Admin>
    );
};

import { Edit, ReferenceInput, SimpleForm, TextInput } from 'react-admin';

export const BookCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="author_id" reference="authors" />
            <TextInput source="title" />
        </SimpleForm>
    </Create>
);
