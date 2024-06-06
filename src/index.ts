import {
    getSinonHandler,
    Server,
    SinonServer,
} from './adapters/SinonServer.js';
import {
    getFetchMockHandler,
    FetchServer,
    FetchMockServer,
} from './adapters/FetchMockServer.js';
import { getMswHandler, MswServer } from './adapters/MswServer.js';
import { Collection } from './Collection.js';
import { Single } from './Single.js';
import { withDelay } from './withDelay.js';

export {
    getSinonHandler,
    getFetchMockHandler,
    getMswHandler,
    Server,
    SinonServer,
    FetchServer,
    FetchMockServer,
    MswServer,
    Collection,
    Single,
    withDelay,
};

export default {
    getSinonHandler,
    getFetchMockHandler,
    getMswHandler,
    Server,
    SinonServer,
    FetchServer,
    FetchMockServer,
    MswServer,
    Collection,
    Single,
    withDelay,
};
