#ifndef SSD1306_H
#define SSD1306_H

#include <stdint.h>
#include <stdbool.h>

#define SSD1306_WIDTH  128
#define SSD1306_HEIGHT 64

typedef struct {
    uint8_t addr;
    uint8_t framebuffer[SSD1306_WIDTH * SSD1306_HEIGHT / 8];
} ssd1306_t;

/* À appeler une seule fois pour tout le bus, avant le premier ssd1306_init() */
void ssd1306_i2c_bus_init(void);

void ssd1306_init(ssd1306_t *dev, uint8_t addr);
void ssd1306_clear(ssd1306_t *dev);
void ssd1306_set_pixel(ssd1306_t *dev, int x, int y, bool on);
void ssd1306_flush(ssd1306_t *dev);

/* Cœur 8x14 pixels */
void ssd1306_draw_heart(ssd1306_t *dev, int x, int y);

/* Texte avec police 5x7, scale = facteur d'agrandissement (1 = normal, 2 = double) */
void ssd1306_draw_string(ssd1306_t *dev, int x, int y, const char *str, int scale);

#endif