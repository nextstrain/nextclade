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
    Tree(const Tree& other) = delete;
    Tree(Tree&& other) noexcept = delete;
    Tree& operator=(const Tree& other) = delete;
    Tree& operator=(Tree&& other) noexcept = delete;
  };
}// namespace Nextclade
