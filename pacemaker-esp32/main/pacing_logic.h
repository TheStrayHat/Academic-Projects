#ifndef PACING_LOGIC_H
#define PACING_LOGIC_H

#include "common.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

typedef struct {
    QueueHandle_t in_queue;   /* battements naturels reçus du capteur/simulateur */
} pacing_args_t;

/* Tâche FreeRTOS priorité la plus haute : le "cerveau" du pacemaker
 * (remplace pacing_logic_thread, SCHED_FIFO priorité 80) */
void pacing_logic_task(void *arg);

#endif
