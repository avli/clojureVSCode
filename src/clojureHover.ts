import * as vscode from 'vscode';

import { cljConnection } from './cljConnection';
import { cljParser } from './cljParser';
import { nreplClient } from './nreplClient';

export class ClojureHoverProvider implements vscode.HoverProvider {

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Hover> {
        if (!cljConnection.isConnected())
            return Promise.reject('No nREPL connected.');

        return new Promise<vscode.Hover>((resolve, reject) => {
            let wordRange = document.getWordRangeAtPosition(position);
            if (wordRange === undefined) {
                resolve(new vscode.Hover('Docstring not found'));
            } else {
                let currentWord: string;
                currentWord = document.lineAt(position.line).text.slice(wordRange.start.character, wordRange.end.character);
                const ns = cljParser.getNamespace(document.getText());

                nreplClient.info(currentWord, ns, (info) => {
                    if (info.doc) {
                        resolve(new vscode.Hover(info.doc));
                    }
                    reject();
                });
            }
        });
    }

}
