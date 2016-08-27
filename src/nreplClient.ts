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
    'file-name': string
}

interface nREPLStacktraceMessage {
    op: string;
    session: string;
}

export class nREPLClient {

    public host: string;
    public port: number;
    private client: net.Socket;

    public constructor(host: string, port: number) {
        this.host = host;
        this.port = port;
        this.client = net.createConnection(this.port, this.host);
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
        let msg: nREPLEvalMessage = {op: 'load-file', file: code, 'file-name': 'foo.clj'};
        this.send(msg, callback);
    }

    public stacktrace(session: string, callback) {
        let msg: nREPLStacktraceMessage = {op: 'stacktrace', session: session};
        this.send(msg, callback);
    }

    private send(msg: nREPLCompleteMessage | nREPLInfoMessage | nREPLEvalMessage | nREPLStacktraceMessage, callback) {
        let nreplResp = new Buffer('');
        this.client.on('connect', () => {
            let encodedMsg = Bencoder.encode(msg);
            this.client.write(encodedMsg.toString());
        });
        this.client.on('data', (data) => {
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