import os
import shutil
from conans import ConanFile, CMake, tools
from conans.errors import ConanInvalidConfiguration


class TBBConan(ConanFile):
    name = "tbb"
    license = "Apache-2.0"
    url = "https://github.com/conan-io/conan-center-index"
    homepage = "https://github.com/oneapi-src/oneTBB"
    description = """Intel Threading Building Blocks (Intel TBB) lets you easily write parallel C++
programs that take full advantage of multicore performance, that are portable and composable, and
that have future-proof scalability"""
    topics = ("conan", "tbb", "threading", "parallelism", "tbbmalloc")
    settings = "os", "compiler", "build_type", "arch"
    options = {
        "shared": [True, False],
        "fPIC": [True, False],
        "tbbmalloc": [True, False],
        "tbbproxy": [True, False]
    }
    default_options = {
        "shared": True,
        "fPIC": True,
        "tbbmalloc": False,
        "tbbproxy": False
    }
    version = "2021.2.0-rc"
    src_url = "https://github.com/oneapi-src/oneTBB/archive/v2021.2.0-rc.tar.gz"
    src_dirname = "oneTBB-2021.2.0-rc"

    mingw = False

    _cmake = None

    @property
    def _source_subfolder(self):
        return "source_subfolder"

    def source(self):
        tools.get(url=self.src_url)
        os.rename(self.src_dirname, self._source_subfolder)

        if self.mingw:
            # shutil.copytree('/path/to/oneTBB', self._source_subfolder)
            git = tools.Git(folder=self._source_subfolder)
            git.clone("https://github.com/ivan-aksamentov/oneTBB", branch="mingw", shallow=True)

    def _configure_cmake(self):
        if self._cmake:
            return self._cmake

        self._cmake = CMake(self)
        self._cmake.definitions["TBB_TEST"] = False
        self._cmake.definitions["TBB_STRICT"] = False

        if not self.options.shared:
            self._cmake.definitions["BUILD_SHARED_LIBS"] = False
            self._cmake.definitions["CMAKE_C_FLAGS"] = '-D__TBB_DYNAMIC_LOAD_ENABLED=0'
            self._cmake.definitions["CMAKE_CXX_FLAGS"] = '-D__TBB_DYNAMIC_LOAD_ENABLED=0'

        self._cmake.configure(source_folder=self._source_subfolder)
        return self._cmake

    def build(self):
        cmake = self._configure_cmake()
        cmake.build()
        cmake.install()

    def package(self):
        self.copy("LICENSE.txt", dst=".", src=self._source_subfolder)
        self.copy("README.md", dst=".", src=self._source_subfolder)
        cmake = self._configure_cmake()
        cmake.install()

    def package_id(self):
        del self.info.options.no_main

    def package_info(self):
        self.cpp_info.names["cmake_find_package"] = "TBB"
        self.cpp_info.names["cmake_find_package_multi"] = "TBB"
        # tbb
        self.cpp_info.components["libtbb"].names["cmake_find_package"] = "tbb"
        self.cpp_info.components["libtbb"].names["cmake_find_package_multi"] = "tbb"

        lib_name = "tbb"
        if self.mingw:
            lib_name += "12"

        self.cpp_info.components["libtbb"].libs = [self._lib_name(lib_name)]

        if self.settings.os == "Linux":
            # self.cpp_info.components["libtbb"].system_libs = ["dl", "rt", "pthread"]
            self.cpp_info.components["libtbb"].system_libs = ["rt", "pthread"]

        # tbbmalloc
        if self.options.tbbmalloc:
            self.cpp_info.components["tbbmalloc"].names["cmake_find_package"] = "tbbmalloc"
            self.cpp_info.components["tbbmalloc"].names["cmake_find_package_multi"] = "tbbmalloc"
            self.cpp_info.components["tbbmalloc"].libs = [self._lib_name("tbbmalloc")]

            if self.settings.os == "Linux":
                # self.cpp_info.components["tbbmalloc"].system_libs = ["dl", "pthread"]
                self.cpp_info.components["tbbmalloc"].system_libs = ["pthread"]

            # tbbmalloc_proxy
            if self.options.tbbproxy:
                self.cpp_info.components["tbbmalloc_proxy"].names["cmake_find_package"] = "tbbmalloc_proxy"
                self.cpp_info.components["tbbmalloc_proxy"].names["cmake_find_package_multi"] = "tbbmalloc_proxy"
                self.cpp_info.components["tbbmalloc_proxy"].libs = [self._lib_name("tbbmalloc_proxy")]
                self.cpp_info.components["tbbmalloc_proxy"].requires = ["tbbmalloc"]

    def _lib_name(self, name):
        if self.settings.build_type == "Debug":
            return name + "_debug"
        return name
