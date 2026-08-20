#include "simulator.h"
#include <stdlib.h>
#include "freertos/task.h"

/* Variable globale simple pour changer le scénario "en direct" depuis l'UART (main.c) */
volatile scenario_t g_scenario = SCEN_NORMAL;
volatile int        g_running  = 1;

/* Inchangé par rapport à la version Buildroot : C pur */
static int rr_interval_ms(scenario_t s) {
    switch (s) {
        case SCEN_NORMAL:      return 800 + (rand() % 100);        /* ~70-75 bpm */
        case SCEN_BRADYCARDIA: return 1500 + (rand() % 300);       /* ~35-40 bpm -> trop lent  */
        case SCEN_TACHYCARDIA: return 300  + (rand() % 60);        /* ~150-180 bpm             */
        case SCEN_ASYSTOLE:    return -1;                          /* aucun battement          */
        case SCEN_NOISY:       return 400 + (rand() % 1200);       /* très irrégulier          */
        default:                return 800;
    }
}

/* Tâche "coeur" : simule l'activité électrique intrinsèque du muscle cardiaque.
 * Totalement indépendante du pacemaker (comme un vrai coeur).
 * Portage : usleep() -> vTaskDelay(), eq_push() -> xQueueSend() */
void cardiac_simulator_task(void *arg) {
    sim_args_t *a = (sim_args_t *)arg;
    while (g_running) {
        int interval = rr_interval_ms(g_scenario);
        if (interval < 0) {
            /* asystolie : pas de battement, le pacemaker doit prendre le relai */
            vTaskDelay(pdMS_TO_TICKS(200));
            continue;
        }
        vTaskDelay(pdMS_TO_TICKS(interval));
        if (!g_running) break;

        beat_event_t ev = { .type = EVT_NATURAL_BEAT, .timestamp_ms = now_ms() };
        xQueueSend(a->out_queue, &ev, 0); /* non-bloquant, comme eq_push() d'origine */
    }
    vTaskDelete(NULL);
}
