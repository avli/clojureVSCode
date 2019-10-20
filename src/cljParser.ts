import * as vscode from 'vscode';

interface ExpressionInfo {
    functionName: string;
    parameterPosition: number;
}

interface RelativeExpressionInfo {
    startPosition: number;
    parameterPosition: number;
}

const CLJ_TEXT_DELIMITER = `"`;
const CLJ_TEXT_ESCAPE = `\\`;
const CLJ_COMMENT_DELIMITER = `;`;
const R_CLJ_WHITE_SPACE = /\s|,/;
const R_CLJ_OPERATOR_DELIMITERS = /\s|,|\(|{|\[/;
const OPEN_CLJ_BLOCK_BRACKET = `(`;
const CLOSE_CLJ_BLOCK_BRACKET = `)`;

/** { close_char open_char } */
const CLJ_EXPRESSION_DELIMITERS: Map<string, string> = new Map<string, string>([
    [`}`, `{`],
    [CLOSE_CLJ_BLOCK_BRACKET, OPEN_CLJ_BLOCK_BRACKET],
    [`]`, `[`],
    [CLJ_TEXT_DELIMITER, CLJ_TEXT_DELIMITER],
]);

const getExpressionInfo = (text: string): ExpressionInfo | undefined => {
    text = removeCljComments(text);
    const relativeExpressionInfo = getRelativeExpressionInfo(text);
    if (!relativeExpressionInfo)
        return;

    let functionName = text.substring(relativeExpressionInfo.startPosition + 1); // expression openning ignored
    functionName = functionName.substring(functionName.search(/[^,\s]/)); // trim left
    functionName = functionName.substring(0, functionName.search(R_CLJ_OPERATOR_DELIMITERS)); // trim right according to operator delimiter

    if (!functionName.length)
        return;

    return {
        functionName,
        parameterPosition: relativeExpressionInfo.parameterPosition,
    };
};

const removeCljComments = (text: string): string => {
    const lines = text.match(/[^\r\n]+/g) || [] // split string by line

    if (lines.length > 1) {
        return lines.map(line => removeCljComments(line)).join(`\n`); // remove comments from each line and concat them again after
    }

    const line = lines[0];
    let uncommentedIndex = line.length;
    let insideString = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === CLJ_TEXT_DELIMITER) {
            insideString = !insideString || line[i - 1] === CLJ_TEXT_ESCAPE;
            continue;
        }
        if (line[i] === CLJ_COMMENT_DELIMITER && !insideString) { // ignore comment delimiter inside a string
            uncommentedIndex = i;
            break;
        }
    }

    return line.substring(0, uncommentedIndex);
};

const getRelativeExpressionInfo = (text: string, openChar: string = `(`): RelativeExpressionInfo | undefined => {
    const relativeExpressionInfo: RelativeExpressionInfo = {
        startPosition: text.length - 1,
        parameterPosition: -1,
    };

    let newParameterFound = false;
    while (relativeExpressionInfo.startPosition >= 0) {
        const char = text[relativeExpressionInfo.startPosition];

        // check if found the beginning of the expression (string escape taken care of)
        if (char === openChar && (openChar !== CLJ_TEXT_DELIMITER || (text[relativeExpressionInfo.startPosition - 1] !== CLJ_TEXT_ESCAPE))) {
            if (newParameterFound) // ignore one parameter found if it's actually the function we're looking for
                relativeExpressionInfo.parameterPosition--;
            return relativeExpressionInfo;
        }

        // ignore everything if searching inside a string
        if (openChar === CLJ_TEXT_DELIMITER) {
            relativeExpressionInfo.startPosition--;
            continue;
        }

        // invalid code if a beginning of an expression is found without being searched for
        if (char !== CLJ_TEXT_DELIMITER && containsValue(CLJ_EXPRESSION_DELIMITERS, char))
            return;

        // keep searching if it's white space
        if (R_CLJ_WHITE_SPACE.test(char)) {
            if (!newParameterFound) {
                relativeExpressionInfo.parameterPosition++;
                newParameterFound = true;
            }
            relativeExpressionInfo.startPosition--;
            continue;
        }

        // check for new expressions
        const expressionDelimiter = CLJ_EXPRESSION_DELIMITERS.get(char);
        if (!!expressionDelimiter) {
            const innerExpressionInfo = getRelativeExpressionInfo(text.substring(0, relativeExpressionInfo.startPosition), expressionDelimiter);
            if (!innerExpressionInfo)
                return;

            relativeExpressionInfo.startPosition = innerExpressionInfo.startPosition - 1;
            relativeExpressionInfo.parameterPosition++;
            newParameterFound = true;
            continue;
        }

        newParameterFound = false;
        relativeExpressionInfo.startPosition--;
    }

    return; // reached the beginning of the text without finding the start of the expression
};

const containsValue = (map: Map<any, any>, checkValue: any): boolean => {
    for (let value of map.values()) {
        if (value === checkValue)
            return true;
    }
    return false;
};

const getNamespace = (text: string): string => {
    const m = text.match(/^[;\s\t\n]*\((?:[\s\t\n]*(?:in-){0,1}ns)[\s\t\n]+'?([\w\-.]+)[\s\S]*\)[\s\S]*/);
    return m ? m[1] : 'user';
};

// end index is not included
const range = (start: number, end: number): Array<number> => {
    if (start < end) {
        const length = end - start;
        return Array.from(Array(length), (_, i) => start + i);
    } else {
        const length = start - end;
        return Array.from(Array(length), (_, i) => start - i);
    }
}

const findNearestBracket = (
    editor: vscode.TextEditor,
    current: vscode.Position,
    bracket: string): vscode.Position | undefined => {

    const isBackward = bracket == OPEN_CLJ_BLOCK_BRACKET;
    // "open" and "close" brackets as keys related to search direction
    let openBracket = OPEN_CLJ_BLOCK_BRACKET,
        closeBracket = CLOSE_CLJ_BLOCK_BRACKET;
    if (isBackward) {
        [closeBracket, openBracket] = [openBracket, closeBracket]
    };

    let bracketStack: string[] = [],
        // get begin of text if we are searching `(` and end of text otherwise
        lastLine = isBackward ? -1 : editor.document.lineCount,
        lineRange = range(current.line, lastLine);

    for (var line of lineRange) {
        const textLine = editor.document.lineAt(line);
        if (textLine.isEmptyOrWhitespace) continue;

        // get line and strip clj comments
        const firstChar = textLine.firstNonWhitespaceCharacterIndex,
            strippedLine = removeCljComments(textLine.text);
        let startColumn = firstChar,
            endColumn = strippedLine.length;
        if (isBackward) {
            // dec both as `range` doesn't include an end edge
            [startColumn, endColumn] = [endColumn - 1, startColumn - 1];
        }

        // get current current char index if it is first iteration of loop
        if (current.line == line) {
            let currentColumn = current.character;
            // set current position as start
            if (isBackward) {
                if (currentColumn <= endColumn) continue;
                startColumn = currentColumn;
                if ([openBracket, closeBracket].indexOf(strippedLine[startColumn]) > -1) {
                    startColumn--;
                };
            } else if (currentColumn <= endColumn) {
                startColumn = currentColumn;
            }
        }

        // search nearest bracket
        for (var column of range(startColumn, endColumn)) {
            const char = strippedLine[column];
            if (!bracketStack.length && char == bracket) {
                // inc column if `char` is a `)` to get correct selection
                if (!isBackward) column++;
                return new vscode.Position(line, column);
            } else if (char == openBracket) {
                bracketStack.push(char);
                // check if inner block is closing
            } else if (char == closeBracket && bracketStack.length > 0) {
                bracketStack.pop();
            };
        };
    }
};


const getCurrentBlock = (
    editor: vscode.TextEditor,
    left?: vscode.Position,
    right?: vscode.Position): vscode.Selection | undefined => {

    if (!left || !right) {
        left = right = editor.selection.active;
    };
    const prevBracket = findNearestBracket(editor, left, OPEN_CLJ_BLOCK_BRACKET);
    if (!prevBracket) return;

    const nextBracket = findNearestBracket(editor, right, CLOSE_CLJ_BLOCK_BRACKET);
    if (nextBracket) {
        return new vscode.Selection(prevBracket, nextBracket);
    }
};

const getOuterBlock = (
    editor: vscode.TextEditor,
    left?: vscode.Position,
    right?: vscode.Position): vscode.Selection | undefined => {

    if (!left || !right) {
        left = right = editor.selection.active;
    };

    const nextBlock = getCurrentBlock(editor, left, right);

    if (nextBlock) {
        return getOuterBlock(editor, nextBlock.anchor, nextBlock.active);
    } else if (right != left) {
        return new vscode.Selection(left, right);
    };
}

export const cljParser = {
    R_CLJ_WHITE_SPACE,
    getExpressionInfo,
    getNamespace,
    getCurrentBlock,
    getOuterBlock,
};
