#include <memory>
#include <vector>

#include "contract.h"


/**
 * Wraps vector with some of the functionality removed and additional
 * debug checks (preconditions) added.
 *
 * Removed functionality:
 *
 *  - at(). Reason: operator[] provides faster access and there are
 *    preconditions in place to catch out-of-bounds accesses in debug mode.
 *
 *  - data(). Reason: so far we don't need access to underlying data storage
 *    and hopefully will never need
 *
 */
template<typename T, typename Alloc = std::allocator<T>>
class safe_vector {
  using Base = std::vector<T, Alloc>;
  Base base;

public:
  using value_type = T;
  using size_type = typename Base::size_type;
  using pointer = typename Base::pointer;
  using const_pointer = typename Base::const_pointer;
  using reference = typename Base::reference;
  using const_reference = typename Base::const_reference;
  using iterator = typename Base::iterator;
  using const_iterator = typename Base::const_iterator;
  using reverse_iterator = typename Base::reverse_iterator;
  using const_reverse_iterator = typename Base::const_reverse_iterator;
  using difference_type = typename Base::difference_type;
  using allocator_type = typename Base::allocator_type;

  inline safe_vector() = default;

  inline explicit safe_vector(const allocator_type& allocator) noexcept : Base(allocator) {}

  inline explicit safe_vector(size_type n, const allocator_type& allocator = allocator_type()) : Base(n, allocator) {}

  inline safe_vector(size_type n, const value_type& value, const allocator_type& allocator = allocator_type())
      : Base(n, value, allocator) {}

  inline safe_vector(const safe_vector& other) : Base(other) {}

  inline safe_vector(safe_vector&&) noexcept = default;

  inline safe_vector(const safe_vector& x, const allocator_type& allocator) : Base(x, allocator) {}

  inline safe_vector(safe_vector&& rv, const allocator_type& allocator) noexcept : Base(std::move(rv), allocator) {}

  inline safe_vector(std::initializer_list<value_type> list, const allocator_type& allocator = allocator_type())
      : Base(list, allocator) {}

  template<typename InputIterator>
  inline safe_vector(InputIterator first, InputIterator last, const allocator_type& allocator = allocator_type())
      : Base(first, last, allocator) {}

  inline ~safe_vector() noexcept = default;

  inline safe_vector& operator=(std::initializer_list<value_type> other) {
    base = other;
    return *this;
  }

  inline safe_vector& operator=(safe_vector&& other) noexcept {
    base = std::move(other);
    return *this;
  }

  inline void assign(size_type n, const value_type& val) {
    base.assign(n, val);
  }

  template<typename InputIterator>
  inline void assign(InputIterator first, InputIterator last) {
    base.assign(first, last);
  }

  inline void assign(std::initializer_list<value_type> list) {
    base.assign(list);
  }

  inline inline iterator begin() noexcept {
    return base.begin();
  }

  inline const_iterator begin() const noexcept {
    return base.begin();
  }

  inline iterator end() noexcept {
    return base.end();
  }

  inline const_iterator end() const noexcept {
    return base.end();
  }

  inline reverse_iterator rbegin() noexcept {
    return base.rbegin();
  }

  inline const_reverse_iterator rbegin() const noexcept {
    return base.rbegin();
  }

  inline reverse_iterator rend() noexcept {
    return base.rend();
  }

  inline const_reverse_iterator rend() const noexcept {
    return base.rend();
  }

  inline const_iterator cbegin() const noexcept {
    return base.cbegin();
  }

  inline const_iterator cend() const noexcept {
    return base.cend();
  }

  inline const_reverse_iterator crbegin() const noexcept {
    return base.crbegin();
  }

  inline const_reverse_iterator crend() const noexcept {
    return base.crend();
  }

  inline size_type size() const noexcept {
    return base.size();
  }

  inline size_type max_size() const noexcept {
    return base.max_size();
  }

  inline void resize(size_type new_size) {
    base.resize(new_size);
  }

  inline void resize(size_type new_size, const value_type& x) {
    base.resize(new_size, x);
  }

  inline void shrink_to_fit() {
    base.shrink_to_fit();
  }

  inline size_type capacity() const noexcept {
    return base.capacity();
  }

  [[nodiscard]] inline bool empty() const noexcept {
    return base.empty();
  }

  inline reference operator[](size_type index) noexcept {
    precondition_greater_equal(index, 0);
    precondition_less(index, size());
    return base[index];
  }

  inline const_reference operator[](size_type index) const noexcept {
    precondition_greater_equal(index, 0);
    precondition_less(index, size());
    return base[index];
  }

  inline reference front() noexcept {
    precondition(!empty());
    return base.front();
  }

  inline const_reference front() const noexcept {
    precondition(!empty());
    return base.front();
  }

  inline reference back() noexcept {
    precondition(!empty());
    return base.back();
  }

  inline const_reference back() const noexcept {
    precondition(!empty());
    return base.back();
  }

  inline void push_back(const value_type& x) {
    base.push_back(x);
  }

  inline void push_back(value_type&& x) {
    base.push_back(std::move(x));
  }

  template<typename... Args>
  inline reference emplace_back(Args&&... args) {
    return base.push_back(std::forward<Args>(args)...);
  }

  inline void pop_back() noexcept {
    precondition(!empty());
    base.pop_back();
  }

  template<typename... Args>
  inline iterator emplace(const_iterator position, Args&&... args) {
    return base.template emplace(position, std::forward<Args>(args)...);
  }

  inline iterator insert(const_iterator position, value_type&& x) {
    return base.insert(position, std::move(x));
  }

  inline iterator insert(const_iterator position, std::initializer_list<value_type> list) {
    return base.insert(position, list);
  }

  inline iterator insert(const_iterator position, size_type n, const value_type& x) {
    return base.insert(position, n, x);
  }

  template<typename InputIterator>
  inline iterator insert(const_iterator position, InputIterator first, InputIterator last) {
    return base.insert(position, first, last);
  }

  inline iterator erase(const_iterator position) {
    return base.erase(position);
  }

  inline iterator erase(const_iterator first, const_iterator last) {
    return base.erase(first, last);
  }

  inline void swap(safe_vector& other) noexcept {
    base.swap(other);
  }

  inline void clear() noexcept {
    base.clear();
  }
}
