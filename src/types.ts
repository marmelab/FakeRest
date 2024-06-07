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

export type BaseResponse = {
    status: number;
    body?: Record<string, any> | Record<string, any>[];
    headers: { [key: string]: string };
};

export type FakeRestContext = {
    url?: string;
    headers?: Headers;
    method?: string;
    collection?: string;
    single?: string;
    requestBody: Record<string, any> | undefined;
    params: { [key: string]: any };
};

export type NormalizedRequest = Pick<
    FakeRestContext,
    'url' | 'method' | 'params' | 'requestBody' | 'headers'
>;

export type APIServer = {
    baseUrl?: string;
    handle: (context: FakeRestContext) => Promise<BaseResponse>;
};
