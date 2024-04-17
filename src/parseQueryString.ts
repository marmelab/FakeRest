export function parseQueryString(queryString: string) {
    if (!queryString) {
        return {};
    }
    const queryObject: Record<string, any> = {};
    const queryElements = queryString.split('&');

    queryElements.map((queryElement) => {
        if (queryElement.indexOf('=') === -1) {
            queryObject[queryElement] = true;
        } else {
            let [key, value] = queryElement.split('=');
            if (value.indexOf('[') === 0 || value.indexOf('{') === 0) {
                value = JSON.parse(value);
            }
            queryObject[key.trim()] = value;
        }
    });

    return queryObject;
}
