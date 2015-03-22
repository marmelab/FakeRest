# FakeRest

Intercept XMLHttpRequest to fake a REST server based on JSON data. Use it on top of [Sinon.js](http://sinonjs.org/) to test JavaScript REST clients on the browser side (e.g. single page apps) without a server.

## Usage

```html
<script src="/path/to/FakeRest.min.js"></script>
<script src="/path/to/sinon.js"></script>
<script type="text/javascript">
// initialize fake REST server and data
var restServer = new FakeRest.Server();
restServer.init({
    'authors': [
        { id: 0, first_name: 'Leo', last_name: 'Tolstoi' },
        { id: 1, first_name: 'Jane', last_name: 'Austen' }
    ],
    'books': [
        { id: 0, author_id: 0, title: 'Anna Karenina' },
        { id: 1, author_id: 0, title: 'War and Peace' },
        { id: 2, author_id: 1, title: 'Pride and Prejudice' },
        { id: 2, author_id: 1, title: 'Sense and Sensibility' }
    ]
});
// use sinon.js to monkey-patch XmlHttpRequest
var server = sinon.fakeServer.create();
server.respondWith(restServer.handle.bind(restServer));

// Now query the fake REST server
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
</script>
```

## Installation

FakeRest is available through npm and Bower:

```sh
# If you use Bower
bower install fakerest --save-dev
# If you use npm
npm install fakerest --save-dev
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

FakeRest is licensed under the [MIT Licence](LICENSE), courtesy of [marmelab](http://marmelab.com).
