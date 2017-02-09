import 'process'
import { spawn, ChildProcess } from 'child_process';

import * as vscode from 'vscode';

export class nREPLController {

    nreplProcess?: ChildProcess;

    start(callback: Function) {
        this.nreplProcess = spawn('lein', ['repl', ':headless'], { cwd: vscode.workspace.rootPath, detached: true });

        this.nreplProcess.stdout.on('data', function (data) {
            if (data.toString().includes('nREPL server started')) {
                callback();
            }
        });

        this.nreplProcess.on('close', (code) => {
            this.nreplProcess = null;
        })
    }

    stop() {
        if (this.nreplProcess) {
            // Workaround http://azimi.me/2014/12/31/kill-child_process-node-js.html
            process.kill(-this.nreplProcess.pid);
            this.nreplProcess = null;
        }
    }

    dispose() {
        this.stop();
    }
}
