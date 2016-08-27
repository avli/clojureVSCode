'use strict';

import * as vscode from 'vscode';

export class ClojureLanguageConfiguration implements vscode.LanguageConfiguration {
    wordPattern = /[\w\-\.][\w\d\.\\/\-\?]+/;
}