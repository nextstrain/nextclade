#ifdef EMSCRIPTEN
  #include <emscripten.h>
  #include <emscripten/bind.h>
  #define EXPORT EMSCRIPTEN_KEEPALIVE
#else
  #define EXPORT
#endif

//EXPORT
//int add(int v1, int v2) {
//  return v1 + v2;
//}


////#include <emscripten.h>
//
////extern "C" {
////  EMSCRIPTEN_KEEPALIVE
//  int add(int x, int y) {
//    return x + y;
//  }
////}
//
//
//int main() {}

//#include <iostream>



using namespace emscripten;

//extern "C"
//EMSCRIPTEN_KEEPALIVE
EXPORT
int add(int x, int y) {
  return x + y;
}

//int main() {
//  std::cout << "Hello";
//  std::cout.flush();
//  return 0;
//}


EMSCRIPTEN_BINDINGS(add) {
  function("add", &add);
}
