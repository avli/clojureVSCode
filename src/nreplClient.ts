import * as vscode from 'vscode';
import * as net from 'net';
import { Buffer } from 'buffer';

import * as bencodeUtil from './bencodeUtil';
import { cljConnection, CljConnectionInformation } from './cljConnection';

type Results = {
    [key: string]: { // namespace
        [key: string]: boolean // var => bool
    }
}

type NamespaceNode = {
    type: 'ns'
    ns: string
}

type VarNode = {
    type: 'var'
    var: string
}

type RootNode = {
    type: 'root'
}

type TestNode = NamespaceNode | VarNode | RootNode

export interface TestListener {
    // TODO - make this a simple function
    onTestResult(ns: string, varName: string, success: boolean): void;
}

const label = function (node: TestNode): string {
    switch (node.type) {
        case 'ns': return node.ns;
        case 'var': return node.var;
        case 'root': return 'Namespaces'
    }
}

class ClojureTestDataProvider implements vscode.TreeDataProvider<TestNode>, TestListener {

    // TODO - make this a simple function
    onTestResult(ns: string, varName: string, success: boolean): void {

        console.log(ns, varName, success);

        this.results = {
            ... this.results,
            [ns]: {
                ...this.results[ns],
                [varName]: success
            }
        }

        this.onDidChangeTreeData(null);
    }

    onDidChangeTreeData?: vscode.Event<TestNode>;

    //private results : Results = Map<String, Map<String, boolean>>
    private results: Map<string, Map<string, boolean>> = new Map();

    private namespaces(): string[] {
        const spaces : string[] = [];
        for (const ns in this.results) {
            spaces.push(ns)
        }
        return spaces;
    }

    getTreeItem(element: TestNode): vscode.TreeItem | Thenable<vscode.TreeItem> {

        const result: vscode.TreeItem = {
            label: label(element),
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
        };

        return result;
    }

    getChildren(element?: TestNode): vscode.ProviderResult<TestNode[]> {

        if (!element)
            return [{ type: 'root' }]

        switch (element.type) {
            case 'root': {
                return this.namespaces().map((ns) => {
                    const node: NamespaceNode = { type: 'ns', ns: ns };
                    return node;
                });
            }
        }
        return null;
    }
}

export const buildTestProvider = function (): ClojureTestDataProvider {
    return new ClojureTestDataProvider();
};

interface nREPLCompleteMessage {
    op: string;
    symbol: string;
    ns?: string
}

interface nREPLInfoMessage {
    op: string;
    symbol: string;
    ns: string;
    session: string;
}

type TestMessage = {
    op: "test" | "test-all" | "test-stacktrace" | "retest"
    ns?: string
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

const evaluate = (code: string, session?: string): Promise<any[]> => clone(session).then((new_session) => {
    const session_id = new_session['new-session'];
    const msg: nREPLSingleEvalMessage = { op: 'eval', code: code, session: session_id };
    return send(msg);
});

const evaluateFile = (code: string, filepath: string, session?: string): Promise<any[]> => clone(session).then((new_session) => {
    const session_id = new_session['new-session'];
    const msg: nREPLEvalMessage = { op: 'load-file', file: code, 'file-path': filepath, session: session_id };
    return send(msg);
});

const stacktrace = (session: string): Promise<any> => send({ op: 'stacktrace', session: session });

const testNamespace = function (namespace: string): Promise<any[]> {
    const message: TestMessage = {
        op: "test",
        ns: namespace
    }
    return send(message);

}

const clone = (session?: string): Promise<any[]> => send({ op: 'clone', session: session }).then(respObjs => respObjs[0]);

const test = (connectionInfo: CljConnectionInformation): Promise<any[]> => {
    return send({ op: 'clone' }, connectionInfo)
        .then(respObjs => respObjs[0])
        .then(response => {
            if (!('new-session' in response))
                return Promise.reject(false);
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
            if (error['code'] == 'ECONNREFUSED') {
                vscode.window.showErrorMessage('Connection refused.');
                cljConnection.disconnect();
            }
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
    testNamespace,
    close,
    listSessions
};
