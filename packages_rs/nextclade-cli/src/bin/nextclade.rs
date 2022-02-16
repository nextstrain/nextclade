use ctor::ctor;
use eyre::Report;
use nextclade::utils::global_init::global_init;

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
}

fn main() -> Result<(), Report> {
  unimplemented!("nextclade-cli is not yer implemented");
}
