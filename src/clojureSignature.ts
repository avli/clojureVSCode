'use strict';

import * as vscode from 'vscode';

import { ClojureProvider } from './clojureProvider';
import * as cljParser from './cljParser';

const PARAMETER_OPEN = `[`;
const PARAMETER_CLOSE = `]`;
const PARAMETER_REST = `&`;

export class ClojureSignatureProvider extends ClojureProvider implements vscode.SignatureHelpProvider {

    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.SignatureHelp> {
        const textToGetInfo = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const exprInfo = cljParser.getExpressionInfo(textToGetInfo);
        if (!exprInfo)
            return;

        const ns = this.getNamespace(document.getText());

        return new Promise<vscode.SignatureHelp>((resolve, reject) => {
            this.getNREPL().info(exprInfo.functionName, ns, info => {
                resolve(getSignatureHelp(info, exprInfo.parameterPosition));
            });
        });
    }

}

function getSignatureHelp(info, parameterPosition): vscode.SignatureHelp {
    const signatures = getSignatureInfos(info);
    signatures.sort((sig1, sig2) => sig1.parameters.length - sig2.parameters.length);

    let activeSignature = signatures.findIndex(signature => signature.parameters.length >= parameterPosition + 1);
    if (activeSignature === -1) {
        activeSignature = signatures.findIndex(signature => signature.parameters.some(param => param.label.startsWith(PARAMETER_REST)));
        if (activeSignature != -1)
            parameterPosition = signatures[activeSignature].parameters.length - 1;
    }

    const signatureHelp = new vscode.SignatureHelp();
    signatureHelp.signatures = signatures;
    signatureHelp.activeParameter = parameterPosition;
    signatureHelp.activeSignature = activeSignature;

    return signatureHelp;
}

function getSignatureInfos(info: any): vscode.SignatureInformation[] {
    const arglists: string = info['arglists-str'];

    const sigParamStarts: number[] = [];
    const sigParamStops: number[] = [];
    let nestingLevel = 0;
    for (let i = 0; i < arglists.length; i++) {
        if (arglists[i] === PARAMETER_OPEN) {
            if (nestingLevel === 0)
                sigParamStarts.push(i);
            nestingLevel++;
        }
        if (arglists[i] === PARAMETER_CLOSE) {
            nestingLevel--;
            if (nestingLevel === 0)
                sigParamStops.push(i);
        }
    }

    return sigParamStarts
        .map((sigParamStart, index) => arglists.substring(sigParamStart, sigParamStops[index] + 1))
        .map(signatureParameter => {
            const parameterInfos = getParameterInfos(signatureParameter);
            const sigInfo = new vscode.SignatureInformation(`${info.ns}/${info.name} [${parameterInfos.map(pi => pi.label).join(`\n`)}]`);
            sigInfo.documentation = info.doc;
            sigInfo.parameters = parameterInfos;
            return sigInfo;
        });
}

function getParameterInfos(signatureParameter: string): vscode.ParameterInformation[] {
    signatureParameter = signatureParameter.substring(1, signatureParameter.length - 1); // removing external brackets
    const paramStarts: number[] = [];
    const paramStops: number[] = [];
    let insideParameter = false;
    let bracketsNestingLevel = 0;
    for (let i = 0; i < signatureParameter.length; i++) {
        const char = signatureParameter[i];

        if (!insideParameter) {
            insideParameter = true;
            paramStarts.push(i);
            if (char === PARAMETER_OPEN)
                bracketsNestingLevel++;
            if (char === PARAMETER_REST)
                break;
        } else {
            if (char === PARAMETER_OPEN)
                bracketsNestingLevel++;
            if (char === PARAMETER_CLOSE)
                bracketsNestingLevel--;
            if (char === PARAMETER_CLOSE && bracketsNestingLevel === 0) {
                paramStops.push(i);
                insideParameter = false;
            }
            if (cljParser.R_CLJ_WHITE_SPACE.test(char) && bracketsNestingLevel === 0) {
                paramStops.push(i);
                insideParameter = false;
            }
        }
    }
    paramStops.push(signatureParameter.length);

    return paramStarts
        .map((paramStart, index) => signatureParameter.substring(paramStart, paramStops[index] + 1))
        .map(parameter => {
            return new vscode.ParameterInformation(parameter);
        });
}
