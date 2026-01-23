# SpecCheck

X-ray vision for tech claims. Point your camera at a circuit board and see what's actually possible.

## What This Does

You open a device, point your phone at it, and the app tells you whether the marketing claims are physically achievable.

Sellers lie about specs because most people can't read a circuit board. This app reads it for you.

## How It Works

1. Open the device (flashlight, charger, power bank, whatever)
2. Point your camera at the PCB
3. App identifies visible components - chips, LEDs, batteries, capacitors
4. Tap any component to see its real specs from manufacturer datasheets
5. Enter the seller's claim ("10,000 lumens", "65W charging", "20,000mAh")
6. App walks the constraint chain and tells you the maximum possible output
7. Verdict: either the claim is plausible, or physics says no

## The Constraint Chain

Every performance claim depends on a chain of components. Each link has hard limits.

```
Claimed Output
      ↓
Component A (LED, motor, cell) → max theoretical output
      ↓
Driver/Controller → max current it can regulate
      ↓
Power Source → max sustained discharge
      ↓
Thermal Mass → max heat dissipation before failure
      ↓
Actual Maximum Possible Output
```

If any link can't support the claim, the claim is false. You don't need a test lab. You just need to see the parts.

## What This Catches

**Flashlights**
- "10,000 lumen" lights with LEDs that max at 1,200
- Drivers that can't push enough current
- Batteries that would explode at claimed discharge rates

**Power Banks & Chargers**
- "20,000mAh" banks with cells that add up to 6,000
- "65W GaN" chargers with controller chips rated for 30W
- USB cables claiming 100W with 28AWG wire

**Power Tools**
- "20V MAX" marketing on 18V nominal systems
- Motor specs that don't match torque claims
- Battery packs with mismatched cell configurations

**Audio Equipment**
- "1000W" speakers with 20W amplifier chips
- Subwoofers with voice coils too small for claimed output

**Storage Devices**
- USB drives with controller chips that reveal actual capacity
- SSDs with DRAM-less controllers sold as "high performance"

**Medical Devices**
- "Blood glucose monitors" with no actual glucose sensing hardware
- SpO2 claims from sensors that lack the necessary wavelengths

## What This Isn't

- Not a product review platform
- Not a place to complain about shipping times
- Not concerned with subjective quality ("feels cheap")
- Not tracking your browsing or purchase history

This tool answers one question: can this hardware physically do what the seller claims?

## The AR Overlay

Point your camera at a PCB and components get highlighted in real-time:

- **Green** - Component identified, specs retrieved
- **Yellow** - Partial match, manual verification suggested  
- **Blue** - Tap for more details
- **Red** - This component can't support the claimed output

Tap any component to see:
- Manufacturer and part number
- Key specs from datasheet (max current, voltage, output, thermal limits)
- What this means for the overall claim

Pinch to zoom. The overlay stays anchored to the physical components.

## Community Layer

When you verify a product, you can submit:
- Photos of the internals
- Seller listing link
- Claimed vs actual specs
- Verdict

This builds a database of known fakes. Before you buy, search the listing URL or product name and see if someone's already opened one up.

No accounts required to search. Optional account to contribute.

## Privacy

- Camera processing happens on-device
- Component recognition runs locally
- Only the LLM reasoning call goes to a server, and it receives chip IDs, not images
- No purchase history, no browsing data, no location tracking
- Community submissions are voluntary and contain only what you choose to share

## Supported Component Types (v1)

- LED packages (Cree, Lumileds, Samsung, Osram, generic)
- LED driver ICs
- Battery management ICs
- USB Power Delivery controllers
- Li-ion/LiPo cells (18650, 21700, pouch)
- DC-DC converters
- Audio amplifier ICs
- Motor driver ICs
- Flash/storage controllers

Datasheet database expands based on what users encounter.

## Why This Matters

Fake specs aren't just annoying - they're dangerous.

A flashlight that claims 10,000 lumens and delivers 800 is a rip-off. A battery pack that claims 20,000mAh with cells that can't handle the discharge rate is a fire. A glucose monitor that displays random numbers instead of measuring blood sugar can kill someone.

The people selling this stuff count on buyers not knowing how to verify claims. This app transfers that knowledge to anyone with a phone and a screwdriver.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a pull request.

## Security

For information about reporting security vulnerabilities, please see our [Security Policy](SECURITY.md).
