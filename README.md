# json-utility
Implementing JSON System based on TypeScript

## Introduce
JSON is a common data type is being used widely on programs and websites. Most of the backend & frontend developers are contact with each others from this file, so it is important to have a good JSON System.

JSON Patch: The system of JSON Patch was founded in 2013, but this implementing is made in 2023 which updated the old poorly JSON Patch system.

It is recommend to use this system to interacting with file system or with the server.

## How to use

First, you need to install NodeJS & TypeScript on your local machine.
The later, you need to compile the script and then import it directly to your project.

Parse JSON:
 ```ts
import json from "./json_util.js";

json.parse_json(create_new_test_json_str as string, true)
```

Return Trailing commas JSON:
 ```ts
import json from "./json_util.js";

json.JSONStringify(obj, true)
```

JSON Patch:
 ```ts
import json from "./json_util.js";

json.JSONPatch(obj, patch_obj)
```
