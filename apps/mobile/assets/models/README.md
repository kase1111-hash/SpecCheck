# ML Model Assets

This directory contains TensorFlow Lite models for on-device component detection.

## Required Models

### Component Detection Model

**File:** `component_detector.tflite`

**Purpose:** Detects electronic components in camera frames and classifies them.

**Input:**
- Shape: `[1, 320, 320, 3]` (batch, height, width, RGB channels)
- Type: `float32` normalized to [0, 1]

**Output:**
- Shape: `[1, 20, 18]` (batch, max_detections, detection_values)
- Each detection: `[x, y, w, h, objectness, class_0, class_1, ..., class_12]`
- Coordinates normalized to [0, 1]

**Classes (13 total):**
| Index | Category | Description |
|-------|----------|-------------|
| 0 | led | LED packages (Cree XM-L, XP-G, etc.) |
| 1 | led_driver | LED driver ICs (PT4115, etc.) |
| 2 | battery_cell | Li-ion cells (18650, 21700, pouch) |
| 3 | bms | Battery management systems |
| 4 | usb_pd | USB Power Delivery controllers |
| 5 | dc_dc | DC-DC converters (buck/boost) |
| 6 | audio_amp | Audio amplifier ICs |
| 7 | motor_driver | Motor driver ICs |
| 8 | mcu | Microcontrollers |
| 9 | capacitor | Electrolytic/ceramic capacitors |
| 10 | inductor | Inductors and chokes |
| 11 | connector | USB, barrel jack, headers |
| 12 | ic_generic | Unclassified ICs |

## Model Training

Models should be trained using TensorFlow/Keras and converted to TFLite format:

```python
# Example conversion
import tensorflow as tf

# Load trained model
model = tf.keras.models.load_model('component_detector.h5')

# Convert to TFLite
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

# Save
with open('component_detector.tflite', 'wb') as f:
    f.write(tflite_model)
```

## Performance Targets

- **Inference time:** < 100ms on mid-range devices
- **Model size:** < 10MB
- **mAP@0.5:** > 0.7

## Adding Models to the App

1. Place `.tflite` files in this directory
2. Update `metro.config.js` to include `.tflite` assets
3. Reference in code:

```typescript
import { Asset } from 'expo-asset';

// Load model asset
const modelAsset = Asset.fromModule(require('./assets/models/component_detector.tflite'));
await modelAsset.downloadAsync();

// Use with TFLiteModel
import { getTFLiteModel } from './src/recognition/TFLiteModel';
const model = getTFLiteModel();
await model.loadModel(modelAsset);
```

## Development Mode

When no model file is present, the app uses a placeholder model that returns
mock detections for UI development. This allows testing the full pipeline
without a trained model.

To disable mock detections once a real model is added:

```typescript
import { getComponentDetector } from './src/recognition';
const detector = getComponentDetector();
detector.setUseMockDetections(false);
```
