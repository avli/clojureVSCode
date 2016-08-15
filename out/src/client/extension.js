'use strict';
var path = require('path');
var vscode = require('vscode');
var vscode_1 = require('vscode');
var vscode_languageclient_1 = require('vscode-languageclient');
function activate(context) {
    console.log('Congratulations, your extension "vscode-nrepl" is now active!');
    var serverModule = context.asAbsolutePath(path.join('out', 'src', 'server', 'server.js'));
    var debugOptions = {};
    var serverOptions = {
        run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
        debug: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc, options: debugOptions }
    };
    var clientOptions = {
        documentSelector: ['clojure'],
        synchronize: {
            configurationSection: 'languageServerExample',
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    var disposable = new vscode_languageclient_1.LanguageClient('nREPL', serverOptions, clientOptions).start();
    context.subscriptions.push(vscode);
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map