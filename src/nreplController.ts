import 'process';
import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';

import { CljConnectionInformation } from './cljConnection';

const LEIN_ARGS: string[] = [
    'update-in',
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
    '--',
    'repl',
];

const R_NREPL_CONNECTION_INFO = /nrepl:\/\/(.*?:.*?(?=[\n\r]))/;

let nreplProcess: ChildProcess;

const isStarted = () => !!nreplProcess;

const start = (): Promise<CljConnectionInformation> => {
    if (isStarted())
        return Promise.reject({ nreplError: 'nREPL already started.' });

    nreplProcess = spawn('lein', LEIN_ARGS, { cwd: vscode.workspace.rootPath, detached: true });

    return new Promise((resolve, reject) => {
        nreplProcess.stdout.addListener('data', data => {
            const nreplConnectionMatch = data.toString().match(R_NREPL_CONNECTION_INFO);

            if (nreplConnectionMatch && nreplConnectionMatch[1]) {
                const [host, port] = nreplConnectionMatch[1].split(':');
                return resolve({ host, port: Number.parseInt(port) });
            }
        });

        nreplProcess.stderr.on('data', data => {
            stop();
            return reject(`This error happened with our nREPL process: ${data}`);
        });

        nreplProcess.on('close', (code, signal) => {
            stop();
            return reject(`Our nREPL was closed. Code: ${code} / Signal: ${signal}`);
        });
    });
};

const stop = () => {
    if (nreplProcess) {
        // Workaround http://azimi.me/2014/12/31/kill-child_process-node-js.html
        nreplProcess.removeAllListeners();
        process.kill(-nreplProcess.pid);
        nreplProcess = null;
    }
};

const dispose = stop;

export const nreplController = {
    start,
    stop,
    isStarted,
    dispose,
};
