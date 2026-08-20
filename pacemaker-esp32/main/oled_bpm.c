#include "oled_bpm.h"
#include "ssd1306.h"
#include <stdio.h>
#include <string.h>
#define OLED_BPM_ADDR 0x3D

static ssd1306_t s_dev;


void oled_bpm_init(void) {
    ssd1306_init(&s_dev, OLED_BPM_ADDR);

    /* Cœur centré en haut */
    ssd1306_draw_heart(&s_dev, 60, 4);
    ssd1306_flush(&s_dev);
}

void oled_bpm_show(int bpm) {
    ssd1306_clear(&s_dev);

    /* Cœur en haut, centré horizontalement */
    ssd1306_draw_heart(&s_dev, 56, 2);

    char buf[8];
    snprintf(buf, sizeof(buf), "%d", bpm);

    /* Largeurs approximatives pour centrer l'ensemble "BPM" + chiffre */
    int label_width  = (5 * 3 + 3) * 3;              /* "BPM" en scale 1 : 3 caractères */
    int number_width = (5 * 3 + 3) * (int)strlen(buf); /* chiffre en scale 3 */
    int spacing       = 6;                             /* espace entre le label et le chiffre */
    int total_width   = label_width + spacing + number_width;

    int x_start = (SSD1306_WIDTH - total_width) / 2;
    if (x_start < 0) x_start = 0;

    /* Label "BPM" aligné verticalement au centre du chiffre (scale 3 = 21px de haut) */
    int label_y = 34 + (21 - 7) / 2;   /* centre le texte 7px sur la hauteur du chiffre 21px */
    ssd1306_draw_string(&s_dev, x_start, label_y, "BPM", 2);

    /* Chiffre en gros, juste à droite du label */
    int number_x = x_start + label_width + spacing;
    ssd1306_draw_string(&s_dev, number_x, 34, buf, 3);

    ssd1306_flush(&s_dev);
}