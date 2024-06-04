import { getSinonHandler, Server, SinonServer } from './SinonServer.js';
import {
    getFetchMockHandler,
    FetchServer,
    FetchMockServer,
} from './FetchMockServer.js';
import { Collection } from './Collection.js';
import { Single } from './Single.js';
import { getMswHandlers, MswServer } from './msw.js';
import { withDelay } from './withDelay.js';

export {
    getSinonHandler,
    getFetchMockHandler,
    getMswHandlers,
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
    getMswHandlers,
    Server,
    SinonServer,
    FetchServer,
    FetchMockServer,
    MswServer,
    Collection,
    Single,
    withDelay,
};
