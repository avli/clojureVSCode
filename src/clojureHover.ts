import * as vscode from 'vscode';

import { cljConnection } from './cljConnection';
import { cljParser } from './cljParser';
import { nreplClient } from './nreplClient';

export class ClojureHoverProvider implements vscode.HoverProvider {

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Hover> {
        if (!cljConnection.isConnected())
            return Promise.reject('No nREPL connected.');

        let wordRange = document.getWordRangeAtPosition(position);
        if (wordRange === undefined)
            return Promise.resolve(new vscode.Hover('Docstring not found'));

        let currentWord: string;
        currentWord = document.lineAt(position.line).text.slice(wordRange.start.character, wordRange.end.character);
        const ns = cljParser.getNamespace(document.getText());

        return cljConnection.sessionForFilename(document.fileName).then(session => {
            return nreplClient.info(currentWord, ns, session.id).then(info => {
                if (info.doc) {
                    return Promise.resolve(new vscode.Hover(info.doc));
                }
                return Promise.reject(undefined);
            });
        });
    }

}
