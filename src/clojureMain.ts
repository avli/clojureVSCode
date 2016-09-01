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

function getNREPLPort(): number {
    let nreplPort: number;
    let projectDir = vscode.workspace.rootPath;
    let globalNREPLFile = path.join(os.homedir(), '.lein', 'repl-port');

    if (!projectDir) {
        nreplPort = Number.parseInt(fs.readFileSync(globalNREPLFile, 'utf-8'))
    }

    if (projectDir) {
        let localNREPLFile = path.join(projectDir, '.nrepl-port');
        if (fs.existsSync(localNREPLFile)) {
            nreplPort = Number.parseInt(fs.readFileSync(localNREPLFile, 'utf-8'))
        } else {
            nreplPort = Number.parseInt(fs.readFileSync(globalNREPLFile, 'utf-8'))
        }
    }

    return nreplPort;
}

function connect(context: vscode.ExtensionContext) {
    let port: number;
    vscode.window.showInputBox({
        prompt: 'nREPL port number'
    }).then((value) => {
        port = Number.parseInt(value);
        if (!port) {
            vscode.window.showErrorMessage('Port number should be an integer.')
            return Promise.reject(false);
        }
    }).then((value) => {
        vscode.window.showInputBox({
            prompt: 'nREPL host',
            value: 'localhost'
        }).then((host) => {
            let nreplClient = new nREPLClient(port, host);
            context.workspaceState.update('port', port);
            context.workspaceState.update('host', host);
            nreplClient.eval('(+ 2 2)', (data) => {
                if (data.value === '4') {
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
}

export function deactivate() {}