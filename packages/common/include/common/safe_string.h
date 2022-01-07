#pragma once

#include <string>

#include "safe_string_view.h"

#if !defined(NDEBUG)

#pragma clang diagnostic push
#pragma ide diagnostic ignored "OCUnusedStructInspection"
#pragma ide diagnostic ignored "OCUnusedTypeAliasInspection"
#pragma ide diagnostic ignored "OCUnusedGlobalDeclarationInspection"

#include <algorithm>
#include <memory>

#include "contract.h"
#include "copy.h"


/**
 * Wraps std::basic_string with debug checks (preconditions) added.
 * Only implements some of the methods, the ones we use.
 */
template<typename T, typename CharTraits = std::char_traits<T>, typename Alloc = std::allocator<T>>
class safe_string {
  using Base = std::basic_string<T, CharTraits, Alloc>;
  Base base;

public:
  template<typename Y, typename CharTraitsY, typename AllocY>
  friend bool operator==(const safe_string<Y, CharTraitsY, AllocY>& left,
    const safe_string<Y, CharTraitsY, AllocY>& right);

  friend class safe_string_view<T, CharTraits>;

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

  inline safe_string() = default;

  inline safe_string(const std::basic_string<T, CharTraits, Alloc>& str) noexcept : base(str) {}

  inline safe_string(std::basic_string<T, CharTraits, Alloc>&& str) noexcept : base(std::move(str)) {}

  inline safe_string(const safe_string_view<T, CharTraits>& strv) noexcept : base(strv.to_std()) {}

  inline explicit safe_string(const T& t, const Alloc& alloc = Alloc()) : base(t, alloc) {}

  inline explicit safe_string(const allocator_type& allocator) noexcept : base(allocator) {}

  inline explicit safe_string(size_type n, const allocator_type& allocator = allocator_type()) : base(n, allocator) {}

  inline safe_string(size_type n, const value_type& value, const allocator_type& allocator = allocator_type())
      : base(n, value, allocator) {}

  inline safe_string(const safe_string& other) = default;

  inline safe_string(safe_string&&) noexcept = default;

  inline safe_string(const safe_string& x, const allocator_type& allocator) : base(x, allocator) {}

  inline safe_string(safe_string&& rv, const allocator_type& allocator) noexcept : base(std::move(rv), allocator) {}

  inline safe_string(std::initializer_list<value_type> list, const allocator_type& allocator = allocator_type())
      : base(list, allocator) {}

  template<typename InputIterator>
  inline safe_string(InputIterator first, InputIterator last, const allocator_type& allocator = allocator_type())
      : base(first, last, allocator) {}

  inline ~safe_string() noexcept = default;

  operator safe_string_view<T, CharTraits>() const noexcept {// NOLINT(google-explicit-constructor)
    return safe_string_view<T, CharTraits>{base.operator std::basic_string_view<T, CharTraits>()};
  }

  inline const std::basic_string<T, CharTraits, Alloc>& to_std() const {
    return base;
  }

  inline std::basic_string<T, CharTraits, Alloc>& to_std_ref() {
    return base;
  }

  inline void swap(safe_string& other) {
    using std::swap;
    base.swap(other.base);
  }

  inline safe_string& operator=(T other) {
    base = other;
    return *this;
  }

  inline safe_string& operator=(std::initializer_list<value_type> other) {
    base = other;
    return *this;
  }

  inline safe_string& operator=(const safe_string& other) {
    using std::swap;
    if (this != &other) {
      safe_string other_copy = copy(other);
      std::swap(base, other_copy.base);
    }
    return *this;
  }

  inline safe_string& operator=(safe_string&& other) noexcept {
    if (this != &other) {
      base = std::move(other.base);
    }
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

  inline iterator begin() noexcept {
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

  inline size_type length() const noexcept {
    return size();
  }

  inline size_type size() const noexcept {
    return base.size();
  }


  inline size_type max_size() const noexcept {
    return base.max_size();
  }

  inline void reserve(size_type new_capacity) {
    base.reserve(new_capacity);
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
    return base.emplace_back(std::forward<Args>(args)...);
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

  inline void clear() noexcept {
    base.clear();
  }

  inline pointer data() noexcept {
    return base.data();
  }

  inline const_pointer data() const noexcept {
    return base.data();
  }

  inline safe_string substr(size_type pos = 0, size_type n = Base::npos) const noexcept(false) {
    return base.substr(pos, n);
  }

  inline safe_string operator+=(const safe_string& other) {
    return base.operator+=(other);
  }

  inline safe_string operator+=(const T c) {
    return base.operator+=(c);
  }

  inline safe_string operator+=(const T* cp) {
    return base.operator+=(cp);
  }

  inline size_type find(const std::basic_string<T, CharTraits, Alloc>& str, size_type pos = 0) const noexcept {
    return base.find(str, pos);
  }

  inline size_type find(const T* c, size_type pos = 0) const noexcept {
    return base.find(c, pos);
  }
};

template<typename T, typename CharTraits, typename Alloc>
bool operator==(const safe_string<T, CharTraits, Alloc>& left, const safe_string<T, CharTraits, Alloc>& right) {
  return left.base == right.base;
}

#pragma clang diagnostic pop

#else

template<typename T, typename CharTraits = std::char_traits<T>, typename Alloc = std::allocator<T>>
using safe_string = std::basic_string<T, CharTraits, Alloc>;

#endif
