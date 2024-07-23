import React from 'react';
import {
    Admin,
    Create,
    type DataProvider,
    EditGuesser,
    ListGuesser,
    Resource,
    ShowGuesser,
    required,
    AutocompleteInput,
    ReferenceInput,
    SimpleForm,
    TextInput,
    Datagrid,
    List,
    TextField,
    SearchInput,
} from 'react-admin';
import authProvider from './authProvider';
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
                list={AuthorList}
                edit={EditGuesser}
                show={ShowGuesser}
                recordRepresentation={(record) =>
                    `${record.first_name} ${record.last_name}`
                }
            />
        </Admin>
    );
};

const AuthorList = () => (
    <List filters={[<SearchInput source="q" alwaysOn key="q" />]}>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="first_name" />
            <TextField source="last_name" />
        </Datagrid>
    </List>
);

// The default value for the title field should cause a server validation error as it's not unique
const BookCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="author_id" reference="authors">
                <AutocompleteInput validate={required()} />
            </ReferenceInput>
            <TextInput
                source="title"
                validate={required()}
                defaultValue="Anna Karenina"
            />
        </SimpleForm>
    </Create>
);
