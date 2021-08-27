<h1 id="nextclade" align="center">
Nextclade
</h1>

<h4 id="nextclade" align="center">
Viral genome alignment, mutation calling, clade assignment, quality checks and phylogenetic placement
</h4>

<p align="center">
by Nextstrain team
</p>


This package contains static library called `libnextclade`, which contains the implementation of Nextclade algorithms.

You are probably more interested in the command-line executable, which is in package <a href="../nextclade_cli">nextclade_cli</a>, or in the WebAssembly module, which is in package which is in package <a href="../nextclade_wasm">nextclade_wasm</a>, or in Nextclade web application, which is in package <a href="../web">web</a>. See readme files there for more details.

See also ["Developer's guide: Nextclade CLI and Nextalign CLI"](docs/dev/developers-guide-cli.md) for instructions on how to build and run the CLI modules. ["Developer's guide: Nextclade Web"](docs/dev/developers-guide-web.md) on how to build and run WebAssembly module and the Web Application.

Currently we don't support usage of this library outside `nextclade_cli` and `nextclade_wasm`, but it does not mean it's impossible. If you want to build a project on top of `nextclade`, we would be glad to hear about your use-case and experience.


<h3 id="license" align="center">
⚖️ License
</h3>

<p align="center">
  <a target="_blank" rel="noopener noreferrer" href="../../LICENSE" alt="License file">MIT License</a>
</p>
