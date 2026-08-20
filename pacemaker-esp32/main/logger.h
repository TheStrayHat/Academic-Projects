#ifndef LOGGER_H
#define LOGGER_H

#include <stdint.h>

void logger_init(void);
/* label typique : "SENSED" ou "PACED" — s'affiche dans le moniteur série Wokwi */
void logger_event(const char *label, uint64_t timestamp_ms, int rr_ms);

#endif
