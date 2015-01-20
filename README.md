# renasar-tasks

Tasks repository (meant as a library of tasks) to be loaded and run by task graphs as needed.

## installation

    rm -rf node_modules
    npm install


## CI/testing

To run tests from a developer console:


    npm test

To run tests and get coverage for CI:


    # verify hint/style
    ./node_modules/.bin/jshint -c .jshintrc --reporter=checkstyle lib index.js > checkstyle-result.xml || true
    ./node_modules/.bin/istanbul cover _mocha -- $(find spec -name '*-spec.js') -R xunit-file --require spec/helper.js
    ./node_modules/.bin/istanbul report cobertura
    ./node_modules/.bin/istanbul report text-summary