#include "ssd1306.h"
#include "driver/i2c.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <string.h>
#include <stdio.h>

#define I2C_PORT     I2C_NUM_0
#define I2C_SDA_PIN  21
#define I2C_SCL_PIN  22
#define I2C_FREQ_HZ  400000

static bool s_bus_ready = false;

static const uint16_t heart_bitmap_big[14] = {
    0b0011001100110000,
    0b0111111111111100,
    0b1111111111111110,
    0b1111111111111110,
    0b1111111111111110,
    0b0111111111111100,
    0b0111111111111100,
    0b0011111111111000,
    0b0011111111111000,
    0b0001111111110000,
    0b0000111111100000,
    0b0000011111000000,
    0b0000001110000000,
    0b0000000100000000,
};


void ssd1306_i2c_bus_init(void) {
    if (s_bus_ready) return;
    i2c_config_t conf = {
        .mode = I2C_MODE_MASTER,
        .sda_io_num = I2C_SDA_PIN,
        .scl_io_num = I2C_SCL_PIN,
        .sda_pullup_en = GPIO_PULLUP_ENABLE,
        .scl_pullup_en = GPIO_PULLUP_ENABLE,
        .master.clk_speed = I2C_FREQ_HZ,
    };
    i2c_param_config(I2C_PORT, &conf);
    i2c_driver_install(I2C_PORT, conf.mode, 0, 0, 0);
    s_bus_ready = true;
}

static void write_cmd(uint8_t addr, uint8_t cmd) {
    uint8_t buf[2] = { 0x00, cmd };
    i2c_master_write_to_device(I2C_PORT, addr, buf, sizeof(buf), pdMS_TO_TICKS(100));
}

static void write_data(uint8_t addr, const uint8_t *data, size_t len) {
    uint8_t buf[17];
    buf[0] = 0x40;
    for (size_t i = 0; i < len; i += 16) {
        size_t chunk = (len - i) < 16 ? (len - i) : 16;
        memcpy(&buf[1], &data[i], chunk);
        i2c_master_write_to_device(I2C_PORT, addr, buf, chunk + 1, pdMS_TO_TICKS(100));
    }
}

void ssd1306_init(ssd1306_t *dev, uint8_t addr) {
    ssd1306_i2c_bus_init();
    dev->addr = addr;
    vTaskDelay(pdMS_TO_TICKS(100));

    static const uint8_t init_seq[] = {
        0xAE, 0xD5, 0x80, 0xA8, 0x3F, 0xD3, 0x00, 0x40,
        0x8D, 0x14, 0x20, 0x00, 0xA1, 0xC8, 0xDA, 0x12,
        0x81, 0xCF, 0xD9, 0xF1, 0xDB, 0x40, 0xA4, 0xA6, 0xAF,
    };
    for (size_t i = 0; i < sizeof(init_seq); i++) write_cmd(addr, init_seq[i]);

    ssd1306_clear(dev);
    ssd1306_flush(dev);
}

void ssd1306_clear(ssd1306_t *dev) {
    memset(dev->framebuffer, 0, sizeof(dev->framebuffer));
}

void ssd1306_set_pixel(ssd1306_t *dev, int x, int y, bool on) {
    if (x < 0 || x >= SSD1306_WIDTH || y < 0 || y >= SSD1306_HEIGHT) return;
    int page = y / 8, bit = y % 8;
    int idx = page * SSD1306_WIDTH + x;
    if (on) dev->framebuffer[idx] |=  (1 << bit);
    else    dev->framebuffer[idx] &= ~(1 << bit);
}

void ssd1306_flush(ssd1306_t *dev) {
    for (uint8_t page = 0; page < SSD1306_HEIGHT / 8; page++) {
        write_cmd(dev->addr, 0xB0 + page);
        write_cmd(dev->addr, 0x00);
        write_cmd(dev->addr, 0x10);
        write_data(dev->addr, &dev->framebuffer[page * SSD1306_WIDTH], SSD1306_WIDTH);
    }
}

/* --- Cœur 8x14 --- */

void ssd1306_draw_heart(ssd1306_t *dev, int x, int y) {
    for (int row = 0; row < 14; row++) {
        for (int col = 0; col < 16; col++) {
            bool on = (heart_bitmap_big[row] >> (15 - col)) & 0x01;
            ssd1306_set_pixel(dev, x + col, y + row, on);
        }
    }
}


/* --- Police 5x7 minimale (glyphes standards, domaine public) --- */
static const uint8_t *glyph(char c) {
    static const uint8_t SP[5] = {0x00,0x00,0x00,0x00,0x00};
    static const uint8_t D0[5] = {0x3E,0x51,0x49,0x45,0x3E};
    static const uint8_t D1[5] = {0x00,0x42,0x7F,0x40,0x00};
    static const uint8_t D2[5] = {0x42,0x61,0x51,0x49,0x46};
    static const uint8_t D3[5] = {0x21,0x41,0x45,0x4B,0x31};
    static const uint8_t D4[5] = {0x18,0x14,0x12,0x7F,0x10};
    static const uint8_t D5[5] = {0x27,0x45,0x45,0x45,0x39};
    static const uint8_t D6[5] = {0x3C,0x4A,0x49,0x49,0x30};
    static const uint8_t D7[5] = {0x01,0x71,0x09,0x05,0x03};
    static const uint8_t D8[5] = {0x36,0x49,0x49,0x49,0x36};
    static const uint8_t D9[5] = {0x06,0x49,0x49,0x29,0x1E};
    static const uint8_t COL[5] = {0x00,0x36,0x36,0x00,0x00};
    static const uint8_t B[5]  = {0x7F,0x49,0x49,0x49,0x36};
    static const uint8_t P[5]  = {0x7F,0x09,0x09,0x09,0x06};
    static const uint8_t M[5]  = {0x7F,0x02,0x0C,0x02,0x7F};

    switch (c) {
        case '0': return D0; case '1': return D1; case '2': return D2;
        case '3': return D3; case '4': return D4; case '5': return D5;
        case '6': return D6; case '7': return D7; case '8': return D8;
        case '9': return D9; case ':': return COL;
        case 'B': return B;  case 'P': return P;  case 'M': return M;
        default:  return SP;
    }
}

static void draw_char(ssd1306_t *dev, int x, int y, char c, int scale) {
    const uint8_t *g = glyph(c);
    for (int col = 0; col < 5; col++) {
        for (int row = 0; row < 7; row++) {
            bool on = (g[col] >> row) & 0x01;
            if (!on) continue;
            for (int sx = 0; sx < scale; sx++)
                for (int sy = 0; sy < scale; sy++)
                    ssd1306_set_pixel(dev, x + col * scale + sx, y + row * scale + sy, true);
        }
    }
}

void ssd1306_draw_string(ssd1306_t *dev, int x, int y, const char *str, int scale) {
    int cursor_x = x;
    while (*str) {
        draw_char(dev, cursor_x, y, *str, scale);
        cursor_x += (5 * scale) + scale; /* espacement entre caractères */
        str++;
    }
}