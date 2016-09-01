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
            let wordRange = document.getWordRangeAtPosition(position);
            if (wordRange === undefined) {
                return reject(); //resolve(new vscode.Hover('Docstring not found'));
            }
            let currentWord: string;
            currentWord = document.lineAt(position.line).text.slice(wordRange.start.character, wordRange.end.character);
            let ns = this.getNamespace(document.getText());

            let nrepl = this.getNREPL();
            nrepl.info(currentWord, ns, (info) => {
                if (info.doc) {
                    let signatureHelp = new vscode.SignatureHelp();
                    signatureHelp.activeParameter = 0;
                    signatureHelp.activeSignature = 0;
                    signatureHelp.signatures = [new vscode.SignatureInformation('a b c')]
                    resolve(signatureHelp);
                }
                reject();
            });
        });
    }
}