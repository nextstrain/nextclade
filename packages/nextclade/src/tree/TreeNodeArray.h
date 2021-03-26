#pragma once

#include <functional>
#include <memory>
#include <nlohmann/json_fwd.hpp>

namespace Nextclade {
  using json = nlohmann::ordered_json;

  class TreeNode;
  class TreeNodeArrayImpl;

  class TreeNodeArray {
    std::unique_ptr<TreeNodeArrayImpl> pimpl;

    friend class TreeNodeArrayImpl;

  public:
    explicit TreeNodeArray(json& j);

    int size() const;

    TreeNode operator[](int index) const;

    TreeNode operator[](int index);

    TreeNodeArray filter(const std::function<bool(const TreeNode&)>& predicate) const;

    void forEach(const std::function<void(TreeNode&)>& action);

    void forEach(const std::function<void(const TreeNode&)>& action) const;

    // Destructor is required when using pimpl idiom with unique_ptr.
    // See "Effective Modern C++" by Scott Meyers,
    // "Item 22: When using the Pimpl Idiom, define special member functions in the implementation file".
    ~TreeNodeArray();
    TreeNodeArray(const TreeNodeArray& other) = delete;
    TreeNodeArray(TreeNodeArray&& other) noexcept = delete;
    TreeNodeArray& operator=(const TreeNodeArray& other) = delete;
    TreeNodeArray& operator=(TreeNodeArray&& other) noexcept = delete;
  };


}// namespace Nextclade
