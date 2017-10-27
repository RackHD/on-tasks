// Copyright, 2017, Dell, Inc.
/* jshint node: true */

'use strict';

describe('JobUtils.WsmanTool', function() {
    var WsmanTool;
    var HttpTool;
    var sandbox;
    var runRequest;
    var setupRequest;

    before(function() {
        helper.setupInjector(
            _.flattenDeep([
                helper.require('/lib/utils/job-utils/wsman-tool.js')
            ])
        );
        WsmanTool = helper.injector.get('JobUtils.WsmanTool');
        HttpTool = helper.injector.get('HttpTool');
        sandbox = sinon.sandbox.create();
    });

    beforeEach(function() {
        runRequest = sandbox.stub(HttpTool.prototype, 'runRequest').resolves({
            httpStatusCode: 200,
            body: '{"a":1,"b":2}'
        });
        setupRequest = sandbox.stub(HttpTool.prototype, 'setupRequest').resolves();
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should respond without options', function() {
        var wsman = new WsmanTool('http://127.0.0.1:8000/path1');
        return wsman.clientRequest('/path2', 'GET', 'data1', 'Error')
        .then(function(response) {
            expect(setupRequest).to.be.calledWith({
                url: {
                    protocol: 'http',
                    host:  '127.0.0.1',
                    port:  '8000',
                    path: '/path2'
                },
                method: 'GET',
                credential: {},
                verifySSL: false,
                headers: {'Content-Type': 'application/json'},
                recvTimeoutMs: 30000,
                data: 'data1'
            });
            expect(response).to.deep.equal({
                httpStatusCode: 200,
                body: {a:1,b:2}
            });
        });
    });

    it('should respond with options', function() {
        var wsman = new WsmanTool('http://127.0.0.1:8000/path1', {
            verifySSL: true,
            recvTimeoutMs: 1000
        });
        return wsman.clientRequest('/path2', 'GET', 'data1', 'Error')
        .then(function(response) {
            expect(setupRequest).to.be.calledWith({
                url: {
                    protocol: 'http',
                    host:  '127.0.0.1',
                    port:  '8000',
                    path: '/path2'
                },
                method: 'GET',
                credential: {},
                verifySSL: true,
                headers: {'Content-Type': 'application/json'},
                recvTimeoutMs: 1000,
                data: 'data1'
            });
            expect(response).to.deep.equal({
                httpStatusCode: 200,
                body: {a:1,b:2}
            });
        });
    });

    it('should throw error when httpStatusCode > 206', function() {
        runRequest.restore();
        runRequest = sandbox.stub(HttpTool.prototype, 'runRequest').resolves({
            httpStatusCode: 400,
            body: {
                error: {
                    message: 'Body.Error.Message'
                }
            }
        });
        var wsman = new WsmanTool('http://127.0.0.1:8000/path1');
        expect(wsman.clientRequest('/path2', 'GET', 'data1', 'Error'))
        .to.be.rejectedWith('Body.Error.Message');
    });
});
