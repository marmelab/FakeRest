module.exports = function (config) {
    "use strict";

    config.set({
        basePath: '../',
        browsers: [process.env.CI ? 'PhantomJS' : 'Chrome'],
        files: [
            {pattern: 'node_modules/sinon/pkg/sinon.js', included: true},
            {pattern: 'dist/FakeRest.js', included: true},
            {pattern: 'test/function.bind.shim.js', included: true},

            // test files
            {pattern: 'test/src/**/*.js', included: true}
        ],
        frameworks: ['jasmine'],
        reporters: ['spec'],
        plugins: ['karma-spec-reporter', 'karma-jasmine', 'karma-chrome-launcher', 'karma-phantomjs-launcher']
    });
};
