

def find_nearest_neighbor():
  new_node # this is new node we want to attach
  closest_node = closest_neighbor(attachment_node, new_node.private_mutations) # this is the node the sequence wants to attach to

  improvement_possible = True
  while improvement_possible:
      shared_mutations = {node_key: len(closest_node.subs_shared) }
      for child_key in attachment_node.children():
          shared_muts = split_muts(child_node.private_mutations, new_node.private_mutations)
          shared_mutations[child_key] = len(shared_muts)
      best_node = argmax(shared_mutations)
      n_shared_mutations = len(shared_mutations[best_node])
      if n_shared_mutations>0:
          if best_node==attachment_node and len(new_node.private_mutations)==n_shared_mutations:
              # all private mutations are shared with the branch to the parent. move up to the parent
              attachment_node = get_parent_of_node(attachment_node)
          elif best_node==attachment_node: # the best node is the current node -- break
              improvment_possible=False
          else: # the best node is child
              attachment_node = get_node(best_node)
          new_node.private_mutations = new_node.private_mutations \ shared_mutations[best_node]
      else:
          improvement_possible=False

  return attachment_node
