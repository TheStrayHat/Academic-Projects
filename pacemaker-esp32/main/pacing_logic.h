#ifndef PACING_LOGIC_H
#define PACING_LOGIC_H

#include "common.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

typedef struct {
    QueueHandle_t in_queue;  
} pacing_args_t;

void pacing_logic_task(void *arg);

#endif
