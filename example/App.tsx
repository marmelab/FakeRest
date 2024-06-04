import React from 'react';
import {
    Admin,
    Create,
    type DataProvider,
    EditGuesser,
    ListGuesser,
    Resource,
    ShowGuesser,
} from 'react-admin';
import { QueryClient } from 'react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
        },
    },
});

export const App = ({ dataProvider }: { dataProvider: DataProvider }) => {
    return (
        <Admin
            dataProvider={dataProvider}
            authProvider={authProvider}
            queryClient={queryClient}
        >
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
                recordRepresentation={(record) =>
                    `${record.first_name} ${record.last_name}`
                }
            />
        </Admin>
    );
};

import { Edit, ReferenceInput, SimpleForm, TextInput } from 'react-admin';
import authProvider from './authProvider';

export const BookCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="author_id" reference="authors" />
            <TextInput source="title" />
        </SimpleForm>
    </Create>
);
