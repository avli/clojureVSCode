'use strict';

import * as net from 'net';
import {Buffer} from 'buffer';
import * as Bencoder from 'bencoder';

interface nREPLCompleteMessage {
    op: string;
    symbol: string;
    ns?: string
}

interface nREPLInfoMessage {
    op: string;
    symbol: string;
    ns: string;
}

interface nREPLEvalMessage {
    op: string;
    file: string;
    'file-path'?: string
}

interface nREPLStacktraceMessage {
    op: string;
    session: string;
}

export class nREPLClient {

    public host: string;
    public port: number;

    public constructor(port: number, host: string) {
        this.host = host;
        this.port = port;
    }

    public complete(symbol: string, ns: string, callback) {
        let msg: nREPLCompleteMessage = {op: 'complete', symbol: symbol, ns: ns};
        this.send(msg, callback);
    }

    public info(symbol: string, ns: string, callback) {
        let msg: nREPLInfoMessage = {op: 'info', symbol: symbol, ns: ns};
        this.send(msg, callback);
    }

    public eval(code: string, callback) {
        let msg: nREPLEvalMessage = {op: 'load-file', file: code};
        this.send(msg, callback);
    }

    public evalFile(code: string, filepath: string, callback) {
        let msg: nREPLEvalMessage = {op: 'load-file', file: code, 'file-path': filepath};
        this.send(msg, callback);
    }

    public stacktrace(session: string, callback) {
        let msg: nREPLStacktraceMessage = {op: 'stacktrace', session: session};
        this.send(msg, callback);
    }

    private send(msg: nREPLCompleteMessage | nREPLInfoMessage | nREPLEvalMessage | nREPLStacktraceMessage, callback) {
        // TODO: Return promise?
        let nreplResp = new Buffer('');
        let encodedMsg = Bencoder.encode(msg);
        const client = net.createConnection(this.port, this.host);
        client.on('error', (error) => {
            callback(false);
        }); 
        client.write(encodedMsg);
        client.on('data', (data) => {
            try {
                nreplResp = Buffer.concat([nreplResp, data]);
                let response = Bencoder.decode(nreplResp);
                callback(response);
            } catch (error) {
                // waiting for the rest of the response
            }
        });
    }
}