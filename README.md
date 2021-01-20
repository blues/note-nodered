# note-nodered

Node JS library with Custom Node Red package for communication with Blues Wireless Notecard over I²C.

This Node Red package enables you to control a Notecard by developing flows in Node Red running on a Raspberry Pi.

## Installation

With Node Red pallet manager search for `node-red-contrib-notecard`

For manual installation, follow the steps suggested by the following video:
  https://youtu.be/2bmWBU2xnHc

You can access the source in the repo here:
https://github.com/blues/note-nodered 

## Usage

Add a `Notecard Request` node to a Node Red flow from the node pallet on the left-hand side of the interface

### Configuration
The default node configuration supports the default Raspberry Pi and Notecard configurations.  

In most cases, additional configuration is not required.

_Communication Settings_
To communicate with the Notecard, the I2C bus number must be set to the port number being used by the I2C module on the Raspberry Pi.  It is a value between [0, 7] inclusive.

The default address for the Notecard is 0x17 (23).  If that has been changed, then set the address value to the new Notecard address.


### Sending Notecard Requests
The `Notecard Request` node accepts Notecard requests formed as JSON object, or as a JSON string.

Set the value of the input  `msg.payload` to a Notecard request.

The response will be provided on the `Notecard Request` output in the `msg.payload` field.

```json
{
    "_msgid":"ece314b1.2b8478",
    "payload":{
        "body":{
            "org":"Blues Wireless",
            "product":"Notecard",
            "version":"notecard-1.5.2",
            "ver_major":1,
            "ver_minor":5,
            "ver_patch":2,
            "ver_build":12200,
            "built":"Dec  7 2020 19:28:29"
        },
        "version":"notecard-1.5.2.12200",
        "device":"dev:xxxxxxxxxxxxxxx",
        "name":"Blues Wireless Notecard",
        "type":11,
        "sku":"NOTE-NBNA500"
    },
    "topic":""
}
```

By default, the `Notecard Request` node will return responses as the same type as the input request (JSON ---> JSON and string ---> string)





## Examples
The [examples](notecard/examples/) directory contains example Node Red flows:

- [Get Notecard Version](notecard/examples/notecard-version-request.json)

## Contributing

We love issues, fixes, and pull requests from everyone. By participating in this project, you agree to abide by the Blues Inc [code of conduct](https://blues.github.io/opensource/code-of-conduct).

For details on contributions we accept and the process for contributing, see our [contribution guide](CONTRIBUTING.md).

## Running the Tests

If you're planning to contribute to this repo, please be sure to run the tests before submitting a PR. 

Tests can only be run on Raspberry Pi connected to Notecard over I2C

Navigate to the root folder and execute

```bash
npm test
```

## More Information

For additional Notecard SDKs and Libraries, see:

* [note-python](https://blues.github.io/opensource/code-of-conduct) for Python support
* [note-c](https://github.com/blues/note-c) for Standard C support
* [note-go](https://github.com/blues/note-go) for Go
* [note-arduino](https://github.com/blues/note-arduino) for Arduino 

## To learn more about Blues Wireless, the Notecard and Notehub, see:

* [blues.com](https://blues.com)
* [notehub.io][Notehub]
* [wireless.dev](https://wireless.dev)

## License

Copyright (c) 2021 Blues Inc. Released under the MIT license. See [LICENSE](LICENSE) for details.

[code of conduct]: https://blues.github.io/opensource/code-of-conduct
[Notehub]: https://notehub.io
