import * as vscode from 'vscode';
import * as net from 'net';
import { Buffer } from 'buffer';

import * as bencodeUtil from './bencodeUtil';
import { cljConnection, CljConnectionInformation } from './cljConnection';

interface nREPLCompleteMessage {
    op: string;
    symbol: string;
    ns?: string
}

interface nREPLInfoMessage {
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
    op: string;
    file: string;
    'file-path'?: string;
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
    session?: string;
}

interface nREPLCloseMessage {
    op: string;
    session?: string;
}

const complete = (symbol: string, ns: string): Promise<any> => {
    const msg: nREPLCompleteMessage = { op: 'complete', symbol, ns };
    return send(msg).then(respObjs => respObjs[0]);
};

const info = (symbol: string, ns: string, session?: string): Promise<any> => {
    const msg: nREPLInfoMessage = { op: 'info', symbol, ns, session };
    return send(msg).then(respObjs => respObjs[0]);
};

const evaluate = (code: string, session?: string): Promise<any[]> => clone(session).then((session_id) => {
    const msg: nREPLSingleEvalMessage = { op: 'eval', code: code, session: session_id };
    return send(msg);
});

const evaluateFile = (code: string, filepath: string, session?: string): Promise<any[]> => clone(session).then((session_id) => {
    const msg: nREPLEvalMessage = { op: 'load-file', file: code, 'file-path': filepath, session: session_id };
    return send(msg);
});

const stacktrace = (session: string): Promise<any> => send({ op: 'stacktrace', session: session });

const runTests = function (namespace: string | undefined): Promise<any[]> {
    const message: TestMessage = {
        op: (namespace ? "test" : "test-all"),
        ns: namespace,
        'load?': 1
    }
    return send(message);
}


const clone = (session?: string): Promise<string> => send({ op: 'clone', session: session }).then(respObjs => respObjs[0]['new-session']);

const test = (connectionInfo: CljConnectionInformation): Promise<any[]> => {
    return send({ op: 'clone' }, connectionInfo)
        .then(respObjs => respObjs[0])
        .then(response => {
            if (!('new-session' in response))
                return Promise.reject(false);
            else {
                return Promise.resolve([]);
            }
        });
};

const close = (session?: string): Promise<any[]> => send({ op: 'close', session: session });

const listSessions = (): Promise<[string]> => {
    return send({ op: 'ls-sessions' }).then(respObjs => {
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
            const { decodedObjects, rest, isDone } = bencodeUtil.decodeBuffer(nreplResp);
            nreplResp = rest;
            respObjects.push(...decodedObjects);

            if (isDone) {
                client.end();
                client.removeAllListeners();
                resolve(respObjects);
            }
        });
    });
};


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
