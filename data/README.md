# Deprecation notice

Nextclade data files require frequent updates to keep up with evolving diversity of pathogens. Hosting these files on GitHub was a convenient temporary measure, but as Nextclade has grown, we are not able to provide these files as a part of this GitHub repository anymore.

### Files removed

The following files were outdated, and eventually have been deprecated and deleted:

- Reference tree `tree.json`
- Quality control configuration `qc.json`
- PCR primers `primers.csv`
- Dataset version information `tag.json`

### Files kept

The stable, rarely updated files remain, so that they can still be used with Nextalign:

- Reference sequence`reference.fasta`
- Gene annotation `genemap.gff`
- Example sequences `sequences.fasta`

But this set of files is not sufficient to run Nextclade.

### Migration

Since Nextclade version 1.3.0, the full up-to-date data bundles for various pathogens are distributed in the form of so called "datasets". Please see:

- [Nextclade CLI](https://docs.nextstrain.org/projects/nextclade/en/stable/user/nextclade-cli/index.html) documentation for example usage
- [Nextclade Datasets](https://docs.nextstrain.org/projects/nextclade/en/stable/user/datasets.html) documentation for more details
- [Input files](https://docs.nextstrain.org/projects/nextclade/en/stable/user/input-files.html) documentation, in order to better understand what each of these files represent and what it's used for

### Timeline

- Aug 31, 2021 - Nextclade 1.3.0 is released, the files in GitHub repository are deprecated and set to be deleted on October 31, 2021. The community was notified on various channels.
- October 31, 2021 - the deletion deadline have been extended to November 10, 2021. The community was reminded on various channels.
- November 10, 2021 the files are deleted from the repository after consultation with some of the community members.

### Issues

We pay particular attention to any changes which may disrupt work of Nextclade users. 

If the datasets functionality does not provide full replacement or if this change is otherwise limiting, please reach out to developers by either:

- creating a [new GitHub issue](https://github.com/nextstrain/nextclade/issues/new/choose)

- posting on [Nextstrain discussion forum](https://discussion.nextstrain.org/)
