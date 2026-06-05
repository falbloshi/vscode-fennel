import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { spawn } from 'child_process';

const windows: boolean = os.platform() == 'win32';
const terminalName = 'Fennel REPL';

function getLuaRuntime(): string {
    return windows ? 'luajit.exe' : 'luajit'; 
}

function execSpawnAsync(runtime: string, args: string[], cwd: string, inputData: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(runtime, args, {
            cwd: cwd,
            env: process.env,
            timeout: 5000
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => stdout += data.toString());
        child.stderr.on('data', (data) => stderr += data.toString());

        child.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr || `Process exited with code ${code}`));
            }
        });

        child.on('error', (err) => reject(err));

        child.stdin.write(inputData);
        child.stdin.end();
    });
}

async function runInRamCompiler(fnlfmtPath: string, codeText: string): Promise<string> {
    const luaRuntime = getLuaRuntime();
    const cwd = path.dirname(fnlfmtPath);
    
    try {
        const stdout = await execSpawnAsync(luaRuntime, [fnlfmtPath, '-'], cwd, codeText);
        return stdout.trim().length > 0 ? stdout : '';
    } catch (error) {
        if (luaRuntime.startsWith('luajit')) {
            try {
                const fallbackRuntime = windows ? 'lua.exe' : 'lua';
                const stdout = await execSpawnAsync(fallbackRuntime, [fnlfmtPath, '-'], cwd, codeText);
                return stdout.trim().length > 0 ? stdout : '';
            } catch {
                throw new Error("Syntax error or Lua runtime not found.");
            }
        }
        throw error;
    }
}

function getBinaryNames(): string[] {
    const config = vscode.workspace.getConfiguration('fennel');
    const type = config.get<string>('executableType', 'fennel');
    const baseName = type === 'fenneljit' ? 'fenneljit' : 'fennel';

    if (windows) {
        return [`${baseName}.exe`, baseName, `${baseName}.bat`, `${baseName}.cmd`];
    }
    return [baseName];
}

function getFennelPath(): string | undefined {
    const pathEnv = process.env['PATH'] || process.env['Path'] || '';
    const binaryCandidates = getBinaryNames();

    for (const envPath of pathEnv.split(path.delimiter)) {
        for (const binary of binaryCandidates) {
            const absolutePath = path.resolve(envPath, binary);
            if (require('fs').existsSync(absolutePath)) {
                return absolutePath;
            }
        }
    }
    return undefined;
}

function fennelExists(): boolean {
    return getFennelPath() !== undefined;
}

async function newREPL(): Promise<vscode.Terminal> {
    const fennelPath = getFennelPath();

    if (!fennelPath) {
        throw new Error("Fennel binary not found in PATH.");
    }

    const terminal = vscode.window.createTerminal({
        name: terminalName,
        shellPath: fennelPath
    });

    let resolved = false;
    let listener: vscode.Disposable | undefined;

    const waitForREPL = new Promise<void>((resolve) => {
        listener = vscode.window.onDidOpenTerminal((e) => {
            if (e === terminal && !resolved) {
                resolved = true;
                listener?.dispose();
                resolve();
            }
        });

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                listener?.dispose();
                resolve();
            }
        }, 2000);
    });

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Starting Fennel REPL...",
        cancellable: false
    }, async () => {
        await waitForREPL;
    });

    terminal.show();
    thenFocusTextEditor();

    return terminal;
}

async function getREPL(show: boolean): Promise<vscode.Terminal> {
    const terminal: vscode.Terminal | undefined = vscode.window.terminals.find(x => x.name === terminalName);
    const terminalP = (terminal) ? Promise.resolve(terminal) : newREPL();
    const t = await terminalP;
    if (show) {
        t.show();
    }
    return t;
}

function sendSource(terminal: vscode.Terminal, text: string) {
    terminal.sendText(text, true);
}

function thenFocusTextEditor() {
    setTimeout(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'), 250);
}

export function activate(context: vscode.ExtensionContext) {
    const fnlfmtPath = path.join(context.extensionPath, 'formatters', 'fnlfmt.lua');

    if (!fennelExists()) {
        vscode.window.showErrorMessage('Fennel executable not found in PATH. Please install Fennel or add it to your PATH variable.');
        return;
    }

    context.subscriptions.push(vscode.commands.registerCommand(
        'fennel.selectExecutable',
        async () => {
            const options = ['fennel', 'fenneljit'];
            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select your preferred Fennel executable'
            });

            if (selected) {
                await vscode.workspace.getConfiguration('fennel').update('executableType', selected, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Fennel executable changed to: ${selected}`);

                if (vscode.window.terminals.some(x => x.name === terminalName)) {
                    vscode.window.showWarningMessage('Please close the active Fennel REPL terminal for changes to apply.');
                }
            }
        }
    ));

    context.subscriptions.push(vscode.commands.registerCommand(
        'fennel.startREPL',
        () => {
            getREPL(true);
        }
    ));

    context.subscriptions.push(vscode.commands.registerCommand(
        'fennel.eval',
        async () => {
            const terminal = await getREPL(true);
            const editor = vscode.window.activeTextEditor;

            if (!editor) return;

            if (editor.selection.isEmpty) {
                await vscode.commands.executeCommand('editor.action.selectToBracket');
            }

            sendSource(terminal, editor.document.getText(editor.selection));
            thenFocusTextEditor();
        }
    ));

    context.subscriptions.push(vscode.commands.registerCommand(
        'fennel.evalFile',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const terminal = await getREPL(true);
            sendSource(terminal, editor.document.getText());
            thenFocusTextEditor();
        }
    ));

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('fennel', {
            async provideDocumentFormattingEdits(document): Promise<vscode.TextEdit[]> {
                const text = document.getText();

                try {
                    const formatted = await runInRamCompiler(fnlfmtPath, text);

                    if (formatted && formatted.trim().length > 0 && formatted !== text) {
                        const fullRange = new vscode.Range(
                            document.positionAt(0),
                            document.positionAt(text.length)
                        );
                        return [vscode.TextEdit.replace(fullRange, formatted)];
                    }
                } catch (error) {
                    // Catches the fnlfmt failure and shows your custom warning window
                    vscode.window.showWarningMessage("There is a syntax error, fix before formatting.");
                }

                return [];
            }
        })
    );
}

export function deactivate() { }