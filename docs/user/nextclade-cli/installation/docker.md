# With Docker

You can run Nextclade in a Docker container.

Docker container images are available at Docker Hub: 🐋 [nextstrain/nextclade](https://hub.docker.com/r/nextstrain/nextclade)

Pull and run the latest released version with:

```bash
docker pull nextstrain/nextclade:latest
docker run -it --rm nextstrain/nextclade:latest nextclade --help
```

Pull and run a specific version with:

```bash
docker run -it --rm nextstrain/nextclade:3.0.0 nextclade --help
```

> ⚠️ Don't forget to mount necessary [docker volumes](https://docs.docker.com/storage/volumes/) to be able to supply the data into the container and to access the results. You may want to also add [`--user` argument](https://docs.docker.com/engine/reference/commandline/run/) to docker command, to run on behalf of a non-root user and group. This is not specific to Nextclade. Explanation of Docker containers is out of scope of this documentation - please refer to Docker documentation for more details.

All images are multi-platform (amd64 and arm64). Pulling on an ARM64 host (Apple Silicon, AWS Graviton, Raspberry Pi) gets a native image automatically.

Docker images are available based on the following images:

- `debian` (default): Nextclade executable + basic Linux utilities (`bash`, `curl`, `wget`) for use in workflows
- `alpine`: Alpine Linux + Nextclade executable, for small image size
- `scratch`: empty image + Nextclade executable, for minimal size

Each base is published for multiple versions (e.g., `debian13`, `debian12`, `debian11`, `alpine3.23`, `alpine3.18`). Unversioned tags (`:debian`, `:alpine`) point to the latest base version.

You can choose to use the latest available version (use tag `:latest` or no tag), or to freeze a specific version (e.g. `:3.0.0`) or only major version (e.g. `:3`), or a base image (e.g. `:debian`) or both version and base image (e.g. `:3.0.0-debian`), or a specific base version (e.g. `:3.0.0-debian13`), or mix and match. Tag `:latest` points to `:debian`. See the full list of tags [here](https://hub.docker.com/r/nextstrain/nextclade/tags).

### Example

This is a simple example for Linux.

```bash
docker run -it --rm \
  --volume="$(pwd):/data/" \
  --user="$(id -u):$(id -g)" \
  "nextstrain/nextclade" \
  nextclade run \
      --dataset-name="sars-cov-2" \
      --output-dir="/data/output/" \
      "/data/my_sequences.fasta"
```

In this example, Docker mounts current working directory on your computer `$(pwd)` as a volume at path `/data/` inside the container. It starts a container from our image tagged `nextstrain/nextclade` on behalf of the current user (command `id -u` prints id of the current user and `id -g` prints id of the current user's group) and runs our Nextclade CLI command in it. Nextclade reads sequences from `/data/my_sequences.fasta` inside the container which corresponds to `my_sequences.fasta` in your current directory. Then Nextclade writes output files to `/data/output/` directory in the container, which corresponds to the `output/` directory in your current working directory.
