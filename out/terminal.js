"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalHandler = void 0;
const vscode = require("vscode");
class TerminalHandler {
    constructor() {
        this.runningProcesses = new Map();
    }
    static get() {
        if (!this.instance) {
            this.instance = new TerminalHandler();
        }
        return this.instance;
    }
    ;
    onTerminalClosed(terminal) {
        let promiseTrigger = this.runningProcesses.get(terminal.name);
        if (promiseTrigger) {
            promiseTrigger(terminal);
        }
    }
    awaitTerminal(terminalOptions) {
        let terminal = vscode.window.createTerminal(terminalOptions);
        terminal.show();
        if (terminal.exitStatus === undefined) {
            let promise = new Promise((resolve) => {
                this.runningProcesses.set(terminal.name, resolve);
            });
            return promise;
        }
        else {
            return Promise.resolve(terminal);
        }
    }
    ;
}
exports.TerminalHandler = TerminalHandler;
//# sourceMappingURL=terminal.js.map