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

export function activate(context: vscode.ExtensionContext) {

    let port = getNREPLPort();
    let host = '127.0.0.1';

    if (port && host) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(CLOJURE_MODE, new ClojureCompletionItemProvider(port, host), '.', '/'))
        context.subscriptions.push(vscode.languages.registerDefinitionProvider(CLOJURE_MODE, new ClojureDefinitionProvider(port, host)));
        context.subscriptions.push(vscode.languages.registerHoverProvider(CLOJURE_MODE, new ClojureHoverProvider(port, host)));

        vscode.languages.setLanguageConfiguration(CLOJURE_MODE.language, new ClojureLanguageConfiguration());

        vscode.commands.registerCommand('clojureVSCode.eval', clojureEval);

        vscode.workspace.registerTextDocumentContentProvider('jar', new JarContentProvider());
    }

    console.log('Congratulations, your extension "clojureVSCode" is now active!');

}

export function deactivate() {}