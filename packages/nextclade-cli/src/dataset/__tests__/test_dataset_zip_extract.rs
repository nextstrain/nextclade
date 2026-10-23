#[cfg(test)]
mod tests {
  use self::helpers::{
    Entry, dir_list_files, root_file_of, zip_build, zip_open, zip_patch_mode, zip_patch_uncompressed_size,
  };
  use crate::dataset::dataset_zip_extract::{copy_limited, zip_entry_name_validate, zip_extract_root_files};
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
  #[case::file(            "a.txt",            Entry::File(b"x"),  Ok(Some("a.txt")))]
  #[case::nested_file(     "a/b/c.txt",        Entry::File(b"x"),  Ok(None))]
  #[case::inner_parent(    "a/../b.txt",       Entry::File(b"x"),  Ok(None))]
  #[case::current_dir(     "./b.txt",          Entry::File(b"x"),  Ok(None))]
  #[case::parent_escape(   "../escape",        Entry::File(b"x"),  Ok(None))]
  #[case::absolute(        "/etc/x",           Entry::File(b"x"),  Ok(None))]
  #[case::drive(           "C:/x",             Entry::File(b"x"),  Ok(None))]
  #[case::root_dir(        "a/",               Entry::Dir,         Ok(None))]
  #[case::nested_dir(      "a/b/",             Entry::Dir,         Ok(None))]
  #[case::nested_symlink(  "a/link",           Entry::Symlink,     Ok(None))]
  #[case::nested_reserved( "dir?/a*b",         Entry::File(b"x"),  Ok(None))]
  #[case::symlink(         "link",             Entry::Symlink,     Err("Dataset archive is invalid: entry 'link' is a symbolic link. Only regular files are allowed"))]
  #[case::colon(           "a.txt:stream",     Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a.txt:stream' has a name with ':'"))]
  #[case::drive_relative(  "c:x",              Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'c:x' has a name with ':'"))]
  #[case::backslash(       "a\\..\\..\\x",     Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a\\..\\..\\x' has a name with '\\'"))]
  #[case::backslash_root(  "\\etc\\x",         Entry::File(b"x"),  Err("Dataset archive is invalid: entry '\\etc\\x' has a name with '\\'"))]
  #[case::less_than(       "a<b.txt",          Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a<b.txt' has a name with '<'"))]
  #[case::greater_than(    "a>b.txt",          Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a>b.txt' has a name with '>'"))]
  #[case::double_quote(    "a\"b.txt",         Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a\"b.txt' has a name with '\"'"))]
  #[case::pipe(            "a|b.txt",          Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a|b.txt' has a name with '|'"))]
  #[case::question_mark(   "a?.txt",           Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a?.txt' has a name with '?'"))]
  #[case::asterisk(        "a*",               Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a*' has a name with '*'"))]
  #[case::nul_char(        "a\u{0}b",          Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a\\0b' has a name with '\\0'"))]
  #[case::control_chars(   "a\u{1b}[2J",       Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a\\u{1b}[2J' has a name with '\\u{1b}'"))]
  #[case::win_device(      "CON",              Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'CON' has a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::win_device_ext(  "aux.txt",          Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'aux.txt' has a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::win_com_port(    "com1.json",        Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'com1.json' has a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::console_in(      "CONIN$",           Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'CONIN$' has a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::device_space(    "nul .txt",         Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'nul .txt' has a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::trailing_dot(    "a.txt.",           Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a.txt.' has a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::trailing_space(  "a.txt ",           Entry::File(b"x"),  Err("Dataset archive is invalid: entry 'a.txt ' has a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::current_dir_name(".",                Entry::File(b"x"),  Err("Dataset archive is invalid: entry '.' has a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::parent_dir_name( "..",               Entry::File(b"x"),  Err("Dataset archive is invalid: entry '..' has a name that is reserved on Windows or ends with '.' or ' '"))]
  #[case::device_prefix(   "console.json",     Entry::File(b"x"),  Ok(Some("console.json")))]
  #[case::device_suffix(   "aux2.txt",         Entry::File(b"x"),  Ok(Some("aux2.txt")))]
  #[case::console_prefix(  "conin.txt",        Entry::File(b"x"),  Ok(Some("conin.txt")))]
  #[case::inner_dots(      "a..b.txt",         Entry::File(b"x"),  Ok(Some("a..b.txt")))]
  #[trace]
  fn test_dataset_zip_extract_classifies_archive_entries(
    #[case] name: &str,
    #[case] entry: Entry,
    #[case] expected: Result<Option<&str>, &str>,
  ) {
    let archive = zip_build(&[(name, entry)]);
    let expected = expected.map(|name| name.map(ToOwned::to_owned)).map_err(ToOwned::to_owned);
    assert_eq!(expected, root_file_of(&archive));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::regular(          ("f",    "x", Some(0o100_644)), Ok(Some("f")))]
  #[case::fifo(             ("fifo", "",  Some(0o010_644)), Err("Dataset archive is invalid: entry 'fifo' is not a regular file. Only regular files are allowed"))]
  #[case::dir_type(         ("d",    "",  Some(0o040_755)), Ok(None))]
  #[case::dir_type_content( ("d",    "x", Some(0o040_755)), Ok(None))]
  #[case::dir_slash_content(("d/",   "x", None),            Ok(None))]
  #[trace]
  fn test_dataset_zip_extract_classifies_entries_by_file_type(#[case] (name, content, mode): (&str, &str, Option<u32>), #[case] expected: Result<Option<&str>, &str>) {
    let archive = zip_build(&[(name, Entry::File(content.as_bytes()))]);
    let archive = match mode {
      Some(mode) => zip_patch_mode(archive, mode),
      None => archive,
    };
    let expected = expected.map(|name| name.map(ToOwned::to_owned)).map_err(ToOwned::to_owned);
    assert_eq!(expected, root_file_of(&archive));
  }

  #[test]
  fn test_dataset_zip_extract_rejects_empty_name() {
    assert_eq!(
      Err("Dataset archive is invalid: an entry has an empty name".to_owned()),
      zip_entry_name_validate("").map_err(|err| report_to_string(&err))
    );
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
  fn test_dataset_zip_extract_extracts_root_files_and_ignores_subdirectories() {
    let dir = tempdir().unwrap();
    let output = dir.path().join("out/dataset");
    let archive = zip_build(&[
      ("pathogen.json", Entry::File(b"{}")),
      ("empty/", Entry::Dir),
      ("a/b/c.txt", Entry::File(b"abc")),
      ("a/d.txt", Entry::File(b"d")),
      ("../escape", Entry::File(b"x")),
      ("/absolute", Entry::File(b"x")),
      ("reference.fasta", Entry::File(b">ref\nACGT\n")),
    ]);

    zip_extract_root_files(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT).unwrap();

    // Listing the parent of the output directory also shows any file written outside of it
    let expected: Vec<PathBuf> = vec![
      ["out", "dataset", "pathogen.json"].iter().collect(),
      ["out", "dataset", "reference.fasta"].iter().collect(),
    ];
    assert_eq!(expected, dir_list_files(dir.path()));
    assert_eq!(
      ">ref\nACGT\n",
      fs::read_to_string(output.join("reference.fasta")).unwrap()
    );
    // No directory from the archive is created either
    assert_eq!(2, fs::read_dir(&output).unwrap().count());
  }

  #[test]
  fn test_dataset_zip_extract_extracts_empty_archive_to_empty_dir() {
    let dir = tempdir().unwrap();
    let output = dir.path().join("out");
    zip_extract_root_files(&mut zip_open(&zip_build(&[])), &output, MAX_ENTRIES, LIMIT).unwrap();
    assert_eq!(0, fs::read_dir(&output).unwrap().count());
  }

  #[test]
  fn test_dataset_zip_extract_replaces_existing_file() {
    let dir = tempdir().unwrap();
    fs::write(dir.path().join("a.txt"), "old content").unwrap();
    let archive = zip_build(&[("a.txt", Entry::File(b"new"))]);

    zip_extract_root_files(&mut zip_open(&archive), dir.path(), MAX_ENTRIES, LIMIT).unwrap();

    assert_eq!("new", fs::read_to_string(dir.path().join("a.txt")).unwrap());
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::late_symlink(&[("good.txt", Entry::File(b"x")), ("link", Entry::Symlink)],      "Dataset archive is invalid: entry 'link' is a symbolic link. Only regular files are allowed")]
  #[case::late_reserved(&[("good.txt", Entry::File(b"x")), ("b?.txt", Entry::File(b"x"))], "Dataset archive is invalid: entry 'b?.txt' has a name with '?'")]
  #[case::late_device(&[("good.txt", Entry::File(b"x")), ("CONOUT$", Entry::File(b"x"))],  "Dataset archive is invalid: entry 'CONOUT$' has a name that is reserved on Windows or ends with '.' or ' '")]
  #[trace]
  fn test_dataset_zip_extract_rejects_invalid_later_entry_without_writing(#[case] entries: &[(&str, Entry<'_>)], #[case] expected: &str) {
    let dir = tempdir().unwrap();
    let output = dir.path().join("out");

    let result = zip_extract_root_files(&mut zip_open(&zip_build(entries)), &output, MAX_ENTRIES, LIMIT);

    assert_eq!(
      (Err(expected.to_owned()), false),
      (result.map_err(|err| report_to_string(&err)), output.exists())
    );
  }

  #[test]
  fn test_dataset_zip_extract_keeps_existing_files_when_archive_is_invalid() {
    let dir = tempdir().unwrap();
    fs::write(dir.path().join("good.txt"), "old content").unwrap();
    let archive = zip_build(&[("good.txt", Entry::File(b"new")), ("link", Entry::Symlink)]);

    let result = zip_extract_root_files(&mut zip_open(&archive), dir.path(), MAX_ENTRIES, LIMIT);

    assert_eq!(
      (
        Err("Dataset archive is invalid: entry 'link' is a symbolic link. Only regular files are allowed".to_owned()),
        "old content".to_owned()
      ),
      (
        result.map_err(|err| report_to_string(&err)),
        fs::read_to_string(dir.path().join("good.txt")).unwrap()
      )
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::below_limit(  (2, 3), (Ok(()), 2))]
  #[case::at_limit(     (3, 3), (Ok(()), 3))]
  #[case::over_limit(   (4, 3), (Err("Dataset archive has 4 entries, which exceeds the limit of 3 entries"), 0))]
  #[trace]
  fn test_dataset_zip_extract_limits_number_of_entries(#[case] (count, max_entries): (usize, usize), #[case] (expected, expected_written): (Result<(), &str>, usize)) {
    let dir = tempdir().unwrap();
    let names = (0..count).map(|index| format!("f{index}")).collect::<Vec<_>>();
    let entries = names.iter().map(|name| (name.as_str(), Entry::File(b""))).collect::<Vec<_>>();

    let result = zip_extract_root_files(&mut zip_open(&zip_build(&entries)), dir.path(), max_entries, LIMIT);

    let written = dir_list_files(dir.path()).len();
    assert_eq!(
      (expected.map_err(ToOwned::to_owned), expected_written),
      (result.map_err(|err| report_to_string(&err)), written)
    );
  }

  #[test]
  fn test_dataset_zip_extract_counts_ignored_entries_toward_entry_limit() {
    let dir = tempdir().unwrap();
    let archive = zip_build(&[
      ("a.txt", Entry::File(b"x")),
      ("d/", Entry::Dir),
      ("d/b.txt", Entry::File(b"x")),
    ]);

    let result = zip_extract_root_files(&mut zip_open(&archive), dir.path(), 2, LIMIT);

    assert_eq!(
      Err("Dataset archive has 3 entries, which exceeds the limit of 2 entries".to_owned()),
      result.map_err(|err| report_to_string(&err))
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

    let result = zip_extract_root_files(&mut zip_open(&zip_build(&entries)), dir.path(), MAX_ENTRIES, limit);

    assert_eq!(expected.map_err(ToOwned::to_owned), result.map_err(|err| report_to_string(&err)));
  }

  #[test]
  fn test_dataset_zip_extract_rejects_entry_larger_than_declared_size() {
    let dir = tempdir().unwrap();
    let data = vec![b'A'; 1000];
    let archive = zip_patch_uncompressed_size(zip_build(&[("big.txt", Entry::File(&data))]), 10);

    let error = zip_extract_root_files(&mut zip_open(&archive), dir.path(), MAX_ENTRIES, 100).unwrap_err();

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

    let result = zip_extract_root_files(&mut zip_open(&archive), dir.path(), MAX_ENTRIES, LIMIT);

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
    use crate::dataset::dataset_zip_extract::zip_extract_root_files;
    use pretty_assertions::assert_eq;
    use std::fs;
    use std::os::unix::fs::{PermissionsExt, symlink};
    use tempfile::tempdir;

    #[test]
    fn test_dataset_zip_extract_ignores_permissions_stored_in_archive() {
      let dir = tempdir().unwrap();
      let setuid_mode = 0o104_755;
      let archive = zip_patch_mode(zip_build(&[("setuid", Entry::File(b"x"))]), setuid_mode);

      zip_extract_root_files(&mut zip_open(&archive), dir.path(), MAX_ENTRIES, LIMIT).unwrap();

      let mode = fs::metadata(dir.path().join("setuid")).unwrap().permissions().mode();
      assert_eq!((0, 0), (mode & 0o4000, mode & 0o111));
    }

    #[test]
    fn test_dataset_zip_extract_writes_nothing_through_existing_symlinked_dir() {
      let dir = tempdir().unwrap();
      let (output, outside) = (dir.path().join("out"), dir.path().join("outside"));
      fs::create_dir_all(&output).unwrap();
      fs::create_dir_all(&outside).unwrap();
      symlink(&outside, output.join("a")).unwrap();
      let archive = zip_build(&[("a/b.txt", Entry::File(b"x")), ("a/", Entry::Dir)]);

      zip_extract_root_files(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT).unwrap();

      assert_eq!(0, fs::read_dir(&outside).unwrap().count());
    }

    #[test]
    fn test_dataset_zip_extract_replaces_leaf_symlink_and_keeps_outside_file() {
      let dir = tempdir().unwrap();
      let (output, outside) = (dir.path().join("out"), dir.path().join("outside.txt"));
      fs::create_dir_all(&output).unwrap();
      fs::write(&outside, "outside").unwrap();
      symlink(&outside, output.join("a.txt")).unwrap();
      let archive = zip_build(&[("a.txt", Entry::File(b"inside"))]);

      zip_extract_root_files(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT).unwrap();

      let is_symlink = fs::symlink_metadata(output.join("a.txt"))
        .unwrap()
        .file_type()
        .is_symlink();
      assert_eq!(
        (false, "inside".to_owned(), "outside".to_owned()),
        (
          is_symlink,
          fs::read_to_string(output.join("a.txt")).unwrap(),
          fs::read_to_string(&outside).unwrap()
        )
      );
    }

    #[test]
    fn test_dataset_zip_extract_replaces_leaf_hardlink_and_keeps_outside_file() {
      let dir = tempdir().unwrap();
      let (output, outside) = (dir.path().join("out"), dir.path().join("outside.txt"));
      fs::create_dir_all(&output).unwrap();
      fs::write(&outside, "outside").unwrap();
      fs::hard_link(&outside, output.join("a.txt")).unwrap();
      let archive = zip_build(&[("a.txt", Entry::File(b"inside"))]);

      zip_extract_root_files(&mut zip_open(&archive), &output, MAX_ENTRIES, LIMIT).unwrap();

      assert_eq!(
        ("inside".to_owned(), "outside".to_owned()),
        (
          fs::read_to_string(output.join("a.txt")).unwrap(),
          fs::read_to_string(&outside).unwrap()
        )
      );
    }
  }

  mod properties {
    use super::generators::entry_name;
    use crate::dataset::dataset_zip_extract::zip_entry_name_validate;
    use itertools::Itertools;
    use proptest::prelude::*;
    use std::ffi::OsStr;
    use std::path::{Component, Path};

    proptest! {
      #[test]
      fn test_dataset_zip_extract_accepted_name_is_one_normal_path_component(name in entry_name()) {
        prop_assume!(zip_entry_name_validate(&name).is_ok());
        let components = Path::new(&name).components().collect_vec();
        prop_assert_eq!(vec![Component::Normal(OsStr::new(&name))], components);
      }

      #[test]
      fn test_dataset_zip_extract_rejected_name_stays_rejected_in_any_letter_case(name in entry_name()) {
        prop_assume!(zip_entry_name_validate(&name).is_err());
        prop_assert!(zip_entry_name_validate(&name.to_uppercase()).is_err());
        prop_assert!(zip_entry_name_validate(&name.to_lowercase()).is_err());
      }
    }
  }

  mod generators {
    use proptest::prelude::*;
    use proptest::sample::select;

    /// Names of root entries, without `/`, built from ordinary, special, and reserved parts
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
        "\\",
        "C:",
        "t\u{1}",
        "end.",
        "end ",
        "\u{130}",
        "\u{df}",
        "\u{1c4}",
        "\u{17f}",
      ])
      .prop_map(ToOwned::to_owned);
      let part = prop_oneof![3 => "[a-zA-Z0-9_-]{1,6}(\\.[a-z]{1,3})?", 2 => special];
      prop::collection::vec(part, 1..4).prop_map(|parts| parts.concat())
    }
  }

  mod helpers {
    use crate::dataset::dataset_zip_extract::zip_entry_root_file;
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

    /// Name of the first entry of an archive if it is a root file to extract, with the error as a string
    pub fn root_file_of(archive: &[u8]) -> Result<Option<String>, String> {
      let mut zip = zip_open(archive);
      let entry = zip.by_index(0).unwrap();
      zip_entry_root_file(&entry).map_err(|err| report_to_string(&err))
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
