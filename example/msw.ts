import { setupWorker } from 'msw/browser';
import { getMswHandlers } from '../src/FakeRest';
import { data } from './data';

export const worker = setupWorker(
    ...getMswHandlers({
        data,
    }),
);
