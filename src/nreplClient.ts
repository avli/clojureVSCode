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
}

interface nREPLCloseMessage {
    op: string;
    session?: string;
}

const complete = (symbol: string, ns: string): Promise<any> => {
    const msg: nREPLCompleteMessage = { op: 'complete', symbol, ns };
    return send(msg).then(respObjs => respObjs[0]);
};

const info = (symbol: string, ns: string): Promise<any> => {
    const msg: nREPLInfoMessage = { op: 'info', symbol, ns };
    return send(msg).then(respObjs => respObjs[0]);
};

const evaluate = (code: string): Promise<any[]> => clone().then((new_session) => {
    const session_id = new_session['new-session'];
    const msg: nREPLSingleEvalMessage = { op: 'eval', code: code, session: session_id };
    return send(msg);
});

const evaluateFile = (code: string, filepath: string): Promise<any[]> => clone().then((new_session) => {
    const session_id = new_session['new-session'];
    const msg: nREPLEvalMessage = { op: 'load-file', file: code, 'file-path': filepath, session: session_id };
    return send(msg);
});

const stacktrace = (session: string): Promise<any> => send({ op: 'stacktrace', session: session });

const clone = (): Promise<any[]> => send({ op: 'clone' }).then(respObjs => respObjs[0]);

const test = (connectionInfo: CljConnectionInformation): Promise<any[]> => {
    return send({ op: 'clone' }, connectionInfo)
        .then(respObjs => respObjs[0])
        .then(response => {
            if (!('new-session' in response))
                return Promise.reject(false);
        });
};

const close = (session?: string): Promise<any[]> => send({ op: 'close', session: session });

const send = (msg: nREPLCompleteMessage | nREPLInfoMessage | nREPLEvalMessage | nREPLStacktraceMessage | nREPLCloneMessage | nREPLCloseMessage | nREPLSingleEvalMessage, connection?: CljConnectionInformation): Promise<any[]> => {
    return new Promise<any[]>((resolve, reject) => {
        connection = connection || cljConnection.getConnection();

        if (!connection)
            return reject('No connection found.');

        const client = net.createConnection(connection.port, connection.host);
        Object.keys(msg).forEach(key => msg[key] === undefined && delete msg[key]);
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
};

const isLastNreplObject = (nreplObjects: any[]): boolean => {
    const lastObj = [...nreplObjects].pop();
    return lastObj && lastObj.status && lastObj.status.indexOf('done') > -1;
}

export const nreplClient = {
    complete,
    info,
    evaluate,
    evaluateFile,
    stacktrace,
    clone,
    test,
    close,
};
