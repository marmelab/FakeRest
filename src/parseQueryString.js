export function parseQueryString(queryString) {
	if (!queryString) {
		return {};
	}
	const queryObject = {};
	const queryElements = queryString.split("&");

	queryElements.map((queryElement) => {
		if (queryElement.indexOf("=") === -1) {
			queryObject[queryElement] = true;
		} else {
			let [key, value] = queryElement.split("=");
			if (value.indexOf("[") === 0 || value.indexOf("{") === 0) {
				value = JSON.parse(value);
			}
			queryObject[key.trim()] = value;
		}
	});

	return queryObject;
}
