'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    nREPLClient
} from './nreplClient';
import {
    ClojureProvider
} from './clojureProvider';

export class ClojureSignatureProvider extends ClojureProvider implements vscode.SignatureHelpProvider {

    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable < vscode.SignatureHelp > {
        return new Promise < vscode.SignatureHelp > ((resolve, reject) => {
            // TODO
        });
    }
}