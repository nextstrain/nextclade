# Standalone download

Nextclade CLI is provided in the form of a self-contained single executable file. You can download and run it directly.

This is the recommended way of installing Nextclade CLI.

## Download manually

All versions and their release notes are available on 🐈 [GitHub Releases](https://github.com/nextstrain/nextclade/releases).

For convenience, this table provides links to the latest version:

<table>
<tr><td><b>Linux</b> x86_64</td><td><a href="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-unknown-linux-gnu">glibc</a><br><a href="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-unknown-linux-musl">musl</a>*</td></tr>
<tr><td><b>Linux</b> ARM64</td><td><a href="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-aarch64-unknown-linux-gnu">glibc</a><br><a href="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-aarch64-unknown-linux-musl">musl</a>*</td></tr>
<tr><td><b>macOS</b>**</td><td><a href="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-aarch64-apple-darwin">Apple Silicon</a><br><a href="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-apple-darwin">Intel</a></td></tr>
<tr><td><b>Windows</b> x86_64</td><td><a href="https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-pc-windows-gnu.exe">.exe</a></td></tr>
</table>

<p><sub>* glibc builds are faster and recommended, but require glibc >= 2.14. musl builds are static, run on older Linux distributions, and are slightly slower</sub><br>
<sub>** macOS executables are not signed. See the note below if macOS refuses to run them</sub></p>

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

## Verify a download

Releases published after version 3.25.1 include a `SHA256SUMS` file with the SHA-256 checksum of every executable, and a [GitHub build provenance attestation](https://docs.github.com/en/actions/concepts/security/artifact-attestations) for every executable. Use them to make sure that the file you downloaded is the file that the Nextclade release workflow built.

### Check the checksum

Download the executable under its original file name, together with `SHA256SUMS` from the same release:

```bash
curl -fsSLO "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-unknown-linux-gnu"
curl -fsSLO "https://github.com/nextstrain/nextclade/releases/latest/download/SHA256SUMS"
```

For a specific version, replace `latest/download` with `download/<version>` in both URLs.

Then check the files in this directory against the checksums. The command prints `OK` for each file that matches, and fails for each file that does not:

- Linux:

  ```bash
  sha256sum --ignore-missing -c SHA256SUMS
  ```

- macOS:

  ```bash
  shasum -a 256 --ignore-missing -c SHA256SUMS
  ```

  If `shasum` reports an unknown option `--ignore-missing` (older macOS versions), check one file. Set `file` to the name of the executable you downloaded:

  ```bash
  file="nextclade-aarch64-apple-darwin" # Apple Silicon; use "nextclade-x86_64-apple-darwin" for Intel
  grep " ${file}\$" SHA256SUMS | shasum -a 256 -c
  ```

- Windows PowerShell:

  ```powershell
  $file = 'nextclade-x86_64-pc-windows-gnu.exe'
  $entry = Select-String -Path SHA256SUMS -Pattern (' ' + [regex]::Escape($file) + '$') -ErrorAction Stop | Select-Object -First 1
  if (-not $entry) { throw "No checksum for $file in SHA256SUMS" }
  $expected = $entry.Line.Split(' ')[0]
  $actual = (Get-FileHash -Algorithm SHA256 -Path $file -ErrorAction Stop).Hash
  if ($actual -ne $expected) { throw "Checksum mismatch for $file" } else { 'OK' }
  ```

  The comparison ignores case, because `Get-FileHash` prints the checksum in upper case. The script stops with an error when the checksum does not match.

After the check, you can rename the executable, for example to `nextclade`.

### Check the build attestation

With the [GitHub CLI](https://cli.github.com/), check that GitHub Actions in the `nextstrain/nextclade` repository built the file:

```bash
gh attestation verify nextclade-x86_64-unknown-linux-gnu --repo nextstrain/nextclade
```

The attestation matches the content of the file, so this check also works after you rename the executable.
