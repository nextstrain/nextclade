# Standalone download

Nextclade CLI is provided in the form of a self-contained single executable file. You can download and run it directly.

This is the recommended way of installing Nextclade CLI.

## Download manually

All versions and their release notes are available on 🐈 [GitHub Releases](https://github.com/nextstrain/nextclade/releases).

For convenience, this table provides links to the latest version:

|         | x86_64                                                                                                                                                                                                                    | arm64                                                                                                                                                                                                                       |
|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Linux   | [gnu](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-unknown-linux-gnu), [musl](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-unknown-linux-musl)* | [gnu](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-aarch64-unknown-linux-gnu), [musl](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-aarch64-unknown-linux-musl)* |
| macOS   | [download](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-apple-darwin)                                                                                                                | [download](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-aarch64-apple-darwin)                                                                                                                 |
| Windows | [download](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-pc-windows-gnu.exe)                                                                                                          | -                                                                                                                                                                                                                           |

<p>
<small>
* - the "gnu" build is faster and is recommended for most users. However, it requires glibc >= 2.14 to be present on the system. If you are running an older Linux distribution, you can use a "musl" flavor, which does not require external libc but is slightly slower.
</small>
</p>

The downloaded executables can be renamed and moved freely. It is convenient to rename the executable to `nextclade` and to move to one of the directories included in system `$PATH`, so that it's available from any directory in the console. On Unix-like systems don't forget to add "executable" permission to the files.

> ⚠️ Note that macOS executables are not currently signed with a developer certificate (it requires maintaining a paid Apple developer account). Recent versions of macOS might refuse to run the executable. Before invoking Nextclade on command line, follow these steps to add Nextclade to the exclude list:
> <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac">
> macOS User Guide: Open a Mac app from an unidentified developer</a>, and check <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/en-us/HT202491">
> Security settings</a>. Refer to the latest macOS documentation if none of this works.

## Download from command line

The following commands can be used to download Nextclade from command line, from shell scripts and inside dockerfiles. They use the same URLs as in the previous section.

<p>
<details>
<summary>
🐧 Linux x86_64 (click to expand)
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-unknown-linux-gnu" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/3.0.0/nextclade-x86_64-unknown-linux-gnu" -o "nextclade" && chmod +x nextclade
```

</details>
</p>

<p>
<details>
<summary>
🍏 macOS Intel (click to expand)
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-apple-darwin" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/3.0.0/nextclade-x86_64-apple-darwin" -o "nextclade" && chmod +x nextclade
```

</details>
</p>

<p>
<details>
<summary>
🍎 macOS Apple Silicon (click to expand)
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-aarch64-apple-darwin" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/3.0.0/nextclade-aarch64-apple-darwin" -o "nextclade" && chmod +x nextclade
```

</details>
</p>

<p>
<details>
<summary>
🪟 Windows x86_64 PowerShell (click to expand)
</summary>

Download latest version:

```powershell
Invoke-WebRequest https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-pc-windows-gnu.exe -O nextclade.exe
```

Download specific version:

```powershell
Invoke-WebRequest https://github.com/nextstrain/nextclade/releases/download/3.0.0/nextclade-x86_64-pc-windows-gnu.exe -O nextclade.exe
```

</details>
</p>
