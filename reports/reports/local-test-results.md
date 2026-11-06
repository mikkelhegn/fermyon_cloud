# Local Language Test Results

Generated: 2026-11-05T12:50:43.597Z

## Summary

13 languages checked: **13 passed**, **0 failed**, **0 blocked**.
Shared manifest and JavaScript handler tests: **PASS**.

## Per-Language Results

| Language | Wasm build | Spin HTTP | Native syntax only | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Rust | PASS | PASS | NOT RUN | **PASS** | HTTP 200; language=Rust ([build](rust/local-test-logs/rust-build.log), [runtime](rust/local-test-logs/rust-runtime.log)) |
| JavaScript | PASS | PASS | NOT RUN | **PASS** | HTTP 200; language=JavaScript ([build](javascript/local-test-logs/javascript-build.log), [runtime](javascript/local-test-logs/javascript-runtime.log)) |
| TypeScript | PASS | PASS | NOT RUN | **PASS** | HTTP 200; language=TypeScript ([build](typescript/local-test-logs/typescript-build.log), [runtime](typescript/local-test-logs/typescript-runtime.log)) |
| Python | PASS | PASS | PASS | **PASS** | HTTP 200; language=Python ([build](python/local-test-logs/python-build.log), [runtime](python/local-test-logs/python-runtime.log)) |
| Go | PASS | PASS | NOT RUN | **PASS** | HTTP 200; language=Go ([build](go/local-test-logs/go-build.log), [runtime](go/local-test-logs/go-runtime.log)) |
| C | PASS | PASS | PASS | **PASS** | HTTP 200; language=C ([build](c/local-test-logs/c-build.log), [runtime](c/local-test-logs/c-runtime.log)) |
| C++ | PASS | PASS | PASS | **PASS** | HTTP 200; language=C++ ([build](cpp/local-test-logs/cpp-build.log), [runtime](cpp/local-test-logs/cpp-runtime.log)) |
| C# | PASS | PASS | NOT RUN | **PASS** | HTTP 200; language=C# ([build](csharp/local-test-logs/csharp-build.log), [runtime](csharp/local-test-logs/csharp-runtime.log)) |
| Grain | PASS | PASS | NOT RUN | **PASS** | HTTP 200; language=Grain ([build](grain/local-test-logs/grain-build.log), [runtime](grain/local-test-logs/grain-runtime.log)) |
| Ruby | PROVIDED | PASS | PASS | **PASS** | HTTP 200; language=Ruby ([build](ruby/local-test-logs/ruby-build.log), [runtime](ruby/local-test-logs/ruby-runtime.log)) |
| Swift | PASS | PASS | PASS | **PASS** | HTTP 200; language=Swift ([build](swift/local-test-logs/swift-build.log), [runtime](swift/local-test-logs/swift-runtime.log)) |
| Zig | PASS | PASS | NOT RUN | **PASS** | HTTP 200; language=Zig ([build](zig/local-test-logs/zig-build.log), [runtime](zig/local-test-logs/zig-runtime.log)) |
| PHP | PROVIDED | PASS | NOT RUN | **PASS** | HTTP 200; language=PHP ([build](php/local-test-logs/php-build.log), [runtime](php/local-test-logs/php-runtime.log)) |

## Follow-Up Actions

No language failures or blocked prerequisites were reported.

## Excluded From Automated Spin Tests

- fsharp: The .NET WASI module runs directly under Wasmtime 50.0.1, but Spin 4.2.5 traps in its WAGI Preview 1 adapter during allocate_stack. Excluded from automated Spin tests until a compatible component runtime is available.

## Environments

| Language | Platform | Spin | Test completed | Shared tests |
| --- | --- | --- | --- | --- |
| Rust | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:17.138Z | [PASS](rust/local-test-logs/unit-tests.log) |
| JavaScript | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:22.868Z | [PASS](javascript/local-test-logs/unit-tests.log) |
| TypeScript | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:22.655Z | [PASS](typescript/local-test-logs/unit-tests.log) |
| Python | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:26.484Z | [PASS](python/local-test-logs/unit-tests.log) |
| Go | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:43.592Z | [PASS](go/local-test-logs/unit-tests.log) |
| C | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:17.879Z | [PASS](c/local-test-logs/unit-tests.log) |
| C++ | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:22.475Z | [PASS](cpp/local-test-logs/unit-tests.log) |
| C# | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:22.531Z | [PASS](csharp/local-test-logs/unit-tests.log) |
| Grain | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:25.272Z | [PASS](grain/local-test-logs/unit-tests.log) |
| Ruby | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:28.685Z | [PASS](ruby/local-test-logs/unit-tests.log) |
| Swift | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:21.875Z | [PASS](swift/local-test-logs/unit-tests.log) |
| Zig | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:13.726Z | [PASS](zig/local-test-logs/unit-tests.log) |
| PHP | Linux x86_64 | spin 4.2.5 (e09d7d5 2026-10-23) | 2026-11-05T12:50:17.209Z | [PASS](php/local-test-logs/unit-tests.log) |

## Installed Tool Inventory

| Language | Tool | Observed version |
| --- | --- | --- |
| Rust | cargo | cargo 1.90.0 (840b83a10 2025-07-30) |
| Rust | rustc | rustc 1.90.0 (1159e78c4 2025-09-14) |
| Rust | node | v22.20.0 |
| Rust | npm | 10.9.3 |
| JavaScript | node | v22.20.0 |
| JavaScript | npm | 10.9.3 |
| TypeScript | node | v22.20.0 |
| TypeScript | npm | 10.9.3 |
| Python | node | v22.20.0 |
| Python | npm | 10.9.3 |
| Python | python3 | Python 3.10.12 |
| Python | .venv/bin/python | Python 3.10.12 |
| Python | .venv/bin/componentize-py | componentize-py 0.17.2 |
| Go | node | v22.20.0 |
| Go | npm | 10.9.3 |
| Go | go | flag provided but not defined: -version Go is a tool for managing Go source code.  Usage:  	go <command> [arguments]  The commands are:  	bug         start a bug report 	build       compile packages and dependencies 	clean       remove object files and cached files 	doc         show documentation for package or symbol 	env         print Go environment information 	fix         update packages to use new APIs 	fmt         gofmt (reformat) package sources 	generate    generate Go files by processing source 	get         add dependencies to current module and install them 	install     compile and install packages and dependencies 	list        list packages or modules 	mod         module maintenance 	work        workspace maintenance 	run         compile and run Go program 	telemetry   manage telemetry data and settings 	test        test packages 	tool        run specified go tool 	version     print Go version 	vet         report likely mistakes in packages  Use "go help <command>" for more information about a command.  Additional help topics:  	buildconstraint build constraints 	buildmode       build modes 	c               calling between Go and C 	cache           build and test caching 	environment     environment variables 	filetype        file types 	go.mod          the go.mod file 	gopath          GOPATH environment variable 	goproxy         module proxy protocol 	importpath      import path syntax 	modules         modules, module versions, and more 	module-auth     module authentication using go.sum 	packages        package lists and patterns 	private         configuration for downloading non-public code 	testflag        testing flags 	testfunc        testing functions 	vcs             controlling version control with GOVCS  Use "go help <topic>" for more information about that topic. |
| Go | tinygo | Unknown command: --version TinyGo is a Go compiler for small places. version: 0.35.0 usage: tinygo <command> [arguments] commands: 		build:		compile packages and dependencies 		run:		compile and run immediately 		test:		test packages 		flash:		compile and flash to the device 		gdb:		run/flash and immediately enter GDB 		lldb:		run/flash and immediately enter LLDB 		monitor:	open communication port 		ports:		list available serial ports 		env:		list environment variables used during build 		list:		run go list using the TinyGo root 		clean:		empty cache directory (/home/tester/.cache/tinygo) 		targets:	list targets 		info:		show info for specified target 		version:	show version 		help:		print this help text flags:   -baudrate int     	baudrate of serial monitor (default 115200)   -buildmode string     	build mode to use (default, c-shared)   -cpuprofile string     	cpuprofile output   -gc string     	garbage collector to use (none, leaking, conservative)   -internal-dumpssa     	dump internal Go SSA   -internal-nodwarf     	internal flag, use -no-debug instead   -internal-printir     	print LLVM IR   -internal-verifyir     	run extra verification steps on LLVM IR   -interp-timeout duration     	interp optimization pass timeout (default 3m0s)   -ldflags string     	Go link tool compatible ldflags   -llvm-features string     	comma separated LLVM features to enable   -monitor     	enable serial monitor   -no-debug     	strip debug information   -ocd-commands string     	OpenOCD commands, overriding target spec (can specify multiple separated by commas)   -ocd-output     	print OCD daemon output during debug   -opt string     	optimization level: 0, 1, 2, s, z (default "z")   -p int     	the number of build jobs that can run in parallel (default 16)   -panic string     	panic strategy (print, trap) (default "print")   -port string     	flash port (can specify multiple candidates separated by commas)   -print-allocs string     	regular expression of functions for which heap allocations should be printed   -print-stacks     	print stack sizes of goroutines   -programmer string     	which hardware programmer to use   -scheduler string     	which scheduler to use (none, tasks, asyncify)   -serial string     	which serial output to use (none, uart, usb, rtt)   -size string     	print sizes (none, short, full, html)   -stack-size value     	goroutine stack size (if unknown at compile time)   -tags value     	a space-separated list of extra build tags   -target string     	chip/board name or JSON target specification file   -timeout duration     	the length of time to retry locating the MSD volume to be used for flashing (default 20s)   -work     	print the name of the temporary build directory and do not delete this directory on exit   -x	Print commands  for more details, see https://tinygo.org/docs/reference/usage/ |
| C | node | v22.20.0 |
| C | npm | 10.9.3 |
| C | zig | info: Usage: zig [command] [options]  Commands:    build            Build project from build.zig   fetch            Copy a package into global cache and print its hash   init             Initialize a Zig package in the current directory    build-exe        Create executable from source or object files   build-lib        Create library from source or object files   build-obj        Create object from source or object files   test             Perform unit testing   run              Create executable and run immediately    ast-check        Look for simple compile errors in any set of files   fmt              Reformat Zig source into canonical form   reduce           Minimize a bug report   translate-c      Convert C code to Zig code    ar               Use Zig as a drop-in archiver   cc               Use Zig as a drop-in C compiler   c++              Use Zig as a drop-in C++ compiler   dlltool          Use Zig as a drop-in dlltool.exe   lib              Use Zig as a drop-in lib.exe   ranlib           Use Zig as a drop-in ranlib   objcopy          Use Zig as a drop-in objcopy   rc               Use Zig as a drop-in rc.exe    env              Print lib path, std path, cache directory, and version   help             Print this help and exit   std              View standard library documentation in a browser   libc             Display native libc paths file or validate one   targets          List available compilation targets   version          Print version number and exit   zen              Print Zen of Zig and exit  General Options:    -h, --help       Print command-specific usage  error: unknown command: --version |
| C | clang | Ubuntu clang version 14.0.0-1ubuntu1.1 Target: x86_64-pc-linux-gnu Thread model: posix InstalledDir: /usr/bin |
| C++ | node | v22.20.0 |
| C++ | npm | 10.9.3 |
| C++ | zig | info: Usage: zig [command] [options]  Commands:    build            Build project from build.zig   fetch            Copy a package into global cache and print its hash   init             Initialize a Zig package in the current directory    build-exe        Create executable from source or object files   build-lib        Create library from source or object files   build-obj        Create object from source or object files   test             Perform unit testing   run              Create executable and run immediately    ast-check        Look for simple compile errors in any set of files   fmt              Reformat Zig source into canonical form   reduce           Minimize a bug report   translate-c      Convert C code to Zig code    ar               Use Zig as a drop-in archiver   cc               Use Zig as a drop-in C compiler   c++              Use Zig as a drop-in C++ compiler   dlltool          Use Zig as a drop-in dlltool.exe   lib              Use Zig as a drop-in lib.exe   ranlib           Use Zig as a drop-in ranlib   objcopy          Use Zig as a drop-in objcopy   rc               Use Zig as a drop-in rc.exe    env              Print lib path, std path, cache directory, and version   help             Print this help and exit   std              View standard library documentation in a browser   libc             Display native libc paths file or validate one   targets          List available compilation targets   version          Print version number and exit   zen              Print Zen of Zig and exit  General Options:    -h, --help       Print command-specific usage  error: unknown command: --version |
| C++ | clang | Ubuntu clang version 14.0.0-1ubuntu1.1 Target: x86_64-pc-linux-gnu Thread model: posix InstalledDir: /usr/bin |
| C# | node | v22.20.0 |
| C# | npm | 10.9.3 |
| C# | python3 | Python 3.10.12 |
| C# | dotnet | 8.0.415 |
| C# | clang | Ubuntu clang version 14.0.0-1ubuntu1.1 Target: x86_64-pc-linux-gnu Thread model: posix InstalledDir: /usr/bin |
| Grain | node | v22.20.0 |
| Grain | npm | 10.9.3 |
| Grain | grain | 0.7.2 |
| Ruby | node | v22.20.0 |
| Ruby | npm | 10.9.3 |
| Ruby | ruby | ruby 3.0.2p107 (2021-07-07 revision 0db68f0233) [x86_64-linux-gnu] |
| Swift | node | v22.20.0 |
| Swift | npm | 10.9.3 |
| Swift | swiftc | Swift version 6.0.2 (swift-6.0.2-RELEASE) Target: x86_64-unknown-linux-gnu |
| Swift | clang | clang version 17.0.0 (https://github.com/swiftlang/llvm-project.git cff7a0f432c7588ea9015cf96f9093cd3e08395c) Target: x86_64-unknown-linux-gnu Thread model: posix InstalledDir: /opt/swift/usr/bin |
| Zig | node | v22.20.0 |
| Zig | npm | 10.9.3 |
| Zig | zig | info: Usage: zig [command] [options]  Commands:    build            Build project from build.zig   fetch            Copy a package into global cache and print its hash   init             Initialize a Zig package in the current directory    build-exe        Create executable from source or object files   build-lib        Create library from source or object files   build-obj        Create object from source or object files   test             Perform unit testing   run              Create executable and run immediately    ast-check        Look for simple compile errors in any set of files   fmt              Reformat Zig source into canonical form   reduce           Minimize a bug report   translate-c      Convert C code to Zig code    ar               Use Zig as a drop-in archiver   cc               Use Zig as a drop-in C compiler   c++              Use Zig as a drop-in C++ compiler   dlltool          Use Zig as a drop-in dlltool.exe   lib              Use Zig as a drop-in lib.exe   ranlib           Use Zig as a drop-in ranlib   objcopy          Use Zig as a drop-in objcopy   rc               Use Zig as a drop-in rc.exe    env              Print lib path, std path, cache directory, and version   help             Print this help and exit   std              View standard library documentation in a browser   libc             Display native libc paths file or validate one   targets          List available compilation targets   version          Print version number and exit   zen              Print Zen of Zig and exit  General Options:    -h, --help       Print command-specific usage  error: unknown command: --version |
| PHP | node | v22.20.0 |
| PHP | npm | 10.9.3 |

## Scope And Limits

Results cover per-language builds and Spin HTTP checks, not Fermyon Cloud deployment certification or external services. Native syntax checks are not Wasm compilation or runtime tests. Ruby and PHP use provided Wasm interpreters. Tool inventories describe separate environments; a compiler absent from an unrelated language container is not a failure.
