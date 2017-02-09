import 'process'
import { spawn, ChildProcess } from 'child_process';

import * as vscode from 'vscode';

export class nREPLController {

    nreplProcess?: ChildProcess;

    private leinArgs: [string] = ['update-in',
        ':dependencies',
        'conj',
        '[org.clojure/tools.nrepl "0.2.12" :exclusions [org.clojure/clojure]]',
        '--',
        'update-in',
        ':plugins',
        'conj',
        '[refactor-nrepl "2.3.0-SNAPSHOT"]',
        '--',
        'update-in',
        ':plugins',
        'conj',
        '[cider/cider-nrepl "0.15.0-SNAPSHOT"]',
        '--', 'repl']

    start(callback: Function): void {
        this.nreplProcess = spawn('lein', this.leinArgs,
            { cwd: vscode.workspace.rootPath, detached: true });

        this.nreplProcess.stdout.on('data', (data) => {
            if (data.toString().includes('nREPL server started')) {
                callback();
            }
        });

        this.nreplProcess.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
        });

        this.nreplProcess.on('close', (code) => {
            this.nreplProcess = null;
        })
    }

    stop(): void {
        if (this.nreplProcess) {
            // Workaround http://azimi.me/2014/12/31/kill-child_process-node-js.html
            process.kill(-this.nreplProcess.pid);
            this.nreplProcess = null;
        }
    }

    dispose(): void {
        this.stop();
    }
}
