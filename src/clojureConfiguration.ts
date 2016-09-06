'use strict';

import * as vscode from 'vscode';

export class ClojureLanguageConfiguration implements vscode.LanguageConfiguration {
    wordPattern = /[\w\-\.][\w\d\.\\/\-\?]+/;
    onEnterRules = [
            {
                beforeText: /^\s*(?:def|defn|for|if|do|else|while|try).*\s*\)?\s*$/,
                action: { indentAction: vscode.IndentAction.Indent }
            }
        ]
}