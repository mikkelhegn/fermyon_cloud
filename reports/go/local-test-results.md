# Local Language Test Results

Generated: 2026-11-02T12:41:30.491Z

Environment: Linux x86_64; spin 4.2.5 (e09d7d5 2026-10-23); Node v22.20.0.

## Summary

1 languages checked: **0 passed**, **1 failed**, **0 blocked**.
Shared manifest and JavaScript handler tests: **PASS**.

## Per-Language Results

| Language | Wasm build | Spin HTTP | Native syntax only | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Go | FAIL | NOT RUN | NOT RUN | **FAIL** | Error: Build command for component go failed with status Exited(1) ([build log](local-test-logs/go-build.log)) |

## Follow-Up Actions

- Python: inspect the componentizer's signal-9 termination before claiming a successful build. Signal 9 establishes process termination, not its cause. Use Python 3.10+ as documented; compare the system and venv versions in the inventory below before retrying.
- Swift: install a WASI-capable SwiftWasm toolchain including `swift-autolink-extract`; the installed Apple Swift compiler is not a complete WASI build environment.
- Go: install Go and TinyGo, then resolve the Go module dependencies.
- C, C++, Zig: install the manifest-compatible Zig 0.13.0 compiler.
- C#, F#: install .NET 8 and the experimental WASI prerequisites; C# also requires Wizer.
- Grain: install a Grain compiler supporting the manifest's WASI build options.
- Rerun the complete matrix after installing prerequisites. A syntax-only PASS does not unblock a missing Wasm toolchain.

## Tool Inventory

| Tool | Observed version |
| --- | --- |
| cargo | Not installed |
| rustc | Not installed |
| node | v22.20.0 |
| npm | 10.9.3 |
| python3 | Not installed |
| .venv/bin/python | Not installed |
| .venv/bin/componentize-py | Not installed |
| go | flag provided but not defined: -version Go is a tool for managing Go source code.  Usage:  	go <command> [arguments]  The commands are:  	bug         start a bug report 	build       compile packages and dependencies 	clean       remove object files and cached files 	doc         show documentation for package or symbol 	env         print Go environment information 	fix         update packages to use new APIs 	fmt         gofmt (reformat) package sources 	generate    generate Go files by processing source 	get         add dependencies to current module and install them 	install     compile and install packages and dependencies 	list        list packages or modules 	mod         module maintenance 	work        workspace maintenance 	run         compile and run Go program 	telemetry   manage telemetry data and settings 	test        test packages 	tool        run specified go tool 	version     print Go version 	vet         report likely mistakes in packages  Use "go help <command>" for more information about a command.  Additional help topics:  	buildconstraint build constraints 	buildmode       build modes 	c               calling between Go and C 	cache           build and test caching 	environment     environment variables 	filetype        file types 	go.mod          the go.mod file 	gopath          GOPATH environment variable 	goproxy         module proxy protocol 	importpath      import path syntax 	modules         modules, module versions, and more 	module-auth     module authentication using go.sum 	packages        package lists and patterns 	private         configuration for downloading non-public code 	testflag        testing flags 	testfunc        testing functions 	vcs             controlling version control with GOVCS  Use "go help <topic>" for more information about that topic. |
| tinygo | Unknown command: --version TinyGo is a Go compiler for small places. version: 0.35.0 usage: tinygo <command> [arguments] commands: 		build:		compile packages and dependencies 		run:		compile and run immediately 		test:		test packages 		flash:		compile and flash to the device 		gdb:		run/flash and immediately enter GDB 		lldb:		run/flash and immediately enter LLDB 		monitor:	open communication port 		ports:		list available serial ports 		env:		list environment variables used during build 		list:		run go list using the TinyGo root 		clean:		empty cache directory (/home/tester/.cache/tinygo) 		targets:	list targets 		info:		show info for specified target 		version:	show version 		help:		print this help text flags:   -baudrate int     	baudrate of serial monitor (default 115200)   -buildmode string     	build mode to use (default, c-shared)   -cpuprofile string     	cpuprofile output   -gc string     	garbage collector to use (none, leaking, conservative)   -internal-dumpssa     	dump internal Go SSA   -internal-nodwarf     	internal flag, use -no-debug instead   -internal-printir     	print LLVM IR   -internal-verifyir     	run extra verification steps on LLVM IR   -interp-timeout duration     	interp optimization pass timeout (default 3m0s)   -ldflags string     	Go link tool compatible ldflags   -llvm-features string     	comma separated LLVM features to enable   -monitor     	enable serial monitor   -no-debug     	strip debug information   -ocd-commands string     	OpenOCD commands, overriding target spec (can specify multiple separated by commas)   -ocd-output     	print OCD daemon output during debug   -opt string     	optimization level: 0, 1, 2, s, z (default "z")   -p int     	the number of build jobs that can run in parallel (default 16)   -panic string     	panic strategy (print, trap) (default "print")   -port string     	flash port (can specify multiple candidates separated by commas)   -print-allocs string     	regular expression of functions for which heap allocations should be printed   -print-stacks     	print stack sizes of goroutines   -programmer string     	which hardware programmer to use   -scheduler string     	which scheduler to use (none, tasks, asyncify)   -serial string     	which serial output to use (none, uart, usb, rtt)   -size string     	print sizes (none, short, full, html)   -stack-size value     	goroutine stack size (if unknown at compile time)   -tags value     	a space-separated list of extra build tags   -target string     	chip/board name or JSON target specification file   -timeout duration     	the length of time to retry locating the MSD volume to be used for flashing (default 20s)   -work     	print the name of the temporary build directory and do not delete this directory on exit   -x	Print commands  for more details, see https://tinygo.org/docs/reference/usage/ |
| zig | Not installed |
| dotnet | Not installed |
| grain | Not installed |
| swiftc | Not installed |
| clang | Not installed |
| ruby | Not installed |

## Method

- Run each available component build independently with `spin build -f spin.toml -c <component>`.
- Missing prerequisites are BLOCKED, not passes or application failures.
- Verify local build artifacts exist and have Wasm magic; PHP uses its manifest-pinned remote artifact instead.
- Ruby and PHP use prebuilt Wasm interpreters (PROVIDED), executing the packaged application sources during the HTTP tests; they are not local compiler builds.
- Start each built/provided component in an isolated Spin manifest on a temporary loopback port.
- Require HTTP 200, JSON content type, and the exact expected language from `GET /api/<component>`.
- For Rust, also require a greeting returned by the composed WIT dependency.
- Capture build, source, and runtime output in [local-test-logs](local-test-logs/).
- Stop every temporary server and remove temporary manifests after its test. Existing development servers are not modified.

Native syntax checks are not Wasm compilation or Spin runtime tests. A successful local Spin 4.2.5 test does not certify Fermyon Cloud compatibility.

## Scope And Limits

This run tests language compilation and HTTP handling, not Cloud deployment, AI model availability, external database credentials, Cloud quotas, or DNS. Python cross-language KV and the full Rust feature smoke suite are separate checks. No external service credentials are required or logged. A FAIL identifies an observed failure in this environment, not necessarily a language-source defect. See individual logs for root-cause evidence.

## Reproduce

`node scripts/test-all-languages.mjs`

For a single-language diagnostic: `node scripts/test-all-languages.mjs --languages=rust`. Each run replaces these summary files with the selected run's results.
