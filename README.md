# Node.js BlueZ

> A Node.js API for BlueZ with native TypeScript support.

This package runs only on Linux and has a very limited feature set. It is
specially designed for controlling simple BLE devices (e.g.
[@clebert/node-switch-bot](https://github.com/clebert/node-switch-bot) and
[@clebert/node-plant-sensor](https://github.com/clebert/node-plant-sensor)) in
the context of home automation.

## Installation

```
npm install @clebert/node-bluez @clebert/node-d-bus
```

## Features

- Designed from the ground up with TypeScript.
- Uses a solid and well-tested D-Bus implementation to communicate with BlueZ.

## Usage example

```js
import {Adapter} from '@clebert/node-bluez';
import {SystemDBus} from '@clebert/node-d-bus';

(async () => {
  const dBus = new SystemDBus();

  await dBus.connectAsExternal();

  try {
    await dBus.hello();

    const [adapter] = await Adapter.getAll(dBus);

    if (!adapter) {
      throw new Error(`Adapter not found.`);
    }

    const unlockAdapter = await adapter.lock.aquire();

    try {
      await adapter.setPowered(true);

      await adapter.setDiscoveryFilter({
        serviceUUIDs: [`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`],
        transport: `le`,
      });

      await adapter.startDiscovery();

      let device;

      try {
        device = await adapter.waitForDevice(`XX:XX:XX:XX:XX:XX`);
      } finally {
        await adapter.stopDiscovery();
      }

      await device.connect();

      const gattCharacteristic = await device.waitForGattCharacteristic(
        `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
      );

      await gattCharacteristic.writeValue([
        `f`.charCodeAt(0),
        `o`.charCodeAt(0),
        `o`.charCodeAt(0),
      ]);

      await device.disconnect();
    } finally {
      unlockAdapter();
    }
  } finally {
    dBus.disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

## Configure user permissions

Create the `/etc/dbus-1/system.d/node-bluez.conf` configuration file. The
username may need to be modified.

```xml
<!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
  "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">

<busconfig>
  <policy user="pi">
    <allow own="org.bluez"/>
    <allow send_destination="org.bluez"/>
    <allow send_interface="org.bluez.GattCharacteristic1"/>
    <allow send_interface="org.bluez.GattDescriptor1"/>
    <allow send_interface="org.freedesktop.DBus.ObjectManager"/>
    <allow send_interface="org.freedesktop.DBus.Properties"/>
  </policy>
</busconfig>
```
