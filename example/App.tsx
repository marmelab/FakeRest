import React from 'react';
import {
    Admin,
    Create,
    type DataProvider,
    EditGuesser,
    Resource,
    ShowGuesser,
    required,
    AutocompleteInput,
    ReferenceInput,
    SimpleForm,
    TextInput,
    SearchInput,
    Datagrid,
    List,
    TextField,
    FunctionField,
} from 'react-admin';

import authProvider from './authProvider';
import { QueryClient } from '@tanstack/react-query';

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
                list={BookList}
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
        <Datagrid>
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

const bookFilters = [
    <SearchInput source="q" alwaysOn key="q" />,
    <TextInput
        label="Author"
        source="author.last_name_q"
        key="author.last_name_q"
    />,
];

const BookList = () => (
    <List queryOptions={{ meta: { embed: ['author'] } }} filters={bookFilters}>
        <Datagrid>
            <TextField source="id" />
            <FunctionField
                label="Author"
                sortBy="author.last_name"
                render={(record) =>
                    record.author
                        ? `${record.author.first_name} ${record.author.last_name}`
                        : ''
                }
            />
            <TextField source="title" />
        </Datagrid>
    </List>
);
