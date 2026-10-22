#[cfg(test)]
mod tests {
  use self::helpers::{
    Entry, dir_list_files, entry_kind_of, zip_build, zip_open, zip_patch_mode, zip_patch_uncompressed_size,
  };
  use crate::dataset::dataset_zip_extract::{ZipEntryKind, copy_limited, zip_extract_safe};
  use nextclade::utils::error::report_to_string;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::fs;
  use std::io::Cursor;
  use std::path::PathBuf;
  use tempfile::tempdir;

  const MAX_ENTRIES: usize = 100;
  const LIMIT: u64 = 1_000_000;

  #[rustfmt::skip]
  #[rstest]
  #[case::file(          "a.txt",           Entry::File(b"x"),  Ok(ZipEntryKind::File(PathBuf::from("a.txt"))))]
  #[case::nested_file(   "a/b/c.txt",       Entry::File(b"x"),  Ok(ZipEntryKind::File(PathBuf::from("a/b/c.txt"))))]
  #[case::inner_parent(  "a/../b.txt",      Entry::File(b"x"),  Ok(ZipEntryKind::File(PathBuf::from("b.txt"))))]
  #[case::current_dir(   "./a/./b.txt",     Entry::File(b"x"),  Ok(ZipEntryKind::File(PathBuf::from("a/b.txt"))))]
  #[case::dir(           "a/b/",            Entry::Dir,         Ok(ZipEntryKind::Dir(PathBuf::from("a/b"))))]
  #[case::parent_escape( "../escape",       Entry::File(b"x"),  Err("Dataset archive is invalid: entry '../escape' has an invalid path or a path outside of the output directory"))]
  #[case::inner_escape(  "a/../../escape",  Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a/../../escape' has an invalid path or a path outside of the output directory"))]
  #[case::absolute(      "/etc/x",          Entry::File(b"x"),  Err("Dataset archive is invalid: entry '/etc/x' has an invalid path or a path outside of the output directory"))]
  #[case::symlink(       "link",            Entry::Symlink,     Err("Dataset archive is invalid: entry 'link' is a symbolic link. Only regular files and directories are allowed"))]
  #[case::empty_path(    "a/..",            Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a/..' is a file with an empty path"))]
  #[case::colon_file(    "a.txt:stream",    Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a.txt:stream' has a path component with ':'"))]
  #[case::colon_dir(     "d:x/a.txt",       Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'd:x/a.txt' has a path component with ':'"))]
  #[case::colon_dir_entry("d:x/",           Entry::Dir,         Err("Dataset archive is invalid: entry 'd:x/' has a path component with ':'"))]
  #[case::colon_removed( "dir/bad:name/../a.txt", Entry::File(b"x"), Err("Dataset archive is invalid: entry 'dir/bad:name/../a.txt' has a path component with ':'"))]
  #[case::control_chars( "a\u{1b}[2J/../../x", Entry::File(b"x"), Err("Dataset archive is invalid: entry 'a\\u{1b}[2J/../../x' has an invalid path or a path outside of the output directory"))]
  #[case::win_device(    "CON",             Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'CON' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::win_device_ext("aux.txt",         Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'aux.txt' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::win_device_dir("dir/nul/a.txt",   Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'dir/nul/a.txt' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::win_com_port(  "com1.json",       Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'com1.json' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::trailing_dot(  "a.txt.",          Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a.txt.' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::trailing_space("a.txt ",          Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a.txt ' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::device_prefix( "console.json",    Entry::File(b"x"),  Ok(ZipEntryKind::File(PathBuf::from("console.json"))))]
  #[case::device_suffix( "a/aux2.txt",      Entry::File(b"x"),  Ok(ZipEntryKind::File(PathBuf::from("a/aux2.txt"))))]
  #[case::double_slash(  "a//b/",           Entry::Dir,         Ok(ZipEntryKind::Dir(PathBuf::from("a/b"))))]
  #[case::backslash_root("\\etc\\x",        Entry::File(b"x"),  Err("Dataset archive is invalid: entry '\\etc\\x' has an invalid path or a path outside of the output directory"))]
  #[case::backslash(     "a\\..\\..\\x",    Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a\\..\\..\\x' has a path component with '\\'"))]
  #[case::drive(         "C:/x",            Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'C:/x' has a path component with ':'"))]
  #[case::drive_relative("c:x",             Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'c:x' has a path component with ':'"))]
  #[case::less_than(     "a<b.txt",         Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a<b.txt' has a path component with '<'"))]
  #[case::greater_than(  "a>b.txt",         Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a>b.txt' has a path component with '>'"))]
  #[case::double_quote(  "a\"b.txt",        Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a\"b.txt' has a path component with '\"'"))]
  #[case::pipe(          "a|b.txt",         Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a|b.txt' has a path component with '|'"))]
  #[case::question_mark( "dir?/a.txt",      Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'dir?/a.txt' has a path component with '?'"))]
  #[case::asterisk(      "a*/",             Entry::Dir,         Err("Dataset archive is invalid: entry 'a*/' has a path component with '*'"))]
  #[case::reserved_removed("dir/a*b/../a.txt", Entry::File(b"x"), Err("Dataset archive is invalid: entry 'dir/a*b/../a.txt' has a path component with '*'"))]
  #[case::nul_char(      "a\u{0}b",         Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a\\0b' has a path component with '\\0'"))]
  #[case::control_char(  "a\u{1f}b",        Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a\\u{1f}b' has a path component with '\\u{1f}'"))]
  #[case::control_removed("a\u{1}/../b.txt", Entry::File(b"x"), Err("Dataset archive is invalid: entry 'a\\u{1}/../b.txt' has a path component with '\\u{1}'"))]
  #[case::console_in(    "CONIN$",          Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'CONIN$' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::console_out(   "dir/conout$.txt", Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'dir/conout$.txt' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::device_removed("nul/../a.txt",    Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'nul/../a.txt' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::device_space(  "nul .txt",        Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'nul .txt' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::dots_only(     "a/...",           Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a/...' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::console_prefix("conin.txt",       Entry::File(b"x"),  Ok(ZipEntryKind::File(PathBuf::from("conin.txt"))))]
  #[trace]
  fn test_dataset_zip_extract_classifies_archive_entries(
    #[case] name: &str,
    #[case] entry: Entry,
    #[case] expected: Result<ZipEntryKind, &str>,
  ) {
    let archive = zip_build(&[(name, entry)]);
    assert_eq!(expected.map_err(ToOwned::to_owned), entry_kind_of(&archive));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::fifo(             ("fifo", "",  Some(0o010_644)), Err("Dataset archive is invalid: entry 'fifo' is not a regular file. Only regular files and directories are allowed"))]
  #[case::dir_type(         ("d",    "",  Some(0o040_755)), Ok(ZipEntryKind::Dir(PathBuf::from("d"))))]
  #[case::dir_type_content( ("d",    "x", Some(0o040_755)), Err("Dataset archive is invalid: entry 'd' is a directory with content"))]
  #[case::dir_slash_content(("d/",   "x", None),            Err("Dataset archive is invalid: entry 'd/' is a directory with content"))]
  #[trace]
  fn test_dataset_zip_extract_classifies_entries_by_file_type(#[case] (name, content, mode): (&str, &str, Option<u32>), #[case] expected: Result<ZipEntryKind, &str>) {
    let archive = zip_build(&[(name, Entry::File(content.as_bytes()))]);
    let archive = match mode {
      Some(mode) => zip_patch_mode(archive, mode),
      None => archive,
    };
    assert_eq!(expected.map_err(ToOwned::to_owned), entry_kind_of(&archive));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::below_limit(  9,  10,  9)]
  #[case::at_limit(    10,  10, 10)]
  #[case::over_limit(  11,  10, 11)]
  #[case::far_over(   100,  10, 11)]
  #[trace]
  fn test_dataset_zip_extract_copies_at_most_one_byte_over_limit(#[case] size: usize, #[case] limit: u64, #[case] expected: u64) {
    let data = vec![b'A'; size];
    let mut output = vec![];
    let copied = copy_limited(&mut Cursor::new(data), &mut output, limit).unwrap();
    assert_eq!((expected, expected), (copied, output.len() as u64));
  }

  #[test]
  fn test_dataset_zip_extract_extracts_files_and_nested_dirs_into_new_output_dir() {
    let dir = tempdir().unwrap();
    let output = dir.path().join("out/dataset");
    let archive = zip_build(&[
      ("pathogen.json", Entry::File(b"{}")),
      ("empty/", Entry::Dir),
      ("a/b/c.txt", Entry::File(b"abc")),
      ("a/d.txt", Entry::File(b"d")),
    ]);

    zip_extract_safe(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT).unwrap();

    let expected: Vec<PathBuf> = vec![
      ["a", "b", "c.txt"].iter().collect(),
      ["a", "d.txt"].iter().collect(),
      PathBuf::from("pathogen.json"),
    ];
    assert_eq!(expected, dir_list_files(&output));
    assert_eq!("abc", fs::read_to_string(output.join("a/b/c.txt")).unwrap());
    assert!(output.join("empty").is_dir());
  }

  #[test]
  fn test_dataset_zip_extract_extracts_empty_archive_to_empty_dir() {
    let dir = tempdir().unwrap();
    let output = dir.path().join("out");
    zip_extract_safe(&mut zip_open(&zip_build(&[])), &output, MAX_ENTRIES, LIMIT).unwrap();
    assert_eq!(0, fs::read_dir(&output).unwrap().count());
  }

  #[test]
  fn test_dataset_zip_extract_rejects_escaping_entry_without_writing_outside() {
    let dir = tempdir().unwrap();
    let output = dir.path().join("out");
    fs::create_dir_all(&output).unwrap();
    let archive = zip_build(&[("../escape", Entry::File(b"x"))]);

    let result = zip_extract_safe(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT);

    assert_eq!(
      Err(
        "Dataset archive is invalid: entry '../escape' has an invalid path or a path outside of the output directory"
          .to_owned()
      ),
      result.map_err(|err| report_to_string(&err))
    );
    assert!(!dir.path().join("escape").exists());
  }

  #[test]
  fn test_dataset_zip_extract_writes_nothing_when_a_later_entry_is_invalid() {
    let dir = tempdir().unwrap();
    let output = dir.path().join("out");
    let archive = zip_build(&[("a/good.txt", Entry::File(b"x")), ("link", Entry::Symlink)]);

    let result = zip_extract_safe(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT);

    assert_eq!(
      Err(
        "Dataset archive is invalid: entry 'link' is a symbolic link. Only regular files and directories are allowed"
          .to_owned()
      ),
      result.map_err(|err| report_to_string(&err))
    );
    assert!(!output.exists());
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::same_case(        &[("A.txt", Entry::File(b"x")), ("a.txt", Entry::File(b"x"))],              Err("Dataset archive is invalid: entries 'A.txt' and 'a.txt' have the same path on file systems that ignore letter case or Unicode normalization"))]
  #[case::same_normalized(  &[("a.txt", Entry::File(b"x")), ("./b/../a.txt", Entry::File(b"x"))],        Err("Dataset archive is invalid: entries 'a.txt' and './b/../a.txt' have the same path on file systems that ignore letter case or Unicode normalization"))]
  #[case::same_unicode_nfc( &[("caf\u{e9}", Entry::File(b"x")), ("cafe\u{301}", Entry::File(b"x"))],      Err("Dataset archive is invalid: entries 'caf\u{e9}' and 'cafe\\u{301}' have the same path on file systems that ignore letter case or Unicode normalization"))]
  #[case::same_unicode_case(&[("\u{c9}T\u{c9}", Entry::Dir), ("e\u{301}te\u{301}", Entry::File(b"x"))],   Err("Dataset archive is invalid: entries '\u{c9}T\u{c9}/' and 'e\\u{301}te\\u{301}' have the same path on file systems that ignore letter case or Unicode normalization"))]
  #[case::dir_and_file(     &[("a/", Entry::Dir), ("A", Entry::File(b"x"))],                            Err("Dataset archive is invalid: entries 'a/' and 'A' have the same path on file systems that ignore letter case or Unicode normalization"))]
  #[case::file_is_parent(   &[("A", Entry::File(b"x")), ("a/b.txt", Entry::File(b"x"))],               Err("Dataset archive is invalid: entry 'a/b.txt' is inside of 'A', which is a file"))]
  #[case::file_is_ancestor( &[("x/y/z/", Entry::Dir), ("X/Y", Entry::File(b"x"))],                      Err("Dataset archive is invalid: entry 'x/y/z/' is inside of 'X/Y', which is a file"))]
  #[case::late_reserved(    &[("a.txt", Entry::File(b"x")), ("b?.txt", Entry::File(b"x"))],             Err("Dataset archive is invalid: entry 'b?.txt' has a path component with '?'"))]
  #[case::late_device(      &[("a.txt", Entry::File(b"x")), ("d/CONOUT$", Entry::File(b"x"))],          Err("Dataset archive is invalid: entry 'd/CONOUT$' has a path component with a name that is reserved on Windows or ends with '.' or ' '"))]
  #[trace]
  fn test_dataset_zip_extract_rejects_clashing_or_reserved_entries_without_writing(#[case] entries: &[(&str, Entry<'_>)], #[case] expected: Result<(), &str>) {
    let dir = tempdir().unwrap();
    let output = dir.path().join("out");

    let result = zip_extract_safe(&mut zip_open(&zip_build(entries)), &output, MAX_ENTRIES, LIMIT);

    assert_eq!(
      (expected.map_err(ToOwned::to_owned), false),
      (result.map_err(|err| report_to_string(&err)), output.exists())
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::same_dirs(      &[("a/", Entry::Dir), ("A/", Entry::Dir), ("a/b.txt", Entry::File(b"x"))], &["a/b.txt"])]
  #[case::dir_with_files( &[("d/", Entry::Dir), ("d/x.txt", Entry::File(b"x")), ("d/y/z.txt", Entry::File(b"x"))], &["d/x.txt", "d/y/z.txt"])]
  #[case::similar_names(  &[("ab", Entry::File(b"x")), ("a/b", Entry::File(b"x")), ("abc/d", Entry::File(b"x"))], &["a/b", "ab", "abc/d"])]
  #[trace]
  fn test_dataset_zip_extract_accepts_entries_that_share_directories(#[case] entries: &[(&str, Entry<'_>)], #[case] expected: &[&str]) {
    let dir = tempdir().unwrap();

    zip_extract_safe(&mut zip_open(&zip_build(entries)), dir.path(), MAX_ENTRIES, LIMIT).unwrap();

    let expected = expected.iter().map(PathBuf::from).collect::<Vec<_>>();
    assert_eq!(expected, dir_list_files(dir.path()));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::below_limit( (2, 3), (Ok(()), 2))]
  #[case::at_limit(    (3, 3), (Ok(()), 3))]
  #[case::over_limit(  (4, 3), (Err("Dataset archive has 4 entries, which exceeds the limit of 3 entries"), 0))]
  #[trace]
  fn test_dataset_zip_extract_limits_number_of_entries(#[case] (count, max_entries): (usize, usize), #[case] (expected, expected_written): (Result<(), &str>, usize)) {
    let dir = tempdir().unwrap();
    let names = (0..count).map(|index| format!("f{index}")).collect::<Vec<_>>();
    let entries = names.iter().map(|name| (name.as_str(), Entry::File(b""))).collect::<Vec<_>>();

    let result = zip_extract_safe(&mut zip_open(&zip_build(&entries)), dir.path(), max_entries, LIMIT);

    let written = dir_list_files(dir.path()).len();
    assert_eq!(
      (expected.map_err(ToOwned::to_owned), expected_written),
      (result.map_err(|err| report_to_string(&err)), written)
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::below_limit( &[3, 6],  10, Ok(()))]
  #[case::at_limit(    &[4, 6],  10, Ok(()))]
  #[case::over_limit(  &[5, 6],  10, Err("Dataset archive exceeds the limit of 10 bytes when unpacked (at entry 'f1')"))]
  #[trace]
  fn test_dataset_zip_extract_limits_total_unpacked_size(#[case] sizes: &[usize], #[case] limit: u64, #[case] expected: Result<(), &str>) {
    let dir = tempdir().unwrap();
    let contents = sizes.iter().map(|&size| vec![b'A'; size]).collect::<Vec<_>>();
    let names = ["f0", "f1"];
    let entries = names
      .iter()
      .zip(&contents)
      .map(|(name, content)| (*name, Entry::File(content)))
      .collect::<Vec<_>>();

    let result = zip_extract_safe(&mut zip_open(&zip_build(&entries)), dir.path(), MAX_ENTRIES, limit);

    assert_eq!(expected.map_err(ToOwned::to_owned), result.map_err(|err| report_to_string(&err)));
  }

  #[test]
  fn test_dataset_zip_extract_rejects_entry_larger_than_declared_size() {
    let dir = tempdir().unwrap();
    let data = vec![b'A'; 1000];
    let archive = zip_patch_uncompressed_size(zip_build(&[("big.txt", Entry::File(&data))]), 10);

    let error = zip_extract_safe(&mut zip_open(&archive), dir.path(), MAX_ENTRIES, 100).unwrap_err();

    // Only the messages of Nextclade, without the message of the zip library at the end of the chain
    let expected = vec![
      "When extracting entry 'big.txt'".to_owned(),
      format!("When writing file '{}'", dir.path().join("big.txt").display()),
    ];
    assert_eq!(
      expected,
      error.chain().take(2).map(ToString::to_string).collect::<Vec<_>>()
    );
  }

  #[test]
  fn test_dataset_zip_extract_rejects_file_where_directory_exists() {
    let dir = tempdir().unwrap();
    fs::create_dir_all(dir.path().join("a")).unwrap();
    let archive = zip_build(&[("a", Entry::File(b"x"))]);

    let result = zip_extract_safe(&mut zip_open(&archive), dir.path(), MAX_ENTRIES, LIMIT);

    assert_eq!(
      Err(format!(
        "When extracting entry 'a': Unable to create file '{}': a directory exists at this path",
        dir.path().join("a").display()
      )),
      result.map_err(|err| report_to_string(&err))
    );
  }

  #[cfg(unix)]
  mod unix {
    use super::helpers::{Entry, zip_build, zip_open, zip_patch_mode};
    use super::{LIMIT, MAX_ENTRIES};
    use crate::dataset::dataset_zip_extract::zip_extract_safe;
    use nextclade::utils::error::report_to_string;
    use pretty_assertions::assert_eq;
    use std::fs;
    use std::os::unix::fs::{PermissionsExt, symlink};
    use tempfile::tempdir;

    #[test]
    fn test_dataset_zip_extract_ignores_permissions_stored_in_archive() {
      let dir = tempdir().unwrap();
      let setuid_mode = 0o104_755;
      let archive = zip_patch_mode(zip_build(&[("setuid", Entry::File(b"x"))]), setuid_mode);

      zip_extract_safe(&mut zip_open(&archive), dir.path(), MAX_ENTRIES, LIMIT).unwrap();

      let mode = fs::metadata(dir.path().join("setuid")).unwrap().permissions().mode();
      assert_eq!((0, 0), (mode & 0o4000, mode & 0o111));
    }

    #[test]
    fn test_dataset_zip_extract_rejects_intermediate_symlink_to_outside_dir() {
      let dir = tempdir().unwrap();
      let (output, outside) = (dir.path().join("out"), dir.path().join("outside"));
      fs::create_dir_all(&output).unwrap();
      fs::create_dir_all(&outside).unwrap();
      symlink(&outside, output.join("a")).unwrap();
      let archive = zip_build(&[("a/b.txt", Entry::File(b"x"))]);

      let result = zip_extract_safe(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT);

      assert_eq!(
        Err(format!(
          "When extracting entry 'a/b.txt': Refusing to extract through '{}': it is an existing symbolic link",
          output.join("a").display()
        )),
        result.map_err(|err| report_to_string(&err))
      );
      assert_eq!(0, fs::read_dir(&outside).unwrap().count());
    }

    #[test]
    fn test_dataset_zip_extract_rejects_dir_entry_at_existing_symlink() {
      let dir = tempdir().unwrap();
      let (output, outside) = (dir.path().join("out"), dir.path().join("outside"));
      fs::create_dir_all(&output).unwrap();
      fs::create_dir_all(&outside).unwrap();
      symlink(&outside, output.join("a")).unwrap();
      let archive = zip_build(&[("a/", Entry::Dir)]);

      let result = zip_extract_safe(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT);

      assert_eq!(
        Err(format!(
          "When extracting entry 'a/': Refusing to extract through '{}': it is an existing symbolic link",
          output.join("a").display()
        )),
        result.map_err(|err| report_to_string(&err))
      );
    }

    #[test]
    fn test_dataset_zip_extract_replaces_leaf_symlink_and_keeps_outside_file() {
      let dir = tempdir().unwrap();
      let (output, outside) = (dir.path().join("out"), dir.path().join("outside.txt"));
      fs::create_dir_all(&output).unwrap();
      fs::write(&outside, "outside").unwrap();
      symlink(&outside, output.join("a.txt")).unwrap();
      let archive = zip_build(&[("a.txt", Entry::File(b"inside"))]);

      zip_extract_safe(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT).unwrap();

      assert!(
        !fs::symlink_metadata(output.join("a.txt"))
          .unwrap()
          .file_type()
          .is_symlink()
      );
      assert_eq!("inside", fs::read_to_string(output.join("a.txt")).unwrap());
      assert_eq!("outside", fs::read_to_string(&outside).unwrap());
    }

    #[test]
    fn test_dataset_zip_extract_replaces_leaf_hardlink_and_keeps_outside_file() {
      let dir = tempdir().unwrap();
      let (output, outside) = (dir.path().join("out"), dir.path().join("outside.txt"));
      fs::create_dir_all(&output).unwrap();
      fs::write(&outside, "outside").unwrap();
      fs::hard_link(&outside, output.join("a.txt")).unwrap();
      let archive = zip_build(&[("a.txt", Entry::File(b"inside"))]);

      zip_extract_safe(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT).unwrap();

      assert_eq!("inside", fs::read_to_string(output.join("a.txt")).unwrap());
      assert_eq!("outside", fs::read_to_string(&outside).unwrap());
    }
  }

  mod properties {
    use super::generators::{entry_name, entry_name_valid};
    use crate::dataset::dataset_zip_extract::zip_entry_path;
    use itertools::Itertools;
    use proptest::prelude::*;
    use std::path::Component;

    proptest! {
      #[test]
      fn test_dataset_zip_extract_accepted_name_has_only_normal_components(name in entry_name_valid()) {
        let path = zip_entry_path(&name);
        prop_assume!(path.is_ok());
        let path = path.unwrap();
        prop_assert!(path.components().all(|component| matches!(component, Component::Normal(_))), "{path:?}");
      }

      #[test]
      fn test_dataset_zip_extract_accepted_name_stays_accepted_after_normalization(name in entry_name_valid()) {
        let path = zip_entry_path(&name);
        prop_assume!(path.is_ok());
        let path = path.unwrap();
        let normalized = path.iter().map(|component| component.to_str().unwrap()).join("/");
        prop_assert_eq!(Ok(path), zip_entry_path(&normalized).map_err(|err| err.to_string()));
      }

      #[test]
      fn test_dataset_zip_extract_rejected_name_stays_rejected_in_any_letter_case(name in entry_name()) {
        prop_assume!(zip_entry_path(&name).is_err());
        prop_assert!(zip_entry_path(&name.to_uppercase()).is_err());
        prop_assert!(zip_entry_path(&name.to_lowercase()).is_err());
      }
    }
  }

  mod generators {
    use proptest::prelude::*;
    use proptest::sample::select;

    /// Archive entry names built from ordinary, special, and reserved components
    pub fn entry_name() -> impl Strategy<Value = String> {
      let special = select(vec![
        "",
        ".",
        "..",
        "...",
        "CON",
        "nul.txt",
        "Com1",
        "lpt¹.json",
        "conin$",
        "CONOUT$.log",
        "aux .x",
        "a:b",
        "x<y",
        "q?",
        "s*",
        "p|",
        "d\"q",
        "b\\s",
        "t\u{1}",
        "end.",
        "end ",
        "\u{130}",
        "\u{df}",
        "\u{1c4}",
        "\u{17f}",
      ])
      .prop_map(ToOwned::to_owned);
      let component = prop_oneof![3 => "[a-zA-Z0-9_-]{1,6}(\\.[a-z]{1,3})?", 2 => special];
      let prefix = prop::option::weighted(0.1, select(vec!["/", "\\", "C:", "c:/"]));
      (prefix, prop::collection::vec(component, 0..6))
        .prop_map(|(prefix, components)| format!("{}{}", prefix.unwrap_or_default(), components.join("/")))
    }

    /// Archive entry names that stay inside the output directory and contain no reserved characters, with `.`, `..`
    /// and empty components. Rarely a device name, such as `aux`, which the properties skip.
    pub fn entry_name_valid() -> impl Strategy<Value = String> {
      let normal = prop_oneof![
        4 => "[a-zA-Z0-9_-]{1,6}(\\.[a-z]{1,3})?",
        1 => select(vec!["\u{130}", "\u{df}", "\u{1c4}", "\u{17f}", "caf\u{e9}"]).prop_map(ToOwned::to_owned),
      ];
      let component = prop_oneof![
        4 => normal.clone(),
        1 => select(vec!["", "."]).prop_map(ToOwned::to_owned),
        1 => normal.prop_map(|name| format!("{name}/..")),
      ];
      prop::collection::vec(component, 0..6).prop_map(|components| components.join("/"))
    }
  }

  mod helpers {
    use crate::dataset::dataset_zip_extract::{ZipEntryKind, zip_entry_kind};
    use itertools::Itertools;
    use nextclade::utils::error::report_to_string;
    use std::fs;
    use std::io::{Cursor, Write};
    use std::path::{Path, PathBuf};
    use zip::write::SimpleFileOptions;
    use zip::{CompressionMethod, ZipArchive, ZipWriter};

    const LOCAL_HEADER_SIGNATURE: [u8; 4] = [0x50, 0x4b, 0x03, 0x04];
    const CENTRAL_HEADER_SIGNATURE: [u8; 4] = [0x50, 0x4b, 0x01, 0x02];
    const LOCAL_HEADER_UNCOMPRESSED_SIZE_OFFSET: usize = 22;
    const CENTRAL_HEADER_UNCOMPRESSED_SIZE_OFFSET: usize = 24;
    const CENTRAL_HEADER_EXTERNAL_ATTRIBUTES_OFFSET: usize = 38;

    #[derive(Debug)]
    pub enum Entry<'a> {
      File(&'a [u8]),
      Dir,
      Symlink,
    }

    pub fn zip_build(entries: &[(&str, Entry<'_>)]) -> Vec<u8> {
      let mut writer = ZipWriter::new(Cursor::new(vec![]));
      let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
      for (name, entry) in entries {
        match entry {
          Entry::File(content) => {
            writer.start_file(*name, options).unwrap();
            writer.write_all(content).unwrap();
          }
          Entry::Dir => writer.add_directory(*name, options).unwrap(),
          Entry::Symlink => writer.add_symlink(*name, "/etc/passwd", options).unwrap(),
        }
      }
      writer.finish().unwrap().into_inner()
    }

    pub fn zip_open(archive: &[u8]) -> ZipArchive<Cursor<&[u8]>> {
      ZipArchive::new(Cursor::new(archive)).unwrap()
    }

    /// Classify the first entry of an archive, with the error as a string
    pub fn entry_kind_of(archive: &[u8]) -> Result<ZipEntryKind, String> {
      let mut zip = zip_open(archive);
      let entry = zip.by_index(0).unwrap();
      zip_entry_kind(&entry).map_err(|err| report_to_string(&err))
    }

    /// Overwrite the declared uncompressed size of the single entry of an archive, in both of its headers
    #[allow(clippy::little_endian_bytes)] // ZIP header fields are little-endian
    pub fn zip_patch_uncompressed_size(mut archive: Vec<u8>, size: u32) -> Vec<u8> {
      let local = find_single(&archive, LOCAL_HEADER_SIGNATURE) + LOCAL_HEADER_UNCOMPRESSED_SIZE_OFFSET;
      let central = find_single(&archive, CENTRAL_HEADER_SIGNATURE) + CENTRAL_HEADER_UNCOMPRESSED_SIZE_OFFSET;
      archive[local..local + 4].copy_from_slice(&size.to_le_bytes());
      archive[central..central + 4].copy_from_slice(&size.to_le_bytes());
      archive
    }

    /// Overwrite the Unix mode, including the file type bits, of the single entry of an archive
    #[allow(clippy::little_endian_bytes)] // ZIP header fields are little-endian
    pub fn zip_patch_mode(mut archive: Vec<u8>, mode: u32) -> Vec<u8> {
      let offset = find_single(&archive, CENTRAL_HEADER_SIGNATURE) + CENTRAL_HEADER_EXTERNAL_ATTRIBUTES_OFFSET;
      archive[offset..offset + 4].copy_from_slice(&(mode << 16).to_le_bytes());
      archive
    }

    fn find_single(haystack: &[u8], needle: [u8; 4]) -> usize {
      haystack
        .windows(needle.len())
        .positions(|window| window == needle)
        .exactly_one()
        .unwrap()
    }

    /// Relative paths of all regular files under `dir`, sorted
    pub fn dir_list_files(dir: &Path) -> Vec<PathBuf> {
      walk(dir)
        .into_iter()
        .map(|path| path.strip_prefix(dir).unwrap().to_owned())
        .sorted()
        .collect()
    }

    fn walk(dir: &Path) -> Vec<PathBuf> {
      fs::read_dir(dir)
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .flat_map(|path| if path.is_dir() { walk(&path) } else { vec![path] })
        .collect()
    }
  }
}
