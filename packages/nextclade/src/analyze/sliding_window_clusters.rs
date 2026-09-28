use itertools::Itertools;
use std::collections::VecDeque;

/// Group items, sorted by unique position, into clusters of more than `cluster_cut_off` items within `window_size`
/// nucleotides.
///
/// Sliding-window scan. Each item enters the window, and items more than `window_size` positions upstream of it leave
/// the window. When the window holds more than `cluster_cut_off` items, the item extends the previous cluster if the
/// previous item is the last member of that cluster. Otherwise all items of the window start a new cluster, which can
/// share items with the previous cluster. This is the algorithm of the `qc.snpClusters` rule.
pub fn find_clusters<T>(
  items: &[T],
  position: impl Fn(&T) -> usize,
  window_size: usize,
  cluster_cut_off: usize,
) -> Vec<Vec<&T>> {
  let mut window = VecDeque::<&T>::new();
  let mut clusters: Vec<Vec<&T>> = Vec::new();
  let mut previous_pos: Option<usize> = None;

  for item in items {
    let pos = position(item);
    window.push_back(item);

    while position(window[0]).saturating_add(window_size) < pos {
      window.pop_front();
    }

    if window.len() > cluster_cut_off {
      let extends_last_cluster = window.len() > 1
        && clusters
          .last()
          .and_then(|cluster| cluster.last())
          .is_some_and(|last| Some(position(last)) == previous_pos);

      if extends_last_cluster {
        clusters.last_mut().expect("checked above").push(item);
      } else {
        clusters.push(window.iter().copied().collect_vec());
      }
    }
    previous_pos = Some(pos);
  }

  clusters
}
