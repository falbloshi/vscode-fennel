# Fennel language support for Visual Studio Code

## Features

- Syntax highlighting
- Eval expression ```alt+e```
- Eval file ```alt+l```

## Local install
```
# First, make sure you have Node.js version 20 or greater installed. 
# I recommend using [bun](https://bun.com/)


# Clone the extension.
```bash
git clone https://github.com/falbloshi/vscode-fennel
cd vscode-fennel
```


# Install vscode-fennel dependencies.
```bash
npm install
#alternatively
bun install
```

# Generate the vscode extension (VSIX) file using vsce. 
```bash
npx vsce package
#alternatively
bunx vsce package
```

# Install the extension.
`code --install-extension vscode-fennel-0.2.1.vsix`



## Debug this extension

- Run `npm install` in terminal to install dependencies
- Run the `Run Extension` target in the Debug View in VS Code. This will:
	- Start a task `npm: watch` to compile the code
	- Run the extension in a new VS Code window

## Credits / Third-Party Licenses
- The main extension is based on [janet-lang:vscode-janet](https://github.com/janet-lang/vscode-janet/)
- Some files and extensions from 
	- Formatter from [~Technomancy:fnlfmt](https://git.sr.ht/~technomancy/fnlfmt)
	- Configuration.json from [BetterThanTomorrow:calva](https://github.com/BetterThanTomorrow/calva)	
	- Syntax highlight from [Kongeor:vsc-fennel](https://github.com/kongeor/vsc-fennel/tree/master/syntaxes)	
- The extension logo is a modified asset based on the [Font Awesome](https://fontawesome.com) Fennel/Pl