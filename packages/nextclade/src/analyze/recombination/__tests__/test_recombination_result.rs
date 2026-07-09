//! [`RecombinationResult`] summarization and serde: region counts, total/longest length, optional
//! confidences, and the `skip_serializing_if` behavior of the confidence field.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::{obs, ranges, region, test_params};
  use crate::analyze::recombination::decode::find_recombinant_regions;
  use crate::analyze::recombination::result::RecombinationResult;
  use crate::coord::range::NucRefGlobalRange;
  use crate::io::json::{JsonPretty, json_stringify};
  use indoc::indoc;
  use pretty_assertions::assert_eq;

  #[test]
  fn test_recombination_result_summary() {
    let result = RecombinationResult::from_ranges(ranges(&[(10, 25), (40, 50)]), None).unwrap();
    let expected = RecombinationResult {
      regions: vec![region(10, 25, None), region(40, 50, None)],
      total_regions: 2,
      total_length: 25, // 15 + 10
      longest_region: region(10, 25, None),
    };
    assert_eq!(expected, result);
  }

  #[test]
  fn test_recombination_result_empty_returns_none() {
    assert!(RecombinationResult::from_ranges(vec![], None).is_none());
  }

  #[test]
  fn test_recombination_result_with_confidences() {
    let result = RecombinationResult::from_ranges(ranges(&[(10, 25), (40, 50)]), Some(&[0.95, 0.82])).unwrap();
    let expected = RecombinationResult {
      regions: vec![region(10, 25, Some(0.95)), region(40, 50, Some(0.82))],
      total_regions: 2,
      total_length: 25,
      longest_region: region(10, 25, Some(0.95)),
    };
    assert_eq!(expected, result);
  }

  #[test]
  fn test_recombination_result_serde_round_trip_with_confidences() {
    let result = RecombinationResult::from_ranges(ranges(&[(10, 25)]), Some(&[0.95])).unwrap();
    let json = json_stringify(&result, JsonPretty(true)).unwrap();
    let expected = indoc! {r#"{
      "regions": [
        {
          "range": {
            "begin": 10,
            "end": 25
          },
          "length": 15,
          "confidence": 0.95
        }
      ],
      "totalRegions": 1,
      "totalLength": 15,
      "longestRegion": {
        "range": {
          "begin": 10,
          "end": 25
        },
        "length": 15,
        "confidence": 0.95
      }
    }"#};
    assert_eq!(expected, json);
    let deserialized: RecombinationResult = serde_json::from_str(&json).unwrap();
    assert_eq!(result, deserialized);
  }

  #[test]
  fn test_recombination_result_serde_round_trip_without_confidences() {
    // `confidence` is `skip_serializing_if = "Option::is_none"`, so the key is absent when unset.
    let result = RecombinationResult::from_ranges(ranges(&[(10, 25)]), None).unwrap();
    let json = json_stringify(&result, JsonPretty(true)).unwrap();
    let expected = indoc! {r#"{
      "regions": [
        {
          "range": {
            "begin": 10,
            "end": 25
          },
          "length": 15
        }
      ],
      "totalRegions": 1,
      "totalLength": 15,
      "longestRegion": {
        "range": {
          "begin": 10,
          "end": 25
        },
        "length": 15
      }
    }"#};
    assert_eq!(expected, json);
    let deserialized: RecombinationResult = serde_json::from_str(&json).unwrap();
    assert_eq!(result, deserialized);
  }

  #[test]
  fn test_recombination_integration_no_confidence_when_no_regions() {
    let observations = obs("RRRRRRRRRRRRRRRRRRRR");
    let params = test_params();
    let regions = find_recombinant_regions(&observations, &params);
    assert!(regions.is_empty());
    assert!(RecombinationResult::from_ranges(regions, None).is_none());
  }

  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(512))]

    // RecombinationResult summary fields are consistent with the input ranges: region count matches,
    // total length is the sum of per-region lengths, each region length equals its range span, and the
    // longest region has the maximum length. An empty range list produces None, not an empty result.
    #[test]
    fn test_prop_recombination_result_summary_consistent(
      items in proptest::collection::vec((0_usize..1000, 1_usize..500, 0.0_f64..=1.0), 1..30),
    ) {
      let ranges: Vec<NucRefGlobalRange> = items
        .iter()
        .map(|&(begin, span, _)| NucRefGlobalRange::from_usize(begin, begin + span))
        .collect();
      let confidences: Vec<f64> = items.iter().map(|&(_, _, c)| c).collect();

      let result = RecombinationResult::from_ranges(ranges.clone(), Some(&confidences)).unwrap();

      proptest::prop_assert_eq!(result.total_regions, ranges.len());
      proptest::prop_assert_eq!(result.regions.len(), ranges.len());
      // Expected totals derive from the generated spans (each range is `begin..begin + span`, so its
      // length is `span`), an oracle independent of the `NucRefGlobalRange::len` used in production.
      let expected_total: usize = items.iter().map(|&(_, span, _)| span).sum();
      proptest::prop_assert_eq!(result.total_length, expected_total);
      let max_len = items.iter().map(|&(_, span, _)| span).max().unwrap();
      proptest::prop_assert_eq!(result.longest_region.length, max_len);
      for (region, range) in result.regions.iter().zip(&ranges) {
        proptest::prop_assert_eq!(region.length, range.len());
        proptest::prop_assert_eq!(&region.range, range);
      }
      proptest::prop_assert!(RecombinationResult::from_ranges(vec![], None).is_none());
    }
  }
}
