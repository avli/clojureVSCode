import { TreeDataProvider, EventEmitter, Event, TreeItemCollapsibleState, TreeItem, ProviderResult } from 'vscode';

// A map from namespace => var => boolean
// true if the running the test was successful.
type Results = {
    [key: string]: {
        [key: string]: boolean
    }
}

type NamespaceNode = {
    type: 'ns'
    ns: string
}

type VarNode = {
    type: 'var'
    varName: string
    nsName: string
}

// The test result tree-view has 2 type of node:
// Namespace nodes and var nodes.
// The (root) contains NamespaceNodes, which have VarNodes as children.
type TestNode = NamespaceNode | VarNode

export interface TestListener {
    onTestResult(ns: string, varName: string, success: boolean): void;
}

class ClojureTestDataProvider implements TreeDataProvider<TestNode>, TestListener {

    onTestResult(ns: string, varName: string, success: boolean): void {

        console.log(ns, varName, success);

        // Make a copy of result with the new result assoc'ed in.
        this.results = {
            ...this.results,
            [ns]: {
                ...this.results[ns],
                [varName]: success
            }
        }

        this.testsChanged.fire(); // Trigger the UI to update.
    }

    private testsChanged: EventEmitter<TestNode> = new EventEmitter<TestNode>();
    readonly onDidChangeTreeData: Event<TestNode | undefined | null> = this.testsChanged.event;

    private results: Results = {}

    getNamespaceItem(element: NamespaceNode): TreeItem {
        return {
            label: element.ns,
            collapsibleState: TreeItemCollapsibleState.Expanded
        };
    }

    getVarItem(element: VarNode): TreeItem {
        const passed: boolean = this.results[element.nsName][element.varName];
        return {
            label: (passed ? "✅ " : "❌ ") + element.varName,
            collapsibleState: TreeItemCollapsibleState.None
        };
    }

    getTreeItem(element: TestNode): TreeItem | Thenable<TreeItem> {
        switch (element.type) {
            case 'ns': return this.getNamespaceItem(element);
            case 'var': return this.getVarItem(element);
        }
    }

    getChildren(element?: TestNode): ProviderResult<TestNode[]> {

        if (!element) {
            return Object.keys(this.results).map((ns) => {
                const node: NamespaceNode = {
                    type: 'ns',
                    ns: ns
                };
                return node;
            });

        }

        switch (element.type) {
            case 'ns': {
                const vars = Object.keys(this.results[element.ns]);

                return vars.map((varName) => {
                    const node: VarNode = {
                        type: 'var',
                        nsName: element.ns,
                        varName: varName
                    };
                    return node;
                });
            }
        }
        return null;
    }
}

export const buildTestProvider = function (): ClojureTestDataProvider {
    return new ClojureTestDataProvider();
};
