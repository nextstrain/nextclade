# macOS: development troubleshooting

1. Problem: developer mode is not enabled

    `lldb` debugger refuses to run with message:
    
      > developer mode is not enabled on this machine and this is a non-interactive debug session
    
    Possible solution:

    Enable developer mode with
      ```
      sudo DevToolsSecurity -enable
      ```
    

2. Problem: `lldb` or `gdb` is not codesigned

    When trying to debug with `lldb` and `gdb` they stop with a message
    
    > Unable to find Mach task port for process-id

    Possible solution:

    The `lldb` or `gdb` executable must be codesigned. The procedure is explained in lldb docs: [code-signing.txt](https://opensource.apple.com/source/lldb/lldb-300.2.47/docs/code-signing.txt)

    Additionally, when installing `gdb` using Homebrew (`brew install gdb`), it recommends the following:

   > gdb requires special privileges to access Mach ports.
   > You will need to codesign the binary. For instructions, see:
   > 
   >   https://sourceware.org/gdb/wiki/BuildingOnDarwin
   > 
   > On 10.12 (Sierra) or later with SIP, you need to run this:
   > 
   >   echo "set startup-with-shell off" >> ~/.gdbinit
    
