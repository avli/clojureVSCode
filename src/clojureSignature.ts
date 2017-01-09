'use strict';

import * as vscode from 'vscode';

import { ClojureProvider } from './clojureProvider';
import * as cljParser from './cljParser';

const PARAMETER_OPEN = `[`;
const PARAMETER_CLOSE = `]`;
const PARAMETER_REST = `&`;
const UNSUPPORTED_SIGNATURE_NAMES = ['.', 'new', 'fn', 'set!']; // they have forms that do not follow the same rules as other special forms
const SPECIAL_FORM_PARAMETER_REST = `*`;

export class ClojureSignatureProvider extends ClojureProvider implements vscode.SignatureHelpProvider {

    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.SignatureHelp> {
        const textToGetInfo = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const exprInfo = cljParser.getExpressionInfo(textToGetInfo);
        if (!exprInfo)
            return;

        const ns = this.getNamespace(document.getText());

        return new Promise<vscode.SignatureHelp>((resolve, reject) => {
            this.getNREPL().info(exprInfo.functionName, ns, info => {
                if (!info.name) // sometimes info brings just a list of suggestions (example: .MAX_VALUE)
                    return resolve();

                if (!!info['special-form'])
                    return resolve(getSpecialFormSignatureHelp(info, exprInfo.parameterPosition));

                return resolve(getFunctionSignatureHelp(info, exprInfo.parameterPosition));
            });
        });
    }

}

function getSpecialFormSignatureHelp(info: any, parameterPosition: number): vscode.SignatureHelp {
    if (UNSUPPORTED_SIGNATURE_NAMES.indexOf(info.name) > -1) {
        const signatureHelp = new vscode.SignatureHelp();
        signatureHelp.signatures = [new vscode.SignatureInformation(`${info.name} *special form* ${info['forms-str']}`, info.doc)];
        signatureHelp.activeSignature = 0;

        return signatureHelp;
    }

    const forms: string = info['forms-str'];
    const [functionName, ...parameters] = forms.substring(3, forms.length - 1).split(' ');
    const parameterInfos = parameters.map(parameter => new vscode.ParameterInformation(parameter));

    const sigInfo = new vscode.SignatureInformation(`${info.name} *special form* [${parameterInfos.map(pi => pi.label).join(`\n`)}]`, info.doc);
    sigInfo.parameters = parameterInfos;

    if (parameterPosition + 1 > sigInfo.parameters.length && sigInfo.parameters[sigInfo.parameters.length - 1].label.endsWith(SPECIAL_FORM_PARAMETER_REST))
        parameterPosition = sigInfo.parameters.length - 1;

    const signatureHelp = new vscode.SignatureHelp();
    signatureHelp.signatures = [sigInfo];
    signatureHelp.activeParameter = parameterPosition;
    signatureHelp.activeSignature = 0;

    return signatureHelp;
}

function getFunctionSignatureHelp(info: any, parameterPosition: number): vscode.SignatureHelp {
    const signatures = getFunctionSignatureInfos(info);
    signatures.sort((sig1, sig2) => sig1.parameters.length - sig2.parameters.length);

    let activeSignature = signatures.findIndex(signature => signature.parameters.length >= parameterPosition + 1);
    if (activeSignature === -1) {
        activeSignature = signatures.findIndex(signature => signature.parameters.some(param => param.label.startsWith(PARAMETER_REST)));
        if (activeSignature !== -1)
            parameterPosition = signatures[activeSignature].parameters.length - 1;
    }
    if (activeSignature === -1)
        activeSignature = 0;

    const signatureHelp = new vscode.SignatureHelp();
    signatureHelp.signatures = signatures;
    signatureHelp.activeParameter = parameterPosition;
    signatureHelp.activeSignature = activeSignature;

    return signatureHelp;
}

function getFunctionSignatureInfos(info: any): vscode.SignatureInformation[] {
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
            const parameterInfos = getFunctionParameterInfos(signatureParameter);
            const sigInfo = new vscode.SignatureInformation(`${info.ns}/${info.name} [${parameterInfos.map(pi => pi.label).join(`\n`)}]`);
            sigInfo.documentation = info.doc;
            sigInfo.parameters = parameterInfos;
            return sigInfo;
        });
}

function getFunctionParameterInfos(signatureParameter: string): vscode.ParameterInformation[] {
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
        .map(parameter => new vscode.ParameterInformation(parameter));
}
