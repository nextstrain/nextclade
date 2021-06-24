# Setup debugging in CLion

This guide describes how to setup [Jetbrains CLion IDE](https://www.jetbrains.com/clion/) debugger for this project.

1. Download and install CLion (snadalone or with [Jetbrains Tolbox App](https://www.jetbrains.com/toolbox-app/))

2. Open CLion and open nextclade directory in it.

3. Setup a Toolchain

   Menu "File" -> "Settings" -> "Build, Execution, Deployment" -> "Toolchains"

   Make sure there is a toolchain in the right side, e.g. "Default", and all fields have valid values/paths.
   If there's no toolchain, click "+" to add one, and configure paths specific for your machine.
   You can setup multiple toolchains, for example GCC and CLang.

   Click "Ok" when done, to save the results.

4. Setup a CMake profile

   Menu "File" -> "Settings" -> "Build, Execution, Deployment" -> "CMake"

   Enable "Reload CMake project on editing CMakeLists.txt"

   In "Profiles" section click "+". Enter the following:

   - Name: `Debug`

   - Build type: `Debug`

   - Toolchain: `Use default`

     (or select a toolchain you've created in step 3)

   - CMake options:

     ```
     -DCMAKE_BUILD_TYPE=Debug
     -DCMAKE_VERBOSE_MAKEFILE=0
     -DCMAKE_MODULE_PATH="<absolute_path_to_nextalign_project>/.build/Debug"
     -DNEXTALIGN_BUILD_TESTS=1
     -DNEXTALIGN_BUILD_BENCHMARKS=1
     ```

   - Build directory: `.build/Debug`

   Click "Ok" when done, to save the results.

5. In terminal (outside or CLion or in the embedded one), run `make dev` to download dependencies

6. Reload CMake project

   Menu "View" -> "Tool windows" -> "CMake". The "CMake" panel will appear (ususally at the bottom).

   In "CMake" tool window, Click "Reload CMake project" button (with "recirculation arows" icon).

   Make sure there are no errors in the CMake log.

7. Setup run configurations

   There is a dropdown on the top panel, with a tooltip "Select Run/Debug configuration". Click it. There thould be a large list of targets.

   Select "Edit configurations..."

   - Select "nextalign_cli" in the side bar and Enter:

     - Program arguments: usual set of nextalign CLI arguments
     - Working directory: path to the project root

     Click "Apply"

   - Select "nextalign_benchmarks" in the side bar and Enter:

     Program arguments:

     ```
     --benchmark_filter=.*Average
     --benchmark_counters_tabular=true
     ```

     Working directory: path to the project root

     Click "OK" to close the window

8. Debug an executable

   In the same dropdown on the top panel, select one of these targets:

   - nextalign_cli
   - nextalign_tests
   - nextalign_benchmarks

   Click "Debug" button (with a "bug" icon) on the same panel.

   Make sure it builds and runs the selected executable without errors. The "Debug" tool window should appear. (if it does not, then Menu "View" -> "Tool windows" -> "Debug").

   On Debug panel, click on "View breakpoints..." button (with "two red circles" icon).

   Enable "Exception Breakpoints" and "When any is thrown". Click "Ok".

   On the top panel, click "Stop" button (with "red square" icon) to stop the program.

9. Set a breakpoint, inspect call stack, threads, variables, add watches

   Open a source file thich belongs to the currently selected target. Click on the gutter to the right of line numbers, on a line which has executable statements, e.g. a function call. A red circle will appear on the gutter.

   Click "Debug" button on the top panel and wait until the breakpoint is hit.

   Mouse over any variable in the scope of the current function - popup should appear showing variable's value (expand the popup with "+" button, if needed).

   In the "Debug" tool window, click "Console" tab. Observe the usual output of the program.

   In the "Debug" tool window, click "Debugger" tab. Observe "Frames" section (call stack). Click on an entry in the stack to to switch to the corresponding function scope and the source file. Select a thread in a dropdown to switch to that thread's call stack.

   Click "Variables" tab. Observe all the variables in the current scope. Expand entries with "+" buttons if needed. Right click on any entry in the "Variables" tab, click "New watch...". Enter a C++ expression to evaluate and hit <Enter>. Examples of expressions:

   - `2 + 2`. Will evaluate to `4`.

   - `a[i]`, where `a` is an array and `i` is an integer in the current function scope. Will evaluate to the value of the i-th element of the array.

   - `toString(ref)`, where `ref` is the `NucleotideSequence` in the current function scope. Will evaluate to corresponding `std::string` (the result of the call to `std::string toString(const NucleotideSequence&)`).

10. Control execution of the program

    In "Debug" tool window, use "Step over", "Step into", "Step out" buttons to resume the program, one expression or a function call at a time.

    Use "Resume program" to continue execution (until the next breakpoint, exception or program exit).

    Use "Stop" button to forcefully exit.

### See also:

- [CLion documentation](https://www.jetbrains.com/help/clion/installation-guide.html)
