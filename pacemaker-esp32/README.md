# Pacemaker RTOS — portage Buildroot → ESP-IDF / Wokwi

## Ce qui a changé par rapport à la version Buildroot

| Fichier | Changement |
|---|---|
| `common.h` | Inchangé (C pur), sauf suppression de `<time.h>` / `<pthread.h>` |
| `event_queue.c/h` | **Supprimé** — remplacé par `xQueueCreate()` / `xQueueSend()` / `xQueueReceive()` (FreeRTOS natif) |
| `simulator.c` | `usleep()` → `vTaskDelay()`, thread → tâche FreeRTOS. Algorithme `rr_interval_ms()` inchangé |
| `pacing_logic.c` | Algorithme VVI (escape_deadline, période réfractaire) **inchangé**. `deliver_pacing_pulse()` pilote un vrai GPIO au lieu d'un `printf` |
| `logger.c` | `pthread_mutex_t` → `SemaphoreHandle_t`. Pas de fichier CSV (pas de filesystem simple) : sortie via UART / moniteur série |
| `main.c` | `main()` → `app_main()`. `pthread_create` + `SCHED_FIFO` → `xTaskCreate()` avec priorité FreeRTOS. Saisie clavier → lecture UART identique en usage |

L'algorithme métier (le cœur du projet : la logique VVI) est **strictement identique**,
seule la couche threading/IO a été portée.

## Builder

```
idf.py set-target esp32
idf.py build
```

## Simuler dans Wokwi (VS Code)

1. Ouvrir ce dossier dans VS Code (extensions ESP-IDF + Wokwi installées).
2. `idf.py build` (génère `build/flasher_args.json` nécessaire à Wokwi).
3. `F1` → **"Wokwi: Start Simulator"**.
4. Utiliser le moniteur série intégré pour taper les commandes `n/b/t/a/z`
   (comme dans la version Buildroot).
5. Observer :
   - LED rouge (GPIO2) = stimulation `PACED`
   - LED verte (GPIO4) = battement naturel détecté `SENSED`

## Vérification de fidélité

Rejoue les mêmes scénarios que sur la cible Buildroot et compare :
- le respect de `LRL_INTERVAL_MS` (jamais plus de 1000 ms sans PACED en asystolie),
- l'inhibition correcte en tachycardie,
- le comportement pendant la période réfractaire en mode bruité.

Le comportement logique doit être identique ; seule la couche matérielle diffère.
