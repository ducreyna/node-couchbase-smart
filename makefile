all: lint test

lint:
	./node_modules/.bin/jshint ./lib/*.js

test:
	./node_modules/.bin/mocha test/*.js

.PHONY: all lint test
