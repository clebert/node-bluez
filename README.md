# Node.js BlueZ

[![][ci-badge]][ci-link] [![][version-badge]][version-link]
[![][license-badge]][license-link] [![][types-badge]][types-link]

[ci-badge]: https://github.com/clebert/node-bluez/workflows/CI/badge.svg
[ci-link]: https://github.com/clebert/node-bluez
[version-badge]: https://badgen.net/npm/v/@clebert/node-bluez
[version-link]: https://www.npmjs.com/package/@clebert/node-bluez
[license-badge]: https://badgen.net/npm/license/@clebert/node-bluez
[license-link]: https://github.com/clebert/node-bluez/blob/master/LICENSE
[types-badge]: https://badgen.net/npm/types/@clebert/node-bluez
[types-link]: https://github.com/clebert/node-bluez

> A Node.js API for BlueZ with native TypeScript support.

This package runs only on Linux and has a very limited feature set. It is
specially designed for controlling simple BLE devices (e.g.
[@clebert/node-switch-bot](https://github.com/clebert/node-switch-bot)) in the
context of home automation.

## Installation

```
npm install @clebert/node-bluez
```

## Features

- Designed from the ground up with TypeScript.
- Uses a solid and well-tested D-Bus implementation to communicate with BlueZ.
- Tested with Node.js 14 on Raspberry Pi OS Lite.

## Usage example

```js
import {Adapter, timeout} from '@clebert/node-bluez';
import {SystemDBus} from '@clebert/node-d-bus';

(async () => {
  const dBus = new SystemDBus();

  await dBus.connectAsExternal();

  try {
    await dBus.hello();

    const [adapter] = await Adapter.getAll(dBus);

    if (!adapter) {
      throw new Error('Adapter not found.');
    }

    await adapter.setPowered(true);

    await adapter.setDiscoveryFilter({
      serviceUUIDs: ['xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'],
      transport: 'le',
    });

    await adapter.startDiscovery();

    let device;

    try {
      device = await timeout(adapter.waitForDevice('XX:XX:XX:XX:XX:XX'), 5000);
    } finally {
      await adapter.stopDiscovery();
    }

    await timeout(device.connect(), 5000);

    const gattCharacteristic = await timeout(
      device.waitForGattCharacteristic('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
      5000
    );

    await gattCharacteristic.writeValue([
      'f'.charCodeAt(0),
      'o'.charCodeAt(0),
      'o'.charCodeAt(0),
    ]);

    await device.disconnect();
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

---

Copyright (c) 2021, Clemens Akens. Released under the terms of the
[MIT License](https://github.com/clebert/node-bluez/blob/master/LICENSE).
