# FakeRest

Intercept AJAX calls to fake a REST server based on JSON data. Use it on top of [Sinon.js](http://sinonjs.org/) (for `XMLHTTPRequest`) or [fetch-mock](https://github.com/wheresrhys/fetch-mock) (for `fetch`) to test JavaScript REST clients on the browser side (e.g. single page apps) without a server.

See it in action in the [react-admin](https://marmelab.com/react-admin/) [demo](https://marmelab.com/react-admin-demo) ([source code](https://github.com/marmelab/react-admin/tree/master/examples/demo)).

## Usage

FakeRest lets you create a handler function that you can pass to an API mocking library. FakeRest supports [MSW](https://mswjs.io/), [fetch-mock](https://www.wheresrhys.co.uk/fetch-mock/), and [Sinon](https://sinonjs.org/releases/v18/fake-xhr-and-server/). If you have the choice, we recommend using MSW.

### MSW

We recommend you use [MSW](https://mswjs.io/) to mock your API. This will allow you to inspect requests as you usually do in the devtools network tab.

Install FakeRest and MSW, then initialize MSW:

```sh
npm install fakerest msw@latest --save-dev
npx msw init <PUBLIC_DIR> # eg: public
```

Then configure a MSW worker:

```js
// in ./src/fakeServer.js
import { setupWorker } from "msw/browser";
import { getMswHandler } from "fakerest";

const handler = getMswHandler({
    baseUrl: 'http://localhost:3000',
    data: {
        'authors': [
            { id: 0, first_name: 'Leo', last_name: 'Tolstoi' },
            { id: 1, first_name: 'Jane', last_name: 'Austen' }
        ],
        'books': [
            { id: 0, author_id: 0, title: 'Anna Karenina' },
            { id: 1, author_id: 0, title: 'War and Peace' },
            { id: 2, author_id: 1, title: 'Pride and Prejudice' },
            { id: 3, author_id: 1, title: 'Sense and Sensibility' }
        ],
        'settings': {
            language: 'english',
            preferred_format: 'hardback',
        }
    }
});
export const worker = setupWorker(handler);
```

Finally call the `worker.start()` method before rendering your application. For instance, in a Vite React application:

```js
import React from "react";
import ReactDom from "react-dom";
import { App } from "./App";
import { worker } from "./fakeServer";

worker.start({
    quiet: true, // Instruct MSW to not log requests in the console
    onUnhandledRequest: 'bypass', // Instruct MSW to ignore requests we don't handle
}).then(() => {
  ReactDom.render(<App />, document.getElementById("root"));
});
```

FakeRest will now intercept every `fetch` requests to the REST server.

### fetch-mock

First, install fakerest and [fetch-mock](https://www.wheresrhys.co.uk/fetch-mock/):

```sh
npm install fakerest fetch-mock --save-dev
```

You can then initialize the `FetchMockServer`:

```js
// in ./src/fakeServer.js
import fetchMock from 'fetch-mock';
import { getFetchMockHandler } from "fakerest";

const handler = getFetchMockHandler({
    baseUrl: 'http://localhost:3000',
    data: {
        'authors': [
            { id: 0, first_name: 'Leo', last_name: 'Tolstoi' },
            { id: 1, first_name: 'Jane', last_name: 'Austen' }
        ],
        'books': [
            { id: 0, author_id: 0, title: 'Anna Karenina' },
            { id: 1, author_id: 0, title: 'War and Peace' },
            { id: 2, author_id: 1, title: 'Pride and Prejudice' },
            { id: 3, author_id: 1, title: 'Sense and Sensibility' }
        ],
        'settings': {
            language: 'english',
            preferred_format: 'hardback',
        }
    }
});

fetchMock.mock('begin:http://localhost:3000', handler);
```

FakeRest will now intercept every `fetch` requests to the REST server.

### Sinon

Install FakeRest and [Sinon](https://sinonjs.org/releases/v18/fake-xhr-and-server/):

```sh
npm install fakerest sinon --save-dev
```

Then, configure a Sinon server:

```js
// in ./src/fakeServer.js
import sinon from 'sinon';
import { getSinonHandler } from "fakerest";

const handler = getSinonHandler({
    baseUrl: 'http://localhost:3000',
    data: {
        'authors': [
            { id: 0, first_name: 'Leo', last_name: 'Tolstoi' },
            { id: 1, first_name: 'Jane', last_name: 'Austen' }
        ],
        'books': [
            { id: 0, author_id: 0, title: 'Anna Karenina' },
            { id: 1, author_id: 0, title: 'War and Peace' },
            { id: 2, author_id: 1, title: 'Pride and Prejudice' },
            { id: 3, author_id: 1, title: 'Sense and Sensibility' }
        ],
        'settings': {
            language: 'english',
            preferred_format: 'hardback',
        }
    },
});

// use sinon.js to monkey-patch XmlHttpRequest
const sinonServer = sinon.fakeServer.create();
// this is required when doing asynchronous XmlHttpRequest
sinonServer.autoRespond = true;
sinonServer.respondWith(handler);
```

FakeRest will now intercept every `XmlHttpRequest` requests to the REST server.

## REST Syntax

FakeRest uses a simple a REST syntax described below.

### Get A Collection of records

`GET /[name]` returns an array or records in the `name` collection. It accepts 4 query parameters: `filter`, `sort`, `range`, and `embed`. It responds with a status 200 if there is no pagination, or 206 if the list of items is paginated. The response contains a mention of the total count in the `Content-Range` header.

    GET /books?filter={"author_id":1}&embed=["author"]&sort=["title","desc"]&range=[0-9]

    HTTP 1.1 200 OK
    Content-Range: items 0-1/2
    Content-Type: application/json
    [
        { "id": 3, "author_id": 1, "title": "Sense and Sensibility", "author": { "id": 1, "first_name": "Jane", "last_name": "Austen" } },
        { "id": 2, "author_id": 1, "title": "Pride and Prejudice", "author": { "id": 1, "first_name": "Jane", "last_name": "Austen" } }
    ]

The `filter` param must be a serialized object literal describing the criteria to apply to the search query. See the [supported filters](#supported-filters) for more details.

    GET /books?filter={"author_id":1} // return books where author_id is equal to 1
    HTTP 1.1 200 OK
    Content-Range: items 0-1/2
    Content-Type: application/json
    [
        { "id": 2, "author_id": 1, "title": "Pride and Prejudice" },
        { "id": 3, "author_id": 1, "title": "Sense and Sensibility" }
    ]

    // array values are possible
    GET /books?filter={"id":[2,3]} // return books where id is in [2,3]
    HTTP 1.1 200 OK
    Content-Range: items 0-1/2
    Content-Type: application/json
    [
        { "id": 2, "author_id": 1, "title": "Pride and Prejudice" },
        { "id": 3, "author_id": 1, "title": "Sense and Sensibility" }
    ]

    // use the special "q" filter to make a full-text search on all text fields
    GET /books?filter={"q":"and"} // return books where any of the book properties contains the string 'and'

    HTTP 1.1 200 OK
    Content-Range: items 0-2/3
    Content-Type: application/json
    [
        { "id": 1, "author_id": 0, "title": "War and Peace" },
        { "id": 2, "author_id": 1, "title": "Pride and Prejudice" },
        { "id": 3, "author_id": 1, "title": "Sense and Sensibility" }
    ]

    // use _gt, _gte, _lte, _lt, or _neq suffix on filter names to make range queries
    GET /books?filter={"price_lte":20} // return books where price is less than or equal to 20
    GET /books?filter={"price_gt":20} // return books where price is greater than 20

    // when the filter object contains more than one property, the criteria combine with an AND logic
    GET /books?filter={"published_at_gte":"2015-06-12","published_at_lte":"2015-06-15"} // return books published between two dates

The `sort` param must be a serialized array literal defining first the property used for sorting, then the sorting direction.

    GET /author?sort=["date_of_birth","asc"]  // return authors, the oldest first
    GET /author?sort=["date_of_birth","desc"]  // return authors, the youngest first

The `range` param defines the number of results by specifying the rank of the first and last result. The first result is #0.

    GET /books?range=[0-9] // return the first 10 books
    GET /books?range=[10-19] // return the 10 next books

The `embed` param sets the related objects or collections to be embedded in the response.

    // embed author in books
    GET /books?embed=["author"]
    HTTP 1.1 200 OK
    Content-Range: items 0-3/4
    Content-Type: application/json
    [
        { "id": 0, "author_id": 0, "title": "Anna Karenina", "author": { "id": 0, "first_name": "Leo", "last_name": "Tolstoi" } },
        { "id": 1, "author_id": 0, "title": "War and Peace", "author": { "id": 0, "first_name": "Leo", "last_name": "Tolstoi" } },
        { "id": 2, "author_id": 1, "title": "Pride and Prejudice", "author": { "id": 1, "first_name": "Jane", "last_name": "Austen" } },
        { "id": 3, "author_id": 1, "title": "Sense and Sensibility", "author": { "id": 1, "first_name": "Jane", "last_name": "Austen" } }
    ]

    // embed books in author
    GET /authors?embed=["books"]
    HTTP 1.1 200 OK
    Content-Range: items 0-1/2
    Content-Type: application/json
    [
        { id: 0, first_name: 'Leo', last_name: 'Tolstoi', books: [{ id: 0, author_id: 0, title: 'Anna Karenina' }, { id: 1, author_id: 0, title: 'War and Peace' }] },
        { id: 1, first_name: 'Jane', last_name: 'Austen', books: [{ id: 2, author_id: 1, title: 'Pride and Prejudice' }, { id: 3, author_id: 1, title: 'Sense and Sensibility' }] }
    ]

    // you can embed several objects
    GET /authors?embed=["books","country"]

### Get A Single Record

`GET /[name]/:id` returns a JSON object, and a status 200, unless the resource doesn't exist.

    GET /books/2

    HTTP 1.1 200 OK
    Content-Type: application/json
    { "id": 2, "author_id": 1, "title": "Pride and Prejudice" }

The `embed` param sets the related objects or collections to be embedded in the response.

    GET /books/2?embed=['author']

    HTTP 1.1 200 OK
    Content-Type: application/json
    { "id": 2, "author_id": 1, "title": "Pride and Prejudice", "author": { "id": 1, "first_name": "Jane", "last_name": "Austen" } }

### Create A Record

`POST /[name]` returns a status 201 with a `Location` header for the newly created resource, and the new resource in the body.

    POST /books
    { "author_id": 1, "title": "Emma" }

    HTTP 1.1 201 Created
    Location: /books/4
    Content-Type: application/json
    { "author_id": 1, "title": "Emma", "id": 4 }


### Update A  Record

`PUT /[name]/:id` returns the modified JSON object, and a status 200, unless the resource doesn't exist.

    PUT /books/2
    { "author_id": 1, "title": "Pride and Prejudice" }

    HTTP 1.1 200 OK
    Content-Type: application/json
    { "id": 2, "author_id": 1, "title": "Pride and Prejudice" }

### Delete A Single Record

`DELETE /[name]/:id` returns the deleted JSON object, and a status 200, unless the resource doesn't exist.

    DELETE /books/2

    HTTP 1.1 200 OK
    Content-Type: application/json
    { "id": 2, "author_id": 1, "title": "Pride and Prejudice" }

### Supported Filters

Operators are specified as suffixes on each filtered field. For instance, applying the `_lte` operator on the `price` field for the `books` resource is done by like this:

    GET /books?filter={"price_lte":20} // return books where price is less than or equal to 20

- `_eq`: check for equality on simple values:

        GET /books?filter={"price_eq":20} // return books where price is equal to 20

- `_neq`: check for inequality on simple values

        GET /books?filter={"price_neq":20} // return books where price is not equal to 20

- `_eq_any`: check for equality on any passed values

        GET /books?filter={"price_eq_any":[20, 30]} // return books where price is equal to 20 or 30

- `_neq_any`: check for inequality on any passed values

        GET /books?filter={"price_neq_any":[20, 30]} // return books where price is not equal to 20 nor 30

- `_inc_any`: check for items that includes any of the passed values

        GET /books?filter={"authors_inc_any":['William Gibson', 'Pat Cadigan']} // return books where authors includes either 'William Gibson' or 'Pat Cadigan' or both

- `_q`: check for items that contains the provided text

        GET /books?filter={"author_q":['Gibson']} // return books where author includes 'Gibson' not considering the other fields

- `_lt`: check for items that has a value lower than the provided value

        GET /books?filter={"price_lte":100} // return books that have a price lower that 100

- `_lte`: check for items that has a value lower or equal than the provided value

        GET /books?filter={"price_lte":100} // return books that have a price lower or equal to 100

- `_gt`: check for items that has a value greater than the provided value

        GET /books?filter={"price_gte":100} // return books that have a price greater that 100

- `_gte`: check for items that has a value greater or equal than the provided value

        GET /books?filter={"price_gte":100} // return books that have a price greater or equal to 100

### Single Elements

FakeRest allows you to define a single element, such as a user profile or global settings, that can be fetched, updated, or deleted.

    GET /settings

    HTTP 1.1 200 OK
    Content-Type: application/json
    { "language": "english", "preferred_format": "hardback" }

    PUT /settings
    { "language": "french", "preferred_format": "paperback" }

    HTTP 1.1 200 OK
    Content-Type: application/json
    { "language": "french", "preferred_format": "paperback" }

    DELETE /settings

    HTTP 1.1 200 OK
    Content-Type: application/json
    { "language": "french", "preferred_format": "paperback" }

## Middlewares

Middlewares let you to intercept requests and simulate server features such as:
    - authentication checks
    - server side validation
    - server dynamically generated values
    - simulate response delays

You can define middlewares on all handlers, by passing a `middlewares` option:

```js
import { getMswHandler } from 'fakerest';
import { data } from './data';

const handler = getMswHandler({
    baseUrl: 'http://my.custom.domain',
    data,
    middlewares: [
        async (context, next) => {
            if (context.headers.Authorization === undefined) {
                return {
                    status: 401,
                    headers: {},
                };
            }

            return next(context);
        },
        withDelay(300),
    ],
});
```

A middleware is a function that receive 2 parameters:
    - The FakeRest `context`, an object containing the data extracted from the request that FakeRest uses to build the response. It has the following properties:
        - `method`: The request method as a string (`GET`, `POST`, `PATCH` or `PUT`)
        - `url`: The request URL as a string
        - `headers`: The request headers as an object where keys are header names
        - `requestBody`: The parsed request data if any
        - `params`: The request parameters from the URL search (e.g. the identifier of the requested record)
        - `collection`: The name of the targeted [collection](#collection) (e.g. `posts`)
        - `single`: The name of the targeted [single](#single) (e.g. `settings`)
    - A `next` function to call the next middleware in the chain, to which you must pass the `context`

A middleware must return a FakeRest response either by returning the result of the `next` function or by returning its own response. A FakeRest response is an object with the following properties:
    - `status`: The response status as a number (e.g. `200`)
    - `headers`: The response HTTP headers as an object where keys are header names
    - `body`: The response body which will be stringified

### Authentication Checks

Here's how to implement an authentication check:

```js
const handler = getMswHandler({
    baseUrl: 'http://my.custom.domain',
    data,
    middlewares: [
        async (context, next) => {
            if (context.headers.Authorization === undefined) {
                return { status: 401, headers: {} };
            }
            return next(context);
        }
    ]
});
```

### Server-Side Validation

Here's how to implement server-side validation:

```js
const handler = getMswHandler({
    baseUrl: 'http://my.custom.domain',
    data,
    middlewares: [
        async (context, next) => {
            if (
                context.collection === "books" &&
                request.method === "POST" &&
                !context.requestBody?.title
            ) {
                return {
                    status: 400,
                    headers: {},
                    body: {
                        errors: {
                            title: 'An article with this title already exists. The title must be unique.',
                        },
                    },
                };
            }

            return next(context);
        }
    ]
});
```

### Dynamically Generated Values

Here's how to implement dynamically generated values on creation:

```js
const handler = getMswHandler({
    baseUrl: 'http://my.custom.domain',
    data,
    middlewares: [
        async (context, next) => {
            if (
                context.collection === 'books' &&
                context.method === 'POST'
            ) {
                const response = await next(context);
                response.body.updatedAt = new Date().toISOString();
                return response;
            }

            return next(context);
        }
    ]
});
```

### Simulate Response Delays

Here's how to simulate response delays:

```js
const handler = getMswHandler({
    baseUrl: 'http://my.custom.domain',
    data,
    middlewares: [
        async (context, next) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(next(context));
                }, 500);
            });
        }
    ]
});
```

This is so common FakeRest provides the `withDelay` function for that:

```js
import { getMswHandler, withDelay } from 'fakerest';

const handler = getMswHandler({
    baseUrl: 'http://my.custom.domain',
    data,
    middlewares: [
        withDelay(500), // delay in ms
    ]
});
```

## Configuration

All handlers can be customized to accomodate your API structure.

### Identifiers

By default, FakeRest assume all records have a unique `id` field.
Some database such as [MongoDB](https://www.mongodb.com) use `_id` instead of `id` for collection identifiers.
You can customize FakeRest to do the same by setting the `identifierName` option:

```js
const handler = getMswHandler({
    baseUrl: 'http://my.custom.domain',
    data,
    identifierName: '_id'
});
```

You can also specify that on a per-collection basis:

```js
import { MswAdapter, Collection } from 'fakerest';

const adapter = new MswAdapter({ baseUrl: 'http://my.custom.domain', data });
const authorsCollection = new Collection({ items: [], identifierName: '_id' });
adapter.server.addCollection('authors', authorsCollection);
const handler = adapter.getHandler();
```

### Primary Keys

By default, FakeRest uses an auto incremented sequence for the items identifiers.
If you'd rather use UUIDs for instance but would like to avoid providing them when you insert new items, you can provide your own function:

```js
import { getMswHandler } from 'fakerest';
import uuid from 'uuid';

const handler = new getMswHandler({
    baseUrl: 'http://my.custom.domain',
    data,
    getNewId: () => uuid.v5()
});
```

You can also specify that on a per-collection basis:

```js
import { MswAdapter, Collection } from 'fakerest';
import uuid from 'uuid';

const adapter = new MswAdapter({ baseUrl: 'http://my.custom.domain', data });
const authorsCollection = new Collection({ items: [], getNewId: () => uuid.v5() });
adapter.server.addCollection('authors', authorsCollection);
const handler = adapter.getHandler();
```

### Default Queries

Some APIs might enforce some parameters on queries. For instance, an API might always include an [embed](#embed) or enforce a query filter.
You can simulate this using the `defaultQuery` parameter:

```js
import { getMswHandler } from 'fakerest';
import uuid from 'uuid';

const handler = getMswHandler({
    baseUrl: 'http://my.custom.domain',
    data,
    defaultQuery: (collection) => {
        if (resourceName == 'authors') return { embed: ['books'] }
        if (resourceName == 'books') return { filter: { published: true } }
        return {};
    }
});
```

## Concepts

Behind a simple API (`getXXXHandler`), FakeRest uses a modular architecture that lets you combine different components to build a fake REST server that fits your needs.

### Mocking Adapter

`getXXXHandler` is a shortcut top an object-oriented API:

```js
export const getMswHandler = (options: MswAdapterOptions) => {
    const server = new MswAdapter(options);
    return server.getHandler();
};
```

FakeRest provides 3 adapter classes:

- `MswAdapter`: Based on [MSW](https://mswjs.io/)
- `FetchMockAdapter`: Based on [`fetch-mock`](https://www.wheresrhys.co.uk/fetch-mock/)
- `SinonAdapter`: Based on [Sinon](https://sinonjs.org/releases/v18/fake-xhr-and-server/)

You can use the adapter class directly, e.g. if you want to store the adapter instance in a variable:

```js
import { MsWAdapter } from 'fakerest';

const adapter = new MswAdapter({
    baseUrl: 'http://my.custom.domain',
    data: {
        'authors': [
            { id: 0, first_name: 'Leo', last_name: 'Tolstoi' },
            { id: 1, first_name: 'Jane', last_name: 'Austen' }
        ],
        'books': [
            { id: 0, author_id: 0, title: 'Anna Karenina' },
            { id: 1, author_id: 0, title: 'War and Peace' },
            { id: 2, author_id: 1, title: 'Pride and Prejudice' },
            { id: 3, author_id: 1, title: 'Sense and Sensibility' }
        ],
        'settings': {
            language: 'english',
            preferred_format: 'hardback',
        }
    }
});
window.fakerest = adapter;
const handler = adapter.getHandler();
```

### REST Server

The REST syntax is implemented by a Server object. It takes a normalized request and returns a normalized response. Adapters rely on the server to handle the REST API.

FakeRest currently provides only one server implementation: `SimpleRestServer`.

You can specify the server to use in an adapter by passing the `server` option:

```js
const server = new SimpleRestServer({
    baseUrl: 'http://my.custom.domain',
    data: {
        'authors': [
            { id: 0, first_name: 'Leo', last_name: 'Tolstoi' },
            { id: 1, first_name: 'Jane', last_name: 'Austen' }
        ],
        'books': [
            { id: 0, author_id: 0, title: 'Anna Karenina' },
            { id: 1, author_id: 0, title: 'War and Peace' },
            { id: 2, author_id: 1, title: 'Pride and Prejudice' },
            { id: 3, author_id: 1, title: 'Sense and Sensibility' }
        ],
        'settings': {
            language: 'english',
            preferred_format: 'hardback',
        }
    }
});
const adapter = new MswAdapter({ server });
const handler = adapter.getHandler();
```

### Database

The querying logic is implemented in a class called `Database`, which is independent of the server. It contains [collections](#collections) and [single](#single).

You can specify the database used by a server by setting its `database` property:

```js
const database = new Database({
    data: {
        'authors': [
            { id: 0, first_name: 'Leo', last_name: 'Tolstoi' },
            { id: 1, first_name: 'Jane', last_name: 'Austen' }
        ],
        'books': [
            { id: 0, author_id: 0, title: 'Anna Karenina' },
            { id: 1, author_id: 0, title: 'War and Peace' },
            { id: 2, author_id: 1, title: 'Pride and Prejudice' },
            { id: 3, author_id: 1, title: 'Sense and Sensibility' }
        ],
        'settings': {
            language: 'english',
            preferred_format: 'hardback',
        }
    }
});
const server = new SimpleRestServer({ baseUrl: 'http://my.custom.domain', database });
```

### Collections

The equivalent to a classic database table or document collection. It supports filtering.

### Single

Represent an API endpoint that returns a single entity. Useful for things such as user profile routes (`/me`) or global settings (`/settings`).

### Embeds

FakeRest support embedding other resources in a main resource query result. For instance, embedding the author of a book.

## Development

```sh
# Install dependencies
make install

# Run the demo with MSW
make run-msw

# Run the demo with fetch-mock
make run-fetch-mock

# Run the demo with sinon
make run-sinon

# Run tests
make test

# Build minified version
make build
```

You can sign-in to the demo with `janedoe` and `password`

## License

FakeRest is licensed under the [MIT License](LICENSE), sponsored by [marmelab](http://marmelab.com).
