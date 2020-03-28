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

const complete = async (symbol: string, ns: string): Promise<any> => {
    const msg: nREPLCompleteMessage = { op: 'complete', symbol, ns };
    const respObjs = await send(msg);
    return respObjs[0];
};

const info = async (symbol: string, ns: string, session?: string): Promise<any> => {
    const msg: nREPLInfoMessage = { op: 'info', symbol, ns, session };
    const respObjs = await send(msg);
    return respObjs[0];
};

const evaluate = async (code: string, session?: string): Promise<any[]> => {
    const sessionId = await clone(session);
    const msg: nREPLSingleEvalMessage = {
        op: 'eval',
        code: code, session: sessionId
    };
    return await send(msg);
};

const evaluateFile = async (code: string, filepath: string, session?: string): Promise<any[]> => {
    const sessionId = await clone(session);
    const msg: nREPLEvalMessage = {
        op: 'load-file',
        file: code,
        'file-path': filepath,
        session: sessionId
    };
    return await send(msg);
};

const stacktrace = (session: string): Promise<any> =>
    send({ op: 'stacktrace', session: session });

const runTests = function (namespace: string | undefined): Promise<any[]> {
    const message: TestMessage = {
        op: (namespace ? "test" : "test-all"),
        ns: namespace,
        'load?': 1
    }
    return send(message);
};

const clone = async (session?: string): Promise<string> => {
    const respObjs = await send({ op: 'clone', session: session });
    return respObjs[0]['new-session'];
};

const test = async (connectionInfo: CljConnectionInformation): Promise<boolean> => {
    const respObjs = await send({ op: 'clone' }, connectionInfo);
    const response = respObjs[0];
    return 'new-session' in response;
};

const close = (session?: string): Promise<any[]> =>
    send({ op: 'close', session: session });

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
