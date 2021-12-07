#pragma once

#pragma clang diagnostic push
#pragma ide diagnostic ignored "cppcoreguidelines-pro-bounds-pointer-arithmetic"
#pragma ide diagnostic ignored "OCUnusedGlobalDeclarationInspection"
#pragma ide diagnostic ignored "cppcoreguidelines-pro-type-member-init"
/**
 * Taken with modifications from
 * https://github.com/cartoonist/kseqpp/blob/558de3086e66dbbdbe1c4bfcc8d0f5abff59b19b/include/kseq%2B%2B/kseq%2B%2B.hpp
 */

/**
 *  @file  kseq++.hpp
 *  @brief  C++ implementation of kseq library.
 *
 *  This is a header-only library re-implementing the original kseq library.
 *
 *  @author  Ali Ghaffaari (\@cartoonist), <ali.ghaffaari@mpi-inf.mpg.de>
 *
 *  @internal
 *       Created:  Sun Jul 15, 2018  19:15
 *  Organization:  Max-Planck-Institut fuer Informatik
 *     Copyright:  Copyright (c) 2018, Ali Ghaffaari
 *
 *  This source code is released under the terms of the MIT License.
 *  See LICENSE file for more information.
 */


#include <cassert>
#include <cctype>
#include <cstdlib>
#include <cstring>
#include <ios>
#include <string>

namespace klibpp {

  template<typename Reader>
  class KStream {// kstream_t
  public:
    using char_type = char;
    constexpr static int64_t DEFAULT_BUFSIZE = 131072;

  private:
    /* Separators */
    constexpr static char_type SEP_SPACE = 0;// isspace(): \t, \n, \v, \f, \r
    constexpr static char_type SEP_TAB = 1;  // isspace() && !' '
    constexpr static char_type SEP_LINE = 2; // line separator: "\n" (Unix) or "\r\n" (Windows)
    constexpr static char_type SEP_MAX = 2;

    std::basic_string<char_type> buf; /**< @brief character buffer */
    int64_t begin;                    /**< @brief begin buffer index */
    int64_t end;                      /**< @brief end buffer index or error flag if -1 */
    bool is_eof;                      /**< @brief eof flag */
    bool is_tqs;                      /**< @brief truncated quality string flag */
    bool is_ready;                    /**< @brief next record ready flag */
    bool last;                        /**< @brief last read was successful */

    Reader reader;

    int64_t index = 0;

    inline bool is_char_allowed(char_type c) {
      return std::isalpha(c) || c == '.' || c == '?' || c == '*';
    }

  public:
    explicit KStream(Reader&& reader_) : reader{std::move(reader_)} {
      this->buf.resize(DEFAULT_BUFSIZE);
      this->begin = 0;
      this->end = 0;
      this->is_eof = false;
      this->is_tqs = false;
      this->is_ready = false;
      this->last = false;
    }

    ~KStream() = default;
    KStream(const KStream&) = delete;
    const KStream& operator=(const KStream&) = delete;
    KStream(const KStream&&) = delete;
    const KStream& operator=(const KStream&&) = delete;

    inline bool err() const// ks_err
    {
      return this->end == -1;
    }

    inline bool eof() const// ks_eof
    {
      return this->is_eof && this->begin >= this->end;
    }

    inline bool tqs() const {
      return this->is_tqs;
    }

    inline bool fail() const {
      return this->err() || this->tqs() || (this->eof() && !this->last);
    }

    template<typename OutputType>
    inline bool next(OutputType& rec)// kseq_read
    {
      char_type c;// NOLINT(cppcoreguidelines-init-variables)
      this->last = false;
      if (!this->is_ready) {// then jump to the next header line
        while ((c = this->getc()) && c != '>') {
          ;
        }
        if (this->fail()) {
          return !this->fail();
        }
        this->is_ready = true;
      }// else: the first header char has been read in the previous call

      // reset all members
      rec.seqName.clear();
      rec.seq.clear();
      rec.index = index;
      ++index;

      if (!this->getuntil(KStream::SEP_LINE, rec.seqName, &c)) {
        return !this->fail();
      }

      while ((c = this->getc()) && c != '>') {
        if (!is_char_allowed(c)) {
          continue;
        }
        c = static_cast<char_type>(std::toupper(c));
        rec.seq += c;
        this->getuntil(KStream::SEP_LINE, rec.seq, nullptr, true);// read the rest of the line
      }
      this->last = true;

      if (c == '>') {
        this->is_ready = true;// the first header char has been read
      }
      return !this->fail();
    }

    /* Low-level methods */
    inline char_type getc() noexcept// ks_getc
    {
      // error
      if (this->err() || this->eof()) {
        return 0;
      }
      // fetch
      if (this->begin >= this->end) {
        this->begin = 0;
        this->end = this->reader.read(this->buf.data(), this->buf.size());
        if (this->end <= 0) {// err if end == -1 and eof if 0
          this->is_eof = true;
          return 0;
        }
      }
      // ready
      return this->buf[this->begin++];
    }

    inline bool getuntil(char_type delimiter, std::string& str, char_type* dret, bool append = false)// ks_getuntil
      noexcept {
      char_type c;// NOLINT(cppcoreguidelines-init-variables)
      bool gotany = false;
      if (dret) {
        *dret = 0;
      }
      if (!append) {
        str.clear();
      }
      int64_t i = -1;
      do {
        if (!(c = this->getc())) {
          break;
        }
        --this->begin;
        if (delimiter == KStream::SEP_LINE) {
          for (i = this->begin; i < this->end; ++i) {
            if (this->buf[i] == '\n') {
              break;
            }
          }
        } else if (delimiter > KStream::SEP_MAX) {
          for (i = this->begin; i < this->end; ++i) {
            if (this->buf[i] == delimiter) {
              break;
            }
          }
        } else if (delimiter == KStream::SEP_SPACE) {
          for (i = this->begin; i < this->end; ++i) {
            if (std::isspace(this->buf[i])) {
              break;
            }
          }
        } else if (delimiter == KStream::SEP_TAB) {
          for (i = this->begin; i < this->end; ++i) {
            if (std::isspace(this->buf[i]) && this->buf[i] != ' ') {
              break;
            }
          }
        } else {
          assert(false);// it should not reach here
          return false; // when assert is replaced by NOOP
        }

        gotany = true;
        str.append(this->buf.data() + this->begin, i - this->begin);
        this->begin = i + 1;
      } while (i >= this->end);

      if (this->err() || (this->eof() && !gotany)) {
        return false;
      }

      assert(i != -1);
      if (!this->eof() && dret) {
        *dret = this->buf[i];
      }
      if (delimiter == KStream::SEP_LINE && !str.empty() && str.back() == '\r') {
        str.pop_back();
      }
      return true;
    }
  };
}// namespace klibpp

#pragma clang diagnostic pop
