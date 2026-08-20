#include "common.h"
#include "simulator.h"
#include "pacing_logic.h"
#include "logger.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "esp_timer.h"
#include <stdio.h>
#include "buzzer.h"
#include "oled_bpm.h"
#include "oled_ecg.h"


/* Remplace clock_gettime(CLOCK_MONOTONIC, ...) de la version Linux */
uint64_t now_ms(void) {
    return (uint64_t)(esp_timer_get_time() / 1000ULL);
}

static void print_help(void) {
    printf("\n=== Simulateur Pacemaker (mode VVI) - ESP32/Wokwi ===\n");
    printf("Tapez dans le moniteur serie : n=normal  b=bradycardie  t=tachycardie  a=asystolie  z=bruit  h=aide\n\n");
}

void app_main(void) {
    logger_init();
    oled_ecg_init();   /* initialise aussi le bus I2C partagé */
    oled_bpm_init();   /* réutilise le même bus */
    buzzer_init();

    /* Remplace event_queue_t + mutex/cond var fait main par une queue FreeRTOS native */
    QueueHandle_t queue = xQueueCreate(64, sizeof(beat_event_t));

    static sim_args_t    sim_args;
    static pacing_args_t pace_args;
    sim_args.out_queue  = queue;
    pace_args.in_queue  = queue;

    /* Priorités FreeRTOS (0=basse, 24=haute sur ESP32) : la logique de
     * stimulation reste la tâche la plus critique, comme SCHED_FIFO priorité
     * 80 dans la version Buildroot. */
    xTaskCreate(pacing_logic_task,     "pacing_logic", 4096, &pace_args, 15, NULL);
    xTaskCreate(cardiac_simulator_task, "cardiac_sim", 4096, &sim_args,   5, NULL);

    print_help();

    /* Remplace la boucle fgets() sur stdin : lecture caractère par caractère
     * depuis l'UART, exactement pilotable depuis le moniteur série Wokwi. */
    while (1) {
        int ch = getchar();
        if (ch == EOF) {
            vTaskDelay(pdMS_TO_TICKS(50));
            continue;
        }
        switch ((char)ch) {
            case 'n': g_scenario = SCEN_NORMAL;      printf(">> Normal (~70-75 bpm)\n"); break;
            case 'b': g_scenario = SCEN_BRADYCARDIA;  printf(">> Bradycardie : le pacemaker doit intervenir\n"); break;
            case 't': g_scenario = SCEN_TACHYCARDIA;  printf(">> Tachycardie : le pacemaker doit s'inhiber\n"); break;
            case 'a': g_scenario = SCEN_ASYSTOLE;     printf(">> Asystolie : aucun battement naturel\n"); break;
            case 'z': g_scenario = SCEN_NOISY;        printf(">> Rythme bruite/irregulier\n"); break;
            case 'h': print_help(); break;
            default: break;
        }
    }
}
