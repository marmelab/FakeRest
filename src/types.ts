import type { SinonFakeXMLHttpRequest } from 'sinon';
import type { MockResponse } from 'fetch-mock';

export type CollectionItem = { [key: string]: any };

export type SortFunction = <T extends CollectionItem = CollectionItem>(
    a: T,
    b: T,
) => number;
export type Sort = string | [string, 'asc' | 'desc'] | SortFunction;

export type Range = [number, number] | [number];

export type FilterFunction = <T extends CollectionItem = CollectionItem>(
    item: T,
) => boolean;
export type FilterObject = CollectionItem & { q?: string };
export type Filter = FilterObject | FilterFunction;

export type Query = {
    filter?: Filter;
    sort?: Sort;
    range?: Range;
    embed?: Embed;
};

export type QueryFunction = (name: string) => Query;

export type Predicate = <T extends CollectionItem = CollectionItem>(
    item: T,
) => boolean;

export type Embed = string | string[];
