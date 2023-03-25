"use strict";
namespace JSON_Util {


    /**
     * 
     * @param jsonStr - You need to pass an json here as string
     * @param allow_trailing_commas - Set boolean of force trailing commas parse 
     * @param - Default behavior of JS is not allowing trailing commas, however you can use Regex to handle it
     * @returns 
     */


    function parseJson(jsonStr: string, allow_trailing_commas: boolean = false): any {
        const jsonStrWithoutTrailingCommas = (allow_trailing_commas) ? jsonStr.replace(/(?<=(true|false|null|["\d}\]])\s*)\s*,(?=\s*[}\]])/g, '') : jsonStr;
        try {
            return JSON.parse(jsonStrWithoutTrailingCommas, (key, value) => {
                if (value && typeof value === 'object') {
                    Object.entries(value).forEach(([k, v]) => {
                        if (typeof v === 'string' && v.includes('@line')) {
                            value[k] = v.replace(/@line/g, '');
                            throw new Error(`Syntax error at ${value[k]}`);
                        }
                    });
                }
                return value;
            });
        } catch (error: any) {
            if (error instanceof SyntaxError) {
                if (error.message != null) {
                    let position = (error.message as any).match(/\d+/g)[0];
                    let lines = jsonStr.split('\n');
                    let lineNumber = 1;
                    let currentPosition = 0;
                    for (let line of lines) {
                        if (currentPosition + line.length >= position) {
                            if (line.match(/,\s*[\]\}]/)) {
                                throw new Error(`Trailing commas at line ${lineNumber}: ${line.trim()}`);
                            }
                            break;
                        }
                        currentPosition += line.length + 1;
                        lineNumber++;
                    }
                    throw new Error(`The JSON syntax error at ${lineNumber}: ${lines[lineNumber - 1]}`);

                }
            } else if (error instanceof TypeError) {
                throw new Error(`JSON Type is Error`);
            } else if (error instanceof URIError) {
                throw new Error(`JSON String cannot contain invalid char`);
            } else {
                throw new Error(error.message.toString()) as never;
            }
        }
    }

    /**
     * 
     * @param data - You need to pass an json here as string
     * @param force_trailing_commas_reader - Set boolean of force trailing commas parse 
     * @param - Default behavior of JS is not allowing trailing commas, however you can use Regex to handle it
     * @returns 
     */

    export function parse_json(data: any, force_trailing_commas_reader: boolean = false): {} {
        if (data instanceof Object || typeof (data) === "object") {
            return data;
        }
        return parseJson(data, force_trailing_commas_reader as boolean);
    }


    /**
     * 
     * @param input1 - You need to pass the original json file path here
     * @param input2 - You need to pass the modified json file path here
     * @returns - The new patch data generated after comparing
     */

    export function generate_patch(input1: any, input2: any) {
        //#region 
        let patch: PatchOperation[] = [];

        const walk = (obj1: any, obj2: any, path: string[] = []) => {
            if (obj1 === null || obj1 === undefined) {
                return;
            }

            Object.keys(obj1).forEach((key: string) => {
                const val1 = obj1[key];
                const val2 = obj2[key];
                const currentPath: string[] = path.concat(key);

                if (!(key in obj2)) {
                    patch.push({
                        op: 'remove',
                        path: currentPath,
                    });
                    return;
                }

                if (Array.isArray(val1) && Array.isArray(val2)) {
                    val1.forEach((val, i) => {
                        if (val2.length <= i) {
                            for (let j = i; j < val1.length; j++) {
                                patch.push({
                                    op: 'remove',
                                    path: currentPath.concat([j.toString()]),
                                });
                            }
                        } else if (Array.isArray(val) || typeof val === 'object') {
                            walk(val, val2[i], currentPath.concat([i.toString()]));
                        } else if (val !== val2[i]) {
                            patch.push({
                                op: 'replace',
                                path: currentPath.concat([i.toString()]),
                                value: val2[i],
                            });
                        }
                    });
                    for (let i = val1.length; i < val2.length; i++) {
                        patch.push({
                            op: 'add',
                            path: currentPath.concat([(i).toString()]),
                            value: val2[i],
                        });
                    }
                } else if (typeof val1 === 'object' && typeof val2 === 'object') {
                    walk(val1, val2, currentPath);
                } else if (val1 !== val2) {
                    patch.push({
                        op: 'replace',
                        path: currentPath,
                        value: val2,
                    });
                }
            });

            if (obj2 === null || obj2 === undefined) {
                return;
            }

            Object.keys(obj2).forEach(key => {
                if (!(key in obj1)) {
                    patch.push({
                        op: 'add',
                        path: path.concat(key),
                        value: obj2[key],
                    });
                }
            });
        };

        walk(input1, input2);
        return patch;

        //#endregion
    }


    export type PatchOperation =
        | { op: 'add'; path: string[]; value: any }
        | { op: 'remove'; path: string[] }
        | { op: 'replace'; path: string[]; value: any }
        | { op: 'move'; from: string[]; path: string[] }
        | { op: 'copy'; from: string[]; path: string[] }
        | { op: 'test'; path: string[]; value: any };



    function get(obj: any, path: string[]): any {
        let current = obj;

        for (const token of path) {
            if (current === null || typeof current === 'undefined') {
                return undefined;
            }
            current = current[token];
        }

        return current;
    }

    function set(obj: any, path: string[], value: any): void {
        let current = obj;

        for (let i = 0; i < path.length - 1; i++) {
            const token = path[i];
            if (!(token in current)) {
                current[token] = {};
            }
            current = current[token];
        }

        current[path[path.length - 1]] = value;
    }

    function remove(obj: any, path: string[]): void {
        let current = obj;

        for (let i = 0; i < path.length - 1; i++) {
            const token = path[i];
            if (!(token in current)) {
                return;
            }
            current = current[token];
        }

        delete current[path[path.length - 1]];
    }

    function applyPatch(obj: any, patch: PatchOperation): void {
        switch (patch.op) {
            case 'add':
                set(obj, patch.path, patch.value);
                break;
            case 'remove':
                remove(obj, patch.path);
                break;
            case 'replace':
                set(obj, patch.path, patch.value);
                break;
            case 'move':
                const valueToMove = get(obj, patch.from);
                remove(obj, patch.from);
                set(obj, patch.path, valueToMove);
                break;
            case 'copy':
                const valueToCopy = get(obj, patch.from);
                set(obj, patch.path, valueToCopy);
                break;
            case 'test':
                const value = get(obj, patch.path);
                if (JSON.stringify(value) !== JSON.stringify(patch.value)) {
                    throw new Error(`Test operation failed`);
                }
                break;
            default:
                throw new Error(`Invalid operation: ${(patch as any).op as never}`) as never;
        }
    }


    /**
     * 
     * @param obj - You need to pass the json data after parse
     * @param patches - You need to pass the patches here 
     * @returns - The new object after being patched
     */


    export function JSONPatch(obj: any, patches: PatchOperation[]) {
        for (const patch of patches) {
            applyPatch(obj, patch);
        }
        return obj;
    }


    /**
     * 
     * @param obj - You need to pass the json object (which mean it needs to be parsed)
     * @param is_trailing_comma - If you want to stringify trailing comma, you can set the argument to true
     * @returns - Stringify with the most reduced size and beautiful
     */


    export function JSONStringify(obj: any, is_trailing_comma: boolean = false) {
        return is_trailing_comma ? addTrailingCommas(JSON.stringify(obj, null, '\t')) : JSON.stringify(obj, null, '\t');
    }


    function addTrailingCommas(jsonFile: string): string {
        const data = jsonFile.split('\n');
        const lastLine = data.pop();
        const modifiedData = data.map((line) => {
            if (line.match(/^\s*[\[{]|[,{]\s*$/)) {
                return line;
            } else {
                const trimmedLine = line.trim();
                const lastChar = trimmedLine[trimmedLine.length - 1];
                if (lastChar === ',' || lastChar === '{' || lastChar === '[') {
                    return line;
                } else {
                    return `${line},`;
                }
            }
        });
        if (lastLine && !lastLine.match(/^\s*[\]}]\s*$/)) {
            modifiedData.push(`${lastLine},`);
        } else if (lastLine) {
            modifiedData.push(lastLine);
        }
        let result = modifiedData.join('\n');
        result = result.replace(/({|\[)(\s*),(\s*)(}|])/g, '$1$2$4$5');
        return result;
    }

}