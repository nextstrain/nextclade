# bio_inline

Bits and pieces from "bio" crate (https://github.com/rust-bio/rust-bio), adapted to the needs of this project.

#### How to add more code from bio crate:

- add required source files from `bio` project's  `src` directory to `bio_inline/src` directory here, preserving directory structure
- find and replace `bio::` with `bio_inline::` in all new files
- remove unused code and unused `use` imports recursively
- (optional) lint and format the new code
- (optional) modify the new code as needed (this is probably why you are doing this procedure)

#### How to switch project code from using `bio` to using `bio_inline`:

- find and replace `bio::` to `bio_inline::`
- add missing library code recursively (see previous section) until project compiles
