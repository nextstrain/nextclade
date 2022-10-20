use ctor::ctor;
use eyre::Report;
use nextclade::utils::global_init::global_init;
use nextclade_cli::cli::nextclade_cli::nextclade_parse_cli_args;

#[cfg(all(target_os = "linux", target_arch = "x86_64"))]
#[global_allocator]
static GLOBAL: jemallocator::Jemalloc = jemallocator::Jemalloc;

#[ctor]
fn init() {
  global_init();
}

fn main() -> Result<(), Report> {
  nextclade_parse_cli_args()
}
