# Fennel language support for Visual Studio Code

## Table of Contents
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#local-install)
- [Windows Fennel Installation](#notes-on-windows)
- [Credits](#credits--third-party-licenses)

## Features

- Syntax highlighting (supports Lume and Luafun)
- Inbuilt formatter
- Eval expression ```alt+e```
- Eval file ```alt+l```

## Requirements
| Dependency | Minimum Version |
| :--- | :--- |
| **Lua** | `5.1` |
| **Fennel** | `1.5.1` |

For Windows Fennel installation, take a look at [Windows Fennel Installation](#notes-on-windows)

## Local install
First, make sure you have Node.js version 20 or greater installed. 
I recommend using [bun](https://bun.com/)


### Clone the extension.
```bash
git clone https://github.com/falbloshi/vscode-fennel
cd vscode-fennel
```


### Install vscode-fennel dependencies.
```bash
npm install
#alternatively
bun install
```

### Generate the vscode extension (VSIX) file using vsce. 
```bash
npx vsce package
#alternatively
bunx vsce package
```

### Install the extension.
`code --install-extension vscode-fennel-0.x.x.vsix`

### Debug this extension

- Run `npm install` in terminal to install dependencies
- Run the `Run Extension` target in the Debug View in VS Code. This will:
	- Start a task `npm: watch` to compile the code
	- Run the extension in a new VS Code window

### Configuration 

There is only one configuration:
``` json
"configurationDefaults": {
			"[fennel]": {
				"editor.formatOnSave": true,
```

Turn to false if you do not want to format on save.


## Notes on Windows
Since some native Lua modules (often installed via LuaRocks) use POSIX-specific code and don't compile on Windows, and there's no official `fennel.exe` available via Scoop, Chocolatey or Winget yet, here's how to set up Fennel on Windows manually. 

> **Note:** Fennel has two types of standalone loose script files. One that is an embed which you use as a library, or inject into your lua files through a runner script([see the guide](https://fennel-lang.org/setup#embedding-the-fennel-compiler-in-a-lua-application)), and one which is actually the interpreter with the REPL, which can compile .fnl into .lua. And to tell which is which, the interpreter has a `#!/usr/bin/env lua` on top of the file. 

### The REPL
Two ways you can do this. Get the standalone executable from the [downloads page](https://fennel-lang.org/downloads/) with the `.exe` extension. Or get the interpreter script, the one without any extensions, e.g `fennel-1.6.1`. 

Best if you remove the version number for either, and keep it as `fennel.exe` or `fennel` without the version number.

#### Executable

Create
`C:\Users\%USERNAME%\Appdata\Local\fennel`

And drop `fennel.exe` there, and add to `%PATH%`

#### PUC Lua w/ Standalone Script

If you have the standalone interpreter `fennel`	script.

Same thing, drop it in here: 

`C:\Users\%USERNAME%\Appdata\Local\fennel`

And add to `%PATH%`

Create `fennel.bat` script and add to it

```bat
@echo off
lua.exe "%~dp0fennel" %*
```

For either methods, to test installation, open a new powershell/cmd session and type

```bash
fennel --version
```

Should receive 

```bash
Fennel 1.6.1 on PUC Lua 5.1
```

#### LuaJIT

If you have compiled LuaJITand have put it somewhere like 

`C:\Users\%USERNAME%\Appdata\Local\luajit`

And set `%PATH%` to it.

Move the `fennel` file there and keep it alongside `luajit.exe`

Create `fennel.bat` (if you just want LuaJIT to be your main interpreter) or `fenneljit.bat` (Same naming convention as the Linux community binaries, and if you want to use `fennel` through Lua and want the option to run via LuaJIT as well)

And add to it

```bat
@echo off
luajit.exe "%~dp0fennel.lua" %*
```

You can invoke fennel `fenneljit` like a compiled executable and through LuaJIT. You should see:

`Welcome to Fennel 1.6.1 on LuaJIT 2.1.1780076327 Windows/x64!`

### The Library

Many programs made for Fennel requires the Fennel library (`fennel.lua`). Download `fennel-1.6.1.lua` from the [downloads page](https://fennel-lang.org/downloads/), rename it to `fennel.lua`, and place it in your Lua module path.

### Vanilla Path

Drop `fennel.lua` in any folder listed when you run:

```lua
lua -e "require('fennel')"
```

### LuaRocks Path

> **Note:** If you don't have LuaRocks installed, download it from [luarocks.org](https://luarocks.org) and install it first.

If you have luarocks installed, here is where you can put the library. Remove the version name and rename it to `fennel.lua`

And drop here (adjust `5.4` to your Lua version, e.g., `5.1` or `5.3`):

`C:\Users\%USERNAME%\AppData\Roaming\luarocks\share\lua\5.4`

To test

Invoke `lua` from powershell/cmd

```lua
Lua 5.4.6  Copyright (C) 1994-2023 Lua.org, PUC-Rio
> require("fennel") ; invoke this command

table: 00000XXXXXX C:\Users\%USERNAME%\AppData\Roaming\luarocks\share\lua\5.4\fennel.lua
```

If you see the `table: 0000` part, then the library is correctly loaded.

## Credits / Third-Party Licenses
- The main extension is based on [janet-lang:vscode-janet](https://github.com/janet-lang/vscode-janet/)
- Some files and extensions from: 
	- Formatter (from the current developer of Fennel) from [~Technomancy:fnlfmt](https://git.sr.ht/~technomancy/fnlfmt)
	- Configuration.json from [BetterThanTomorrow:calva](https://github.com/BetterThanTomorrow/calva)	
	- Syntax highlighting from [Kongeor:vsc-fennel](https://github.com/kongeor/vsc-fennel/tree/master/syntaxes)	
- The extension logo is a modified asset based on the [Font Awesome](https://fontawesome.com)