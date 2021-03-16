#pragma once


#include <nextclade/nextclade.h>

#include <memory>
#include <string>

#include "TreeNode.h"

namespace Nextclade {
  class TreeImpl;

  class Tree {
    std::unique_ptr<TreeImpl> pimpl;

  public:
    explicit Tree(const std::string& auspiceJsonV2);

    TreeNode root() const;

    // Destructor is required when using pimpl idiom with unique_ptr.
    // See "Effective Modern C++" by Scott Meyers,
    // "Item 22: When using the Pimpl Idiom, define special member functions in the implementation file".
    ~Tree();
    Tree(const Tree&) = delete;
    Tree(const Tree&&) = delete;
    const Tree& operator=(const Tree&) = delete;
    const Tree& operator=(const Tree&&) = delete;
  };
}// namespace Nextclade
