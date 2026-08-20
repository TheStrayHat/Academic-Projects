#ifndef COMMON_H
#define COMMON_H

#include <stdint.h>

/* ===================== Paramètres cliniques (mode VVI simplifié) =====================
 * VVI = Ventricule senti (V), Ventricule stimulé (V), Inhibé si battement naturel (I)
 * Inchangé par rapport à la version Buildroot : c'est du C pur, portable tel quel.
 */
#define LRL_BPM              60      /* Lower Rate Limit : fréquence minimale garantie   */
#define URL_BPM              120     /* Upper Rate Limit : on ignore le bruit au-delà    */
#define REFRACTORY_PERIOD_MS 250     /* Période où on ignore les signaux (post-battement)*/
#define PULSE_WIDTH_MS       2       /* Durée simulée de l'impulsion électrique          */

#define LRL_INTERVAL_MS  (60000 / LRL_BPM)   /* Intervalle d'échappement -> 1000 ms       */
#define URL_INTERVAL_MS  (60000 / URL_BPM)   /* Intervalle réfractaire haut -> 500 ms     */

#define TICK_PERIOD_MS       2       /* Période de la tâche de contrôle (2 ms = 500 Hz)  */

typedef enum {
    EVT_NATURAL_BEAT = 0,   /* battement cardiaque naturel détecté par le capteur */
    EVT_QUIT
} event_type_t;

typedef struct {
    event_type_t type;
    uint64_t     timestamp_ms;
} beat_event_t;

typedef enum {
    SCEN_NORMAL = 0,
    SCEN_BRADYCARDIA,   /* coeur trop lent  -> le pacemaker doit intervenir souvent   */
    SCEN_TACHYCARDIA,   /* coeur trop rapide -> le pacemaker doit rester inhibé       */
    SCEN_ASYSTOLE,      /* absence totale de battement -> pacing à la fréquence LRL  */
    SCEN_NOISY          /* rythme irrégulier / bruité                                 */
} scenario_t;

/* Implémentée dans main.c via esp_timer_get_time() (remplace clock_gettime Linux) */
uint64_t now_ms(void);

#endif
