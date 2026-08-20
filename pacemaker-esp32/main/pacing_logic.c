#include "pacing_logic.h"
#include "logger.h"
#include "simulator.h"
#include "driver/gpio.h"
#include "freertos/task.h"
#include "buzzer.h"
#include "oled_bpm.h"
#include "oled_ecg.h"

/* Broches câblées dans diagram.json : adapte si tu changes le câblage */
#define PACE_PIN       GPIO_NUM_2   /* LED rouge : stimulation (PACED) */
#define SENSE_LED_PIN  GPIO_NUM_4   /* LED verte : battement naturel détecté (SENSED) */

static uint64_t g_last_beat_ms = 0;

static void update_bpm_display(int rr_ms) {
    if (rr_ms <= 0) {
        return;
    }

    int bpm = 60000 / rr_ms;
    oled_bpm_show(bpm);
}



static void deliver_pacing_pulse(uint64_t t) {
    gpio_set_level(PACE_PIN, 1);
    logger_event("PACED", t, (int)(t - g_last_beat_ms));

    oled_ecg_scroll_and_plot(10);       /* pic bas et large = stimulation artificielle */
    buzzer_beep(1000, 80);         
    update_bpm_display((int)(t - g_last_beat_ms));
    vTaskDelay(pdMS_TO_TICKS(PULSE_WIDTH_MS));
    gpio_set_level(PACE_PIN, 0);
    g_last_beat_ms = t;
}

void pacing_logic_task(void *arg) {
    pacing_args_t *a = (pacing_args_t *)arg;

    gpio_reset_pin(PACE_PIN);
    gpio_set_direction(PACE_PIN, GPIO_MODE_OUTPUT);
    gpio_reset_pin(SENSE_LED_PIN);
    gpio_set_direction(SENSE_LED_PIN, GPIO_MODE_OUTPUT);
    
    uint64_t escape_deadline = now_ms() + LRL_INTERVAL_MS;
    g_last_beat_ms = now_ms();

    while (g_running) {
        beat_event_t ev;
        int64_t remaining = (int64_t)escape_deadline - (int64_t)now_ms();
        int wait_ms = remaining > 0 ? (int)remaining : 0;
        if (wait_ms > TICK_PERIOD_MS) wait_ms = TICK_PERIOD_MS; /* on tick régulièrement */
        if (wait_ms < 10) wait_ms = 10;

        /* xQueueReceive remplace eq_pop_wait() : timeout natif, plus besoin
         * de mutex/cond var gérés à la main comme dans event_queue.c */
        int got = xQueueReceive(a->in_queue, &ev, pdMS_TO_TICKS(wait_ms));

        uint64_t t = now_ms();

        if (got && ev.type == EVT_NATURAL_BEAT) {
            uint64_t since_last = t - g_last_beat_ms;

            if (since_last < REFRACTORY_PERIOD_MS) {
                /* dans la période réfractaire -> on ignore (bruit / repolarisation) */
                continue;
            }

            /* battement naturel valide : le pacemaker s'inhibe */
            gpio_set_level(SENSE_LED_PIN, 1);
            logger_event("SENSED", t, (int)since_last);
            oled_ecg_scroll_and_plot(55);  /* pic haut et fin = battement naturel type QRS */
            buzzer_beep(2500, 30);     

            update_bpm_display((int)since_last);
            g_last_beat_ms   = t;
            escape_deadline  = t + LRL_INTERVAL_MS;
            vTaskDelay(pdMS_TO_TICKS(50)); /* flash visible de la LED verte */
            gpio_set_level(SENSE_LED_PIN, 0);

            oled_ecg_scroll_and_plot(32);
            continue;
        }

        /* pas de battement reçu : a-t-on dépassé le délai d'échappement ? */
        if (now_ms() >= escape_deadline) {
            deliver_pacing_pulse(now_ms());
            escape_deadline = now_ms() + LRL_INTERVAL_MS;
        }
    }
    vTaskDelete(NULL);
}
