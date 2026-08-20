// oled_ecg.c
#include "oled_ecg.h"
#include "ssd1306.h"

#define OLED_ECG_ADDR 0x3C
static ssd1306_t s_dev;

void oled_ecg_init(void) {
    ssd1306_init(&s_dev, OLED_ECG_ADDR);
}

void oled_ecg_scroll_and_plot(int y_value) {
    if (y_value < 0) y_value = 0;
    if (y_value > SSD1306_HEIGHT - 1) y_value = SSD1306_HEIGHT - 1;

    for (int page = 0; page < SSD1306_HEIGHT / 8; page++)
        for (int x = 0; x < SSD1306_WIDTH - 1; x++)
            s_dev.framebuffer[page * SSD1306_WIDTH + x] = s_dev.framebuffer[page * SSD1306_WIDTH + x + 1];

    for (int y = 0; y < SSD1306_HEIGHT; y++)
        ssd1306_set_pixel(&s_dev, SSD1306_WIDTH - 1, y, false);
    ssd1306_set_pixel(&s_dev, SSD1306_WIDTH - 1, y_value, true);

    ssd1306_flush(&s_dev);
}