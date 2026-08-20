#ifndef BUZZER_H
#define BUZZER_H

void buzzer_init(void);
/* Bip bloquant court, fréquence en Hz, durée en ms */
void buzzer_beep(int freq_hz, int duration_ms);

#endif