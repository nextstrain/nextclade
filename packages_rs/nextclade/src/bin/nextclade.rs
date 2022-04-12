// Configuration of Rust lints (static analysis). Scroll past it to find the actual code.
// This needs to be kept in each root module right now, which is inconvenient and error-prone.
// Hopefully it gets fixed soon. For a good summary see here: https://github.com/EmbarkStudios/rust-ecosystem/issues/59
//
//
// Disable some of the default rust checks
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]
//
// Enable some of the default lints which are disabled by default
#![warn(nonstandard_style)]
#![warn(rust_2018_idioms)]
#![warn(trivial_numeric_casts)]
//
// Enable all clippy lint groups
// Order is important!
#![warn(clippy::all)]
#![warn(clippy::pedantic)]
#![allow(clippy::blanket_clippy_restriction_lints)]
#![warn(clippy::restriction)]
#![warn(clippy::nursery)]
//
// Enable some of the clippy lints disabled by default
#![warn(clippy::await_holding_lock)]
#![warn(clippy::char_lit_as_u8)]
#![warn(clippy::checked_conversions)]
#![warn(clippy::dbg_macro)]
#![warn(clippy::debug_assert_with_mut_call)]
#![warn(clippy::disallowed_script_idents)]
#![warn(clippy::doc_markdown)]
#![warn(clippy::empty_enum)]
#![warn(clippy::enum_glob_use)]
#![warn(clippy::equatable_if_let)]
#![warn(clippy::exit)]
#![warn(clippy::expl_impl_clone_on_copy)]
#![warn(clippy::explicit_deref_methods)]
#![warn(clippy::explicit_into_iter_loop)]
#![warn(clippy::fallible_impl_from)]
#![warn(clippy::filter_map_next)]
#![warn(clippy::flat_map_option)]
#![warn(clippy::float_cmp_const)]
#![warn(clippy::fn_params_excessive_bools)]
#![warn(clippy::fn_to_numeric_cast_any)]
#![warn(clippy::from_iter_instead_of_collect)]
#![warn(clippy::if_let_mutex)]
#![warn(clippy::implicit_clone)]
#![warn(clippy::imprecise_flops)]
#![warn(clippy::index_refutable_slice)]
#![warn(clippy::inefficient_to_string)]
#![warn(clippy::invalid_upcast_comparisons)]
#![warn(clippy::iter_not_returning_iterator)]
#![warn(clippy::large_digit_groups)]
#![warn(clippy::large_stack_arrays)]
#![warn(clippy::large_types_passed_by_value)]
#![warn(clippy::let_unit_value)]
#![warn(clippy::linkedlist)]
#![warn(clippy::lossy_float_literal)]
#![warn(clippy::macro_use_imports)]
#![warn(clippy::manual_ok_or)]
#![warn(clippy::map_err_ignore)]
#![warn(clippy::map_flatten)]
#![warn(clippy::map_unwrap_or)]
#![warn(clippy::match_on_vec_items)]
#![warn(clippy::match_same_arms)]
#![warn(clippy::match_wild_err_arm)]
#![warn(clippy::match_wildcard_for_single_variants)]
#![warn(clippy::mem_forget)]
#![warn(clippy::mismatched_target_os)]
#![warn(clippy::missing_enforced_import_renames)]
#![warn(clippy::mut_mut)]
#![warn(clippy::mutex_integer)]
#![warn(clippy::needless_continue)]
#![warn(clippy::needless_for_each)]
#![warn(clippy::negative_feature_names)]
#![warn(clippy::nonstandard_macro_braces)]
#![warn(clippy::option_option)]
#![warn(clippy::path_buf_push_overwrite)]
#![warn(clippy::ptr_as_ptr)]
#![warn(clippy::rc_mutex)]
#![warn(clippy::ref_option_ref)]
#![warn(clippy::rest_pat_in_fully_bound_structs)]
#![warn(clippy::same_functions_in_if_condition)]
#![warn(clippy::semicolon_if_nothing_returned)]
#![warn(clippy::single_match_else)]
#![warn(clippy::string_add)]
#![warn(clippy::string_add_assign)]
#![warn(clippy::string_lit_as_bytes)]
#![warn(clippy::string_to_string)]
#![warn(clippy::trailing_empty_array)]
#![warn(clippy::trait_duplication_in_bounds)]
#![warn(clippy::unimplemented)]
#![warn(clippy::unnecessary_wraps)]
#![warn(clippy::unnested_or_patterns)]
#![warn(clippy::useless_transmute)]
#![warn(clippy::verbose_file_reads)]
#![warn(clippy::zero_sized_map_values)]
//
// Disabled clippy lints, up for discussion
#![allow(clippy::cognitive_complexity)]
#![allow(clippy::else_if_without_else)]
#![allow(clippy::expect_used)]
#![allow(clippy::panic)]
#![allow(clippy::panic_in_result_fn)]
#![allow(clippy::single_char_lifetime_names)]
#![allow(clippy::suboptimal_flops)]
#![allow(clippy::too_many_arguments)]
#![allow(clippy::unsafe_derive_deserialize)]
#![allow(clippy::unwrap_in_result)]
#![allow(clippy::unwrap_used)]
#![allow(clippy::useless_transmute)]
//
// Disabled clippy lints, permanent
#![allow(clippy::as_conversions)]
#![allow(clippy::cast_lossless)]
#![allow(clippy::cast_possible_truncation)]
#![allow(clippy::cast_possible_wrap)]
#![allow(clippy::cast_precision_loss)]
#![allow(clippy::cast_sign_loss)]
#![allow(clippy::default_numeric_fallback)]
#![allow(clippy::doc_markdown)]
#![allow(clippy::exhaustive_enums)]
#![allow(clippy::exhaustive_structs)]
#![allow(clippy::float_arithmetic)]
#![allow(clippy::if_not_else)]
#![allow(clippy::implicit_hasher)]
#![allow(clippy::implicit_return)]
#![allow(clippy::inconsistent_digit_grouping)]
#![allow(clippy::indexing_slicing)]
#![allow(clippy::integer_arithmetic)]
#![allow(clippy::integer_division)]
#![allow(clippy::iter_nth_zero)]
#![allow(clippy::large_digit_groups)]
#![allow(clippy::let_underscore_must_use)]
#![allow(clippy::match_same_arms)]
#![allow(clippy::missing_docs_in_private_items)]
#![allow(clippy::missing_errors_doc)]
#![allow(clippy::missing_inline_in_public_items)]
#![allow(clippy::missing_panics_doc)]
#![allow(clippy::mod_module_files)]
#![allow(clippy::module_inception)]
#![allow(clippy::module_name_repetitions)]
#![allow(clippy::must_use_candidate)]
#![allow(clippy::new_without_default)]
#![allow(clippy::non_ascii_literal)]
#![allow(clippy::option_if_let_else)]
#![allow(clippy::pattern_type_mismatch)]
#![allow(clippy::print_stderr)]
#![allow(clippy::print_stdout)]
#![allow(clippy::separated_literal_suffix)]
#![allow(clippy::shadow_reuse)]
#![allow(clippy::shadow_same)]
#![allow(clippy::shadow_unrelated)]
#![allow(clippy::should_implement_trait)]
#![allow(clippy::similar_names)]
#![allow(clippy::too_many_lines)]
#![allow(clippy::unnecessary_wraps)]
#![allow(clippy::unreachable)]
#![allow(clippy::unreadable_literal)]
#![allow(clippy::unused_self)]
#![allow(clippy::unused_unit)]
#![allow(clippy::use_debug)]
#![allow(clippy::use_self)]
#![allow(clippy::wildcard_enum_match_arm)]

use ctor::ctor;
use eyre::Report;
use nextclade::cli::nextclade_cli::{nextclade_parse_cli_args, NextcladeCommands};
use nextclade::cli::nextclade_loop::nextclade_run;
use nextclade::utils::global_init::global_init;

#[cfg(all(target_family = "linux", target_arch = "x86_64"))]
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
}

fn main() -> Result<(), Report> {
  let args = nextclade_parse_cli_args()?;

  match args.command {
    Some(NextcladeCommands::Run { 0: run_args }) => nextclade_run(*run_args),
    _ => Ok(()),
  }
}
