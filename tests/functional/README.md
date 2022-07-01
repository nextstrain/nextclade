# Functional tests for CLI

These tests use cram functional testing framework for command line applications:
https://bitheap.org/cram/

These tests run a set of shell commands and compare the outputs with the recorded outputs.

Install cram:

```bash
pip3 install cram
```

In order to verify the CLI behavior against existing tests, run:

```bash
cram --shell=/bin/bash tests/functional/*.t
```

When adding new tests or when the behavior of CLI is changing, run cram with `-i` arg to interactively accept or reject the changes:

```bash
cram --shell=/bin/bash tests/functional/*.t -i
```

Accepted changes are recorded in the same file as the test, just below the command.
