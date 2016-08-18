'use strict';

import * as fs from 'fs';

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

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "clojureVSCode" is now active!');

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(CLOJURE_MODE, new ClojureCompletionItemProvider(), '.', '/'))

    vscode.commands.registerCommand('clojureVSCode.eval', clojureEval);

}

export function deactivate() {}