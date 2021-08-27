#pragma once

#include <vector>

#include "contract.h"

template<class T>
class vector2d {
  size_t m_rows = 0;
  size_t m_cols = 0;
  std::vector<T> m_data;

public:
  typedef T value_type;
  typedef typename std::vector<T>::iterator iterator;
  typedef typename std::vector<T>::const_iterator const_iterator;

  inline vector2d() {}

  inline vector2d(size_t rows, size_t cols) : m_rows(rows), m_cols(cols), m_data(rows * cols) {}

  inline size_t num_rows() const {
    return m_rows;
  }

  inline size_t num_cols() const {
    return m_cols;
  }

  inline T& at(size_t row, size_t col) {
    precondition_less(row, m_rows);
    precondition_less(col, m_cols);
    return m_data[row * m_cols + col];
  }

  inline const T& at(size_t row, size_t col) const {
    precondition_less(row, m_rows);
    precondition_less(col, m_cols);
    return m_data[row * m_cols + col];
  }

  inline T& operator()(size_t i) {
    return at(i);
  }

  inline const T& operator()(size_t i) const {
    return at(i);
  }

  inline T& operator()(size_t row, size_t col) {
    return at(row, col);
  }

  inline const T& operator()(size_t row, size_t col) const {
    return at(row, col);
  }

  inline value_type* data() {
    return m_data.data();
  }

  inline const value_type* data() const {
    return m_data.data();
  }

  inline iterator begin() {
    return m_data.begin();
  }

  inline const const_iterator begin() const {
    return m_data.begin();
  }

  inline iterator end() {
    return m_data.end();
  }

  inline const iterator end() const {
    return m_data.end();
  }

  inline const const_iterator cbegin() const {
    return m_data.cbegin();
  }

  inline const const_iterator cend() const {
    return m_data.cend();
  }

  void resize(int rows, int cols) {
    m_data.resize(rows * cols);
    m_rows = rows;
    m_cols = cols;
  }
};
