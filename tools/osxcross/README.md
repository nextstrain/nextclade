# osxcross docker build

This builds an osxcross distribution inside a Docker container and produces a tarball, for simpler distribution.

osxcross is a toolchain that allows cross-compilation for macOS targets. Learn more about osxcross here:
https://github.com/tpoechtrager/osxcross

### How to

 1. You will need a packaged macOS SDK. It cannot be distributed due to legal reasons. Prepare it as described here: https://github.com/tpoechtrager/osxcross#packaging-the-sdk

    Usually it comes out in form of a file `MacOSXvv.v.sdk.tar.xz`, where `vv.v` is the version of the SDK.

    You can then upload it to a remote server (ensuring that it's not easily accessible publicly) or to keep locally.

 3. Prepare a `.env` file. Copy example file

     ```bash
     $ cp .env.example .env
     ```
    
    and edit resulting `.env` file, filling the remote URL or local path (relative to the `Dockerfile`) to your macOS SDK, as well as its filename.

 4. Run the docker build:

    ```bash
    $ ./build
    ```
    This will produce a file "osxcross.tar.xz". This is your osxcross distribution.

