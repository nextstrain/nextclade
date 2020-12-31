function(message)
  list(GET ARGV 0 MessageType)
  if (MessageType STREQUAL FATAL_ERROR OR
    MessageType STREQUAL SEND_ERROR OR
    MessageType STREQUAL WARNING OR
    MessageType STREQUAL AUTHOR_WARNING)
    list(REMOVE_AT ARGV 0)
    _message(${MessageType} "${ARGV}")
  endif ()
endfunction()
