'use strict';

import * as net from 'net';
import { Buffer } from 'buffer';

import * as bencodeUtil from './bencodeUtil';

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

interface nREPLSingleEvalMessage {
    op: string;
    code: string;
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
        const msg: nREPLCompleteMessage = { op: 'complete', symbol: symbol, ns: ns };
        this.send(msg).then(respObjs => callback(respObjs[0]));
    }

    public info(symbol: string, ns: string, callback) {
        const msg: nREPLInfoMessage = { op: 'info', symbol: symbol, ns: ns };
        this.send(msg).then(respObjs => callback(respObjs[0]));
    }

    public eval(code: string): Promise<any[]> {
        return this.clone().then((new_session) => {
            const session_id = new_session['new-session'];
            const msg: nREPLSingleEvalMessage = { op: 'eval', code: code, session: session_id };
            return this.send(msg);
        });
    }

    public evalFile(code: string, filepath: string): Promise<any[]> {
        return this.clone().then((new_session) => {
            const session_id = new_session['new-session'];
            const msg: nREPLEvalMessage = { op: 'load-file', file: code, 'file-path': filepath, session: session_id };
            return this.send(msg);
        });
    }

    public stacktrace(session: string): Promise<any> {
        const msg: nREPLStacktraceMessage = { op: 'stacktrace', session: session };
        return this.send(msg);
    }

    public clone(): Promise<any[]> {
        const msg = { op: 'clone' };
        return this.send(msg).then(respObjs => respObjs[0]);
    }

    public close(): Promise<any[]> {
        const msg: nREPLCloseMessage = { op: 'close' };
        return this.send(msg);
    }

    private send(msg: nREPLCompleteMessage | nREPLInfoMessage | nREPLEvalMessage | nREPLStacktraceMessage | nREPLCloneMessage | nREPLCloseMessage | nREPLSingleEvalMessage): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            const client = net.createConnection(this.port, this.host);
            client.write(bencodeUtil.encode(msg), 'binary');

            client.on('error', error => {
                client.end();
                client.removeAllListeners();
                reject(error);
            });

            let nreplResp = Buffer.from('');
            const respObjects = [];
            client.on('data', data => {
                nreplResp = Buffer.concat([nreplResp, data]);
                const { decodedObjects, rest } = bencodeUtil.decodeObjects(nreplResp);
                nreplResp = rest;
                const validDecodedObjects = decodedObjects.reduce((objs, obj) => {
                    if (!isLastNreplObject(objs))
                        objs.push(obj);
                    return objs;
                }, []);
                respObjects.push(...validDecodedObjects);

                if (isLastNreplObject(respObjects)) {
                    client.end();
                    client.removeAllListeners();
                    resolve(respObjects);
                }
            });
        });
    }
}

function isLastNreplObject(nreplObjects: any[]): boolean {
    const lastObj = [...nreplObjects].pop();
    return lastObj && lastObj.status && lastObj.status.indexOf('done') > -1;
}
