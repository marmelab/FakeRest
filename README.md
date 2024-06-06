# FakeRest

Intercept AJAX calls to fake a REST server based on JSON data. Use it on top of [Sinon.js](http://sinonjs.org/) (for `XMLHTTPRequest`) or [fetch-mock](https://github.com/wheresrhys/fetch-mock) (for `fetch`) to test JavaScript REST clients on the browser side (e.g. single page apps) without a server.

See it in action in the [react-admin](https://marmelab.com/react-admin/) [demo](https://marmelab.com/react-admin-demo) ([source code](https://github.com/marmelab/react-admin/tree/master/examples/demo)).

## Installation

### MSW

We recommend you use [MSW](https://mswjs.io/) to mock your API. This will allow you to inspect requests as you usually do in the devtools network tab.

First, install fakerest and MSW. Then initialize MSW:

```sh
npm install fakerest msw@latest --save-dev
npx msw init <PUBLIC_DIR> # eg: public
```

Then configure it:

```js
// in ./src/fakeServer.js
import { setupWorker } from "msw/browser";
import { getMswHandler } from "fakerest";

const data = {
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
};

export const worker = setupWorker(getMswHandler({
    baseUrl: 'http://localhost:3000',
    data
}));
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

Another option is to use the `MswServer` class. This is useful if you must conditionally include data or add middlewares:

```js
// in ./src/fakeServer.js
import { setupWorker } from "msw/browser";
import { MswServer } from "fakerest";

const data = {
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
};

const restServer = new MswServer({
    baseUrl: 'http://localhost:3000',
    data,
});

export const worker = setupWorker(restServer.getHandler());
```

FakeRest will now intercept every `fetch` requests to the REST server.

### Sinon

```js
// in ./src/fakeServer.js
import sinon from 'sinon';
import { getSinonHandler } from "fakerest";

const data = {
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
};

// use sinon.js to monkey-patch XmlHttpRequest
const sinonServer = sinon.fakeServer.create();
// this is required when doing asynchronous XmlHttpRequest
sinonServer.autoRespond = true;

sinonServer.respondWith(
    getSinonHandler({
        baseUrl: 'http://localhost:3000',
        data,
    })
);
```

Another option is to use the `SinonServer` class. This is useful if you must conditionally include data or add middlewares:

```js
// in ./src/fakeServer.js
import sinon from 'sinon';
import { SinonServer } from "fakerest";

const data = {
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
};

const restServer = new SinonServer({
    baseUrl: 'http://localhost:3000',
    data,
});

// use sinon.js to monkey-patch XmlHttpRequest
const sinonServer = sinon.fakeServer.create();
// this is required when doing asynchronous XmlHttpRequest
sinonServer.autoRespond = true;

sinonServer.respondWith(
    restServer.getHandler({
        baseUrl: 'http://localhost:3000',
        data,
    })
);
```

FakeRest will now intercept every `XmlHttpRequest` requests to the REST server.

### fetch-mock

First, install fakerest and fetch-mock:

```sh
npm install fakerest fetch-mock --save-dev
```

You can then initialize the `FetchMockServer`:

```js
// in ./src/fakeServer.js
import fetchMock from 'fetch-mock';
import { getFetchMockHandler } from "fakerest";

const data = {
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
};

fetchMock.mock(
    'begin:http://localhost:3000',
    getFetchMockHandler({ baseUrl: 'http://localhost:3000', data })
);
```

Another option is to use the `FetchMockServer` class. This is useful if you must conditionally include data or add middlewares:

```js
import fetchMock from 'fetch-mock';
import { FetchMockServer } from 'fakerest';

const data = {
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
};
const restServer = new FetchMockServer({
    baseUrl: 'http://localhost:3000',
    data
});
fetchMock.mock('begin:http://localhost:3000', restServer.getHandler());
```

FakeRest will now intercept every `fetch` requests to the REST server.

## REST Flavor

FakeRest defines a REST flavor, described below. It is inspired by commonly used ways how to handle aspects like filtering and sorting.

* `GET /foo` returns a JSON array. It accepts three query parameters: `filter`, `sort`, and `range`. It responds with a status 200 if there is no pagination, or 206 if the list of items is paginated. The response contains a mention of the total count in the `Content-Range` header.

        GET /books?filter={"author_id":1}&embed=["author"]&sort=["title","desc"]&range=[0-9]

        HTTP 1.1 200 OK
        Content-Range: items 0-1/2
        Content-Type: application/json
        [
          { "id": 3, "author_id": 1, "title": "Sense and Sensibility", "author": { "id": 1, "first_name": "Jane", "last_name": "Austen" } },
          { "id": 2, "author_id": 1, "title": "Pride and Prejudice", "author": { "id": 1, "first_name": "Jane", "last_name": "Austen" } }
        ]

    The `filter` param must be a serialized object literal describing the criteria to apply to the search query.

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

    The `sort` param must be a serialized array literal defining first the property used for sorting, then the sorting direction.

        GET /author?sort=["date_of_birth","asc"]  // return authors, the oldest first
        GET /author?sort=["date_of_birth","desc"]  // return authors, the youngest first

    The `range` param defines the number of results by specifying the rank of the first and last result. The first result is #0.

        GET /books?range=[0-9] // return the first 10 books
        GET /books?range=[10-19] // return the 10 next books

* `POST /foo` returns a status 201 with a `Location` header for the newly created resource, and the new resource in the body.

        POST /books
        { "author_id": 1, "title": "Emma" }

        HTTP 1.1 201 Created
        Location: /books/4
        Content-Type: application/json
        { "author_id": 1, "title": "Emma", "id": 4 }

* `GET /foo/:id` returns a JSON object, and a status 200, unless the resource doesn't exist

        GET /books/2

        HTTP 1.1 200 OK
        Content-Type: application/json
        { "id": 2, "author_id": 1, "title": "Pride and Prejudice" }

    The `embed` param sets the related objects or collections to be embedded in the response.

        GET /books/2?embed=['author']

        HTTP 1.1 200 OK
        Content-Type: application/json
        { "id": 2, "author_id": 1, "title": "Pride and Prejudice", "author": { "id": 1, "first_name": "Jane", "last_name": "Austen" } }

* `PUT /foo/:id` returns the modified JSON object, and a status 200, unless the resource doesn't exist
* `DELETE /foo/:id` returns the deleted JSON object, and a status 200, unless the resource doesn't exist

If the REST flavor you want to simulate differs from the one chosen for FakeRest, no problem: request and response interceptors will do the conversion (see below).  

Note that all of the above apply only to collections. Single objects respond to `GET /bar`, `PUT /bar` and `PATCH /bar` in a manner identical to those operations for `/foo/:id`, including embedding. `POST /bar` and `DELETE /bar` are not enabled.

## Supported Filters

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

## Middlewares

All fake servers supports middlewares that allows you to intercept requests and simulate server features such as:
    - authentication checks
    - server side validation
    - server dynamically generated values
    - simulate response delays

A middleware is a function that receive 3 parameters:
    - The `request` object, specific to the chosen mocking solution (e.g. a [`Request`](https://developer.mozilla.org/fr/docs/Web/API/Request) for MSW and `fetch-mock`, a fake [`XMLHttpRequest`](https://developer.mozilla.org/fr/docs/Web/API/XMLHttpRequest) for [Sinon](https://sinonjs.org/releases/v18/fake-xhr-and-server/))
    - The FakeRest `context`, an object containing the data extracted from the request that FakeRest uses to build the response. It has the following properties:
        - `url`: The request URL as a string
        - `method`: The request method as a string (`GET`, `POST`, `PATCH` or `PUT`)
        - `collection`: The name of the targeted [collection](#collection) (e.g. `posts`)
        - `single`: The name of the targeted [single](#single) (e.g. `settings`)
        - `requestJson`: The parsed request data if any
        - `params`: The request parameters from the URL search (e.g. the identifier of the requested record)
    - A `next` function to call the next middleware in the chain, to which you must pass the `request` and the `context`

A middleware must return a FakeRest response either by returning the result of the `next` function or by returning its own response. A FakeRest response is an object with the following properties:
    - `status`: The response status as a number (e.g. `200`)
    - `headers`: The response HTTP headers as an object where keys are header names
    - `body`: The response body which will be stringified

Except for Sinon, a middleware might also throw a response specific to the chosen mocking solution (e.g. a [`Response`](https://developer.mozilla.org/fr/docs/Web/API/Response) for MSW, a [`MockResponseObject`](https://www.wheresrhys.co.uk/fetch-mock/#api-mockingmock_response) or a [`Response`](https://developer.mozilla.org/fr/docs/Web/API/Response) for `fetch-mock`) for even more control.

### Authentication Checks

Here's to implement an authentication check:

```js
restServer.addMiddleware(async (request, context, next) => {
    if (request.requestHeaders.Authorization === undefined) {
        return {
            status: 401,
            headers: {},
        };
    }

    return next(request, context);
}
```

### Server Side Validation

Here's to implement server side validation:

```js
restServer.addMiddleware(async (request, context, next) => {
    if (
        context.collection === "books" &&
        request.method === "POST" &&
        !context.requestJson?.title
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

    return next(request, context);
}
```

### Server Dynamically Generated Values

Here's to implement server dynamically generated values:

```js
restServer.addMiddleware(async (request, context, next) => {
    if (
        context.collection === 'books' &&
        context.method === 'POST'
    ) {
        const response = await next(request, context);
        response.body.updatedAt = new Date().toISOString();
        return response;
    }

    return next(request, context);
}
```

### Simulate Response Delays

Here's to simulate response delays:

```js
restServer.addMiddleware(async (request, context, next) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(next(request, context));
        }, delayMs);
    });
});
```

This is so common FakeRest provides the `withDelay` function for that:

```js
import { withDelay } from 'fakerest';

restServer.addMiddleware(withDelay(300));
```

## Configuration

### Configure Identifiers Generation

By default, FakeRest uses an auto incremented sequence for the items identifiers. If you'd rather use UUIDs for instance but would like to avoid providing them when you insert new items, you can provide your own function:

```js
import FakeRest from 'fakerest';
import uuid from 'uuid';

const restServer = new FakeRest.SinonServer({ baseUrl: 'http://my.custom.domain', getNewId: () => uuid.v5() });
```

This can also be specified at the collection level:

```js
import FakeRest from 'fakerest';
import uuid from 'uuid';

const restServer = new FakeRest.SinonServer({ baseUrl: 'http://my.custom.domain' });
const authorsCollection = new FakeRest.Collection({ items: [], identifierName: '_id', getNewId: () => uuid.v5() });
```

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
