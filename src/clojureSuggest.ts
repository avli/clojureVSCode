import * as vscode from 'vscode';
import { cljConnection } from './cljConnection';
import { cljParser } from './cljParser';
import { nreplClient } from './nreplClient';

const mappings = {
    'nil': vscode.CompletionItemKind.Value,
    'macro': vscode.CompletionItemKind.Value,
    'class': vscode.CompletionItemKind.Class,
    'keyword': vscode.CompletionItemKind.Keyword,
    'namespace': vscode.CompletionItemKind.Module,
    'function': vscode.CompletionItemKind.Function,
    'special-form': vscode.CompletionItemKind.Keyword,
    'var': vscode.CompletionItemKind.Variable,
    'method': vscode.CompletionItemKind.Method,
}

export class ClojureCompletionItemProvider implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionList> {
        if (!cljConnection.isConnected())
            return Promise.reject('No nREPL connected.');

        return new Promise<vscode.CompletionList>((resolve, reject) => {
            let document = vscode.window.activeTextEditor.document;

            // TODO: Use VSCode means for getting a current word
            let lineText = document.lineAt(position.line).text;
            let words: string[] = lineText.split(' ');
            let currentWord = words[words.length - 1].replace(/^[\('\[\{]+|[\)\]\}]+$/g, '');
            let text = document.getText()
            let ns = cljParser.getNamespace(text);

            let currentWordLength: number = currentWord.length;

            let buildInsertText = (suggestion: string) => {
                return suggestion[0] === '.' ? suggestion.slice(1) : suggestion;
            }

            nreplClient.complete(currentWord, ns, (completions) => {
                let suggestions = [];
                if ('completions' in completions) {
                    completions.completions.forEach(element => {
                        suggestions.push({
                            label: element.candidate,
                            kind: mappings[element.type] || vscode.CompletionItemKind.Text,
                            insertText: buildInsertText(element.candidate)
                        })
                    })
                } else {
                    return reject();
                }
                let completionList: vscode.CompletionList = new vscode.CompletionList(suggestions, false);
                resolve(completionList);
            });
        })
    }

    public resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): Thenable<vscode.CompletionItem> {
        return new Promise<vscode.CompletionItem>((resolve, reject) => {
            let document = vscode.window.activeTextEditor.document;
            let ns = cljParser.getNamespace(document.getText());
            nreplClient.info(item.label, ns, (info) => {
                item.documentation = info.doc;
                resolve(item);
            });
        })
    }

}
