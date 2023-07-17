use crate::io::json::json_stringify;
use eyre::Report;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use shadow_rs::{shadow, Format};
use std::fmt::{Display, Formatter, Write};

shadow!(build);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildInfo {
  version: &'static str,
  is_debug: bool,
  git_is_clean: bool,
  git_branch: String,
  git_tag: String,
  git_commit: &'static str,
  git_commit_date: &'static str,
  build_time: &'static str,
  build_os: &'static str,
  rust_version: &'static str,
  rust_channel: &'static str,
}

impl BuildInfo {
  pub fn detailed(&self) -> Result<String, Report> {
    let mut f = String::new();

    write!(f, "{}", self.version)?;
    write!(f, " (")?;

    let mut version_ext = vec![];

    if self.is_debug {
      version_ext.push("Debug".to_owned());
    }

    if !self.git_is_clean {
      version_ext.push("Dirty".to_owned());
    }

    if !self.git_commit.is_empty() {
      version_ext.push(format!("Commit {}", self.git_commit));
    }

    if !self.git_branch.is_empty() {
      version_ext.push(format!("Branch {}", self.git_branch));
    }

    if !self.git_tag.is_empty() {
      version_ext.push(format!("Tag {}", self.git_tag));
    }

    if !self.git_commit_date.is_empty() {
      version_ext.push(format!("Committed on {}", self.git_commit_date));
    }

    if !self.build_time.is_empty() {
      version_ext.push(format!("Built on {}", self.build_time));
    }

    write!(f, "{}", version_ext.join("; "))?;

    write!(f, ")")?;

    Ok(f)
  }

  pub fn full(&self) -> Result<String, Report> {
    Ok(self.to_string())
  }

  pub fn json(&self) -> Result<String, Report> {
    json_stringify(&self)
  }
}

impl Display for BuildInfo {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    writeln!(f, "Version               {}", self.version)?;
    writeln!(f, "Debug                 {}", self.is_debug)?;
    writeln!(f, "Dirty                 {}", !self.git_is_clean)?;
    writeln!(f, "Branch                {}", self.git_branch)?;
    writeln!(f, "Tag                   {}", self.git_tag)?;
    writeln!(f, "Commit                {}", self.git_commit)?;
    writeln!(f, "Committed on          {}", self.git_commit_date)?;
    writeln!(f, "Built on              {}", self.build_time)?;
    writeln!(f, "Build OS              {}", self.build_os)?;
    writeln!(f, "Rust version          {}", self.rust_version)?;
    writeln!(f, "Rust channel          {}", self.rust_channel)?;
    Ok(())
  }
}

pub fn get_build_info() -> BuildInfo {
  BuildInfo {
    version: build::PKG_VERSION,
    git_branch: shadow_rs::branch(),
    git_tag: shadow_rs::tag(),
    is_debug: shadow_rs::is_debug(),
    git_commit: build::SHORT_COMMIT,
    git_commit_date: build::COMMIT_DATE,
    build_os: build::BUILD_OS,
    rust_version: build::RUST_VERSION,
    rust_channel: build::RUST_CHANNEL,
    build_time: build::BUILD_TIME,
    git_is_clean: build::GIT_CLEAN,
  }
}
