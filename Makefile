.PHONY: build test

install:
	@npm install

build-dev:
	@NODE_ENV=development npm run build

build:
	@NODE_ENV=production npm run build

run: run-msw

run-msw:
	@NODE_ENV=development VITE_MOCK=msw npm run dev

run-fetch-mock:
	@NODE_ENV=development VITE_MOCK=fetch-mock npm run dev

run-sinon:
	@NODE_ENV=development VITE_MOCK=sinon npm run dev

watch:
	@NODE_ENV=development npm run build --watch

test:
	@npm run test

format:
	@npm run format

lint:
	@npm run lint