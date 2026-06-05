cmake_minimum_required(VERSION 3.10.2)

project("fheli_engine")

# Expose C++17 capabilities for OpenFHE
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build Fheli Engine shared library JNI wrapper
add_library(fheli_engine SHARED
    fheli_jni.cpp
    FheliEngineCPP.cpp
)

# Link native dependencies and logging libraries
find_library(log-lib log)
target_link_libraries(fheli_engine
    android
    jnigraphics
    ${log-lib}
)
