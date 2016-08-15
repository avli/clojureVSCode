'use strict';
var net = require('net');
var buffer_1 = require('buffer');
var Bencoder = require('bencoder');
var nREPLClient = (function () {
    function nREPLClient(host, port) {
        this.host = host;
        this.port = port;
    }
    nREPLClient.prototype.complete = function (symbol, callback) {
        var client = net.createConnection(this.port, this.host);
        var nreplResp = new buffer_1.Buffer('');
        client.on('connect', function () {
            var msg = { op: 'complete', symbol: symbol };
            var encodedMsg = Bencoder.encode(msg);
            client.write(encodedMsg.toString());
        });
        client.on('data', function (data) {
            try {
                nreplResp = buffer_1.Buffer.concat([nreplResp, data]);
                var completions = Bencoder.decode(nreplResp);
                callback(completions);
            }
            catch (error) {
            }
        });
    };
    return nREPLClient;
}());
exports.nREPLClient = nREPLClient;
//# sourceMappingURL=nreplClient.js.map