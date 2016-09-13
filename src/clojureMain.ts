'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import {
    CLOJURE_MODE
} from './clojureMode';
import {
    ClojureCompletionItemProvider
} from './clojureSuggest';
import {
    clojureEval
} from './clojureEval';
import {
    ClojureDefinitionProvider
} from './clojureDefinition';
import {
    ClojureLanguageConfiguration
} from './clojureConfiguration'
import {
    ClojureHoverProvider
} from './clojureHover'
import {
    nREPLClient
} from './nreplClient';
import {
    JarContentProvider
} from './jarContentProvider';

let connectionIndicator = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

function updateConnectionIndicator(port: number, host: string) {
    connectionIndicator.text = `⚡nrepl://${host}:${port}`;
    connectionIndicator.show();
}

function resetConnectionParams(context: vscode.ExtensionContext) {
    context.workspaceState.update('port', undefined);
    context.workspaceState.update('host', undefined);
}

function updateConnectionParams(context: vscode.ExtensionContext): void {
    let nreplPort: number;
    const nreplHost = '127.0.0.1';
    let projectDir = vscode.workspace.rootPath;

    if (projectDir) {
        let localNREPLFile = path.join(projectDir, '.nrepl-port');
        if (fs.existsSync(localNREPLFile)) {
            nreplPort = Number.parseInt(fs.readFileSync(localNREPLFile, 'utf-8'))
        }
    }

    if (nreplPort) {
        context.workspaceState.update('port', nreplPort);
        context.workspaceState.update('host', nreplHost);
        updateConnectionIndicator(nreplPort, nreplHost);
    }
}

function connect(context: vscode.ExtensionContext) {
    let port: number;
    vscode.window.showInputBox({
        prompt: 'nREPL port number'
    }).then((value) => {
        if (!value) {
            return Promise.reject(false);
        }
        port = Number.parseInt(value);
        if (!port) {
            vscode.window.showErrorMessage('Port number should be an integer.')
            return Promise.reject(false);
        }
    }).then((value) => {
        vscode.window.showInputBox({
            prompt: 'nREPL host',
            value: undefined
        }).then((host) => {
            if (!host) {
                return Promise.reject(false);
            }
            let nreplClient = new nREPLClient(port, host);
            nreplClient.clone((response) => {
                if ('new-session' in response) {
                    context.workspaceState.update('port', port);
                    context.workspaceState.update('host', host);
                    updateConnectionIndicator(port, host);
                    vscode.window.showInformationMessage('Successfully connected to the nREPL.')
                } else {
                    vscode.window.showErrorMessage('Can\'t connect to the nREPL.');
                }
            })
        })
    });
}

export function activate(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand('clojureVSCode.connect', () => {connect(context)});
    vscode.commands.registerCommand('clojureVSCode.eval', () => {clojureEval(context)});
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(CLOJURE_MODE, new ClojureCompletionItemProvider(context), '.', '/'))
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(CLOJURE_MODE, new ClojureDefinitionProvider(context)));
    context.subscriptions.push(vscode.languages.registerHoverProvider(CLOJURE_MODE, new ClojureHoverProvider(context)));
    vscode.workspace.registerTextDocumentContentProvider('jar', new JarContentProvider());
    vscode.languages.setLanguageConfiguration(CLOJURE_MODE.language, new ClojureLanguageConfiguration());

    resetConnectionParams(context);
    updateConnectionParams(context);
    let port = context.workspaceState.get<number>('port');
    let host = context.workspaceState.get<string>('host');
    if (port && host ) {
        updateConnectionIndicator(port, host);
    }
}

export function deactivate() {}