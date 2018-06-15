import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { nreplClient } from './nreplClient';
import { nreplController } from './nreplController';

export interface CljConnectionInformation {
    host: string;
    port: number;
}
export interface REPLSession {
    type: 'ClojureScript' | 'Clojure';
    id?: string;
}

const CONNECTION_STATE_KEY: string = 'CLJ_CONNECTION';
const DEFAULT_LOCAL_IP: string = '127.0.0.1';
const CLJS_SESSION_KEY: string = 'CLJS_SESSION';
const connectionIndicator: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

let cljContext: vscode.ExtensionContext;

const setCljContext = (context: vscode.ExtensionContext) => cljContext = context;

const getConnection = (): CljConnectionInformation | undefined => cljContext.workspaceState.get(CONNECTION_STATE_KEY);

const isConnected = (): boolean => !!getConnection();

const saveConnection = (connection: CljConnectionInformation): void => {
    cljContext.workspaceState.update(CONNECTION_STATE_KEY, connection);

    connectionIndicator.text = `⚡nrepl://${connection.host}:${connection.port}`;
    connectionIndicator.show();

    vscode.window.showInformationMessage('Connected to nREPL.');
};

const saveDisconnection = (showMessage: boolean = true): void => {
    cljContext.workspaceState.update(CONNECTION_STATE_KEY, undefined);
    cljContext.workspaceState.update(CLJS_SESSION_KEY, undefined);

    connectionIndicator.text = '';
    connectionIndicator.show();

    if (showMessage)
        vscode.window.showInformationMessage('Disconnected from nREPL.');
};

let loadingHandler: NodeJS.Timer | null
const startLoadingAnimation = () => {
    if (loadingHandler)
        return;

    const maxAnimationDots: number = 3;
    let animationTime: number = 0;

    loadingHandler = setInterval(() => {
        connectionIndicator.text = '⚡Starting nREPL' + '.'.repeat(animationTime);
        connectionIndicator.show();

        animationTime += animationTime < maxAnimationDots ? 1 : -maxAnimationDots;
    }, 500);
};

const stopLoadingAnimation = () => {
    if (loadingHandler) {
        clearInterval(loadingHandler);
        loadingHandler = null;
        connectionIndicator.text = '';
        connectionIndicator.show();
    }
};

const manuallyConnect = (): void => {
    if (loadingHandler) {
        vscode.window.showWarningMessage('Already starting a nREPL. Disconnect first.');
        return;
    }
    if (isConnected()) {
        vscode.window.showWarningMessage('Already connected to nREPL. Disconnect first.');
        return;
    }

    let host: string;
    let port: number;
    vscode.window.showInputBox({ prompt: 'nREPL host', value: DEFAULT_LOCAL_IP })
        .then(hostFromUser => {
            if (!hostFromUser)
                return Promise.reject({ connectionError: 'Host must be informed.' });

            host = hostFromUser;

            const portNumberPromptOptions: vscode.InputBoxOptions = { prompt: 'nREPL port number' };

            if (hostFromUser === DEFAULT_LOCAL_IP || hostFromUser.toLowerCase() === 'localhost') {
                const localPort = getLocalNReplPort();
                if (localPort)
                    portNumberPromptOptions.value = String(localPort);
            }

            return <PromiseLike<string>>vscode.window.showInputBox(portNumberPromptOptions); // cast needed to chain promises
        })
        .then(portFromUser => {
            if (!portFromUser)
                return Promise.reject({ connectionError: 'Port number must be informed.' });

            const intPort = Number.parseInt(portFromUser);
            if (!intPort)
                return Promise.reject({ connectionError: 'Port number must be an integer.' });

            port = intPort;
        })
        .then(() => nreplClient.test({ host, port }))
        .then(() => {
            saveConnection({ host, port });
        }
        , ({ connectionError }) => {
            if (!connectionError)
                connectionError = "Can't connect to the nREPL.";

            vscode.window.showErrorMessage(connectionError);
        });
};

const startNRepl = (): void => {
    if (isConnected()) {
        vscode.window.showWarningMessage('Already connected to nREPL. Disconnect first.');
        return;
    }

    startLoadingAnimation();

    let nreplConnection: CljConnectionInformation;
    nreplController.start()
        .then(connectionInfo => nreplConnection = connectionInfo)
        .then(() => nreplClient.test(nreplConnection))
        .then(stopLoadingAnimation)
        .then(() => saveConnection(nreplConnection), ({ nreplError }) => {
            stopLoadingAnimation();
            if (!nreplError)
                nreplError = "Can't start nREPL.";
            disconnect(false);
            vscode.window.showErrorMessage(nreplError);
        });
};

const disconnect = (showMessage: boolean = true): void => {
    if (isConnected() || loadingHandler) {
        stopLoadingAnimation();
        nreplController.stop();
        saveDisconnection(showMessage);
    } else if (showMessage)
        vscode.window.showWarningMessage('Not connected to any nREPL.');
};

const getLocalNReplPort = (): number | undefined => {
    const projectDir = vscode.workspace.rootPath;

    if (projectDir) {
        const projectPort: number = getPortFromFS(path.join(projectDir, '.nrepl-port'));
        if (projectPort)
            return projectPort;
    }

    const homeDir = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    if (homeDir) {
        return getPortFromFS(path.join(homeDir, '.lein', 'repl-port'));
    }
};

const getPortFromFS = (path: string): number => fs.existsSync(path) ? Number.parseInt(fs.readFileSync(path, 'utf-8')) : NaN;

const findClojureScriptSession = (sessions: string[]): Promise<string> => {
    if (sessions.length == 0)
        return Promise.reject(null);

    const base_session = sessions.shift();

    if (!base_session) {
        return Promise.reject("no base session");
    }
    return nreplClient.evaluate('(js/parseInt "42")', base_session).then(results => {
        let { session, value } = results[0];
        nreplClient.close(session);
        if (value == 42) {
            return Promise.resolve(base_session);
        }

        return findClojureScriptSession(sessions);
    });
}

const discoverSessions = (): Promise<string> => {
    return nreplClient.listSessions().then(sessions => {
        return findClojureScriptSession(sessions).then(cljs_session => {
            console.log("found ClojureScript session", cljs_session);
            cljContext.workspaceState.update(CLJS_SESSION_KEY, cljs_session);
            return cljs_session;
        }).catch(reason => {
            cljContext.workspaceState.update(CLJS_SESSION_KEY, undefined);
            throw reason;
        });
    });
}

const sessionForFilename = (filename: string): Promise<REPLSession> => {
    return new Promise((resolve, reject) => {
        const sessionType = filename.endsWith('.cljs') ? "ClojureScript" : "Clojure";
        if (sessionType == "Clojure") {
            // Assume that the default session is Clojure. This is always the case with cider.
            return resolve({ type: sessionType, id: undefined });
        }

        const session_id = cljContext.workspaceState.get<string>(CLJS_SESSION_KEY);
        if (session_id)
            return resolve({ type: sessionType, id: session_id });
        return discoverSessions().then(session_id => {
            resolve({ type: sessionType, id: session_id });
        });
    });
}

export const cljConnection = {
    setCljContext,
    getConnection,
    isConnected,
    manuallyConnect,
    startNRepl,
    disconnect,
    sessionForFilename
};
