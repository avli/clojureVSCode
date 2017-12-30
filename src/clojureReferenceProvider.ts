import * as vscode from 'vscode';
import { cljConnection } from './cljConnection';
import { nreplClient } from './nreplClient';
import { Uri, Location } from 'vscode';
import {JarContentProvider} from './jarContentProvider';
import { evaluateText } from './clojureEval';
import { isNullOrUndefined } from 'util';
import { cljParser } from './cljParser';


class InfoResult {
    public file: string;
    public line: number;
    public column: number;

    public fileToUri(): Uri {
        return vscode.Uri.parse(this.file);
    }
}

export class ClojureReferenceProvider implements vscode.ReferenceProvider {

    private jarProvider: JarContentProvider = new JarContentProvider();

    public provideReferences(document: vscode.TextDocument, 
                             position: vscode.Position, 
                             context: vscode.ReferenceContext, 
                             token: vscode.CancellationToken)
            : vscode.ProviderResult<vscode.Location[]>
    {        
        if(!cljConnection.isConnected)
            return [];

        const referenceRange = document.getWordRangeAtPosition(position);
        const fileName = document.fileName;        

        let symbolText = document.getText(referenceRange);
        if(isNullOrUndefined(symbolText) || symbolText.length === 0)
            return null;
        
        //TODO: instead of ignoring the namespace need to find the reference
        const symbolParts = symbolText.split("/");
        let searchTerm;
        if(symbolParts.length === 1)        
            searchTerm = `(clojure.repl/apropos #"^${symbolText}.{0,3}$")`; 
        else       
            searchTerm = `(clojure.repl/apropos #"^${symbolParts[1]}$")`; 

        const command = `(clojure.repl/apropos #"^${searchTerm}.{0,3}$")`; 
        return cljConnection.sessionForFilename(fileName).then(session => {                     
            return nreplClient.evaluateFile(command, fileName, session.id);         
        }).then((result)=>{      
            try {  
               return result[0].value
                               .substring(1, result[0].value.length - 1)
                               .split(' ');
            } catch(e) {
                console.error(e);
                return [];
            }
        }, console.error).then((symboles: Array<string>) =>{            
            const symbolesPromises =
                        symboles.map((item)=> {
                            if(isNullOrUndefined(item) || item.length === 0)
                                return Promise.resolve(null);

                            const symbolesParts = item.split('/');                            
                            return nreplClient.info(symbolesParts[1], symbolesParts[0]);
                        });
            
                                    
            return Promise.all(symbolesPromises)
                    .then((value: InfoResult[])=> {
                                                
                        return value.filter(item=>item != null)
                            .map(item=>{
                                try {
                                    const fileUri: vscode.Uri = vscode.Uri.parse(item.file);
                                    const range = new vscode.Range(item.line, item.column, item.line, item.column);
                                    return new vscode.Location(fileUri, range);
                                } catch(e) {
                                    console.error(e);
                                    return null;
                                }
                        });
                        
                    }, (e)=> {
                        console.error(e);  
                        return [];                  
                        });
        });      
    }
}