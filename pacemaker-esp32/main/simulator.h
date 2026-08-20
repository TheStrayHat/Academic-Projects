#ifndef SIMULATOR_H
#define SIMULATOR_H

#include "common.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

extern volatile scenario_t g_scenario;
extern volatile int        g_running;

typedef struct {
    QueueHandle_t out_queue;   /* remplace event_queue_t* : queue FreeRTOS native */
} sim_args_t;

/* Tâche FreeRTOS (remplace le thread pthread cardiac_simulator_thread) */
void cardiac_simulator_task(void *arg);

#endif
