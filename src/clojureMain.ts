'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { CLOJURE_MODE } from './clojureMode';
import { ClojureCompletionItemProvider } from './clojureSuggest';
import { clojureEval, clojureEvalAndShowResult } from './clojureEval';
import { ClojureDefinitionProvider } from './clojureDefinition';
import { ClojureLanguageConfiguration } from './clojureConfiguration';
import { ClojureHoverProvider } from './clojureHover';
import { ClojureSignatureProvider } from './clojureSignature';
import { nREPLClient } from './nreplClient';
import { JarContentProvider } from './jarContentProvider';

const connectionIndicator = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

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
        const localNREPLFile = path.join(projectDir, '.nrepl-port');
        if (fs.existsSync(localNREPLFile)) {
            nreplPort = Number.parseInt(fs.readFileSync(localNREPLFile, 'utf-8'));
        }
    }

    if (nreplPort) {
        context.workspaceState.update('port', nreplPort);
        context.workspaceState.update('host', nreplHost);
        updateConnectionIndicator(nreplPort, nreplHost);
    }
}

function testConnection(port: number, host: string): Promise<any[]> {
    const nreplClient = new nREPLClient(port, host);
    return nreplClient.clone();
}

const onSuccesfullConnectMessage = 'Successfully connected to the nREPL.';

function connect(context: vscode.ExtensionContext) {
    let host: string;
    let port: number;

    vscode.window.showInputBox({ prompt: 'nREPL port number' })
        .then(portFromUser => {
            if (!portFromUser)
                return Promise.reject({ connectionError: 'Port number must be informed.' });

            port = Number.parseInt(portFromUser);
            if (!port)
                return Promise.reject({ connectionError: 'Port number should be an integer.' });
        })
        .then(_ => vscode.window.showInputBox({ prompt: 'nREPL host', value: '127.0.0.1' }))
        .then(hostFromUser => {
            if (!hostFromUser)
                return Promise.reject({ connectionError: 'Host must be informed.' });
            host = hostFromUser;
        })
        .then(_ => testConnection(port, host))
        .then(response => {
            if (!('new-session' in response))
                return Promise.reject(false);

            context.workspaceState.update('port', port);
            context.workspaceState.update('host', host);
            updateConnectionIndicator(port, host);
            vscode.window.showInformationMessage(onSuccesfullConnectMessage);
        }, ({ connectionError }) => {
            if (!connectionError)
                connectionError = `Can't connect to the nREPL.`;

            vscode.window.showErrorMessage(connectionError);
        });
}

export function activate(context: vscode.ExtensionContext) {
    const evaluationResultChannel = vscode.window.createOutputChannel('Evaluation results');
    vscode.commands.registerCommand('clojureVSCode.connect', () => { connect(context) });
    vscode.commands.registerCommand('clojureVSCode.eval', () => { clojureEval(context, evaluationResultChannel) });
    vscode.commands.registerCommand('clojureVSCode.evalAndShowResult', () => { clojureEvalAndShowResult(context, evaluationResultChannel) });
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(CLOJURE_MODE, new ClojureCompletionItemProvider(context), '.', '/'));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(CLOJURE_MODE, new ClojureDefinitionProvider(context)));
    context.subscriptions.push(vscode.languages.registerHoverProvider(CLOJURE_MODE, new ClojureHoverProvider(context)));
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(CLOJURE_MODE, new ClojureSignatureProvider(context), ' ', '\n'));
    vscode.workspace.registerTextDocumentContentProvider('jar', new JarContentProvider());
    vscode.languages.setLanguageConfiguration(CLOJURE_MODE.language, new ClojureLanguageConfiguration());

    resetConnectionParams(context);
    updateConnectionParams(context);
    let port = context.workspaceState.get<number>('port');
    let host = context.workspaceState.get<string>('host');
    if (port && host) {
        updateConnectionIndicator(port, host);
        testConnection(port, host).then(_ => vscode.window.showInformationMessage(onSuccesfullConnectMessage));
    }
}

export function deactivate() { }
