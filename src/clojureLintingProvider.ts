import * as vscode from 'vscode';
import * as nreplConnection from './cljConnection';
import { nreplClient } from './nreplClient';
import { resolve } from 'dns';
import { Diagnostic, Range, TextDocument } from 'vscode';
import { cljParser } from './cljParser';
import { CLOJURE_MODE } from './clojureMode';
import { handleError } from './clojureEval';

interface LinterWarningResult {

	msg: string;
	line: number;
	column: number;
	linter: string;
}

interface LinterErrorData {
	column: number;
	"end-column": number;
	line: number;
	"end-line": number;
	file: string;
}

interface LinterError {
	cause: string;
	trace: number;
	data: LinterErrorData;
}

interface LinterResult {

	err: string;
	"err-data": LinterError;
	warnings: LinterWarningResult[];
}

const errorsSeverity: string[] = ["bad-arglists",
	"misplaced-docstrings",
	"wrong-arity",
	"wrong-ns-form",
	"wrong-pre-post",
	"wrong-tag"];
const warningsSeverity: string[] = [":constant-test",
	"def-in-def",
	"deprecations",
	"keyword-typos",
	"local-shadows-var",
	"redefd-vars",
	"suspicious-expression",
	"suspicious-test",
	"unused-locals",
	"unused-meta-on-macro",
	"unused-namespaces",
	"unused-private-vars"];
const infoSeverity: string[] = ["no-ns-form-found",
	"unlimited-use",
	"unused-ret-vals",
	"unused-ret-vals-in-try"];

export class ClojureLintingProvider {

	private outputChannel: vscode.OutputChannel;
	private eastwoodInstalled: boolean = false;

	constructor(channel: vscode.OutputChannel) {
		this.outputChannel = channel;
	}

	private getLintCommand(ns: string): string {
		return `(do (require '[eastwood.lint])
					(require '[clojure.data.json])					
					(-> (eastwood.lint/lint {:namespaces ['${ns}]})
						(select-keys [:warnings :err :err-data])
						(update :warnings (fn [x] (map #(select-keys % [:msg :line :column :linter]) x)))
						(update :err-data :exception)
						((fn [data]
							 (if-let [err-data (:err-data data)]
									 (-> data
										 (update :err-data Throwable->map)						
										 (update :err-data #(select-keys % [:cause :data :trace]))
										 (update-in [:err-data :trace] 
													(fn [trace]
														(->> trace															 
															 (filter #(clojure.string/starts-with? (.getClassName %) (str "${ns}" "$")))
															 (first)
															 ((fn [x] (if x (.getLineNumber x)))))))
										(or data))
									 data)))
						(clojure.data.json/write-str)))`;
	}

	private diagnosticCollection: vscode.DiagnosticCollection;

	private parseLintSuccessResponse(response: string): LinterResult {
		const parsedToString = JSON.parse(response);
		return JSON.parse(parsedToString);
	}

	private getSeverity(type: string) {
		if (errorsSeverity.indexOf(type) > 0) {
			return vscode.DiagnosticSeverity.Error;
		} else if (warningsSeverity.indexOf(type) > 0) {
			return vscode.DiagnosticSeverity.Warning;
		} else if (infoSeverity.indexOf(type) > 0) {
			return vscode.DiagnosticSeverity.Information;
		}
		else {
			return vscode.DiagnosticSeverity.Hint;
		}
	}

	private createDiagnosticFromLintResult(document: TextDocument, warning: LinterWarningResult): Diagnostic {
		const blockRange = cljParser.getDirectlyBeforeBlockRange(document, warning.line, warning.column);
		const severity = this.getSeverity(warning.linter);
		return new Diagnostic(blockRange, warning.msg, severity);
	}

	private createDiagnosticCollectionFromLintResult(document: TextDocument, result: LinterResult): Diagnostic[] {
		let warnings = result.warnings.map((item) => { return this.createDiagnosticFromLintResult(document, item); });
		if (result.err) {
			const errData = result['err-data'];
			if (errData.data != null && document.fileName.endsWith(errData.data.file)) {
				const startLine = errData.data.line - 1;
				const startChar = errData.data.column - 1;
				const endLine = errData.data['end-line'] == null ? startLine : errData.data['end-line'] - 1;
				const endChar = errData.data['end-column'] == null ? startChar : errData.data['end-column'] - 1;
				warnings.push({
					range: new Range(errData.data.line - 1, errData.data.column - 1, endLine, endChar),
					message: errData.cause,
					source: "Linter Exception",
					severity: vscode.DiagnosticSeverity.Error,
					code: -1
				});
			} else {
				warnings.push({
					range: new Range(errData.trace - 1, 0, errData.trace - 1, 0),
					message: errData.cause,
					source: "Linter Exception",
					severity: vscode.DiagnosticSeverity.Error,
					code: -1
				});
			}
		}

		return warnings;
	}

	private isEastwoodInstalled(textDocument: vscode.TextDocument) {
		return nreplConnection.cljConnection
			.sessionForFilename(textDocument.fileName)
			.then(value => {
				return nreplClient.evaluate("(require '[eastwood.lint])")
					.then(result => {
						try {
							return result[0].ex == null;
						} catch (e) {
							return false;
						}
					}, () => false);
			}, () => false);
	}

	private lint(textDocument: vscode.TextDocument): void {

		if (!this.eastwoodInstalled) {
			this.isEastwoodInstalled(textDocument)
				.then(value => {
					this.eastwoodInstalled = value || false;
					if (this.eastwoodInstalled)
						this.lint(textDocument);
				});

			return;
		}

		if (textDocument.languageId !== CLOJURE_MODE.language
			|| !nreplConnection.cljConnection.isConnected
			|| !this.eastwoodInstalled) {
			return;
		}

		nreplConnection.cljConnection
			.sessionForFilename(textDocument.fileName)
			.then(value => {
				const ns = cljParser.getNamespace(textDocument.getText());
				if (ns.length > 0) {
					const command = this.getLintCommand(ns);
					nreplClient.evaluate(command)
						.then(result => {
							try {
								if (!!result[0].ex) {
									handleError(this.outputChannel,
										new vscode.Selection(0, 0, 0, 0),
										false,
										result[0].session);
								} else {
									let lintResult: LinterResult = this.parseLintSuccessResponse(result[0].value);
									const diagnostics = this.createDiagnosticCollectionFromLintResult(textDocument, lintResult);
									this.diagnosticCollection.set(textDocument.uri, diagnostics);
								}
							} catch (e) {
								console.error(e);
							}

						}, err => {
							console.error(err);
						});
				}
			});
	}

	public activate(subscriptions: vscode.Disposable[]) {
		subscriptions.push(this);
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection();

		vscode.workspace.onDidOpenTextDocument(this.lint, this, subscriptions);
		vscode.workspace.onDidCloseTextDocument((textDocument) => {
			this.diagnosticCollection.delete(textDocument.uri);
		}, null, subscriptions);

		vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
			this.diagnosticCollection.delete(textDocument.uri);
			this.lint(textDocument);
		}, this);
	}

	public dispose(): void {
		this.diagnosticCollection.clear();
		this.diagnosticCollection.dispose();
	}
}