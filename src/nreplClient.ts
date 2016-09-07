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
    'file-path'?: string,
    session: string;
}

interface nREPLStacktraceMessage {
    op: string;
    session: string;
}

interface nREPLCloneMessage {
    op: string;
}

interface nREPLCloseMessage {
    op: string;
}

export class nREPLClient {

    private host: string;
    private port: number;
    private client: net.Socket;

    public constructor(port: number, host: string) {
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
        this.clone((new_session) => {
            let session_id = new_session['new-session'];
            let msg: nREPLEvalMessage = {op: 'load-file', file: code, session: session_id};
            this.send(msg, callback);
        })
    }

    public evalFile(code: string, filepath: string, callback) {
        this.clone((new_session) => {
            let session_id = new_session['new-session'];
            let msg: nREPLEvalMessage = {op: 'load-file', file: code, 'file-path': filepath, session: session_id};
            this.send(msg, callback);
        })
    }

    public stacktrace(session: string, callback) {
        let msg: nREPLStacktraceMessage = {op: 'stacktrace', session: session};
        this.send(msg, callback);
    }

    public clone(callback) {
        let msg = {op: 'clone'};
        this.send(msg, callback);
    }

    public close(callback) {
        let msg = {op: 'close'};
        this.send(msg, callback);
    }

    private send(msg: nREPLCompleteMessage | nREPLInfoMessage | nREPLEvalMessage | nREPLStacktraceMessage | nREPLCloneMessage | nREPLCloseMessage, callback) {
        // TODO: Return promise?
        let nreplResp = new Buffer('');
        let encodedMsg = Bencoder.encode(msg);
        // const client = net.createConnection(this.port, this.host);
        this.client.on('error', (error) => {
            callback(false);
        }); 
        this.client.write(encodedMsg);
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