.PHONY: build test

install:
	@npm install
	@bower install

build-dev:
	@NODE_ENV=development npm run build

build:
	@NODE_ENV=production npm run build

watch:
	@NODE_ENV=development npm run build --watch

test:
	@npm run test
