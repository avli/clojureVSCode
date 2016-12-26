'use strict';

import * as net from 'net';
import {Buffer} from 'buffer';

// import * as bencode from 'bencode';
const bencode = require('bencode');

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

    public constructor(port: number, host: string) {
        this.host = host;
        this.port = port;
    }

    public complete(symbol: string, ns: string, callback) {
        let msg: nREPLCompleteMessage = {op: 'complete', symbol: symbol, ns: ns};
        this.send(msg).then(respObjs => callback(respObjs[0]));
    }

    public info(symbol: string, ns: string, callback) {
        let msg: nREPLInfoMessage = {op: 'info', symbol: symbol, ns: ns};
        this.send(msg).then(respObjs => callback(respObjs[0]));
    }

    public eval(code: string): Promise<any[]> {
        return this.clone().then((new_session) => {
            let session_id = new_session['new-session'];
            let msg: nREPLEvalMessage = {op: 'load-file', file: code, session: session_id};
            return this.send(msg);
        });
    }

    public evalFile(code: string, filepath: string): Promise<any[]> {
        return this.clone().then((new_session) => {
            let session_id = new_session['new-session'];
            let msg: nREPLEvalMessage = {op: 'load-file', file: code, 'file-path': filepath, session: session_id};
            return this.send(msg);
        });
    }

    public stacktrace(session: string, callback) {
        let msg: nREPLStacktraceMessage = {op: 'stacktrace', session: session};
        this.send(msg).then(respObjs => callback(respObjs[0]));
    }

    public clone(): Promise<any[]> {
        let msg = {op: 'clone'};
        return this.send(msg).then(respObjs => respObjs[0]);
    }

    public close(callback) {
        let msg: nREPLCloseMessage = {op: 'close'};
        this.send(msg).then(respObjs => callback(respObjs));
    }

    private send(msg: nREPLCompleteMessage | nREPLInfoMessage | nREPLEvalMessage | nREPLStacktraceMessage | nREPLCloneMessage | nREPLCloseMessage): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            const client = net.createConnection(this.port, this.host);
            client.write(bencode.encode(msg), 'binary');

            client.on('error', error => {
                client.end();
                client.removeAllListeners();
                reject(error);
            });

            let nreplResp = new Buffer('');
            const respObjects = [];
            client.on('data', data => {
                try {
                    nreplResp = Buffer.concat([nreplResp, data]);
                    const respObject = bencode.decode(nreplResp, 'utf8');
                    respObjects.push(respObject);
                    nreplResp = new Buffer('');

                    if (respObject.status && respObject.status.indexOf('done') > -1) {
                        client.end();
                        client.removeAllListeners();
                        resolve(respObjects);
                    }
                } catch (error) {
                    // waiting for the rest of the response
                }
            });
        });
    }
}