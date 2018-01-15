import 'process';
import * as os from 'os';
import * as vscode from 'vscode';
import { spawn } from 'cross-spawn';
import { ChildProcess, exec } from 'child_process';

import { CljConnectionInformation } from './cljConnection';

const LEIN_ARGS: string[] = [
    'update-in',
    ':dependencies',
    'conj',
    '[org.clojure/tools.nrepl "0.2.12" :exclusions [org.clojure/clojure]]',
    '--',
    'update-in',
    ':dependencies',
    'conj',
    '[cljfmt "0.5.7"]',
    '--',
    'update-in',
    ':plugins',
    'conj',
    '[refactor-nrepl "2.3.1"]',
    '--',
    'update-in',
    ':plugins',
    'conj',
    '[cider/cider-nrepl "0.15.1"]',
    '--',
    'repl',
];

const R_NREPL_CONNECTION_INFO = /nrepl:\/\/(.*?:.*?(?=[\n\r]))/;

let nreplProcess: ChildProcess;

const isStarted = () => !!nreplProcess;

const start = (): Promise<CljConnectionInformation> => {
    if (isStarted())
        return Promise.reject({ nreplError: 'nREPL already started.' });

    nreplProcess = spawn('lein', LEIN_ARGS, {
        cwd: vscode.workspace.rootPath,
        detached: !(os.platform() === 'win32')
    });

    return new Promise((resolve, reject) => {
        nreplProcess.stdout.addListener('data', data => {
            const nreplConnectionMatch = data.toString().match(R_NREPL_CONNECTION_INFO);

            if (nreplConnectionMatch && nreplConnectionMatch[1]) {
                const [host, port] = nreplConnectionMatch[1].split(':');
                return resolve({ host, port: Number.parseInt(port) });
            }
        });

        nreplProcess.stderr.on('data', data => {
            console.info('nrepl stderr =>', data.toString());
        });

        nreplProcess.on('exit', (code, signal) => {
            console.info(`nREPL exit => ${code} / Signal: ${signal}`);
            stop();
            return reject();
        });

        nreplProcess.on('close', (code, signal) => {
            console.info(`nREPL close => ${code} / Signal: ${signal}`);
            stop();
            return reject();
        });
    });
};

const stop = () => {
    if (nreplProcess) {
        // Workaround http://azimi.me/2014/12/31/kill-child_process-node-js.html
        nreplProcess.removeAllListeners();
        if(os.platform() === 'win32'){
            exec('taskkill /pid ' + nreplProcess.pid + ' /T /F')
        }
        else {
            process.kill(-nreplProcess.pid);
        }
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
