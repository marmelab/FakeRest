# FakeRest [![Build Status](https://travis-ci.org/marmelab/FakeRest.svg?branch=master)](https://travis-ci.org/marmelab/FakeRest)

Intercept XMLHttpRequest to fake a REST server based on JSON data. Use it on top of [Sinon.js](http://sinonjs.org/) to test JavaScript REST clients on the browser side (e.g. single page apps) without a server.

## Usage

```html
<script src="/path/to/FakeRest.min.js"></script>
<script src="/path/to/sinon.js"></script>
<script type="text/javascript">
var data = {
    'authors': [
        { id: 0, first_name: 'Leo', last_name: 'Tolstoi' },
        { id: 1, first_name: 'Jane', last_name: 'Austen' }
    ],
    'books': [
        { id: 0, author_id: 0, title: 'Anna Karenina' },
        { id: 1, author_id: 0, title: 'War and Peace' },
        { id: 2, author_id: 1, title: 'Pride and Prejudice' },
        { id: 3, author_id: 1, title: 'Sense and Sensibility' }
    ]
};
// initialize fake REST server
var restServer = new FakeRest.Server();
restServer.init(data);
// use sinon.js to monkey-patch XmlHttpRequest
var server = sinon.fakeServer.create();
server.respondWith(restServer.getHandler());
</script>
```

FakeRest will now intercept every XmlHTTPResquest to the REST server. The handled routes are:

```
GET    /:resource
POST   /:resource
GET    /:resource/:id
PUT    /:resource/:id
PATCH  /:resource/:id
DELETE /:resource/:id
```

Let's see an example:

```js
// Query the fake REST server
var req = new XMLHttpRequest();
req.open("GET", "/authors", false);
req.send(null);
console.log(req.responseText);
// [
//    {"id":0,"first_name":"Leo","last_name":"Tolstoi"},
//    {"id":1,"first_name":"Jane","last_name":"Austen"}
// ]

var req = new XMLHttpRequest();
req.open("GET", "/books/3", false);
req.send(null);
console.log(req.responseText);
// {"id":3,"author_id":1,"title":"Sense and Sensibility"}

var req = new XMLHttpRequest();
req.open("POST", "/books", false);
req.send(JSON.stringify({ author_id: 1, title: 'Emma' }));
console.log(req.responseText);
// {"author_id":1,"title":"Emma","id":4}

// restore native XHR constructor
server.restore();
```

*Tip*: The `fakerServer` provided by Sinon.js is [available as a standalone library](http://sinonjs.org/docs/#server), without the entire stubbing framework. Simply add the following bower dependency:

```
devDependencies: {
  "sinon-server": "http://sinonjs.org/releases/sinon-server-1.14.1.js"
}
```

## Installation

FakeRest is available through npm and Bower:

```sh
# If you use Bower
bower install fakerest --save-dev
# If you use npm
npm install fakerest --save-dev
```

## REST Flavor

FakeRest uses a standard REST flavor, described below.

* `GET /foo` returns a JSON array. It accepts three query parameters: `filter`, `sort`, and `range`. It responds with a status 200 if there is no pagination, or 206 if the list of items is paginated. The response contains a mention of the total count in the `Content-Range` header.

        GET /books?filter={author_id:1}&embed=['author']&sort=['title','desc']&range=[0-9]

        HTTP 1.1 200 OK
        Content-Range: items 0-1/2
        Content-Type: application/json
        [
          { id: 3, author_id: 1, title: 'Sense and Sensibility', author: { id: 1, first_name: 'Jane', last_name: 'Austen' } },
          { id: 2, author_id: 1, title: 'Pride and Prejudice', author: { id: 1, first_name: 'Jane', last_name: 'Austen' } }
        ]

    The `filter` param must be a serialized object litteral describing the criteria to apply to the search query.

        GET /books?filter={author_id:1} // return books where author_id is equal to 1
        HTTP 1.1 200 OK
        Content-Range: items 0-1/2
        Content-Type: application/json
        [
          { id: 2, author_id: 1, title: 'Pride and Prejudice' },
          { id: 3, author_id: 1, title: 'Sense and Sensibility' }
        ]

        // array values are possible
        GET /books?filter={id:[2,3]} // return books where id is in [2,3]
        HTTP 1.1 200 OK
        Content-Range: items 0-1/2
        Content-Type: application/json
        [
          { id: 2, author_id: 1, title: 'Pride and Prejudice' },
          { id: 3, author_id: 1, title: 'Sense and Sensibility' }
        ]

        // use the special "q" filter to make a full-text search on all text fields
        GET /books?filter={q:'and'} // return books where any of the book properties contains the string 'and'

        HTTP 1.1 200 OK
        Content-Range: items 0-2/3
        Content-Type: application/json
        [
          { id: 1, author_id: 0, title: 'War and Peace' },
          { id: 2, author_id: 1, title: 'Pride and Prejudice' },
          { id: 3, author_id: 1, title: 'Sense and Sensibility' }
        ]

        // use _gt, _gte, _lte, or _lt suffix on filter names to make range queries
        GET /books?filter={price_lte:20} // return books where price is less than or equal to 20
        GET /books?filter={price_gt:20} // return books where price is greater than 20

        // when the filter object contains more than one property, the criteria combine with an AND logic
        GET /books?filter={published_at_gte:'2015-06-12',published_at_lte:'2015-06-15'} // return books published between two dates

    The `embed` param sets the related objects or collections to be embedded in the response.

        // embed author in books
        GET /books?embed=['author']
        HTTP 1.1 200 OK
        Content-Range: items 0-3/4
        Content-Type: application/json
        [
            { id: 0, author_id: 0, title: 'Anna Karenina', author: { id: 0, first_name: 'Leo', last_name: 'Tolstoi' } },
            { id: 1, author_id: 0, title: 'War and Peace', author: { id: 0, first_name: 'Leo', last_name: 'Tolstoi' } },
            { id: 2, author_id: 1, title: 'Pride and Prejudice', author: { id: 1, first_name: 'Jane', last_name: 'Austen' } },
            { id: 3, author_id: 1, title: 'Sense and Sensibility', author: { id: 1, first_name: 'Jane', last_name: 'Austen' } }
        ]

        // embed books in author
        GET /authors?embed=['books']
        HTTP 1.1 200 OK
        Content-Range: items 0-1/2
        Content-Type: application/json
        [
            { id: 0, first_name: 'Leo', last_name: 'Tolstoi', books: [{ id: 0, author_id: 0, title: 'Anna Karenina' }, { id: 1, author_id: 0, title: 'War and Peace' }] },
            { id: 1, first_name: 'Jane', last_name: 'Austen', books: [{ id: 2, author_id: 1, title: 'Pride and Prejudice' }, { id: 3, author_id: 1, title: 'Sense and Sensibility' }] }
        ]

        // you can embed several objects
        GET /authors?embed=['books', 'country']

    The `sort` param must be a serialized array literal defining first the property used for sorting, then the sorting direction.

        GET /author?sort=['date_of_birth','asc']  // return authors, the oldest first
        GET /author?sort=['date_of_birth','desc']  // return authors, the youngest first

    The `range` param defines the number of results by specifying the rank of the first and last result. The first result is #0.

        GET /books?range=[0-9] // return the first 10 books
        GET /books?range=[10-19] // return the 10 next books

* `POST /foo` returns a status 201 with a `Location` header for the newly created resource, and the new resource in the body.

        POST /books
        { author_id: 1, title: 'Emma' }

        HTTP 1.1 201 Created
        Location: /books/4
        Content-Type: application/json
        { "author_id": 1, "title": "Emma", "id": 4 }

* `GET /foo/:id` returns a JSON object, and a status 200, unless the resource doesn't exist

        GET /books/2

        HTTP 1.1 200 OK
        Content-Type: application/json
        { id: 2, author_id: 1, title: 'Pride and Prejudice' }

    The `embed` param sets the related objects or collections to be embedded in the response.

        GET /books/2?embed=['author']

        HTTP 1.1 200 OK
        Content-Type: application/json
        { id: 2, author_id: 1, title: 'Pride and Prejudice', author: { id: 1, first_name: 'Jane', last_name: 'Austen' } }

* `PUT /foo/:id` returns the modified JSON object, and a status 200, unless the resource doesn't exist
* `DELETE /foo/:id` returns the deleted JSON object, and a status 200, unless the resource doesn't exist

If the REST flavor you want to simulate differs from the one chosen for FakeRest, no problem: request and response interceptors will do the conversion (see below).

## Usage and Configuration

```js
// initialize a rest server with a custom base URL
var restServer = new FakeRest.Server('http://my.custom.domain'); // // only URLs starting wiyj my.custom.domain will be intercepted
restServer.toggleLogging(); // logging is off by default, enable it to see network calls in the console
// Set all JSON data at once - only if identifier name is 'id'
restServer.init(json);
// modify the request before FakeRest handles it, using a request interceptor
// request is {
//     url: '...',
//     headers: [...],
//     requestBody: '...',
//     json: ..., // parsed JSON body
//     queryString: '...',
//     params: {...} // parsed query string
// }
restServer.addRequestInterceptor(function(request) {
    var start = (request.params._start - 1) || 0;
    var end = request.params._end !== undefined ? (request.params._end - 1) : 19;
    request.params.range = [start, end];
    return request; // always return the modified input
});
// modify the response before FakeRest sends it, using a response interceptor
// response is {
//     status: ...,
//     headers: [...],
//     body: {...}
// }
restServer.addResponseInterceptor(function(response) {
    response.body = { data: response.body, status: response.status };
    return response; // always return the modified input
});
// set default query, e.g. to force embeds or filters
restServer.setDefaultQuery(function(resourceName) {
    if (resourceName == 'authors') return { embed: ['books'] }
    if (resourceName == 'books') return { filter: { published: true } }
    return {};
})
// enable batch request handler, i.e. allow API clients to query several resourecs into a single request
// see [Facebook's Batch Requests philosophy](https://developers.facebook.com/docs/graph-api/making-multiple-requests) for more details.
restServer.setBatchUrl('/batch');

// you can create more than one fake server to listen to several domains
var restServer2 = new FakeRest.Server('http://my.other.domain');
// Set data collection by collection - allows to customize the identifier name
var authorsCollection = new FakeRest.Collection([], '_id');
authorsCollection.addOne({ first_name: 'Leo', last_name: 'Tolstoi' }); // { _id: 0, first_name: 'Leo', last_name: 'Tolstoi' }
authorsCollection.addOne({ first_name: 'Jane', last_name: 'Austen' }); // { _id: 1, first_name: 'Jane', last_name: 'Austen' }
// collections have autoincremented identifier but accept identifiers already set
authorsCollection.addOne({ _id: 3, first_name: 'Marcel', last_name: 'Proust' }); // { _id: 3, first_name: 'Marcel', last_name: 'Proust' }
restServer2.addCollection('authors', authorsCollection);
// collections are mutable
authorsCollection.updateOne(1, { last_name: 'Doe' }); // { _id: 1, first_name: 'Jane', last_name: 'Doe' }
authorsCollection.removeOne(3); // { _id: 3, first_name: 'Marcel', last_name: 'Proust' }

var server = sinon.fakeServer.create();
server.autoRespond = true;
server.respondWith(restServer.getHandler());
server.respondWith(restServer2.getHandler());
```

## Development

```sh
# Install dependencies
make install
# Watch source files and recompile dist/FakeRest.js when anything is modified
make watch
# Run tests
make test
# Build minified version
make build
```

## License

FakeRest is licensed under the [MIT Licence](LICENSE), sponsored by [marmelab](http://marmelab.com).
