#include "logger.h"
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static SemaphoreHandle_t g_lock;

void logger_init(void) {
    g_lock = xSemaphoreCreateMutex();
    printf("timestamp_ms,event,rr_interval_ms\n");
}

/* Portage : pthread_mutex_t -> SemaphoreHandle_t. Le fichier CSV disparaît
 * (pas de filesystem persistant simple sur cible simulée) : la sortie va
 * dans le moniteur série Wokwi, exploitable en copiant/collant si besoin. */
void logger_event(const char *label, uint64_t timestamp_ms, int rr_ms) {
    if (g_lock) xSemaphoreTake(g_lock, portMAX_DELAY);
    printf("%llu,%s,%d\n", (unsigned long long)timestamp_ms, label, rr_ms);
    if (g_lock) xSemaphoreGive(g_lock);
}
