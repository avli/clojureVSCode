'use strict';

import * as vscode from 'vscode';

import { CLOJURE_MODE } from './clojureMode';
import { ClojureCompletionItemProvider } from './clojureSuggest';

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "vscode-nrepl" is now active!');

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(CLOJURE_MODE, new ClojureCompletionItemProvider(), '/', '.'))

}

export function deactivate() {
}