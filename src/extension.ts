import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const windows: boolean = os.platform() == 'win32';
const terminalName = 'Fennel REPL';

function getBinaryNames(): string[] {
    let type = 'fennel';
    try {
        const config = vscode.workspace.getConfiguration('fennel');
        if (config) {
            type = config.get<string>('executableType', 'fennel');
        }
    } catch (e) {
        console.error("Configuration framework failed to initialize:", e);
    }
    
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
            if (fs.existsSync(absolutePath)) {
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

	let listener: vscode.Disposable | undefined;

	const waitForREPL = new Promise<void>((resolve) => {
		listener = vscode.window.onDidOpenTerminal((e) => {
			if (e === terminal) {
				resolve();
			}
		});
		setTimeout(resolve, 2000);
	});

	await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Starting Fennel REPL...",
		cancellable: false
	}, async () => {
		await waitForREPL;
	});

	listener?.dispose();
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

	context.subscriptions.push(vscode.commands.registerCommand(
        'fennel.selectExecutable',
        async () => {
            const options = ['fennel', 'fenneljit'];
            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select your preferred Fennel executable executable'
            });

            if (selected) {
                // Save the configuration globally so it persists across sessions
                await vscode.workspace.getConfiguration('fennel').update('executableType', selected, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Fennel executable changed to: ${selected}`);
                
                // If a terminal is already open, gently notify them
                if (vscode.window.terminals.some(x => x.name === terminalName)) {
                    vscode.window.showWarningMessage('Please close the active Fennel REPL terminal for changes to apply.');
                }
            }
        }
    ));


	console.log('Extension "vscode-fennel" is now active!');

	if (!fennelExists()) {
		vscode.window.showErrorMessage('Can\'t find Fennel language on your computer! Check your PATH variable.');
		return;
	}

	context.subscriptions.push(vscode.commands.registerCommand(
		'fennel.startREPL',
		() => {
			getREPL(true);
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'fennel.eval',
		async () => {

			try {
				const terminal = await getREPL(true);
				const editor = vscode.window.activeTextEditor

				if (!editor) return;

				if (editor.selection.isEmpty) {
					await vscode.commands.executeCommand('editor.action.selectToBracket')
				}

				sendSource(terminal, editor.document.getText(editor.selection));
				thenFocusTextEditor();

			} catch (error) {
				console.error('Repl failed to load:', error)
				vscode.window.showErrorMessage(`Repl failed to load: ${error}`);
			}
		}
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'fennel.evalFile',
		async () => {

			try {
				const editor = vscode.window.activeTextEditor;
				if (!editor) return;

				const terminal = await getREPL(true);

				sendSource(terminal, editor.document.getText());
				thenFocusTextEditor();

			} catch (error) {
				console.error('Failed to evaluate file:', error)
				vscode.window.showErrorMessage(`Failed to evaluate file: ${error}`);
			}
		}
	));

	context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('fennel', {
            async provideDocumentFormattingEdits(document) {
                try {
                    const fnlfmtPath = path.join(context.extensionPath, 'formatters', 'fnlfmt.lua');
                    const filePath = document.uri.fsPath;
                    const formatCommand = `lua "${fnlfmtPath}" "${filePath}"`;

                    const { stdout } = await execPromise(formatCommand);

                    if (stdout && stdout.trim().length > 0) {
                        const fullRange = new vscode.Range(
                            document.positionAt(0),
                            document.positionAt(document.getText().length)
                        );
                        return [vscode.TextEdit.replace(fullRange, stdout)];
                    }
                    return [];
                } catch (error) {
                    console.error('Failed to format document:', error);
                    vscode.window.showErrorMessage(`Fennel formatting failed: ${error}`);
                    return [];
                }
            }
        })
    );
}

export function deactivate() {}