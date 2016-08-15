'use strict';
var vscode_languageserver_1 = require('vscode-languageserver');
var nreplClient = require('nrepl-client');
var connection = vscode_languageserver_1.createConnection(new vscode_languageserver_1.IPCMessageReader(process), new vscode_languageserver_1.IPCMessageWriter(process));
var documents = new vscode_languageserver_1.TextDocuments();
documents.listen(connection);
var workspaceRoot;
connection.onInitialize(function (params) {
    workspaceRoot = params.rootPath;
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                resolveProvider: false
            }
        }
    };
});
connection.onCompletion(function (textDocumentPosition) {
    return new Promise(function (resolve, reject) {
        // let document = vscode.window.activeTextEditor.document;
        // let lineText = document.lineAt(textDocumentPosition.position.line).text;
        // let words: string[] = lineText.split(' ');
        // let currentWord = words[words.length - 1];
        // if (lineText.match(/^\s*\/\//)) {
        //     resolve([]);
        // }
        var conn = nreplClient.connect({ port: 54735 });
        // let p = new TextDocumentPositionParams()
        // vscode.window.activeTextEditor.document.getText(new vscode.Range(textDocumentPosition - 1, textDocumentPosition));
        conn.send({ op: 'complete', symbol: 'f' }, function (err, messages) {
            var suggestions = [];
            for (var i = 0; i < messages[0].completions.length; i++) {
                suggestions.push({
                    label: messages[0].completions[i].candidate,
                    kind: vscode_languageserver_1.CompletionItemKind.Text,
                    data: i
                });
            }
            resolve(suggestions);
        });
    });
});
connection.listen();
//# sourceMappingURL=server.js.map