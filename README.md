# on-tasks [![Build Status](https://travis-ci.org/RackHD/on-tasks.svg?branch=master)](https://travis-ci.org/RackHD/on-tasks) [![Code Climate](https://codeclimate.com/github/RackHD/on-tasks/badges/gpa.svg)](https://codeclimate.com/github/RackHD/on-tasks) [![Coverage Status](https://coveralls.io/repos/RackHD/on-tasks/badge.svg?branch=master&service=github)](https://coveralls.io/github/RackHD/on-tasks?branch=master)


'on-tasks' are the job code, libraries and definitions (meant as a library of tasks) to be loaded and run by task graphs as needed.

Copyright 2015, EMC, Inc.

## installation

    rm -rf node_modules
    npm install

## CI/testing

To run tests from a developer console:

    npm test

To run tests and get coverage for CI:

    # verify hint/style
    ./node_modules/.bin/jshint -c .jshintrc --reporter=checkstyle lib index.js > checkstyle-result.xml || true
    ./node_modules/.bin/istanbul cover -x "**/spec/**" _mocha -- $(find spec -name '*-spec.js') -R xunit-file --require spec/helper.js
    ./node_modules/.bin/istanbul report cobertura
    # if you want HTML reports locally
    ./node_modules/.bin/istanbul report html
