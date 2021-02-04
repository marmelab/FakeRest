.PHONY: build test

install:
	@npm install
	@bower install

build-dev:
	@${CURDIR}/node_modules/.bin/webpack

build:
	@${CURDIR}/node_modules/.bin/webpack --mode=production 

watch:
	@${CURDIR}/node_modules/.bin/webpack --watch

test:
	@npm run test
