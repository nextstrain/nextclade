
# Nextclade web app

Nextclade web is available online at [clades.nextstrain.org](https://clades.nextstrain.org). This is the easiest way of using Nextclade and is the recommended way to get started.

Drag a fasta file onto the "upload" box, provide a url or paste sequence data directly into the text box. The sequences will then be analyzed right in your browser - data never leaves your computer (i.e. no actual "upload" is happening). Since your computer is doing the computational work rather than a remote server, it is advisable to analyze at most a few hundred of sequences at a time, depending on yor hardware.

Power users might want to switch to "Advanced mode" in order to get access to more configuration. This mode is equivalent to using the Nextclade command-line tool and accepts the same input files (see "inputs" section) <!--- Need to link to CLI docs here -->.

The simple mode ("non-advanced") of the web application currently only supports SARS-CoV-2 sequences, but we are extending the tool to influenza and hopefully other pathogens in the future.

## Getting started

The quickest way to explore Nextclade web is to open [clades.nextstrain.org](https://clades.nextstrain.org) in your browser. We recommend you use Firefox or a Chromium based browser (Chrome, Edge, Brave, Opera, etc.), since these are the browser we officially support. Then click on "Show me an example", if you don't want to upload your own SARS-CoV-2 FASTA file.  

![Show me an exmaple](assets/web_show-example.png)

If you decide to use your own data, you can choose between a file upload, a link to a file on the internet or simply pate from a clipboard. For now, only SARS-CoV-2 sequences are supported.

## Analysis

Nextclade now analysis your sequences locally, right in your Browser, with results appearing sequence by sequence.

### QC metrics

Nextclade implements a variety of quality control metrics to quickly spot problems in your sequencing/assembly pipeline. You can get a quick idea which of your sequences are having problems by sorting the results table from bad to good (click on the upper arrow in the column QC). Bad sequences are colored red, mediocre ones yellow and good ones white. You can view detailed results of the QC metrics by hovering your mouse over a sequences QC entry:

![QC hover](assets/web_QC.png)

Every icon corresponds to a different metric.

<!--- TODO: Describe metrics -->

### Table data

Nextclade automatically infers the (probable) clade a sequence belongs to and displays the result in the table. Clades are determined by identifying the clade of the neares neighbour on a reference tree. 

The result table further displays for each sequence: 
- "Mut.": number of mutations with respect to the root of the reference tree
- "non-ACGTN": number of ambiguous nucleotides that are not *N*
- "Ns": number of missing nucleotides indicated by *N*
- "Gaps": number of nucleotides that are deleted with respect to the reference sequence
- "Ins.": number of nucleotides that are inserted with respect to the reference sequence

Hovering over table entries reveals more detailed information. For example, hovering over the number of mutations reveals which nucleotides and aminoacids have changed with respect to the reference. Changes in bases that are used by common primers are also displayed.

### Alignment viewer

### Tree

### Download data

### Custom upload


