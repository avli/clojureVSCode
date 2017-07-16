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
import { nREPLController } from './nreplController';

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
    const projectDir = vscode.workspace.rootPath;

    function readPortFromFile(path) {
        return Number.parseInt(fs.readFileSync(path, 'utf-8'))
    }

    if (projectDir) {
        const localNREPLFile = path.join(projectDir, '.nrepl-port');
        if (fs.existsSync(localNREPLFile)) {
            nreplPort = readPortFromFile(localNREPLFile)
        }
    }

    if (!nreplPort) {
        // We have one more option: the file with the port number can be at
        // ~/.lein/repl-port
        const homeDir = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
        const globalNREPLFile = path.join(homeDir, '.lein', 'repl-port');
        if (fs.existsSync(globalNREPLFile)) {
            nreplPort = readPortFromFile(globalNREPLFile)
        }
    }

    if (nreplPort) {
        context.workspaceState.update('port', nreplPort);
        context.workspaceState.update('host', nreplHost);
        updateConnectionIndicator(nreplPort, nreplHost);
        const terminal = vscode.window.createTerminal("Clojure REPL");
        terminal.sendText(`lein repl :connect ${nreplPort}`);
        terminal.show();
    }
}

function testConnection(port: number, host: string, callback) {
    let nreplClient = new nREPLClient(port, host);
    nreplClient.clone().then((response) => {
        callback(response);
    });
}

const onSuccesfullConnectMessage = 'Successfully connected to the nREPL.';

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
            vscode.window.showErrorMessage('Port number should be an integer.');
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
            testConnection(port, host, (response) => {
                if ('new-session' in response) {
                    context.workspaceState.update('port', port);
                    context.workspaceState.update('host', host);
                    updateConnectionIndicator(port, host);
                    vscode.window.showInformationMessage(onSuccesfullConnectMessage);
                } else {
                    vscode.window.showErrorMessage('Can\'t connect to the nREPL.');
                }
            });
        })
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

    function doConnect() {
        // ToDo: Refactor Me, maybe controller?
        resetConnectionParams(context);
        updateConnectionParams(context);
        let port = context.workspaceState.get<number>('port');
        let host = context.workspaceState.get<string>('host');
        if (port && host) {
            updateConnectionIndicator(port, host);
            testConnection(port, host, (response) => {
                vscode.window.showInformationMessage(onSuccesfullConnectMessage)
            });
        }
    }

    const nreplController = new nREPLController();
    context.subscriptions.push(nreplController);

    vscode.commands.registerCommand('clojureVSCode.startNRepl', () => { nreplController.start(connectionIndicator, doConnect) });
    vscode.commands.registerCommand('clojureVSCode.stopNRepl', () => {
        nreplController.stop();
        // ToDo: update indicator
    });
}

export function deactivate() { }
