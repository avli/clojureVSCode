import * as vscode from 'vscode';
import * as net from 'net';
import { Buffer } from 'buffer';

import * as bencodeUtil from './bencodeUtil';
import { cljConnection, CljConnectionInformation } from './cljConnection';
import { resolve } from 'url';

interface nREPLCompleteMessage {
    id: string,
    op: string;
    symbol: string;
    ns?: string
}

interface nREPLInfoMessage {
    id: string,
    op: string;
    symbol: string;
    ns: string;
    session?: string;
}

type TestMessage = {
    op: "test" | "test-all" | "test-stacktrace" | "retest"
    ns?: string,
    'load?'?: any
}

interface nREPLEvalMessage {
    id: string,
    op: string;
    file: string;
    'file-path'?: string;
    session: string;
}

interface nREPLSingleEvalMessage {
    id: string,
    op: string;
    code: string;
    session: string;
}

interface nREPLStacktraceMessage {
    id: string,
    op: string;
    session: string;
}

interface nREPLCloneMessage {
    id: string,
    op: string;
    session?: string;
}

interface nREPLCloseMessage {
    id: string,
    op: string;
    session?: string;
}

const complete = (symbol: string, ns: string): Promise<any> => {
    const msg: nREPLCompleteMessage = { id: create_UUID(), op: 'complete', symbol, ns };
    return send(msg).then(respObjs => respObjs[0]);
};

const info = (symbol: string, ns: string, session?: string): Promise<any> => {
    const msg: nREPLInfoMessage = { id: create_UUID(), op: 'info', symbol, ns, session };
    return send(msg).then(respObjs => respObjs[0]);
};

const evaluate = (code: string, session?: string): Promise<any[]> => (!session ? clone(session) : Promise.resolve(session)).then((session_id) => {
    const msg: nREPLSingleEvalMessage = { id: create_UUID(), op: 'eval', code: code, session: session_id };
    return send(msg);
});

const evaluateFile = (code: string, filepath: string, session?: string): Promise<any[]> => (!session ? clone(session) : Promise.resolve(session)).then((session_id) => {
    const msg: nREPLEvalMessage = { id: create_UUID(), op: 'load-file', file: code, 'file-path': filepath, session: session_id };
    return send(msg);
});

const stacktrace = (session: string): Promise<any> => send({ id: create_UUID(), op: 'stacktrace', session: session });

const runTests = function (namespace: string | undefined): Promise<any[]> {
    const message: TestMessage = {
        op: (namespace ? "test" : "test-all"),
        ns: namespace,
        'load?': 1
    }
    return send(message);
}


const clone = (session?: string): Promise<string> => send({ id: create_UUID(), op: 'clone', session: session }).then(respObjs => respObjs[0]['new-session']);

const test = (connectionInfo: CljConnectionInformation): Promise<any[]> => {
    return send({ id: create_UUID(), op: 'clone' }, connectionInfo)
        .then(respObjs => respObjs[0])
        .then(response => {
            if (!('new-session' in response))
                return Promise.reject(false);
            else {
                return Promise.resolve([]);
            }
        });
};

const close = (session?: string): Promise<any[]> => send({ id: create_UUID(), op: 'close', session: session });

const listSessions = (): Promise<[string]> => {
    return send({ id: create_UUID(), op: 'ls-sessions' }).then(respObjs => {
        const response = respObjs[0];
        if (response.status[0] == "done") {
            return Promise.resolve(response.sessions);
        }
    });
}

type Message = TestMessage | nREPLCompleteMessage | nREPLInfoMessage | nREPLEvalMessage | nREPLStacktraceMessage | nREPLCloneMessage | nREPLCloseMessage | nREPLSingleEvalMessage;

const send = (msg: Message, connection?: CljConnectionInformation): Promise<any[]> => {

    console.log("nREPL: Sending op", msg);

    return new Promise<any[]>((resolve, reject) => {
        connection = connection || cljConnection.getConnection();

        if (!connection)
            return reject('No connection found.');

        const client = net.createConnection(connection.port, connection.host);
        Object.keys(msg).forEach(key => (msg as any)[key] === undefined && delete (msg as any)[key]);
        client.write(bencodeUtil.encode(msg), 'binary');

        client.on('error', error => {
            client.end();
            client.removeAllListeners();
            if ((error as any)['code'] === 'ECONNREFUSED') {
                vscode.window.showErrorMessage('Connection refused.');
                cljConnection.disconnect();
            }
            reject(error);
        });

        let nreplResp = Buffer.from('');
        const respObjects: any[] = [];
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
};

const isLastNreplObject = (nreplObjects: any[]): boolean => {
    const lastObj = [...nreplObjects].pop();
    return lastObj && lastObj.status && lastObj.status.indexOf('done') > -1;
}

const create_UUID = () => {
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}


export const nreplClient = {
    complete,
    info,
    evaluate,
    evaluateFile,
    stacktrace,
    clone,
    test,
    runTests,
    close,
    listSessions
};
