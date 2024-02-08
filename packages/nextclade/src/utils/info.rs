use lazy_static::lazy_static;
use semver::Version;

pub fn this_package_name() -> &'static str {
  lazy_static! {
    pub static ref PKG_NAME: &'static str = env!("CARGO_PKG_NAME");
  }
  &PKG_NAME
}

pub fn this_package_version() -> &'static Version {
  lazy_static! {
    pub static ref VERSION: Version = Version::parse(env!("CARGO_PKG_VERSION")).expect(
      "Unable to parse env var `CARGO_PKG_VERSION` in semantic version format. \
        In most cases it comes from `version` field in `Cargo.toml` file."
    );
  }
  &VERSION
}

pub fn this_package_version_str() -> &'static str {
  lazy_static! {
    pub static ref VERSION_STR: String = this_package_version().to_string();
  }
  &VERSION_STR
}
