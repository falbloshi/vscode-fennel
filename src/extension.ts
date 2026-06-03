import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const windows: boolean = os.platform() == 'win32';
const fennelBinary: string = windows ? 'fennel.exe' : 'fennel';
const terminalName = 'Fennel REPL';


function getFennelPath(): string | undefined {
	const pathEnv = process.env['PATH'] || process.env['Path'] || '';

	for (const envPath of pathEnv.split(path.delimiter)) {
		const absolutePath = path.resolve(envPath, fennelBinary);
		if (fs.existsSync(absolutePath)) {
			return absolutePath;
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

	context.subscriptions.push(vscode.commands.registerCommand(
    'fennel.formatFile',
    async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            
            const fnlfmtPath = path.join(context.extensionPath, 'formatters', 'fnlfmt.lua');
			const filePath = editor.document.uri.fsPath;
			const formatCommand = `lua "${fnlfmtPath}" --fix "${filePath}"`;

            await editor.document.save();
            await execPromise(formatCommand);
			
			thenFocusTextEditor();

        } catch (error) {
            console.error('Failed to format file:', error);
            vscode.window.showErrorMessage(`Failed to format file: ${error}`);
        }
    }
));
}
